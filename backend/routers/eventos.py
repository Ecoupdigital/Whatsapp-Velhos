from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Evento, EventoParticipante
from schemas import (
    EventoCreate, EventoUpdate, EventoOut,
    ParticipanteUpdate, ParticipanteOut,
)
from auth import get_current_user

router = APIRouter(prefix="/api/eventos", tags=["eventos"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[EventoOut])
def listar(
    tipo: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Evento)
    if tipo:
        q = q.filter(Evento.tipo == tipo)
    if status:
        q = q.filter(Evento.status == status)
    return q.order_by(Evento.data_inicio.desc()).all()


@router.post("", response_model=EventoOut, status_code=201)
def criar(data: EventoCreate, db: Session = Depends(get_db)):
    e = Evento(**data.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.get("/{evento_id}", response_model=EventoOut)
def detalhe(evento_id: int, db: Session = Depends(get_db)):
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")
    return e


@router.put("/{evento_id}", response_model=EventoOut)
def atualizar(evento_id: int, data: EventoUpdate, db: Session = Depends(get_db)):
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(e, field, value)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{evento_id}")
def remover(evento_id: int, db: Session = Depends(get_db)):
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")
    db.delete(e)
    db.commit()
    return {"ok": True}


# --- Participantes ---

@router.get("/{evento_id}/participantes", response_model=list[ParticipanteOut])
def listar_participantes(evento_id: int, db: Session = Depends(get_db)):
    return (
        db.query(EventoParticipante)
        .options(joinedload(EventoParticipante.jogador))
        .filter(EventoParticipante.evento_id == evento_id)
        .all()
    )


@router.post("/{evento_id}/participantes", response_model=ParticipanteOut)
def upsert_participante(evento_id: int, data: ParticipanteUpdate, db: Session = Depends(get_db)):
    existing = db.query(EventoParticipante).filter(
        EventoParticipante.evento_id == evento_id,
        EventoParticipante.jogador_id == data.jogador_id,
    ).first()

    if existing:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    p = EventoParticipante(evento_id=evento_id, **data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
