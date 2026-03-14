from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Conta, Transacao
from schemas import ContaCreate, ContaUpdate, ContaOut
from auth import get_current_user

router = APIRouter(prefix="/api/contas", tags=["contas"], dependencies=[Depends(get_current_user)])


def _calcular_saldo_atual(db: Session, conta: Conta) -> float:
    """saldo_atual = saldo_inicial + entradas - saidas para esta conta."""
    entradas = (
        db.query(func.coalesce(func.sum(Transacao.valor), 0))
        .filter(Transacao.conta_id == conta.id, Transacao.tipo == "entrada")
        .scalar()
    )
    saidas = (
        db.query(func.coalesce(func.sum(Transacao.valor), 0))
        .filter(Transacao.conta_id == conta.id, Transacao.tipo == "saida")
        .scalar()
    )
    return conta.saldo_inicial + entradas - saidas


@router.get("", response_model=list[ContaOut])
def listar_contas(db: Session = Depends(get_db)):
    contas = db.query(Conta).filter(Conta.ativo == 1).order_by(Conta.nome).all()
    result = []
    for c in contas:
        out = ContaOut.model_validate(c)
        out.saldo_atual = _calcular_saldo_atual(db, c)
        result.append(out)
    return result


@router.post("", response_model=ContaOut, status_code=201)
def criar_conta(data: ContaCreate, db: Session = Depends(get_db)):
    conta = Conta(**data.model_dump())
    db.add(conta)
    db.commit()
    db.refresh(conta)
    out = ContaOut.model_validate(conta)
    out.saldo_atual = conta.saldo_inicial
    return out


@router.put("/{conta_id}", response_model=ContaOut)
def atualizar_conta(conta_id: int, data: ContaUpdate, db: Session = Depends(get_db)):
    conta = db.query(Conta).filter(Conta.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(conta, field, value)
    db.commit()
    db.refresh(conta)
    out = ContaOut.model_validate(conta)
    out.saldo_atual = _calcular_saldo_atual(db, conta)
    return out


@router.delete("/{conta_id}")
def excluir_conta(conta_id: int, db: Session = Depends(get_db)):
    conta = db.query(Conta).filter(Conta.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")
    conta.ativo = 0
    db.commit()
    return {"ok": True}
