from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime

from database import get_db
from models import Evento, EventoParticipante, Jogador, Transacao
from schemas import (
    EventoCreate, EventoUpdate, EventoOut,
    ParticipanteUpdate, ParticipanteOut,
    ParticipanteAvulsoCreate,
    PagamentoCreate, PagamentoOut,
    EventoResumo,
)
from auth import get_current_user

router = APIRouter(prefix="/api/eventos", tags=["eventos"], dependencies=[Depends(get_current_user)])


# ─── Eventos CRUD ────────────────────────────────────────────────

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
    # Limpar transacoes associadas (FK ON DELETE SET NULL ja zera evento_participante_id, mas tambem mata evento_id)
    db.query(Transacao).filter(Transacao.evento_id == evento_id).delete()
    db.query(EventoParticipante).filter(EventoParticipante.evento_id == evento_id).delete()
    db.delete(e)
    db.commit()
    return {"ok": True}


# ─── Participantes ────────────────────────────────────────────────

@router.get("/{evento_id}/participantes", response_model=list[ParticipanteOut])
def listar_participantes(evento_id: int, db: Session = Depends(get_db)):
    return (
        db.query(EventoParticipante)
        .options(joinedload(EventoParticipante.jogador))
        .filter(EventoParticipante.evento_id == evento_id)
        .order_by(EventoParticipante.id)
        .all()
    )


@router.post("/{evento_id}/participantes", response_model=ParticipanteOut)
def upsert_participante(evento_id: int, data: ParticipanteUpdate, db: Session = Depends(get_db)):
    """Upsert por (evento_id, jogador_id). Para avulsos use /participantes/avulso."""
    if data.jogador_id is None and not data.nome_avulso:
        raise HTTPException(status_code=400, detail="Informe jogador_id ou nome_avulso")

    existing = None
    if data.jogador_id is not None:
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

    p = EventoParticipante(evento_id=evento_id, **data.model_dump(exclude_unset=True))
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.post("/{evento_id}/participantes/avulso", response_model=ParticipanteOut, status_code=201)
def adicionar_avulso(evento_id: int, data: ParticipanteAvulsoCreate, db: Session = Depends(get_db)):
    """Adiciona convidado nao cadastrado ao evento."""
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")

    p = EventoParticipante(
        evento_id=evento_id,
        jogador_id=None,
        nome_avulso=data.nome,
        valor=data.valor,
        valor_pago=0,
        status="confirmado",
        pago=0,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.post("/{evento_id}/popular", response_model=list[ParticipanteOut])
def popular_elenco(evento_id: int, db: Session = Depends(get_db)):
    """Adiciona todos jogadores ativos ao evento com valor padrao baseado em tipo."""
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")

    jogadores = db.query(Jogador).filter(Jogador.ativo == 1).all()

    for j in jogadores:
        existing = db.query(EventoParticipante).filter(
            EventoParticipante.evento_id == evento_id,
            EventoParticipante.jogador_id == j.id,
        ).first()
        if existing:
            continue

        valor = e.valor_socio if j.tipo == "socio" else e.valor_jogador
        p = EventoParticipante(
            evento_id=evento_id,
            jogador_id=j.id,
            valor=valor or 0,
            valor_pago=0,
            status="pendente",
            pago=0,
        )
        db.add(p)
    db.commit()

    return (
        db.query(EventoParticipante)
        .options(joinedload(EventoParticipante.jogador))
        .filter(EventoParticipante.evento_id == evento_id)
        .order_by(EventoParticipante.id)
        .all()
    )


@router.delete("/{evento_id}/participantes/{participante_id}")
def remover_participante(evento_id: int, participante_id: int, db: Session = Depends(get_db)):
    p = db.query(EventoParticipante).filter(
        EventoParticipante.id == participante_id,
        EventoParticipante.evento_id == evento_id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Participante nao encontrado")

    # Apaga transacoes financeiras ligadas
    db.query(Transacao).filter(Transacao.evento_participante_id == participante_id).delete()
    db.delete(p)
    db.commit()
    return {"ok": True}


# ─── Pagamentos ───────────────────────────────────────────────────

def _nome_participante(p: EventoParticipante) -> str:
    if p.jogador:
        return p.jogador.apelido or p.jogador.nome
    return p.nome_avulso or f"Participante {p.id}"


def _recalcular_valor_pago(db: Session, p: EventoParticipante):
    """Soma todas transacoes do participante e ajusta valor_pago + pago."""
    total = (
        db.query(func.coalesce(func.sum(Transacao.valor), 0.0))
        .filter(Transacao.evento_participante_id == p.id, Transacao.tipo == "entrada")
        .scalar()
    ) or 0.0
    p.valor_pago = float(total)
    p.pago = 1 if p.valor and p.valor_pago >= p.valor else 0


@router.post("/{evento_id}/participantes/{participante_id}/pagamento", response_model=PagamentoOut)
def registrar_pagamento(
    evento_id: int,
    participante_id: int,
    data: PagamentoCreate,
    db: Session = Depends(get_db),
):
    """Cria transacao financeira de pagamento parcial. Multiplas chamadas = multiplas tx."""
    p = (
        db.query(EventoParticipante)
        .options(joinedload(EventoParticipante.jogador), joinedload(EventoParticipante.evento))
        .filter(
            EventoParticipante.id == participante_id,
            EventoParticipante.evento_id == evento_id,
        )
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Participante nao encontrado")

    if data.valor <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")

    nome = _nome_participante(p)
    titulo = p.evento.titulo if p.evento else f"Evento {evento_id}"
    data_pgto = data.data or datetime.now().strftime("%Y-%m-%d")

    tx = Transacao(
        tipo="entrada",
        categoria="evento",
        descricao=f"{titulo} - {nome}",
        valor=data.valor,
        data=data_pgto,
        jogador_id=p.jogador_id,
        evento_id=evento_id,
        conta_id=data.conta_id,
        evento_participante_id=p.id,
    )
    db.add(tx)
    db.flush()

    # Atualiza dados do participante
    p.data_pagamento = data_pgto
    if data.forma_pagto:
        p.forma_pagto = data.forma_pagto
    if data.conta_id is not None:
        p.conta_id = data.conta_id
    _recalcular_valor_pago(db, p)

    db.commit()
    db.refresh(tx)
    return tx


@router.get("/{evento_id}/pagamentos", response_model=list[PagamentoOut])
def listar_pagamentos(evento_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Transacao)
        .filter(Transacao.evento_id == evento_id, Transacao.tipo == "entrada")
        .order_by(Transacao.data.desc(), Transacao.id.desc())
        .all()
    )


@router.delete("/{evento_id}/pagamentos/{tx_id}")
def estornar_pagamento(evento_id: int, tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transacao).filter(
        Transacao.id == tx_id,
        Transacao.evento_id == evento_id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Pagamento nao encontrado")

    participante_id = tx.evento_participante_id
    db.delete(tx)
    db.flush()

    if participante_id:
        p = db.query(EventoParticipante).filter(EventoParticipante.id == participante_id).first()
        if p:
            _recalcular_valor_pago(db, p)

    db.commit()
    return {"ok": True}


@router.get("/{evento_id}/resumo", response_model=EventoResumo)
def resumo_evento(evento_id: int, db: Session = Depends(get_db)):
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")

    parts = db.query(EventoParticipante).filter(EventoParticipante.evento_id == evento_id).all()

    pagos = sum(1 for p in parts if p.valor and p.valor_pago and p.valor_pago >= p.valor)
    parciais = sum(1 for p in parts if p.valor_pago and p.valor and 0 < p.valor_pago < p.valor)
    pendentes = sum(1 for p in parts if not p.valor_pago)
    valor_arrecadado = sum(p.valor_pago or 0 for p in parts)
    valor_esperado = sum(p.valor or 0 for p in parts)

    meta = e.meta_arrecadacao or 0
    pct = (valor_arrecadado / meta * 100) if meta > 0 else 0.0

    return EventoResumo(
        total_participantes=len(parts),
        pagos=pagos,
        parciais=parciais,
        pendentes=pendentes,
        valor_arrecadado=valor_arrecadado,
        valor_esperado=valor_esperado,
        percentual_meta=round(pct, 1),
        meta_arrecadacao=meta,
    )
