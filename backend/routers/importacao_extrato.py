"""Importacao de extrato bancario para o agente (e para o app, se um dia tiver tela).

Fluxo: POST /previa (nao grava) -> POST /confirmar (grava um lote) ->
POST /lotes/{id}/desfazer (volta tudo que o lote lancou).
"""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import ExtratoLinha, ImportacaoExtrato, Transacao, Usuario
from services import extrato_service
from services.extrato_service import ExtratoErro

router = APIRouter(
    prefix="/api/importacao-extrato",
    tags=["importacao-extrato"],
    dependencies=[Depends(get_current_user)],
)


class LinhaExtrato(BaseModel):
    data: str = Field(description="AAAA-MM-DD")
    valor: float = Field(description="Valor positivo (o sinal vem do tipo)")
    tipo: Literal["entrada", "saida"]
    descricao: Optional[str] = Field(None, description="Nome ou descricao como aparece no extrato")
    conta_id: Optional[int] = Field(None, description="Se ausente, usa o conta_id do pedido")


class LinhaConfirmar(LinhaExtrato):
    acao: Literal["mensalidade", "transacao", "ignorar"]
    mensalidade_ids: list[int] = Field(default_factory=list, description="acao=mensalidade")
    categoria: Optional[str] = Field(None, description="acao=transacao (ex.: mensalidade, evento, despesa)")
    jogador_id: Optional[int] = None
    evento_id: Optional[int] = None
    descricao_lancamento: Optional[str] = Field(None, description="Descricao da transacao; padrao = descricao")
    forma_pagto: Optional[str] = Field(None, description="acao=mensalidade; padrao pix")


class PreviaRequest(BaseModel):
    conta_id: Optional[int] = None
    linhas: list[LinhaExtrato]


class ConfirmarRequest(BaseModel):
    conta_id: Optional[int] = None
    observacao: Optional[str] = None
    linhas: list[LinhaConfirmar]


@router.post("/previa")
def previa(req: PreviaRequest, db: Session = Depends(get_db)):
    """Classifica cada linha (nova | duplicada | erro) e sugere jogador e mensalidade. Nao grava."""
    return extrato_service.previa(db, req.conta_id, [ln.model_dump() for ln in req.linhas])


@router.post("/confirmar", status_code=201)
def confirmar(
    req: ConfirmarRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Grava o lote. Duplicadas sao puladas; erro numa linha nao derruba as outras."""
    origem = db.info.get("origem") or "app"
    return extrato_service.confirmar(
        db, req.conta_id, [ln.model_dump() for ln in req.linhas],
        usuario_id=user.id, origem=origem, observacao=req.observacao,
    )


@router.get("/lotes")
def listar_lotes(db: Session = Depends(get_db)):
    lotes = db.query(ImportacaoExtrato).order_by(ImportacaoExtrato.id.desc()).limit(100).all()
    return [_lote_out(l) for l in lotes]


@router.get("/lotes/{lote_id}")
def detalhe_lote(lote_id: int, db: Session = Depends(get_db)):
    lote = db.query(ImportacaoExtrato).filter(ImportacaoExtrato.id == lote_id).first()
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote nao encontrado")
    linhas = db.query(ExtratoLinha).filter(ExtratoLinha.lote_id == lote.id).order_by(ExtratoLinha.id).all()
    transacoes = db.query(Transacao).filter(Transacao.importacao_lote_id == lote.id).order_by(Transacao.id).all()
    return {
        **_lote_out(lote),
        "linhas": [
            {"id": l.id, "data": l.data, "tipo": l.tipo, "valor": l.valor, "descricao": l.descricao,
             "acao": l.acao, "impressao_digital": l.impressao_digital}
            for l in linhas
        ],
        "transacoes": [
            {"id": t.id, "tipo": t.tipo, "categoria": t.categoria, "valor": t.valor, "data": t.data,
             "descricao": t.descricao, "jogador_id": t.jogador_id, "mensalidade_id": t.mensalidade_id}
            for t in transacoes
        ],
    }


@router.post("/lotes/{lote_id}/desfazer")
def desfazer_lote(lote_id: int, db: Session = Depends(get_db)):
    try:
        return extrato_service.desfazer(db, lote_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Lote nao encontrado")
    except ExtratoErro as e:
        raise HTTPException(status_code=409, detail=str(e))


def _lote_out(l: ImportacaoExtrato) -> dict:
    return {
        "id": l.id, "conta_id": l.conta_id, "usuario_id": l.usuario_id, "origem": l.origem,
        "observacao": l.observacao, "total_linhas": l.total_linhas, "linhas_gravadas": l.linhas_gravadas,
        "status": l.status, "created_at": l.created_at, "desfeito_em": l.desfeito_em,
    }
