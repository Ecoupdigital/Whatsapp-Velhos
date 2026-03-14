from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Transacao, Conta
from schemas import (
    TransacaoCreate, TransacaoUpdate, TransacaoOut,
    BalancoOut, FluxoMensal, ContaSaldo,
)
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api", tags=["financeiro"], dependencies=[Depends(get_current_user)])


# --- Transacoes ---

@router.get("/transacoes", response_model=list[TransacaoOut])
def listar_transacoes(
    tipo: str | None = Query(None),
    categoria: str | None = Query(None),
    data_inicio: str | None = Query(None),
    data_fim: str | None = Query(None),
    conta_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Transacao)
    if tipo:
        q = q.filter(Transacao.tipo == tipo)
    if categoria:
        q = q.filter(Transacao.categoria == categoria)
    if data_inicio:
        q = q.filter(Transacao.data >= data_inicio)
    if data_fim:
        q = q.filter(Transacao.data <= data_fim)
    if conta_id is not None:
        q = q.filter(Transacao.conta_id == conta_id)
    return q.order_by(Transacao.data.desc(), Transacao.id.desc()).all()


@router.post("/transacoes", response_model=TransacaoOut, status_code=201)
def criar_transacao(data: TransacaoCreate, db: Session = Depends(get_db)):
    t = Transacao(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/transacoes/{transacao_id}", response_model=TransacaoOut)
def atualizar_transacao(transacao_id: int, data: TransacaoUpdate, db: Session = Depends(get_db)):
    t = db.query(Transacao).filter(Transacao.id == transacao_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/transacoes/{transacao_id}")
def remover_transacao(transacao_id: int, db: Session = Depends(get_db)):
    t = db.query(Transacao).filter(Transacao.id == transacao_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")
    db.delete(t)
    db.commit()
    return {"ok": True}


# --- Balanco ---

@router.get("/financeiro/balanco", response_model=BalancoOut)
def balanco(db: Session = Depends(get_db)):
    now = datetime.now()
    mes_atual = now.strftime("%Y-%m")
    mes_anterior = f"{now.year}-{now.month - 1:02d}" if now.month > 1 else f"{now.year - 1}-12"

    entradas_total = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(Transacao.tipo == "entrada").scalar()
    saidas_total = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(Transacao.tipo == "saida").scalar()
    saldo = entradas_total - saidas_total

    entradas_mes = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "entrada", Transacao.data.like(f"{mes_atual}%")
    ).scalar()
    saidas_mes = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "saida", Transacao.data.like(f"{mes_atual}%")
    ).scalar()

    entradas_anterior = db.query(func.coalesce(func.sum(Transacao.valor), 0)).filter(
        Transacao.tipo == "entrada", Transacao.data.like(f"{mes_anterior}%")
    ).scalar()

    variacao = None
    if entradas_anterior > 0:
        variacao = round(((entradas_mes - entradas_anterior) / entradas_anterior) * 100, 1)

    # Saldos por conta
    saldos_por_conta = []
    contas = db.query(Conta).filter(Conta.ativo == 1).all()
    for conta in contas:
        ent = (
            db.query(func.coalesce(func.sum(Transacao.valor), 0))
            .filter(Transacao.conta_id == conta.id, Transacao.tipo == "entrada")
            .scalar()
        )
        sai = (
            db.query(func.coalesce(func.sum(Transacao.valor), 0))
            .filter(Transacao.conta_id == conta.id, Transacao.tipo == "saida")
            .scalar()
        )
        saldos_por_conta.append(ContaSaldo(
            nome=conta.nome,
            tipo=conta.tipo,
            saldo=conta.saldo_inicial + ent - sai,
        ))

    return BalancoOut(
        saldo_total=saldo,
        entradas_mes=entradas_mes,
        saidas_mes=saidas_mes,
        variacao_percentual=variacao,
        saldos_por_conta=saldos_por_conta,
    )


@router.get("/financeiro/fluxo", response_model=list[FluxoMensal])
def fluxo_mensal(meses: int = Query(12), db: Session = Depends(get_db)):
    transacoes = db.query(Transacao).order_by(Transacao.data).all()

    fluxo = {}
    for t in transacoes:
        mes = t.data[:7] if t.data else "unknown"
        if mes not in fluxo:
            fluxo[mes] = {"entradas": 0, "saidas": 0}
        if t.tipo == "entrada":
            fluxo[mes]["entradas"] += t.valor
        else:
            fluxo[mes]["saidas"] += t.valor

    sorted_meses = sorted(fluxo.keys(), reverse=True)[:meses]
    return [
        FluxoMensal(mes=m, entradas=fluxo[m]["entradas"], saidas=fluxo[m]["saidas"])
        for m in sorted(sorted_meses)
    ]
