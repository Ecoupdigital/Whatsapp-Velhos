"""Origem dos lancamentos: grava transacoes.origem sem mexer nas rotas.

get_current_user marca a sessao do banco (db.info["origem"] = "app" | "agente").
Antes de gravar, toda Transacao nova sem origem recebe a da sessao; sem marca
(scheduler, scripts) fica "app". A importacao de extrato grava "importacao" direto.
"""
from sqlalchemy import event
from sqlalchemy.orm import Session

from models import Transacao

ORIGENS = ("app", "agente", "importacao")


@event.listens_for(Session, "before_flush")
def _carimbar_origem(session, flush_context, instances):
    origem = session.info.get("origem") or "app"
    for obj in session.new:
        if isinstance(obj, Transacao) and not obj.origem:
            obj.origem = origem
