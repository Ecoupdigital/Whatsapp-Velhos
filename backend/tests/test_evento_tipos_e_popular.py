"""Testes para API-04, API-05, API-07.

- API-07: tipos_item no Evento (criar, GET, PUT)
- API-04: popular_elenco cria 1 faixa numerada por jogador com recebidos derivado
- API-05: atualizar_cartoes ignora qtd_cartoes_recebidos do payload (derivado de faixas)
"""
from models import Jogador


def test_criar_e_atualizar_tipos_item(client):
    # API-07: criar evento com tipos_item, GET retorna lista, PUT altera
    r = client.post("/api/eventos", json={
        "tipo": "galeto", "titulo": "Galeto API", "tipos_item": ["cru", "assado"]})
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    assert r.json()["tipos_item"] == ["cru", "assado"]

    g = client.get(f"/api/eventos/{eid}")
    assert g.json()["tipos_item"] == ["cru", "assado"]

    u = client.put(f"/api/eventos/{eid}", json={"tipos_item": ["cru", "assado", "frango"]})
    assert u.status_code == 200, u.text
    assert u.json()["tipos_item"] == ["cru", "assado", "frango"]


def test_evento_sem_tipos_item_retorna_none(client):
    r = client.post("/api/eventos", json={"tipo": "viagem", "titulo": "Viagem"})
    assert r.status_code == 201
    assert r.json()["tipos_item"] is None


def test_popular_elenco_cria_faixa_por_jogador(client, TestingSession):
    # API-04: popular cria faixa numerada; recebidos derivado
    db = TestingSession()
    db.add(Jogador(nome="Atleta1", tipo="jogador", ativo=1))
    db.add(Jogador(nome="Socio1", tipo="socio", ativo=1))
    db.commit()
    db.close()

    r = client.post("/api/eventos", json={
        "tipo": "galeto", "titulo": "Galeto Popular",
        "qtd_cartoes_padrao_jogador": 10, "qtd_cartoes_padrao_socio": 5,
        "valor_cartao": 20})
    eid = r.json()["id"]

    pop = client.post(f"/api/eventos/{eid}/popular")
    assert pop.status_code == 200, pop.text
    parts = pop.json()
    assert len(parts) == 2
    for p in parts:
        assert len(p["faixas"]) == 1
        assert p["faixas"][0]["sem_numero"] is False
        # recebidos == quantidade da faixa
        assert p["qtd_cartoes_recebidos"] == p["faixas"][0]["quantidade"]
    # numeros nao colidem entre os dois
    todos = sorted([(p["faixas"][0]["numero_inicio"], p["faixas"][0]["numero_fim"]) for p in parts])
    assert todos[0][1] < todos[1][0]


def test_atualizar_cartoes_ignora_recebidos_do_payload(client, participante, TestingSession):
    # API-05: payload qtd_cartoes_recebidos nao define recebidos (vem das faixas)
    evento_id, pid = participante
    # cria faixa de 10 via API de faixas
    client.post(f"/api/eventos/{evento_id}/participantes/{pid}/faixas",
                json={"numero_inicio": 1, "numero_fim": 10})
    # tenta forcar recebidos=999 e vender 5
    r = client.put(f"/api/eventos/{evento_id}/participantes/{pid}/cartoes",
                   json={"qtd_cartoes_recebidos": 999, "qtd_vendidos": 5})
    assert r.status_code == 200, r.text
    assert r.json()["qtd_cartoes_recebidos"] == 10  # derivado das faixas, ignora 999
    assert r.json()["qtd_vendidos"] == 5


def test_atualizar_cartoes_reconciliacao_400(client, participante):
    evento_id, pid = participante
    client.post(f"/api/eventos/{evento_id}/participantes/{pid}/faixas",
                json={"numero_inicio": 1, "numero_fim": 5})
    r = client.put(f"/api/eventos/{evento_id}/participantes/{pid}/cartoes",
                   json={"qtd_vendidos": 8})  # 8 > 5 recebidos
    assert r.status_code == 400
