from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Promocao
from schemas import PromocaoCreate, PromocaoUpdate, PromocaoOut
from auth import get_current_user

router = APIRouter(prefix="/api/promocoes", tags=["promocoes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[PromocaoOut])
def listar(db: Session = Depends(get_db)):
    return db.query(Promocao).order_by(Promocao.created_at.desc()).all()


@router.post("", response_model=PromocaoOut, status_code=201)
def criar(data: PromocaoCreate, db: Session = Depends(get_db)):
    p = Promocao(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{promocao_id}", response_model=PromocaoOut)
def atualizar(promocao_id: int, data: PromocaoUpdate, db: Session = Depends(get_db)):
    p = db.query(Promocao).filter(Promocao.id == promocao_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Promocao nao encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{promocao_id}")
def remover(promocao_id: int, db: Session = Depends(get_db)):
    p = db.query(Promocao).filter(Promocao.id == promocao_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Promocao nao encontrada")
    db.delete(p)
    db.commit()
    return {"ok": True}
