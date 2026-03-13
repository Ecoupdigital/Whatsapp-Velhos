from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import CartaoBaile
from schemas import CartaoCreate, CartaoUpdate, CartaoOut, CartaoResumo
from auth import get_current_user

router = APIRouter(prefix="/api/cartoes", tags=["cartoes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CartaoOut])
def listar(
    evento_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(CartaoBaile).options(joinedload(CartaoBaile.jogador))
    if evento_id:
        q = q.filter(CartaoBaile.evento_id == evento_id)
    return q.all()


@router.post("", response_model=CartaoOut, status_code=201)
def distribuir(data: CartaoCreate, db: Session = Depends(get_db)):
    quantidade = data.numero_fim - data.numero_inicio + 1
    c = CartaoBaile(
        evento_id=data.evento_id,
        jogador_id=data.jogador_id,
        numero_inicio=data.numero_inicio,
        numero_fim=data.numero_fim,
        quantidade=quantidade,
        valor_unitario=data.valor_unitario,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{cartao_id}", response_model=CartaoOut)
def atualizar(cartao_id: int, data: CartaoUpdate, db: Session = Depends(get_db)):
    c = db.query(CartaoBaile).filter(CartaoBaile.id == cartao_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cartao nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return c


@router.get("/resumo/{evento_id}", response_model=CartaoResumo)
def resumo(evento_id: int, db: Session = Depends(get_db)):
    cartoes = db.query(CartaoBaile).filter(CartaoBaile.evento_id == evento_id).all()
    return CartaoResumo(
        evento_id=evento_id,
        total_cartoes=sum(c.quantidade for c in cartoes),
        total_vendidos=sum(c.vendidos for c in cartoes),
        total_arrecadado=sum(c.vendidos * c.valor_unitario for c in cartoes),
        total_acertado=sum(c.valor_acertado for c in cartoes),
    )
