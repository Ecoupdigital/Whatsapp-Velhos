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


def test_resumo_assado_derivado_de_cru(client, evento_galeto, TestingSession):
    # Binario complementar: so cru e enviado; assado = vendidos - cru (derivado).
    eid = evento_galeto
    p1 = _novo_participante(TestingSession, eid, "A", 10)
    p2 = _novo_participante(TestingSession, eid, "B", 8)

    # p1: vendidos 10, cru 6 -> assado derivado 4
    client.put(f"/api/eventos/{eid}/participantes/{p1}/itens", json={"itens": [
        {"tipo": "cru", "qtd_vendido": 6}]})
    # p2: vendidos 8, cru 3 -> assado derivado 5
    client.put(f"/api/eventos/{eid}/participantes/{p2}/itens", json={"itens": [
        {"tipo": "cru", "qtd_vendido": 3}]})

    r = client.get(f"/api/eventos/{eid}/resumo")
    assert r.status_code == 200, r.text
    por_tipo = {x["tipo"]: x for x in r.json()["itens_por_tipo"]}
    assert por_tipo["cru"]["total_vendido"] == 9      # 6+3 (armazenado)
    assert por_tipo["assado"]["total_vendido"] == 9   # vendidos 18 - cru 9 (derivado)
    assert "total_pedido" not in por_tipo["cru"]      # pedido removido


def test_resumo_sem_itens_lista_vazia(client, evento_galeto):
    r = client.get(f"/api/eventos/{evento_galeto}/resumo")
    assert r.status_code == 200, r.text
    assert r.json()["itens_por_tipo"] == []
