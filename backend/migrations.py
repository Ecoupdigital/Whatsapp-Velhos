"""Migracoes aditivas idempotentes rodadas no boot (main.py), apos create_all.

Regras (MIG-03/MIG-05):
- Estritamente aditivo: nunca DROP nem rename de tabela/coluna existente.
- Portavel Postgres + SQLite: ADD COLUMN ... TEXT, sem IF NOT EXISTS, JSON como Text.
- Idempotente: checa via inspect() antes de alterar; backfill so toca participante sem faixa.
"""
import logging

from sqlalchemy import inspect, text
from sqlalchemy.orm import sessionmaker

log = logging.getLogger(__name__)


def _add_column_tipos_item(engine):
    """ADD COLUMN eventos.tipos_item TEXT, somente se ainda nao existe.

    Portavel Postgres+SQLite (sem IF NOT EXISTS). Idempotente via inspect().
    """
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("eventos")]
    if "tipos_item" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE eventos ADD COLUMN tipos_item TEXT"))
        log.info("migrations: coluna eventos.tipos_item adicionada")
    else:
        log.info("migrations: eventos.tipos_item ja existe, pulando ADD COLUMN")


def _backfill_faixas(engine):
    """Cria 1 faixa por participante legado que ainda NAO tem faixa.

    Idempotencia (TEST-06): so processa participante com COUNT(faixas)==0.
    Regras (MIG-02/MIG-04):
      - tem numero_inicio E numero_fim -> 1 faixa numerada, qtd = fim-ini+1
      - senao, qtd_cartoes_recebidos > 0 -> 1 faixa sem_numero=1, qtd = recebidos
      - senao -> nenhuma faixa
    Garante sum(faixas.quantidade) == qtd_cartoes_recebidos legado por participante.
    """
    from models import EventoParticipante, EventoCartaoFaixa

    Session = sessionmaker(bind=engine)
    db = Session()
    criadas = 0
    try:
        parts = db.query(EventoParticipante).all()
        for p in parts:
            ja_tem = (
                db.query(EventoCartaoFaixa)
                .filter(EventoCartaoFaixa.evento_participante_id == p.id)
                .count()
            )
            if ja_tem:
                continue
            if p.numero_inicio is not None and p.numero_fim is not None:
                qtd = p.numero_fim - p.numero_inicio + 1
                db.add(EventoCartaoFaixa(
                    evento_participante_id=p.id,
                    numero_inicio=p.numero_inicio,
                    numero_fim=p.numero_fim,
                    quantidade=qtd,
                    sem_numero=0,
                ))
                criadas += 1
            elif (p.qtd_cartoes_recebidos or 0) > 0:
                db.add(EventoCartaoFaixa(
                    evento_participante_id=p.id,
                    numero_inicio=None,
                    numero_fim=None,
                    quantidade=p.qtd_cartoes_recebidos,
                    sem_numero=1,
                ))
                criadas += 1
        db.commit()
        log.info("migrations: backfill criou %d faixa(s)", criadas)
    finally:
        db.close()


def run_additive_migrations(engine):
    """Ponto de entrada chamado no boot apos Base.metadata.create_all.

    Ordem: (1) ADD COLUMN tipos_item, (2) backfill de faixas.
    Seguro rodar N vezes (idempotente).
    """
    _add_column_tipos_item(engine)
    _backfill_faixas(engine)
