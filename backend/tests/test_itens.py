"""Testes API-03 / TEST-03: PUT itens por tipo (substituicao total + validacao de fechamento)."""
from models import EventoParticipante


def _set_vendidos(TestingSession, pid, n):
    db = TestingSession()
    p = db.get(EventoParticipante, pid)
    p.qtd_vendidos = n
    db.commit()
    db.close()


def test_split_parcial_ok(client, participante, TestingSession):
    # TEST-03: vendidos=10, split parcial cru=7 + assado=0 = 7 <= 10 -> 200 (faltam 3, OK)
    evento_id, pid = participante
    _set_vendidos(TestingSession, pid, 10)
    url = f"/api/eventos/{evento_id}/participantes/{pid}/itens"
    r = client.put(url, json={"itens": [
        {"tipo": "cru", "qtd_vendido": 7, "qtd_pedido": 0},
    ]})
    assert r.status_code == 200, r.text
    assert {i["tipo"]: i["qtd_vendido"] for i in r.json()["itens"]}["cru"] == 7


def test_split_que_excede_400(client, participante, TestingSession):
    # vendidos=10, split cru=8 + assado=6 = 14 > 10 -> 400 (so bloqueia se passar)
    evento_id, pid = participante
    _set_vendidos(TestingSession, pid, 10)
    url = f"/api/eventos/{evento_id}/participantes/{pid}/itens"
    r = client.put(url, json={"itens": [
        {"tipo": "cru", "qtd_vendido": 8, "qtd_pedido": 0},
        {"tipo": "assado", "qtd_vendido": 6, "qtd_pedido": 0},
    ]})
    assert r.status_code == 400, r.text
    assert "14" in r.json()["detail"] and "10" in r.json()["detail"]


def test_split_que_fecha_persiste(client, participante, TestingSession):
    evento_id, pid = participante
    _set_vendidos(TestingSession, pid, 10)
    url = f"/api/eventos/{evento_id}/participantes/{pid}/itens"
    r = client.put(url, json={"itens": [
        {"tipo": "cru", "qtd_vendido": 6, "qtd_pedido": 2},
        {"tipo": "assado", "qtd_vendido": 4, "qtd_pedido": 1},
    ]})
    assert r.status_code == 200, r.text
    itens = {i["tipo"]: i for i in r.json()["itens"]}
    assert itens["cru"]["qtd_vendido"] == 6
    assert itens["assado"]["qtd_vendido"] == 4
    assert itens["cru"]["qtd_pedido"] == 2  # pedido livre


def test_tipo_fora_do_evento_400(client, participante, TestingSession):
    evento_id, pid = participante
    _set_vendidos(TestingSession, pid, 5)
    url = f"/api/eventos/{evento_id}/participantes/{pid}/itens"
    r = client.put(url, json={"itens": [{"tipo": "frango", "qtd_vendido": 5}]})
    assert r.status_code == 400
    assert "frango" in r.json()["detail"]


def test_substituicao_total_remove_tipo_omitido(client, participante, TestingSession):
    evento_id, pid = participante
    _set_vendidos(TestingSession, pid, 10)
    url = f"/api/eventos/{evento_id}/participantes/{pid}/itens"
    # primeiro: cru 6 + assado 4
    client.put(url, json={"itens": [
        {"tipo": "cru", "qtd_vendido": 6}, {"tipo": "assado", "qtd_vendido": 4}]})
    # depois: so cru 10 -> assado deve sumir
    r = client.put(url, json={"itens": [{"tipo": "cru", "qtd_vendido": 10}]})
    assert r.status_code == 200, r.text
    tipos = {i["tipo"] for i in r.json()["itens"]}
    assert tipos == {"cru"}


def test_lista_vazia_exige_vendidos_zero(client, participante, TestingSession):
    evento_id, pid = participante
    _set_vendidos(TestingSession, pid, 0)
    url = f"/api/eventos/{evento_id}/participantes/{pid}/itens"
    r = client.put(url, json={"itens": []})
    assert r.status_code == 200, r.text
    assert r.json()["itens"] == []
