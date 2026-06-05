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
    Evento, EventoParticipante, EventoParticipanteItem, Jogo, Configuracao,
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


# --- API-01 / API-02: responde 200 sem token, com as 4 chaves de topo ---

def test_portal_responde_200_sem_token(client, seed_portal_data):
    r = client.get("/api/portal")  # sem header Authorization
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body.keys()) == {"meta", "caixa", "eventos", "jogos"}


def test_portal_meta(client, seed_portal_data):
    body = client.get("/api/portal").json()
    assert body["meta"]["time_nome"] == "Velhos Parceiros F.C."
    assert isinstance(body["meta"]["atualizado_em"], str) and body["meta"]["atualizado_em"]


# --- API-03: bloco caixa ---

def test_portal_caixa_saldo_e_totais(client, seed_portal_data):
    exp = seed_portal_data
    caixa = client.get("/api/portal").json()["caixa"]
    assert caixa["saldo_atual"] == exp["saldo_atual"]
    assert caixa["total_entrou"] == exp["total_entrou"]
    assert caixa["total_saiu"] == exp["total_saiu"]
    assert caixa["entrou_mes"] == exp["entrou_mes"]
    assert caixa["saiu_mes"] == exp["saiu_mes"]


def test_portal_fluxo_12m_max_12_itens(client, seed_portal_data):
    fluxo = client.get("/api/portal").json()["caixa"]["fluxo_12m"]
    assert len(fluxo) <= 12
    # ordem cronologica asc
    meses = [f["mes"] for f in fluxo]
    assert meses == sorted(meses)
    for f in fluxo:
        assert set(f.keys()) == {"mes", "entradas", "saidas"}


# --- SEC-01: atrasos sao COUNT inteiros ---

def test_portal_atrasos_count_int(client, seed_portal_data):
    exp = seed_portal_data
    atrasos = client.get("/api/portal").json()["caixa"]["atrasos"]
    assert isinstance(atrasos["mensalidades"], int)
    assert isinstance(atrasos["jogadores"], int)
    assert atrasos["mensalidades"] == exp["atrasos_mensalidades"]   # 2
    assert atrasos["jogadores"] == exp["atrasos_jogadores"]         # 2
    # garante que nao virou bool (bool e subclasse de int em python)
    assert not isinstance(atrasos["mensalidades"], bool)


# --- API-04 / API-07: eventos (liquido + filtro) ---

def test_portal_evento_liquido_e_custo_origem(client, seed_portal_data):
    exp = seed_portal_data
    eventos = client.get("/api/portal").json()["eventos"]
    titulos = {e["titulo"] for e in eventos}
    # cancelado e planejado-sem-arrecadacao nao aparecem
    assert "Baile Cancelado" not in titulos
    assert "Viagem Futura" not in titulos
    assert "Galeto Junho" in titulos
    galeto = next(e for e in eventos if e["titulo"] == "Galeto Junho")
    assert galeto["arrecadado"] == exp["evento_ok_arrecadado"]   # 400
    assert galeto["custo"] == exp["evento_ok_custo"]             # 200 (custo_real > 0)
    assert galeto["custo_origem"] == "real"
    assert galeto["liquido"] == exp["evento_ok_liquido"]         # 200
    assert galeto["liquido"] == galeto["arrecadado"] - galeto["custo"]


# --- API-05: jogos ---

def test_portal_jogos_resumo_e_rankings(client, seed_portal_data):
    jogos = client.get("/api/portal").json()["jogos"]
    resumo = jogos["resumo"]
    # seed: 1 vitoria (3x1), 1 derrota (0x2)
    assert resumo["vitorias"] == 1
    assert resumo["empates"] == 0
    assert resumo["derrotas"] == 1
    assert resumo["gols_pro"] == 3
    assert resumo["gols_contra"] == 3
    # artilharia: Carlao (2), Pedrinho (1)
    art = {e["nome"]: e["quantidade"] for e in jogos["artilharia"]}
    assert art.get("Carlao") == 2
    assert art.get("Pedrinho") == 1
    # ranking ordenado desc
    qts = [e["quantidade"] for e in jogos["artilharia"]]
    assert qts == sorted(qts, reverse=True)


def test_portal_resultados_e_proximos(client, seed_portal_data):
    jogos = client.get("/api/portal").json()["jogos"]
    # ultimos_resultados: realizados, recentes primeiro, placar "GFxGC"
    placares = {r["adversario"]: r["placar"] for r in jogos["ultimos_resultados"]}
    assert placares["Time A"] == "3x1"
    assert placares["Time B"] == "0x2"
    datas = [r["data"] for r in jogos["ultimos_resultados"]]
    assert datas == sorted(datas, reverse=True)
    # proximos_jogos: futuro (2099) presente, com horario/local
    prox = {p["adversario"]: p for p in jogos["proximos_jogos"]}
    assert "Time C" in prox
    assert prox["Time C"]["horario"] == "15:00"
    assert prox["Time C"]["local"] == "Estadio"


# --- SEC-02 / SEC-03: trava de privacidade (varredura do payload) ---

def _coletar_strings(obj):
    """Coleta recursivamente todas as strings de um objeto JSON (dict/list/str)."""
    out = []
    if isinstance(obj, dict):
        for v in obj.values():
            out.extend(_coletar_strings(v))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(_coletar_strings(v))
    elif isinstance(obj, str):
        out.append(obj)
    return out


def _coletar_chaves(obj):
    """Coleta recursivamente todas as chaves de dict de um objeto JSON."""
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            out.append(k)
            out.extend(_coletar_chaves(v))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(_coletar_chaves(v))
    return out


def test_privacidade_nenhum_nome_de_jogador_fora_de_jogos(client, seed_portal_data):
    exp = seed_portal_data
    body = client.get("/api/portal").json()

    # remove o bloco jogos: nome de jogador em ranking e nome de adversario (time) sao permitidos la
    sem_jogos = {k: v for k, v in body.items() if k != "jogos"}
    strings_financeiras = _coletar_strings(sem_jogos)
    blob = " ".join(strings_financeiras)

    for nome in exp["nomes_jogadores"]:   # ["Carlao", "Pedrinho"]
        assert nome not in blob, (
            f"VAZAMENTO: nome de jogador '{nome}' apareceu em contexto financeiro: {strings_financeiras}"
        )


def test_privacidade_sem_chaves_de_pii_nem_registro_cru(client, seed_portal_data):
    body = client.get("/api/portal").json()
    chaves = set(_coletar_chaves(body))
    proibidas = {
        "telefone", "transacoes", "participantes", "mensalidades_lista",
        "jogador_id", "valor_pago", "data_pagamento", "forma_pagto",
        "nome_avulso", "apelido", "password_hash", "comprovante",
    }
    vazadas = chaves & proibidas
    assert not vazadas, f"chaves de PII/registro cru no payload: {vazadas}"


def test_privacidade_atrasos_sao_int_nunca_lista(client, seed_portal_data):
    atrasos = client.get("/api/portal").json()["caixa"]["atrasos"]
    assert set(atrasos.keys()) == {"mensalidades", "jogadores"}
    assert isinstance(atrasos["mensalidades"], int) and not isinstance(atrasos["mensalidades"], bool)
    assert isinstance(atrasos["jogadores"], int) and not isinstance(atrasos["jogadores"], bool)
    # nenhum valor de atrasos pode ser lista/dict
    assert not isinstance(atrasos["mensalidades"], (list, dict))
    assert not isinstance(atrasos["jogadores"], (list, dict))


# --- Regressao: correcoes de numeros publicos (code review) ---

def test_atrasos_conta_pendente_vencido(client, TestingSession):
    """#1: mensalidade 'pendente' do mes corrente ja vencida conta como atraso.

    O status 'atrasado' e materializado de forma lazy (so ao listar mensalidades);
    o portal nao pode subnotificar inadimplencia esperando essa materializacao.
    """
    db = TestingSession()
    try:
        mes = _mes_corrente()
        # vencimento no dia 1: se hoje > dia 1, o mes corrente ja venceu
        db.add(Configuracao(chave="dia_vencimento", valor="1"))
        j = Jogador(nome="Fulano", tipo="jogador", ativo=1)
        db.add(j)
        db.flush()
        db.add(Mensalidade(jogador_id=j.id, mes_referencia=mes, valor=60.0, status="pendente"))
        db.commit()
    finally:
        db.close()

    atrasos = client.get("/api/portal").json()["caixa"]["atrasos"]
    if datetime.now().day > 1:  # mes ja venceu
        assert atrasos["mensalidades"] == 1  # pendente vencido entra no count
        assert atrasos["jogadores"] == 1
    else:  # dia 1: ainda nao venceu
        assert atrasos["mensalidades"] == 0


def test_totais_excluem_transferencia_interna(client, TestingSession):
    """#2: transferencia interna (par saida+entrada) nao infla total_entrou/total_saiu/fluxo."""
    db = TestingSession()
    try:
        mes = _mes_corrente()
        c1 = Conta(nome="Caixa", tipo="dinheiro", saldo_inicial=0.0, ativo=1)
        c2 = Conta(nome="Banco", tipo="banco", saldo_inicial=0.0, ativo=1)
        db.add_all([c1, c2])
        db.flush()
        # entrada real de 100
        db.add(Transacao(tipo="entrada", categoria="mensalidade", valor=100.0,
                         data=f"{mes}-05", conta_id=c1.id))
        # transferencia 100 c1 -> c2 (par saida+entrada que se anula)
        db.add(Transacao(tipo="saida", categoria="transferencia", valor=100.0,
                         data=f"{mes}-06", conta_id=c1.id))
        db.add(Transacao(tipo="entrada", categoria="transferencia", valor=100.0,
                         data=f"{mes}-06", conta_id=c2.id))
        db.commit()
    finally:
        db.close()

    caixa = client.get("/api/portal").json()["caixa"]
    assert caixa["total_entrou"] == 100.0   # so a entrada real
    assert caixa["total_saiu"] == 0.0        # transferencia nao conta como saida
    assert caixa["entrou_mes"] == 100.0
    assert caixa["saiu_mes"] == 0.0
    mes_no_fluxo = [f for f in caixa["fluxo_12m"] if f["mes"] == mes]
    assert mes_no_fluxo and mes_no_fluxo[0]["entradas"] == 100.0
    assert mes_no_fluxo[0]["saidas"] == 0.0
    # saldo segue coerente (transferencia se anula entre contas ativas)
    assert caixa["saldo_atual"] == 100.0


def test_gols_nulos_nao_quebram_resumo(client, TestingSession):
    """#3: jogo realizado com placar NULL nao derruba o endpoint publico (coalesce)."""
    db = TestingSession()
    try:
        db.add(Jogo(data="2025-03-01", adversario="Sem Placar",
                    gols_favor=None, gols_contra=None, realizado=1))
        db.add(Jogo(data="2025-03-02", adversario="Normal",
                    gols_favor=2, gols_contra=0, realizado=1))
        db.commit()
    finally:
        db.close()

    r = client.get("/api/portal")
    assert r.status_code == 200, r.text
    jogos = r.json()["jogos"]
    # jogo NULL tratado como 0x0 (empate); jogo normal 2x0 (vitoria)
    assert jogos["resumo"]["vitorias"] == 1
    assert jogos["resumo"]["empates"] == 1
    assert jogos["resumo"]["gols_pro"] == 2
    assert jogos["resumo"]["gols_contra"] == 0
    placares = {x["adversario"]: x["placar"] for x in jogos["ultimos_resultados"]}
    assert placares["Sem Placar"] == "0x0"


# --- Galeto: bloco de estatisticas de cartoes ---

@pytest.fixture()
def seed_galeto_com_tipos(TestingSession):
    """Evento com cartoes e split cru/assado. Fixture isolada do seed_portal_data."""
    db = TestingSession()
    try:
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))
        j1 = Jogador(nome="Zeus", tipo="jogador", ativo=1)
        j2 = Jogador(nome="Hera", tipo="jogador", ativo=1)
        db.add_all([j1, j2])
        db.flush()

        # Evento com tipos_item definido (cru + assado)
        ev = Evento(
            tipo="galeto",
            titulo="Galeto Teste",
            data_inicio="2026-05-15",
            status="concluido",
            custo_real=100.0,
            tipos_item='["cru","assado"]',
        )
        db.add(ev)
        db.flush()

        # p1: recebeu 10 cartoes, vendeu 6, devolveu 2; cru=4
        p1 = EventoParticipante(
            evento_id=ev.id, jogador_id=j1.id,
            status="confirmado", valor=60.0, valor_pago=60.0,
            qtd_cartoes_recebidos=10, qtd_vendidos=6, qtd_devolvidos=2,
        )
        # p2: recebeu 5 cartoes, vendeu 4, devolveu 1; cru=2
        p2 = EventoParticipante(
            evento_id=ev.id, jogador_id=j2.id,
            status="confirmado", valor=40.0, valor_pago=40.0,
            qtd_cartoes_recebidos=5, qtd_vendidos=4, qtd_devolvidos=1,
        )
        db.add_all([p1, p2])
        db.flush()

        # Itens por tipo: tipo "cru" = 4 (p1) + 2 (p2) = 6 total
        db.add(EventoParticipanteItem(evento_participante_id=p1.id, tipo="cru", qtd_vendido=4))
        db.add(EventoParticipanteItem(evento_participante_id=p2.id, tipo="cru", qtd_vendido=2))
        db.commit()

        return {
            "evento_titulo": "Galeto Teste",
            "emitidos": 15,    # 10 + 5
            "vendidos": 10,    # 6 + 4
            "devolvidos": 3,   # 2 + 1
            "cru_total": 6,    # 4 + 2
            "assado_total": 4, # vendidos(10) - cru(6)
        }
    finally:
        db.close()


def test_galeto_bloco_presente_com_cartoes(client, seed_galeto_com_tipos):
    """Evento com cartoes emitidos retorna bloco galeto com contagens corretas."""
    exp = seed_galeto_com_tipos
    eventos = client.get("/api/portal").json()["eventos"]
    ev = next((e for e in eventos if e["titulo"] == exp["evento_titulo"]), None)
    assert ev is not None, "Evento nao encontrado na resposta"
    galeto = ev.get("galeto")
    assert galeto is not None, "Campo galeto deve estar presente para evento com cartoes"
    assert galeto["emitidos"] == exp["emitidos"]
    assert galeto["vendidos"] == exp["vendidos"]
    assert galeto["devolvidos"] == exp["devolvidos"]


def test_galeto_por_tipo_cru_assado(client, seed_galeto_com_tipos):
    """Split por tipo (cru/assado) usa logica binaria complementar de resumo_evento."""
    exp = seed_galeto_com_tipos
    eventos = client.get("/api/portal").json()["eventos"]
    ev = next(e for e in eventos if e["titulo"] == exp["evento_titulo"])
    por_tipo = {t["nome"]: t["quantidade"] for t in ev["galeto"]["por_tipo"]}
    assert por_tipo.get("cru") == exp["cru_total"]      # 6
    assert por_tipo.get("assado") == exp["assado_total"]  # 4


def test_galeto_none_sem_cartoes(client, TestingSession):
    """Evento sem cartoes emitidos retorna galeto=None (UI nao renderiza bloco)."""
    db = TestingSession()
    try:
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))
        j = Jogador(nome="Fulano", tipo="jogador", ativo=1)
        db.add(j)
        db.flush()
        ev = Evento(
            tipo="churrasco",
            titulo="Churrasco Sem Cartao",
            data_inicio="2026-05-20",
            status="concluido",
            custo_real=50.0,
        )
        db.add(ev)
        db.flush()
        # Participante pagante mas sem qtd_cartoes_recebidos (emitidos=0)
        db.add(EventoParticipante(
            evento_id=ev.id, jogador_id=j.id,
            status="confirmado", valor=80.0, valor_pago=80.0,
            qtd_cartoes_recebidos=0, qtd_vendidos=0, qtd_devolvidos=0,
        ))
        db.commit()
    finally:
        db.close()

    eventos = client.get("/api/portal").json()["eventos"]
    ev_r = next((e for e in eventos if e["titulo"] == "Churrasco Sem Cartao"), None)
    assert ev_r is not None
    assert ev_r["galeto"] is None, "galeto deve ser None quando nao ha cartoes emitidos"


# --- mensalidades_geral: estatisticas gerais (todas as competencias) ---

def test_mensalidades_geral_shape(client, seed_portal_data):
    """Campo caixa.mensalidades existe com todas as chaves esperadas."""
    geral = client.get("/api/portal").json()["caixa"].get("mensalidades")
    assert geral is not None, "caixa.mensalidades deve estar presente"
    assert set(geral.keys()) == {
        "pagas", "em_atraso", "a_vencer", "isentas",
        "jogadores_total", "jogadores_em_dia", "jogadores_em_atraso",
    }
    for k, v in geral.items():
        assert isinstance(v, int) and not isinstance(v, bool), (
            f"campo {k} deve ser int, nao {type(v)}"
        )


def test_mensalidades_geral_mes_passado_pendente_eh_atraso(client, TestingSession):
    """Mensalidade de mes passado com status pendente conta como em_atraso."""
    db = TestingSession()
    try:
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))
        j = Jogador(nome="TesteMesPast", tipo="jogador", ativo=1)
        db.add(j)
        db.flush()
        # mes passado: sempre vencido independente do dia de vencimento
        db.add(Mensalidade(jogador_id=j.id, mes_referencia="2020-01", valor=50.0, status="pendente"))
        db.commit()
    finally:
        db.close()

    geral = client.get("/api/portal").json()["caixa"]["mensalidades"]
    assert geral["em_atraso"] == 1
    assert geral["a_vencer"] == 0
    assert geral["jogadores_em_atraso"] == 1


def test_mensalidades_geral_mes_atual_pendente_nao_vencido_eh_a_vencer(client, TestingSession):
    """Mensalidade do mes atual pendente, sem ter vencido, conta como a_vencer."""
    db = TestingSession()
    try:
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))
        # dia de vencimento = 28: na maioria dos dias de execucao nao venceu ainda.
        # Se hoje for > 28, o mes venceu e o teste adapta.
        db.add(Configuracao(chave="dia_vencimento", valor="28"))
        j = Jogador(nome="TesteMesAtual", tipo="jogador", ativo=1)
        db.add(j)
        db.flush()
        mes = _mes_corrente()
        db.add(Mensalidade(jogador_id=j.id, mes_referencia=mes, valor=50.0, status="pendente"))
        db.commit()
    finally:
        db.close()

    hoje = datetime.now().day
    geral = client.get("/api/portal").json()["caixa"]["mensalidades"]
    if hoje <= 28:
        assert geral["a_vencer"] == 1
        assert geral["em_atraso"] == 0
        assert geral["jogadores_em_dia"] == 1
        assert geral["jogadores_em_atraso"] == 0
    else:
        # 29/30/31 com dia_vencimento=28: mes venceu, pendente = em_atraso
        assert geral["em_atraso"] == 1
        assert geral["a_vencer"] == 0


def test_mensalidades_geral_pago_e_isento(client, TestingSession):
    """Status pago e isento contam em seus respectivos buckets, nunca em atraso."""
    db = TestingSession()
    try:
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))
        j1 = Jogador(nome="Pagador", tipo="jogador", ativo=1)
        j2 = Jogador(nome="Isento", tipo="jogador", ativo=1)
        db.add_all([j1, j2])
        db.flush()
        db.add(Mensalidade(jogador_id=j1.id, mes_referencia="2025-01", valor=50.0, status="pago"))
        db.add(Mensalidade(jogador_id=j2.id, mes_referencia="2025-01", valor=50.0, status="isento"))
        db.commit()
    finally:
        db.close()

    geral = client.get("/api/portal").json()["caixa"]["mensalidades"]
    assert geral["pagas"] == 1
    assert geral["isentas"] == 1
    assert geral["em_atraso"] == 0
    assert geral["a_vencer"] == 0


def test_mensalidades_geral_particao_em_dia_mais_em_atraso_igual_total(client, TestingSession):
    """Particao limpa: jogadores_em_dia + jogadores_em_atraso == jogadores_total."""
    db = TestingSession()
    try:
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))
        db.add(Configuracao(chave="dia_vencimento", valor="1"))
        j1 = Jogador(nome="Adimplente", tipo="jogador", ativo=1)
        j2 = Jogador(nome="Inadimplente", tipo="jogador", ativo=1)
        j3 = Jogador(nome="Isento", tipo="jogador", ativo=1)
        db.add_all([j1, j2, j3])
        db.flush()
        # j1: pago no mes passado -> em_dia
        db.add(Mensalidade(jogador_id=j1.id, mes_referencia="2020-01", valor=50.0, status="pago"))
        # j2: pendente no mes passado -> em_atraso (mes < mes_atual sempre vencido)
        db.add(Mensalidade(jogador_id=j2.id, mes_referencia="2020-01", valor=50.0, status="pendente"))
        # j3: isento no mes passado -> em_dia (isento nao e atraso)
        db.add(Mensalidade(jogador_id=j3.id, mes_referencia="2020-01", valor=0.0, status="isento"))
        db.commit()
    finally:
        db.close()

    geral = client.get("/api/portal").json()["caixa"]["mensalidades"]
    assert geral["jogadores_em_dia"] + geral["jogadores_em_atraso"] == geral["jogadores_total"]
    assert geral["jogadores_em_atraso"] == 1   # apenas j2
    assert geral["jogadores_em_dia"] == 2      # j1 e j3
    assert geral["jogadores_total"] == 3


def test_mensalidades_geral_jogador_com_1_atraso_so_em_atraso(client, TestingSession):
    """Jogador com ao menos 1 mensalidade em atraso cai apenas em jogadores_em_atraso."""
    db = TestingSession()
    try:
        db.add(Configuracao(chave="time_nome", valor="Velhos Parceiros F.C."))
        j = Jogador(nome="MistoJog", tipo="jogador", ativo=1)
        db.add(j)
        db.flush()
        # 1 mensalidade paga e 1 em atraso para o mesmo jogador
        db.add(Mensalidade(jogador_id=j.id, mes_referencia="2020-01", valor=50.0, status="pago"))
        db.add(Mensalidade(jogador_id=j.id, mes_referencia="2020-02", valor=50.0, status="atrasado"))
        db.commit()
    finally:
        db.close()

    geral = client.get("/api/portal").json()["caixa"]["mensalidades"]
    assert geral["jogadores_em_atraso"] == 1
    assert geral["jogadores_em_dia"] == 0  # tem pelo menos 1 atraso -> nao esta em_dia
    assert geral["jogadores_total"] == 1
