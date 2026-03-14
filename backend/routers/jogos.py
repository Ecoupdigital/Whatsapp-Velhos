from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Jogo
from schemas import JogoCreate, JogoUpdate, JogoOut, JogoEstatisticas
from auth import get_current_user

router = APIRouter(prefix="/api/jogos", tags=["jogos"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[JogoOut])
def listar(
    tipo: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Jogo)
    if tipo:
        q = q.filter(Jogo.tipo == tipo)
    return q.order_by(Jogo.data.asc()).all()


@router.post("", response_model=JogoOut, status_code=201)
def criar(data: JogoCreate, db: Session = Depends(get_db)):
    j = Jogo(**data.model_dump())
    db.add(j)
    db.commit()
    db.refresh(j)
    return j


@router.put("/{jogo_id}", response_model=JogoOut)
def atualizar(jogo_id: int, data: JogoUpdate, db: Session = Depends(get_db)):
    j = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Jogo nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(j, field, value)
    db.commit()
    db.refresh(j)
    return j


@router.delete("/{jogo_id}")
def remover(jogo_id: int, db: Session = Depends(get_db)):
    j = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Jogo nao encontrado")
    db.delete(j)
    db.commit()
    return {"ok": True}


@router.get("/estatisticas", response_model=JogoEstatisticas)
def estatisticas(db: Session = Depends(get_db)):
    jogos = db.query(Jogo).all()
    vitorias = sum(1 for j in jogos if j.gols_favor > j.gols_contra)
    empates = sum(1 for j in jogos if j.gols_favor == j.gols_contra)
    derrotas = sum(1 for j in jogos if j.gols_favor < j.gols_contra)
    gols_m = sum(j.gols_favor for j in jogos)
    gols_s = sum(j.gols_contra for j in jogos)

    return JogoEstatisticas(
        total=len(jogos),
        vitorias=vitorias,
        empates=empates,
        derrotas=derrotas,
        gols_marcados=gols_m,
        gols_sofridos=gols_s,
    )
