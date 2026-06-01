"""Testes de CRUD de faixas de cartao (API-01, API-02, API-08, API-10, TEST-02)."""


def test_faixa_numerada_quebrada_e_lote_sem_numero_soma_recebidos(client, participante):
    # TEST-02: jogador com 1-12, depois 45-50, depois lote sem numero de 5
    evento_id, pid = participante
    base = f"/api/eventos/{evento_id}/participantes/{pid}/faixas"

    r1 = client.post(base, json={"sem_numero": False, "numero_inicio": 1, "numero_fim": 12})
    assert r1.status_code == 201, r1.text
    assert r1.json()["qtd_cartoes_recebidos"] == 12

    r2 = client.post(base, json={"sem_numero": False, "numero_inicio": 45, "numero_fim": 50})
    assert r2.status_code == 201, r2.text
    assert r2.json()["qtd_cartoes_recebidos"] == 12 + 6

    r3 = client.post(base, json={"sem_numero": True, "quantidade": 5})
    assert r3.status_code == 201, r3.text
    body = r3.json()
    assert body["qtd_cartoes_recebidos"] == 12 + 6 + 5  # 23
    assert len(body["faixas"]) == 3
    sem_num = [f for f in body["faixas"] if f["sem_numero"]]
    assert len(sem_num) == 1 and sem_num[0]["numero_inicio"] is None


def test_numerada_deriva_quantidade_ignora_payload(client, participante):
    evento_id, pid = participante
    base = f"/api/eventos/{evento_id}/participantes/{pid}/faixas"
    r = client.post(base, json={"numero_inicio": 10, "numero_fim": 19, "quantidade": 999})
    assert r.status_code == 201, r.text
    faixa = r.json()["faixas"][0]
    assert faixa["quantidade"] == 10  # 19-10+1, ignora 999


def test_numerada_fim_menor_que_inicio_400(client, participante):
    evento_id, pid = participante
    base = f"/api/eventos/{evento_id}/participantes/{pid}/faixas"
    r = client.post(base, json={"numero_inicio": 20, "numero_fim": 10})
    assert r.status_code == 400


def test_sem_numero_sem_quantidade_400(client, participante):
    evento_id, pid = participante
    base = f"/api/eventos/{evento_id}/participantes/{pid}/faixas"
    r = client.post(base, json={"sem_numero": True})
    assert r.status_code == 400


def test_delete_que_quebra_reconciliacao_400_e_nao_remove(client, participante, TestingSession):
    evento_id, pid = participante
    base = f"/api/eventos/{evento_id}/participantes/{pid}/faixas"
    r = client.post(base, json={"numero_inicio": 1, "numero_fim": 10})
    faixa_id = r.json()["faixas"][0]["id"]
    # vende 8 cartoes (precisa do endpoint de cartoes; setar direto no banco)
    db = TestingSession()
    from models import EventoParticipante
    p = db.query(EventoParticipante).get(pid)
    p.qtd_vendidos = 8
    db.commit()
    db.close()
    # deletar a unica faixa deixaria recebidos=0 < 8 -> 400
    r2 = client.delete(f"{base}/{faixa_id}")
    assert r2.status_code == 400, r2.text
    # faixa ainda existe
    r3 = client.get(base)
    assert any(f["id"] == faixa_id for f in r3.json())


def test_proximo_numero_considera_faixas(client, participante):
    # API-08: apos criar faixa 1-12, resumo.proximo_numero deve ser 13
    evento_id, pid = participante
    base = f"/api/eventos/{evento_id}/participantes/{pid}/faixas"
    client.post(base, json={"numero_inicio": 1, "numero_fim": 12})
    r = client.get(f"/api/eventos/{evento_id}/resumo")
    assert r.status_code == 200, r.text
    assert r.json()["proximo_numero"] == 13


def test_get_participante_singular_retorna_faixas(client, participante):
    # API-10: GET singular usado pelo refetchParticipante da Fase 3
    evento_id, pid = participante
    base = f"/api/eventos/{evento_id}/participantes/{pid}/faixas"
    client.post(base, json={"numero_inicio": 1, "numero_fim": 12})
    r = client.get(f"/api/eventos/{evento_id}/participantes/{pid}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == pid
    assert body["qtd_cartoes_recebidos"] == 12
    assert len(body["faixas"]) == 1
    assert "itens" in body  # shape completo (lista, possivelmente vazia)


def test_get_participante_singular_404(client, evento_galeto):
    r = client.get(f"/api/eventos/{evento_galeto}/participantes/999999")
    assert r.status_code == 404
