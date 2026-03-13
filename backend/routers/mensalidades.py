from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Mensalidade, Jogador, Transacao
from schemas import (
    MensalidadeCreate, MensalidadeUpdate, MensalidadeOut,
    GerarMensalidadesRequest, MensalidadeResumo,
)
from auth import get_current_user
from datetime import datetime

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
