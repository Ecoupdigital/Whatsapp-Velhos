"""Planilha do baile dentro do evento.

A importacao grava atletas, numeros, vendidos, lucro e patrocinios.
Nao cria lancamento. O dinheiro que ja entrou no financeiro so muda de
lugar quando alguem vincula o lancamento existente.
"""
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user
from database import get_db
from models import (
    BaileVinculo,
    Evento,
    EventoParticipante,
    EventoPatrocinio,
    Transacao,
)
from routers.eventos import _recalcular_valor_esperado, qtd_venda_efetiva
from services.baile_planilha import PLANILHA_PADRAO, importar_arquivo

router = APIRouter(
    prefix="/api/eventos",
    tags=["Baile"],
    dependencies=[Depends(get_current_user)],
)

RESPOSTAS = {"respondeu", "a_confirmar", "sem_resposta"}
ACERTOS = {"sim", "nao", "a_confirmar"}


class PlanilhaIn(BaseModel):
    qtd_venda: float | None = None
    qtd_lucro: float | None = None
    qtd_brindes: float | None = None
    status_resposta: str | None = None
    acerto: str | None = None
    observacoes: str | None = None
    numero_inicio: int | None = None
    numero_fim: int | None = None


class VincularIn(BaseModel):
    transacao_id: int
    participante_id: int | None = None
    patrocinio_id: int | None = None


def _evento(db: Session, evento_id: int) -> Evento:
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")
    return e


def _nome(p: EventoParticipante) -> str:
    if p.jogador and p.jogador.nome:
        return p.jogador.nome
    return p.nome_avulso or "Sem nome"


def _sincronizar_caixa(db: Session, p: EventoParticipante, evento: Evento):
    partes = (
        db.query(BaileVinculo)
        .filter(BaileVinculo.participante_id == p.id)
        .all()
    )
    if partes:
        total = sum(v.valor or 0 for v in partes)
    else:
        diretos = (
            db.query(Transacao)
            .filter(Transacao.evento_participante_id == p.id, Transacao.tipo == "entrada")
            .all()
        )
        total = sum(t.valor or 0 for t in diretos)
    p.valor_pago = float(total)
    _recalcular_valor_esperado(p, evento)
    p.pago = 1 if p.valor and p.valor_pago >= p.valor - 0.009 else 0


def _vinculos_da(db: Session, transacao_id: int) -> list[BaileVinculo]:
    return db.query(BaileVinculo).filter(BaileVinculo.transacao_id == transacao_id).all()


def _materializar_legado(db: Session, t: Transacao, evento_id: int) -> list[BaileVinculo]:
    """O vínculo antigo guardava o lançamento inteiro num patrocínio só.

    Se o patrocínio vale menos que o lançamento (R$ 60 dentro de um PIX de
    R$ 120), fica só a parte dele. O resto continua livre para o segundo.
    """
    atuais = _vinculos_da(db, t.id)
    if atuais:
        return atuais
    if t.patrocinio_id:
        pat = db.query(EventoPatrocinio).filter(EventoPatrocinio.id == t.patrocinio_id).first()
        teto = float(pat.valor or 0) if pat else float(t.valor or 0)
        valor = min(float(t.valor or 0), teto) if teto else float(t.valor or 0)
        db.add(BaileVinculo(
            transacao_id=t.id,
            evento_id=evento_id,
            patrocinio_id=t.patrocinio_id,
            valor=valor,
        ))
        t.patrocinio_id = None
        db.flush()
    elif t.evento_participante_id:
        db.add(BaileVinculo(
            transacao_id=t.id,
            evento_id=evento_id,
            participante_id=t.evento_participante_id,
            valor=float(t.valor or 0),
        ))
        t.evento_participante_id = None
        db.flush()
    return _vinculos_da(db, t.id)


def _partes_lancamento(db: Session, t: Transacao) -> list[tuple[int | None, int | None, float]]:
    vinculos = _vinculos_da(db, t.id)
    if vinculos:
        return [(v.participante_id, v.patrocinio_id, float(v.valor or 0)) for v in vinculos]
    if t.patrocinio_id:
        pat = db.query(EventoPatrocinio).filter(EventoPatrocinio.id == t.patrocinio_id).first()
        teto = float(pat.valor or 0) if pat else float(t.valor or 0)
        valor = min(float(t.valor or 0), teto) if teto else float(t.valor or 0)
        return [(None, t.patrocinio_id, valor)]
    if t.evento_participante_id:
        return [(t.evento_participante_id, None, float(t.valor or 0))]
    return []


def _visao(db: Session, evento: Evento) -> dict:
    parts = (
        db.query(EventoParticipante)
        .options(joinedload(EventoParticipante.jogador), joinedload(EventoParticipante.faixas))
        .filter(EventoParticipante.evento_id == evento.id)
        .order_by(EventoParticipante.id)
        .all()
    )
    pats = (
        db.query(EventoPatrocinio)
        .filter(EventoPatrocinio.evento_id == evento.id)
        .order_by(EventoPatrocinio.id)
        .all()
    )
    lancamentos = (
        db.query(Transacao)
        .filter(
            Transacao.tipo == "entrada",
            or_(
                Transacao.categoria.in_(["cartao_baile", "patrocinio"]),
                Transacao.descricao.ilike("%baile%"),
                Transacao.evento_id == evento.id,
            ),
        )
        .order_by(Transacao.data, Transacao.id)
        .all()
    )
    por_part = {}
    por_pat = {}
    partes_por_tx = {}
    for t in lancamentos:
        partes = _partes_lancamento(db, t)
        partes_por_tx[t.id] = partes
        for participante_id, patrocinio_id, valor in partes:
            if participante_id:
                por_part[participante_id] = por_part.get(participante_id, 0) + valor
            if patrocinio_id:
                por_pat[patrocinio_id] = por_pat.get(patrocinio_id, 0) + valor

    preco = evento.valor_cartao or 0
    lucro_preco = evento.valor_lucro or 0
    linhas = []
    receita_cartao = 0.0
    receita_lucro = 0.0
    venda_total = 0.0
    lucro_total = 0.0
    caixa_cartao = 0.0
    for p in parts:
        venda = qtd_venda_efetiva(p)
        qtd_lucro = float(p.qtd_lucro or 0)
        rc = venda * preco
        rl = qtd_lucro * lucro_preco
        faixas_num = [
            {"inicio": f.numero_inicio, "fim": f.numero_fim, "quantidade": f.quantidade or 0}
            for f in p.faixas
            if not f.sem_numero and f.numero_inicio is not None
        ]
        conhecidos = sum(f["quantidade"] for f in faixas_num)
        linhas.append({
            "id": p.id,
            "nome": _nome(p),
            "telefone": p.jogador.telefone if p.jogador else None,
            "numero_inicio": faixas_num[0]["inicio"] if faixas_num else p.numero_inicio,
            "numero_fim": faixas_num[0]["fim"] if faixas_num else p.numero_fim,
            "faixas": faixas_num,
            "conhecidos": conhecidos,
            "a_identificar": max(0.0, venda - conhecidos),
            "qtd_venda": venda,
            "qtd_lucro": qtd_lucro,
            "qtd_brindes": float(p.qtd_brindes or 0),
            "status_resposta": p.status_resposta or "sem_resposta",
            "acerto": p.acerto or "nao",
            "observacoes": p.observacoes,
            "valor": float(p.valor or 0),
            "valor_pago": float(por_part.get(p.id, 0)),
            "receita_cartao": rc,
            "receita_lucro": rl,
        })
        receita_cartao += rc
        receita_lucro += rl
        venda_total += venda
        lucro_total += qtd_lucro
        caixa_cartao += por_part.get(p.id, 0)

    linhas_pat = []
    valor_pat_marcado = 0.0
    caixa_pat = 0.0
    for pat in pats:
        vinculado = float(por_pat.get(pat.id, 0))
        linhas_pat.append({
            "id": pat.id,
            "nome_jogador": pat.nome_jogador,
            "nome_patrocinador": pat.nome_patrocinador,
            "valor": float(pat.valor or 0),
            "logo_enviado": pat.logo_enviado or "nao",
            "pago": pat.pago or "nao",
            "data_pagamento": pat.data_pagamento,
            "participante_id": pat.participante_id,
            "valor_vinculado": vinculado,
        })
        if pat.pago == "sim":
            valor_pat_marcado += float(pat.valor or 0)
        caixa_pat += vinculado

    return {
        "evento_id": evento.id,
        "titulo": evento.titulo,
        "valor_cartao": preco,
        "valor_lucro": lucro_preco,
        "valor_brinde": float(evento.valor_brinde or 0),
        "participantes": linhas,
        "patrocinios": linhas_pat,
        "lancamentos": [
            {
                "id": t.id,
                "data": t.data,
                "valor": float(t.valor or 0),
                "descricao": t.descricao,
                "categoria": t.categoria,
                "participante_id": t.evento_participante_id,
                "patrocinio_id": t.patrocinio_id,
                "vinculos": [
                    {
                        "participante_id": pid,
                        "patrocinio_id": pat_id,
                        "valor": valor,
                    }
                    for pid, pat_id, valor in partes_por_tx.get(t.id, [])
                ],
                "restante": max(0.0, float(t.valor or 0) - sum(v for _, _, v in partes_por_tx.get(t.id, []))),
            }
            for t in lancamentos
        ],
        "resumo": {
            "atletas": len(linhas),
            "vendidos": venda_total,
            "lucro_qtd": lucro_total,
            "receita_cartao": receita_cartao,
            "receita_lucro": receita_lucro,
            "receita_total": receita_cartao + receita_lucro,
            "caixa_cartao": caixa_cartao,
            "patrocinios": len(linhas_pat),
            "patrocinios_marcados_pagos": sum(1 for x in linhas_pat if x["pago"] == "sim"),
            "patrocinios_valor_marcado": valor_pat_marcado,
            "caixa_patrocinio": caixa_pat,
        },
    }


@router.get("/{evento_id}/baile")
def ver_baile(evento_id: int, db: Session = Depends(get_db)):
    return _visao(db, _evento(db, evento_id))


@router.put("/{evento_id}/baile/participantes/{participante_id}")
def atualizar_planilha(
    evento_id: int,
    participante_id: int,
    data: PlanilhaIn,
    db: Session = Depends(get_db),
):
    evento = _evento(db, evento_id)
    p = (
        db.query(EventoParticipante)
        .options(joinedload(EventoParticipante.faixas))
        .filter(
            EventoParticipante.id == participante_id,
            EventoParticipante.evento_id == evento_id,
        )
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Participante nao encontrado")
    payload = data.model_dump(exclude_unset=True)
    if "status_resposta" in payload and payload["status_resposta"] not in RESPOSTAS:
        raise HTTPException(status_code=400, detail="Status de resposta invalido")
    if "acerto" in payload and payload["acerto"] not in ACERTOS:
        raise HTTPException(status_code=400, detail="Acerto invalido")
    for campo in ("qtd_venda", "qtd_lucro", "qtd_brindes"):
        if campo in payload and payload[campo] is not None and payload[campo] < 0:
            raise HTTPException(status_code=400, detail="Quantidade nao pode ser negativa")
    inicio = payload.pop("numero_inicio", None)
    fim = payload.pop("numero_fim", None)
    for k, v in payload.items():
        setattr(p, k, v)
    if inicio is not None and fim is not None:
        from services.baile_planilha import _garantir_faixa
        _garantir_faixa(db, p, inicio, fim)
    p.evento = evento
    _recalcular_valor_esperado(p, evento)
    _sincronizar_caixa(db, p, evento)
    db.commit()
    return _visao(db, evento)


@router.post("/{evento_id}/baile/vincular")
def vincular(evento_id: int, data: VincularIn, db: Session = Depends(get_db)):
    """Amarra um pedaço de um lançamento que já existe. Não cria entrada nova.

    Um PIX de R$ 120 pode ir para dois patrocínios de R$ 60. Cada vínculo
    leva só o valor daquele patrocínio. O que sobra fica livre para o próximo.
    """
    evento = _evento(db, evento_id)
    if bool(data.participante_id) == bool(data.patrocinio_id):
        raise HTTPException(status_code=400, detail="Vincule a um atleta ou a um patrocinio")
    t = db.query(Transacao).filter(Transacao.id == data.transacao_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Lancamento nao encontrado")
    if t.tipo != "entrada":
        raise HTTPException(status_code=400, detail="So da para vincular entrada")

    atuais = _materializar_legado(db, t, evento_id)
    if data.patrocinio_id and any(v.patrocinio_id == data.patrocinio_id for v in atuais):
        db.commit()
        return _visao(db, evento)
    if data.participante_id and any(v.participante_id == data.participante_id for v in atuais):
        db.commit()
        return _visao(db, evento)

    restante = float(t.valor or 0) - sum(v.valor or 0 for v in atuais)
    if restante <= 0.009:
        raise HTTPException(status_code=400, detail="Esse lancamento ja foi todo usado")

    afetados = []
    if data.participante_id:
        p = (
            db.query(EventoParticipante)
            .filter(
                EventoParticipante.id == data.participante_id,
                EventoParticipante.evento_id == evento_id,
            )
            .first()
        )
        if not p:
            raise HTTPException(status_code=404, detail="Participante nao encontrado")
        p.evento = evento
        _recalcular_valor_esperado(p, evento)
        ja = sum(v.valor or 0 for v in atuais if v.participante_id == p.id)
        falta = max(0.0, float(p.valor or 0) - ja)
        valor = min(restante, falta) if falta else restante
        db.add(BaileVinculo(
            transacao_id=t.id,
            evento_id=evento_id,
            participante_id=p.id,
            valor=valor,
        ))
        afetados.append(p)
    else:
        pat = (
            db.query(EventoPatrocinio)
            .filter(EventoPatrocinio.id == data.patrocinio_id, EventoPatrocinio.evento_id == evento_id)
            .first()
        )
        if not pat:
            raise HTTPException(status_code=404, detail="Patrocinio nao encontrado")
        ja = sum(v.valor or 0 for v in atuais if v.patrocinio_id == pat.id)
        falta = max(0.0, float(pat.valor or 0) - ja)
        if falta <= 0.009:
            raise HTTPException(status_code=400, detail="Esse patrocinio ja esta coberto")
        valor = min(restante, falta)
        db.add(BaileVinculo(
            transacao_id=t.id,
            evento_id=evento_id,
            patrocinio_id=pat.id,
            valor=valor,
        ))
    t.evento_id = evento_id
    db.flush()
    for p in afetados:
        _sincronizar_caixa(db, p, evento)
    db.commit()
    return _visao(db, evento)


@router.post("/{evento_id}/baile/desvincular")
def desvincular(evento_id: int, data: VincularIn, db: Session = Depends(get_db)):
    evento = _evento(db, evento_id)
    t = db.query(Transacao).filter(Transacao.id == data.transacao_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Lancamento nao encontrado")
    _materializar_legado(db, t, evento_id)
    consulta = db.query(BaileVinculo).filter(BaileVinculo.transacao_id == t.id)
    if data.patrocinio_id:
        consulta = consulta.filter(BaileVinculo.patrocinio_id == data.patrocinio_id)
    elif data.participante_id:
        consulta = consulta.filter(BaileVinculo.participante_id == data.participante_id)
    participantes_ids = {v.participante_id for v in consulta.all() if v.participante_id}
    consulta.delete(synchronize_session=False)
    t.evento_participante_id = None
    t.patrocinio_id = None
    if not _vinculos_da(db, t.id) and t.evento_id == evento_id:
        t.evento_id = None
    for pid in participantes_ids:
        p = db.query(EventoParticipante).filter(EventoParticipante.id == pid).first()
        if p:
            _sincronizar_caixa(db, p, evento)
    db.commit()
    return _visao(db, evento)


@router.post("/{evento_id}/baile/importar")
async def importar(
    evento_id: int,
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """Le a planilha e grava a estrutura. Nao lanca nada no financeiro."""
    _evento(db, evento_id)
    if file is not None and file.filename:
        sufixo = Path(file.filename).suffix or ".xlsx"
        with tempfile.NamedTemporaryFile(delete=False, suffix=sufixo) as tmp:
            tmp.write(await file.read())
            caminho = tmp.name
        try:
            return importar_arquivo(db, evento_id, caminho)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        finally:
            os.unlink(caminho)
    caminho = os.environ.get("BAILE_PLANILHA") or str(PLANILHA_PADRAO)
    if not Path(caminho).is_file():
        raise HTTPException(
            status_code=400,
            detail="Planilha nao encontrada neste servidor. Envie o arquivo .xlsx.",
        )
    try:
        return importar_arquivo(db, evento_id, caminho)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
