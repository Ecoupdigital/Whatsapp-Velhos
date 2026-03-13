from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Jogador
from schemas import JogadorCreate, JogadorUpdate, JogadorOut
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/jogadores", tags=["jogadores"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[JogadorOut])
def listar(
    ativo: int | None = Query(None),
    tipo: str | None = Query(None),
    busca: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Jogador)
    if ativo is not None:
        q = q.filter(Jogador.ativo == ativo)
    if tipo:
        q = q.filter(Jogador.tipo == tipo)
    if busca:
        q = q.filter(
            (Jogador.nome.ilike(f"%{busca}%")) | (Jogador.apelido.ilike(f"%{busca}%"))
        )
    return q.order_by(Jogador.nome).all()


@router.post("", response_model=JogadorOut, status_code=201)
def criar(data: JogadorCreate, db: Session = Depends(get_db)):
    jogador = Jogador(**data.model_dump())
    db.add(jogador)
    db.commit()
    db.refresh(jogador)
    return jogador


@router.get("/{jogador_id}", response_model=JogadorOut)
def detalhe(jogador_id: int, db: Session = Depends(get_db)):
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador nao encontrado")
    return jogador


@router.put("/{jogador_id}", response_model=JogadorOut)
def atualizar(jogador_id: int, data: JogadorUpdate, db: Session = Depends(get_db)):
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador nao encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(jogador, field, value)
    jogador.updated_at = datetime.now().isoformat()
    db.commit()
    db.refresh(jogador)
    return jogador


@router.delete("/{jogador_id}")
def desativar(jogador_id: int, db: Session = Depends(get_db)):
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador nao encontrado")
    jogador.ativo = 0
    jogador.updated_at = datetime.now().isoformat()
    db.commit()
    return {"ok": True}
