import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from datetime import datetime

from database import get_db
from models import Evento, EventoParticipante, EventoParticipanteItem, Jogador, Transacao, EventoCartaoFaixa
from schemas import (
    EventoCreate, EventoUpdate, EventoOut,
    ParticipanteUpdate, ParticipanteOut,
    ParticipanteAvulsoCreate,
    PagamentoCreate, PagamentoOut,
    EventoResumo,
    CartoesUpdate,
    FaixaCreate, FaixaUpdate, FaixaOut,
    ItensUpdate, ItemOut,
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
    payload = data.model_dump()
    if payload.get("tipos_item") is not None:
        payload["tipos_item"] = json.dumps(payload["tipos_item"])
    e = Evento(**payload)
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
    updates = data.model_dump(exclude_unset=True)
    if "tipos_item" in updates:
        updates["tipos_item"] = json.dumps(updates["tipos_item"]) if updates["tipos_item"] is not None else None
    for field, value in updates.items():
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


def _proximo_numero(db: Session, evento_id: int) -> int:
    """Proximo numero disponivel: max entre numero_fim legado (participante) e das faixas."""
    max_part = (
        db.query(func.max(EventoParticipante.numero_fim))
        .filter(EventoParticipante.evento_id == evento_id)
        .scalar()
    )
    max_faixa = (
        db.query(func.max(EventoCartaoFaixa.numero_fim))
        .join(EventoParticipante, EventoParticipante.id == EventoCartaoFaixa.evento_participante_id)
        .filter(EventoParticipante.evento_id == evento_id)
        .scalar()
    )
    return max(max_part or 0, max_faixa or 0) + 1


def _recalcular_valor_esperado(p: EventoParticipante, evento: Evento):
    """Valor esperado = vendidos*valor_cartao + pagou_custo*custo_cartao."""
    if evento.valor_cartao or evento.custo_cartao:
        valor = (
            (p.qtd_vendidos or 0) * (evento.valor_cartao or 0)
            + (p.qtd_pagou_custo or 0) * (evento.custo_cartao or 0)
        )
        p.valor = float(valor)


def _recalc_recebidos(p: EventoParticipante):
    """Recebidos e DERIVADO da soma das faixas. Cliente nunca dita esse valor."""
    p.qtd_cartoes_recebidos = sum(f.quantidade or 0 for f in p.faixas)


def _validar_reconciliacao(p: EventoParticipante):
    total_destino = (p.qtd_vendidos or 0) + (p.qtd_devolvidos or 0) + (p.qtd_pagou_custo or 0)
    if total_destino > (p.qtd_cartoes_recebidos or 0):
        raise HTTPException(
            status_code=400,
            detail=f"Soma vendidos+devolvidos+pagou_custo ({total_destino}) excede recebidos ({p.qtd_cartoes_recebidos})",
        )


@router.post("/{evento_id}/popular", response_model=list[ParticipanteOut])
def popular_elenco(evento_id: int, db: Session = Depends(get_db)):
    """Adiciona todos jogadores ativos ao evento com valor + cartoes padrao."""
    e = db.query(Evento).filter(Evento.id == evento_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evento nao encontrado")

    jogadores = db.query(Jogador).filter(Jogador.ativo == 1).all()
    proximo = _proximo_numero(db, evento_id)

    for j in jogadores:
        existing = db.query(EventoParticipante).filter(
            EventoParticipante.evento_id == evento_id,
            EventoParticipante.jogador_id == j.id,
        ).first()
        if existing:
            continue

        is_socio = j.tipo == "socio"
        qtd = (e.qtd_cartoes_padrao_socio if is_socio else e.qtd_cartoes_padrao_jogador) or 0

        # Valor padrao: por valor fixo OU por cartoes (se valor_cartao definido)
        if e.valor_cartao and qtd > 0:
            # Valor presume que vai vender tudo
            valor = qtd * e.valor_cartao
        else:
            valor = (e.valor_socio if is_socio else e.valor_jogador) or 0

        numero_ini = None
        numero_f = None
        if qtd > 0:
            numero_ini = proximo
            numero_f = proximo + qtd - 1
            proximo = numero_f + 1

        p = EventoParticipante(
            evento_id=evento_id,
            jogador_id=j.id,
            valor=valor,
            valor_pago=0,
            status="pendente",
            pago=0,
            qtd_cartoes_recebidos=qtd,
            numero_inicio=numero_ini,
            numero_fim=numero_f,
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


@router.put("/{evento_id}/participantes/{participante_id}/cartoes", response_model=ParticipanteOut)
def atualizar_cartoes(
    evento_id: int,
    participante_id: int,
    data: CartoesUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza cartoes do participante e recalcula valor esperado."""
    p = (
        db.query(EventoParticipante)
        .options(joinedload(EventoParticipante.evento), joinedload(EventoParticipante.jogador))
        .filter(
            EventoParticipante.id == participante_id,
            EventoParticipante.evento_id == evento_id,
        )
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Participante nao encontrado")

    payload = data.model_dump(exclude_unset=True)

    # Auto-ajusta numero_fim se mudou qtd_recebidos e tem numero_inicio
    if "qtd_cartoes_recebidos" in payload:
        novo_qtd = payload["qtd_cartoes_recebidos"] or 0
        if novo_qtd > 0 and p.numero_inicio is None and "numero_inicio" not in payload:
            # Auto-numerar a partir do proximo disponivel
            proximo = _proximo_numero(db, evento_id)
            payload["numero_inicio"] = proximo
            payload["numero_fim"] = proximo + novo_qtd - 1
        elif novo_qtd > 0 and p.numero_inicio is not None and "numero_fim" not in payload:
            payload["numero_fim"] = p.numero_inicio + novo_qtd - 1

    for field, value in payload.items():
        setattr(p, field, value)

    # Validacao reconciliacao: vendidos + devolvidos + pagou_custo <= recebidos
    total_destino = (p.qtd_vendidos or 0) + (p.qtd_devolvidos or 0) + (p.qtd_pagou_custo or 0)
    if total_destino > (p.qtd_cartoes_recebidos or 0):
        raise HTTPException(
            status_code=400,
            detail=f"Soma vendidos+devolvidos+pagou_custo ({total_destino}) excede recebidos ({p.qtd_cartoes_recebidos})",
        )

    if p.evento:
        _recalcular_valor_esperado(p, p.evento)

    # Recalcula status pago derivado
    p.pago = 1 if p.valor and p.valor_pago and p.valor_pago >= p.valor else 0

    db.commit()
    db.refresh(p)
    return p


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


# ─── Helpers de participante e faixas ────────────────────────────

def _carregar_participante(db: Session, evento_id: int, participante_id: int) -> EventoParticipante:
    p = (
        db.query(EventoParticipante)
        .options(
            joinedload(EventoParticipante.evento),
            joinedload(EventoParticipante.jogador),
            selectinload(EventoParticipante.faixas),
            selectinload(EventoParticipante.itens),
        )
        .filter(
            EventoParticipante.id == participante_id,
            EventoParticipante.evento_id == evento_id,
        )
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Participante nao encontrado")
    return p


def _tipos_do_evento(evento: Evento) -> list[str]:
    """Desserializa tipos_item do evento (Text JSON). Retorna lista vazia se ausente/invalido."""
    raw = getattr(evento, "tipos_item", None)
    if not raw:
        return []
    try:
        val = json.loads(raw) if isinstance(raw, str) else raw
        return val if isinstance(val, list) else []
    except (ValueError, TypeError):
        return []


def _aplicar_dados_faixa(f: EventoCartaoFaixa, sem_numero: bool, numero_inicio, numero_fim, quantidade):
    """Valida e seta campos da faixa segundo as regras de dominio (400 em erro)."""
    if sem_numero:
        if not quantidade or quantidade < 1:
            raise HTTPException(status_code=400, detail="Lote sem numero exige quantidade >= 1")
        f.sem_numero = 1
        f.numero_inicio = None
        f.numero_fim = None
        f.quantidade = quantidade
    else:
        if numero_inicio is None or numero_fim is None:
            raise HTTPException(status_code=400, detail="Faixa numerada exige numero_inicio e numero_fim")
        if numero_fim < numero_inicio:
            raise HTTPException(status_code=400, detail="numero_fim deve ser >= numero_inicio")
        f.sem_numero = 0
        f.numero_inicio = numero_inicio
        f.numero_fim = numero_fim
        f.quantidade = numero_fim - numero_inicio + 1  # servidor recalcula, ignora qtd enviada


def _pos_mutacao_faixa(db: Session, p: EventoParticipante):
    """Cadeia padrao apos mutar faixas: recalc recebidos -> reconciliacao -> valor -> pago -> commit."""
    db.flush()  # garante que faixas adicionadas/removidas refletem em p.faixas
    db.refresh(p)
    _recalc_recebidos(p)
    _validar_reconciliacao(p)
    if p.evento:
        _recalcular_valor_esperado(p, p.evento)
    p.pago = 1 if p.valor and p.valor_pago and p.valor_pago >= p.valor else 0
    db.commit()
    db.refresh(p)


# ─── Participante singular (API-10) ──────────────────────────────

@router.get("/{evento_id}/participantes/{participante_id}", response_model=ParticipanteOut)
def detalhe_participante(evento_id: int, participante_id: int, db: Session = Depends(get_db)):
    """Refetch granular de UM participante (jogador + faixas + itens). Usado pelo grid inline da Fase 3."""
    return _carregar_participante(db, evento_id, participante_id)


# ─── CRUD de faixas (API-01, API-02, API-08) ─────────────────────

@router.get("/{evento_id}/participantes/{participante_id}/faixas", response_model=list[FaixaOut])
def listar_faixas(evento_id: int, participante_id: int, db: Session = Depends(get_db)):
    p = _carregar_participante(db, evento_id, participante_id)
    return (
        db.query(EventoCartaoFaixa)
        .filter(EventoCartaoFaixa.evento_participante_id == p.id)
        .order_by(EventoCartaoFaixa.id)
        .all()
    )


@router.post("/{evento_id}/participantes/{participante_id}/faixas", response_model=ParticipanteOut, status_code=201)
def criar_faixa(evento_id: int, participante_id: int, data: FaixaCreate, db: Session = Depends(get_db)):
    p = _carregar_participante(db, evento_id, participante_id)
    f = EventoCartaoFaixa(evento_participante_id=p.id)
    _aplicar_dados_faixa(f, data.sem_numero, data.numero_inicio, data.numero_fim, data.quantidade)
    db.add(f)
    _pos_mutacao_faixa(db, p)
    return p


@router.put("/{evento_id}/participantes/{participante_id}/faixas/{faixa_id}", response_model=ParticipanteOut)
def atualizar_faixa(evento_id: int, participante_id: int, faixa_id: int, data: FaixaUpdate, db: Session = Depends(get_db)):
    p = _carregar_participante(db, evento_id, participante_id)
    f = db.query(EventoCartaoFaixa).filter(
        EventoCartaoFaixa.id == faixa_id,
        EventoCartaoFaixa.evento_participante_id == p.id,
    ).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faixa nao encontrada")
    # merge: valores ausentes no payload mantem o atual da faixa
    sem_numero = data.sem_numero if data.sem_numero is not None else bool(f.sem_numero)
    numero_inicio = data.numero_inicio if data.numero_inicio is not None else f.numero_inicio
    numero_fim = data.numero_fim if data.numero_fim is not None else f.numero_fim
    quantidade = data.quantidade if data.quantidade is not None else f.quantidade
    _aplicar_dados_faixa(f, sem_numero, numero_inicio, numero_fim, quantidade)
    _pos_mutacao_faixa(db, p)
    return p


@router.delete("/{evento_id}/participantes/{participante_id}/faixas/{faixa_id}", response_model=ParticipanteOut)
def remover_faixa(evento_id: int, participante_id: int, faixa_id: int, db: Session = Depends(get_db)):
    p = _carregar_participante(db, evento_id, participante_id)
    f = db.query(EventoCartaoFaixa).filter(
        EventoCartaoFaixa.id == faixa_id,
        EventoCartaoFaixa.evento_participante_id == p.id,
    ).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faixa nao encontrada")
    db.delete(f)
    _pos_mutacao_faixa(db, p)  # se recebidos < vendidos+dev+custo -> 400 e rollback
    return p


# ─── Itens por tipo (cru/assado) ──────────────────────────────────

@router.get("/{evento_id}/participantes/{participante_id}/itens", response_model=list[ItemOut])
def listar_itens(evento_id: int, participante_id: int, db: Session = Depends(get_db)):
    p = _carregar_participante(db, evento_id, participante_id)
    return (
        db.query(EventoParticipanteItem)
        .filter(EventoParticipanteItem.evento_participante_id == p.id)
        .order_by(EventoParticipanteItem.id)
        .all()
    )


@router.put("/{evento_id}/participantes/{participante_id}/itens", response_model=ParticipanteOut)
def atualizar_itens(
    evento_id: int,
    participante_id: int,
    data: ItensUpdate,
    db: Session = Depends(get_db),
):
    """Substituicao total dos itens por tipo do participante.

    - Valida que cada tipo pertence a evento.tipos_item (se o evento define tipos).
    - Upsert por (participante, tipo); tipos omitidos no payload sao REMOVIDOS.
    - Fechamento: sum(qtd_vendido) deve ser igual a p.qtd_vendidos (400 senao).
    - qtd_pedido e livre (sem validacao de soma).
    """
    p = _carregar_participante(db, evento_id, participante_id)

    tipos_validos = _tipos_do_evento(p.evento) if p.evento else []

    # 1. Validar tipos e duplicidade no payload
    vistos: set[str] = set()
    for it in data.itens:
        if tipos_validos and it.tipo not in tipos_validos:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo '{it.tipo}' nao pertence aos tipos do evento ({tipos_validos})",
            )
        if it.tipo in vistos:
            raise HTTPException(status_code=400, detail=f"Tipo '{it.tipo}' duplicado no payload")
        vistos.add(it.tipo)

    # 2. Validar fechamento de vendidos
    soma_vendido = sum(it.qtd_vendido or 0 for it in data.itens)
    if soma_vendido != (p.qtd_vendidos or 0):
        raise HTTPException(
            status_code=400,
            detail=f"Soma dos vendidos por tipo ({soma_vendido}) deve bater com vendidos do participante ({p.qtd_vendidos or 0})",
        )

    # 3. Substituicao total: indexar existentes, upsert presentes, remover ausentes
    existentes = {
        i.tipo: i
        for i in db.query(EventoParticipanteItem).filter(
            EventoParticipanteItem.evento_participante_id == p.id
        ).all()
    }
    novos_tipos = {it.tipo for it in data.itens}
    for tipo, item in existentes.items():
        if tipo not in novos_tipos:
            db.delete(item)
    for it in data.itens:
        if it.tipo in existentes:
            existentes[it.tipo].qtd_vendido = it.qtd_vendido
            existentes[it.tipo].qtd_pedido = it.qtd_pedido
        else:
            db.add(EventoParticipanteItem(
                evento_participante_id=p.id,
                tipo=it.tipo,
                qtd_vendido=it.qtd_vendido,
                qtd_pedido=it.qtd_pedido,
            ))

    db.commit()
    db.refresh(p)
    return p


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

    cartoes_emitidos = sum(p.qtd_cartoes_recebidos or 0 for p in parts)
    cartoes_vendidos = sum(p.qtd_vendidos or 0 for p in parts)
    cartoes_devolvidos = sum(p.qtd_devolvidos or 0 for p in parts)
    cartoes_pagou_custo = sum(p.qtd_pagou_custo or 0 for p in parts)
    proximo_num = _proximo_numero(db, evento_id)

    return EventoResumo(
        total_participantes=len(parts),
        pagos=pagos,
        parciais=parciais,
        pendentes=pendentes,
        valor_arrecadado=valor_arrecadado,
        valor_esperado=valor_esperado,
        percentual_meta=round(pct, 1),
        meta_arrecadacao=meta,
        cartoes_emitidos=cartoes_emitidos,
        cartoes_vendidos=cartoes_vendidos,
        cartoes_devolvidos=cartoes_devolvidos,
        cartoes_pagou_custo=cartoes_pagou_custo,
        proximo_numero=proximo_num,
    )
