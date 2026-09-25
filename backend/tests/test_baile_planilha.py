"""Planilha do baile: meio cartao, lucro a parte, e vinculo que nao cria lancamento."""
from pathlib import Path

from openpyxl import Workbook

from models import Evento, EventoParticipante, Jogador, Transacao


def _planilha(path: Path):
    wb = Workbook()
    params = wb.active
    params.title = "Parâmetros"
    params["B6"] = 180
    params["B8"] = 30
    params["B12"] = 17100
    params["B17"] = 90
    cartoes = wb.create_sheet("Cartões")
    cartoes["B5"] = "Tucum"
    cartoes["C5"] = "51 9810-1638"
    cartoes["D5"] = "Respondeu"
    cartoes["E5"] = 3
    cartoes["I5"] = 2
    cartoes["K5"] = "106 a 110"
    cartoes["L5"] = "Não"
    cartoes["M5"] = "Lucro de 2 cartões"
    cartoes["B6"] = "Amauri"
    cartoes["C6"] = "51 9989-2263"
    cartoes["D6"] = "Respondeu"
    cartoes["E6"] = 7.5
    cartoes["I6"] = 0
    cartoes["K6"] = "111 a 115"
    cartoes["L6"] = "A confirmar"
    pats = wb.create_sheet("Patrocínios")
    pats["B4"] = "Amauri"
    pats["C4"] = "Bruxel"
    pats["D4"] = 60
    pats["E4"] = "Sim"
    pats["F4"] = "Sim"
    wb.save(path)


def test_importar_nao_cria_lancamento_e_aceita_meio_cartao(client, TestingSession, tmp_path):
    db = TestingSession()
    db.add(Jogador(nome="Tucum", apelido="Tucum", telefone="555198101638", tipo="jogador"))
    db.add(Jogador(nome="Amauri", apelido="Amauri", telefone="555199892263", tipo="socio"))
    ev = Evento(tipo="baile", titulo="Baile", status="planejado")
    db.add(ev)
    db.commit()
    evento_id = ev.id
    antes = db.query(Transacao).count()
    db.close()

    caminho = tmp_path / "baile.xlsx"
    _planilha(caminho)
    with open(caminho, "rb") as f:
        r = client.post(
            f"/api/eventos/{evento_id}/baile/importar",
            files={"file": ("baile.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
    assert r.status_code == 200, r.text
    assert r.json()["atletas"] == 2
    assert r.json()["patrocinios"] == 1

    visao = client.get(f"/api/eventos/{evento_id}/baile")
    assert visao.status_code == 200
    body = visao.json()
    por_nome = {p["nome"]: p for p in body["participantes"]}
    assert por_nome["Tucum"]["qtd_venda"] == 3
    assert por_nome["Tucum"]["qtd_lucro"] == 2
    assert por_nome["Tucum"]["receita_cartao"] == 540
    assert por_nome["Tucum"]["receita_lucro"] == 180
    assert por_nome["Tucum"]["valor"] == 720
    assert por_nome["Tucum"]["valor_pago"] == 0
    assert por_nome["Tucum"]["numero_inicio"] == 106
    assert por_nome["Amauri"]["qtd_venda"] == 7.5
    assert por_nome["Amauri"]["acerto"] == "a_confirmar"
    assert body["patrocinios"][0]["nome_patrocinador"] == "Bruxel"
    assert body["patrocinios"][0]["pago"] == "sim"
    assert body["patrocinios"][0]["valor_vinculado"] == 0

    db = TestingSession()
    assert db.query(Transacao).count() == antes
    db.close()


def test_vincular_nao_duplica_o_lancamento(client, TestingSession):
    db = TestingSession()
    db.add(Jogador(nome="Mauro", apelido="Mauro", telefone="555199211910", tipo="jogador"))
    ev = Evento(tipo="baile", titulo="Baile", status="em_andamento", valor_cartao=180, valor_lucro=90)
    db.add(ev)
    db.commit()
    j = db.query(Jogador).filter(Jogador.nome == "Mauro").one()
    p = EventoParticipante(
        evento_id=ev.id, jogador_id=j.id, qtd_venda=5, qtd_lucro=0,
        status="confirmado", valor=900, valor_pago=0, pago=0,
    )
    db.add(p)
    db.flush()
    tx = Transacao(
        tipo="entrada", categoria="cartao_baile", descricao="Mauro 5 Cartoes Baile",
        valor=900, data="2026-09-19",
    )
    db.add(tx)
    db.commit()
    evento_id, pid, txid = ev.id, p.id, tx.id
    db.close()

    r = client.post(
        f"/api/eventos/{evento_id}/baile/vincular",
        json={"transacao_id": txid, "participante_id": pid},
    )
    assert r.status_code == 200, r.text
    linha = next(x for x in r.json()["participantes"] if x["id"] == pid)
    assert linha["valor_pago"] == 900
    assert linha["valor"] == 900

    db = TestingSession()
    assert db.query(Transacao).count() == 1
    gravado = db.query(Transacao).one()
    assert gravado.valor == 900
    assert gravado.evento_participante_id == pid
    db.close()

    de_novo = client.post(
        f"/api/eventos/{evento_id}/baile/vincular",
        json={"transacao_id": txid, "participante_id": pid},
    )
    assert de_novo.status_code == 200
    db = TestingSession()
    assert db.query(Transacao).count() == 1
    db.close()
