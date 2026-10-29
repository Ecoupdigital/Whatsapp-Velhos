"""Regra unica de quitar mensalidade: usada pela tela (PUT /api/mensalidades/{id})
e pela importacao de extrato. Nao duplique esta logica em outro lugar."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models import Jogador, Mensalidade, Transacao


def sincronizar_transacao_mensalidade(db: Session, m: Mensalidade) -> Optional[Transacao]:
    """Deixa o caixa igual ao status da mensalidade.

    Pago com valor: cria ou atualiza a transacao de entrada da mensalidade (uma por
    mensalidade). Outro status: apaga a transacao associada (estorno).
    Devolve a transacao viva, ou None. Nao faz commit.
    """
    existing_tx = db.query(Transacao).filter(Transacao.mensalidade_id == m.id).first()

    if m.status == "pago" and m.valor_pago:
        jogador = db.query(Jogador).filter(Jogador.id == m.jogador_id).first()
        nome = jogador.apelido or jogador.nome if jogador else "Desconhecido"
        descricao = f"Mensalidade {m.mes_referencia} - {nome}"
        data_tx = m.data_pagamento or datetime.now().strftime("%Y-%m-%d")

        if existing_tx:
            existing_tx.valor = m.valor_pago
            existing_tx.data = data_tx
            existing_tx.descricao = descricao
            existing_tx.conta_id = m.conta_id
            existing_tx.jogador_id = m.jogador_id
            return existing_tx
        tx = Transacao(
            tipo="entrada",
            categoria="mensalidade",
            descricao=descricao,
            valor=m.valor_pago,
            data=data_tx,
            jogador_id=m.jogador_id,
            conta_id=m.conta_id,
            mensalidade_id=m.id,
        )
        db.add(tx)
        return tx

    if m.status != "pago" and existing_tx:
        db.delete(existing_tx)
    return None
