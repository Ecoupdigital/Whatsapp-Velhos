"""Testes do Portal de Transparencia publico (GET /api/portal).

Scaffold criado no plano 01-001 (schemas + seed). Os testes de endpoint
completos (200 sem token, shape, privacidade, regras de negocio) vivem aqui
e sao preenchidos no plano 01-003.

A fixture seed_portal_data popula o banco in-memory (db_engine do conftest)
com dados deterministicos: 2 contas ativas, transacoes (entrada/saida),
mensalidades atrasadas, 1 evento concluido com participantes pagantes,
1 evento cancelado (nao deve aparecer), jogos realizados e futuros.
"""
import json
from datetime import datetime

import pytest

from models import (
    Conta, Transacao, Mensalidade, Jogador,
    Evento, EventoParticipante, Jogo, Configuracao,
)


def _hoje():
    return datetime.now().strftime("%Y-%m-%d")


def _mes_corrente():
    return datetime.now().strftime("%Y-%m")


@pytest.fixture()
def seed_portal_data(TestingSession):
    """Popula o banco com um cenario deterministico e devolve um dict de esperados."""
    db = TestingSession()
    try:
        mes = _mes_corrente()
        hoje = _hoje()

        # --- Config ---
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))

        # --- Contas ativas (saldo_inicial) ---
        c1 = Conta(nome="Caixa", tipo="dinheiro", saldo_inicial=100.0, ativo=1)
        c2 = Conta(nome="Banco", tipo="banco", saldo_inicial=50.0, ativo=1)
        c_inativa = Conta(nome="Velha", tipo="dinheiro", saldo_inicial=999.0, ativo=0)
        db.add_all([c1, c2, c_inativa])
        db.flush()

        # --- Transacoes (historico + mes corrente) ---
        # Conta 1: +300 entrada (mes corrente), -50 saida (mes corrente)
        db.add(Transacao(tipo="entrada", categoria="mensalidade", descricao="x",
                         valor=300.0, data=f"{mes}-05", conta_id=c1.id))
        db.add(Transacao(tipo="saida", categoria="material", descricao="y",
                         valor=50.0, data=f"{mes}-06", conta_id=c1.id))
        # Conta 2: +200 entrada (mes corrente)
        db.add(Transacao(tipo="entrada", categoria="evento", descricao="z",
                         valor=200.0, data=f"{mes}-07", conta_id=c2.id))
        # Historico antigo (nao conta no mes): +1000 entrada, -400 saida em 2025-01
        db.add(Transacao(tipo="entrada", categoria="doacao", descricao="hist",
                         valor=1000.0, data="2025-01-10", conta_id=c1.id))
        db.add(Transacao(tipo="saida", categoria="custo", descricao="hist",
                         valor=400.0, data="2025-01-15", conta_id=c1.id))

        # --- Jogadores + mensalidades atrasadas (mes corrente) ---
        j1 = Jogador(nome="Carlao", tipo="jogador", ativo=1)
        j2 = Jogador(nome="Pedrinho", tipo="jogador", ativo=1)
        db.add_all([j1, j2])
        db.flush()
        # 2 mensalidades atrasadas no mes corrente, 2 jogadores distintos
        db.add(Mensalidade(jogador_id=j1.id, mes_referencia=mes, valor=50.0,
                           status="atrasado"))
        db.add(Mensalidade(jogador_id=j2.id, mes_referencia=mes, valor=50.0,
                           status="atrasado"))
        # 1 mensalidade paga (nao conta) e 1 atrasada de mes antigo (nao conta)
        db.add(Mensalidade(jogador_id=j1.id, mes_referencia="2025-01", valor=50.0,
                           status="atrasado"))

        # --- Evento concluido com arrecadacao e custo_real ---
        ev_ok = Evento(tipo="confraternizacao", titulo="Galeto Junho",
                       data_inicio=hoje, status="concluido",
                       custo_estimado=300.0, custo_real=200.0)
        # --- Evento cancelado (NAO deve aparecer) ---
        ev_cancel = Evento(tipo="baile", titulo="Baile Cancelado",
                           data_inicio=hoje, status="cancelado",
                           custo_estimado=100.0, custo_real=0.0)
        # --- Evento planejado SEM arrecadacao (NAO deve aparecer) ---
        ev_plan_vazio = Evento(tipo="viagem", titulo="Viagem Futura",
                               data_inicio=hoje, status="planejado",
                               custo_estimado=500.0, custo_real=0.0)
        db.add_all([ev_ok, ev_cancel, ev_plan_vazio])
        db.flush()
        # Participantes pagantes do evento concluido: 250 + 150 = 400 arrecadado
        db.add(EventoParticipante(evento_id=ev_ok.id, jogador_id=j1.id,
                                  status="confirmado", valor=250.0, valor_pago=250.0))
        db.add(EventoParticipante(evento_id=ev_ok.id, jogador_id=j2.id,
                                  status="confirmado", valor=150.0, valor_pago=150.0))

        # --- Jogos: 1 vitoria (realizado), 1 derrota (realizado), 1 futuro ---
        db.add(Jogo(data="2025-05-01", adversario="Time A", gols_favor=3,
                    gols_contra=1, realizado=1, gols_descricao="Carlao (2), Pedrinho",
                    assistencias="Silver", destaque="Carlao"))
        db.add(Jogo(data="2025-05-10", adversario="Time B", gols_favor=0,
                    gols_contra=2, realizado=1))
        # futuro: data >= hoje, realizado=0
        db.add(Jogo(data="2099-12-31", adversario="Time C", horario="15:00",
                    local="Estadio", gols_favor=0, gols_contra=0, realizado=0))

        db.commit()

        return {
            "saldo_atual": 100.0 + 300.0 - 50.0 + 1000.0 - 400.0 + 50.0 + 200.0,  # c1=950, c2=250 => 1200
            "total_entrou": 300.0 + 200.0 + 1000.0,   # 1500
            "total_saiu": 50.0 + 400.0,                # 450
            "entrou_mes": 300.0 + 200.0,               # 500
            "saiu_mes": 50.0,                          # 50
            "atrasos_mensalidades": 2,
            "atrasos_jogadores": 2,
            "evento_ok_arrecadado": 400.0,
            "evento_ok_custo": 200.0,
            "evento_ok_liquido": 200.0,
            "nomes_jogadores": ["Carlao", "Pedrinho"],
        }
    finally:
        db.close()


def test_schemas_portal_importam_e_shape_topo():
    from schemas import PortalResponse
    assert set(PortalResponse.model_fields.keys()) == {"meta", "caixa", "eventos", "jogos"}
