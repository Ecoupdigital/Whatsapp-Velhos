"""Testes de API-06: GET /eventos/{id}/resumo - itens_por_tipo consolidado."""
from models import EventoParticipante


def _novo_participante(TestingSession, evento_id, nome, vendidos):
    db = TestingSession()
    p = EventoParticipante(
        evento_id=evento_id, jogador_id=None, nome_avulso=nome,
        status="pendente", pago=0, valor=0,
        qtd_cartoes_recebidos=0, qtd_vendidos=vendidos,
        qtd_devolvidos=0, qtd_pagou_custo=0,
    )
    db.add(p)
    db.commit()
    pid = p.id
    db.close()
    return pid


def test_resumo_itens_por_tipo_consolida(client, evento_galeto, TestingSession):
    eid = evento_galeto
    p1 = _novo_participante(TestingSession, eid, "A", 10)
    p2 = _novo_participante(TestingSession, eid, "B", 8)

    # p1: cru 6 (ped 2) + assado 4 (ped 1)
    client.put(f"/api/eventos/{eid}/participantes/{p1}/itens", json={"itens": [
        {"tipo": "cru", "qtd_vendido": 6, "qtd_pedido": 2},
        {"tipo": "assado", "qtd_vendido": 4, "qtd_pedido": 1}]})
    # p2: cru 3 (ped 0) + assado 5 (ped 3)
    client.put(f"/api/eventos/{eid}/participantes/{p2}/itens", json={"itens": [
        {"tipo": "cru", "qtd_vendido": 3, "qtd_pedido": 0},
        {"tipo": "assado", "qtd_vendido": 5, "qtd_pedido": 3}]})

    r = client.get(f"/api/eventos/{eid}/resumo")
    assert r.status_code == 200, r.text
    por_tipo = {x["tipo"]: x for x in r.json()["itens_por_tipo"]}
    assert por_tipo["cru"]["total_vendido"] == 9   # 6+3
    assert por_tipo["cru"]["total_pedido"] == 2    # 2+0
    assert por_tipo["assado"]["total_vendido"] == 9  # 4+5
    assert por_tipo["assado"]["total_pedido"] == 4   # 1+3


def test_resumo_sem_itens_lista_vazia(client, evento_galeto):
    r = client.get(f"/api/eventos/{evento_galeto}/resumo")
    assert r.status_code == 200, r.text
    assert r.json()["itens_por_tipo"] == []
