import asyncio
import random

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from database import get_db
from models import Mensalidade, Jogador, Transacao, MensagemLog, Configuracao
from schemas import (
    MensalidadeCreate, MensalidadeUpdate, MensalidadeOut,
    GerarMensalidadesRequest, MensalidadeResumo,
)
from auth import get_current_user
from services.whatsapp_service import send_text_message
from services.template_service import render_template, mes_por_extenso
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/mensalidades", tags=["mensalidades"], dependencies=[Depends(get_current_user)])

VALOR_JOGADOR = 60.0
VALOR_SOCIO = 20.0


@router.get("", response_model=list[MensalidadeOut])
def listar(
    mes: str | None = Query(None, description="Formato: 2026-03"),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Mensalidade).options(joinedload(Mensalidade.jogador))
    if mes:
        q = q.filter(Mensalidade.mes_referencia == mes)
    if status:
        q = q.filter(Mensalidade.status == status)
    return q.order_by(Mensalidade.mes_referencia.desc()).all()


@router.post("", response_model=MensalidadeOut, status_code=201)
def criar(data: MensalidadeCreate, db: Session = Depends(get_db)):
    existing = db.query(Mensalidade).filter(
        Mensalidade.jogador_id == data.jogador_id,
        Mensalidade.mes_referencia == data.mes_referencia,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Mensalidade ja existe para este jogador/mes")

    m = Mensalidade(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/{mensalidade_id}", response_model=MensalidadeOut)
def atualizar(mensalidade_id: int, data: MensalidadeUpdate, db: Session = Depends(get_db)):
    m = db.query(Mensalidade).filter(Mensalidade.id == mensalidade_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mensalidade nao encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(m, field, value)

    # Se marcou como pago, cria transacao de entrada automaticamente
    if data.status == "pago" and data.valor_pago:
        jogador = db.query(Jogador).filter(Jogador.id == m.jogador_id).first()
        nome = jogador.apelido or jogador.nome if jogador else "Desconhecido"
        transacao = Transacao(
            tipo="entrada",
            categoria="mensalidade",
            descricao=f"Mensalidade {m.mes_referencia} - {nome}",
            valor=data.valor_pago,
            data=data.data_pagamento or datetime.now().strftime("%Y-%m-%d"),
            jogador_id=m.jogador_id,
        )
        db.add(transacao)

    db.commit()
    db.refresh(m)
    return m


@router.delete("/{mensalidade_id}")
def excluir(mensalidade_id: int, db: Session = Depends(get_db)):
    m = db.query(Mensalidade).filter(Mensalidade.id == mensalidade_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mensalidade nao encontrada")
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.post("/gerar", response_model=list[MensalidadeOut])
def gerar_mensalidades(req: GerarMensalidadesRequest, db: Session = Depends(get_db)):
    jogadores = db.query(Jogador).filter(Jogador.ativo == 1).all()
    criadas = []

    for j in jogadores:
        existing = db.query(Mensalidade).filter(
            Mensalidade.jogador_id == j.id,
            Mensalidade.mes_referencia == req.mes_referencia,
        ).first()
        if existing:
            continue

        valor = VALOR_JOGADOR if j.tipo == "jogador" else VALOR_SOCIO
        m = Mensalidade(
            jogador_id=j.id,
            mes_referencia=req.mes_referencia,
            valor=valor,
            status="pendente",
        )
        db.add(m)
        criadas.append(m)

    db.commit()
    for m in criadas:
        db.refresh(m)
    return criadas


@router.get("/resumo/{mes}", response_model=MensalidadeResumo)
def resumo(mes: str, db: Session = Depends(get_db)):
    mensalidades = db.query(Mensalidade).filter(Mensalidade.mes_referencia == mes).all()

    pagos = sum(1 for m in mensalidades if m.status == "pago")
    pendentes = sum(1 for m in mensalidades if m.status == "pendente")
    atrasados = sum(1 for m in mensalidades if m.status == "atrasado")
    isentos = sum(1 for m in mensalidades if m.status == "isento")
    valor_esperado = sum(m.valor for m in mensalidades)
    valor_arrecadado = sum(m.valor_pago or 0 for m in mensalidades)

    return MensalidadeResumo(
        mes=mes,
        total_jogadores=len(mensalidades),
        pagos=pagos,
        pendentes=pendentes,
        atrasados=atrasados,
        isentos=isentos,
        valor_esperado=valor_esperado,
        valor_arrecadado=valor_arrecadado,
    )


class CobrarRequest(BaseModel):
    mes_referencia: str
    mensalidade_ids: Optional[list[int]] = None  # None = todos pendentes/atrasados


@router.post("/cobrar")
async def cobrar(req: CobrarRequest, db: Session = Depends(get_db)):
    if req.mensalidade_ids:
        mensalidades = (
            db.query(Mensalidade)
            .options(joinedload(Mensalidade.jogador))
            .filter(Mensalidade.id.in_(req.mensalidade_ids))
            .all()
        )
    else:
        mensalidades = (
            db.query(Mensalidade)
            .options(joinedload(Mensalidade.jogador))
            .filter(
                Mensalidade.mes_referencia == req.mes_referencia,
                Mensalidade.status.in_(["pendente", "atrasado"]),
            )
            .all()
        )

    # Carregar configs do banco
    def _cfg(chave: str, default: str = "") -> str:
        row = db.query(Configuracao).filter(Configuracao.chave == chave).first()
        return row.valor if row else default

    template_text = _cfg(
        "template_cobranca_manual",
        (
            "Fala, {nome}! Tudo bem?\n\n"
            "Passando pra lembrar da mensalidade do time:\n\n"
            "Valor: *R$ {valor}*\nReferencia: *{mes}*\nVencimento: *dia {vencimento}*\n\n"
            "Apos o dia {vencimento}, o valor do jogador passa para *R$ {valor_multa}*.\n\n"
            "PIX: *{pix}*\n\n"
            "Se ja pagou, pode desconsiderar essa mensagem!\n\n"
            "_Mensagem enviada pelo sistema {time}_"
        ),
    )
    pix_chave = _cfg("pix_chave", "pix@velhosparceiros.com.br")
    time_nome = _cfg("time_nome", "Velhos Parceiros F.C.")
    dia_vencimento = _cfg("dia_vencimento", "15")
    valor_multa = _cfg("valor_multa", "65")

    enviados = 0
    erros = 0
    detalhes = []

    for m in mensalidades:
        jogador = m.jogador
        if not jogador or not jogador.telefone or jogador.excluido_envio == 1:
            continue

        nome = jogador.apelido or jogador.nome
        valor_formatado = f"{m.valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

        context = {
            "nome": nome,
            "nome_completo": jogador.nome,
            "valor": valor_formatado,
            "valor_multa": valor_multa,
            "mes": mes_por_extenso(m.mes_referencia),
            "vencimento": dia_vencimento,
            "pix": pix_chave,
            "time": time_nome,
        }
        texto = render_template(template_text, context)

        result = await send_text_message(jogador.telefone, texto)

        log_entry = MensagemLog(
            jogador_id=jogador.id,
            telefone=jogador.telefone,
            tipo_mensagem="cobranca_manual",
            conteudo=texto,
            status="enviado" if result["success"] else "erro",
            message_id=result.get("message_id", ""),
            erro_detalhe=result.get("error", ""),
            enviado_em=datetime.now().isoformat(),
        )
        db.add(log_entry)

        if result["success"]:
            enviados += 1
        else:
            erros += 1

        detalhes.append({
            "jogador": nome,
            "telefone": jogador.telefone,
            "success": result["success"],
            "error": result.get("error", ""),
        })

        # Delay entre mensagens
        await asyncio.sleep(random.uniform(3, 10))

    db.commit()
    return {"enviados": enviados, "erros": erros, "total": len(detalhes), "detalhes": detalhes}
