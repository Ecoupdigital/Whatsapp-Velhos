def test_get_evento_retorna_tipos_item_como_lista(client, evento_galeto):
    r = client.get(f"/api/eventos/{evento_galeto}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["tipos_item"] == ["cru", "assado"]


def test_participante_out_tem_faixas_e_itens_vazios(client, participante):
    evento_id, pid = participante
    r = client.get(f"/api/eventos/{evento_id}/participantes")
    assert r.status_code == 200, r.text
    p = next(x for x in r.json() if x["id"] == pid)
    assert p["faixas"] == []
    assert p["itens"] == []
