"""API para o agente Velhos Parceiros: chave de servico, segredo do JWT por ambiente,
importacao de extrato e origem dos lancamentos.

Usa auth de verdade (sem override de get_current_user): login JWT e chave passam
pelo mesmo get_current_user que as rotas usam em producao.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

from auth import hash_password
from database import Base, get_db
from models import (
    ApiKey, Conta, ExtratoLinha, ImportacaoExtrato, Jogador, Mensalidade, Transacao, Usuario,
)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRATO_PAN = "/home/vault/00-inbox/extrato-pan-velhos-ledger-nomeado.md"


# ─── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture()
def api(db_engine, TestingSession, monkeypatch):
    """App com auth real. Semeia admin, um usuario comum, conta Banco e jogadores."""
    import main
    monkeypatch.setattr(main, "start_scheduler", lambda *a, **kw: None, raising=False)
    from main import app

    db = TestingSession()
    db.add(Usuario(id=1, username="admin", password_hash=hash_password("senha-admin"), nome="Admin", role="admin"))
    db.add(Usuario(id=2, username="tesoureiro", password_hash=hash_password("senha-t"), nome="Tesoureiro", role="user"))
    db.add(Conta(id=1, nome="Banco Pan", tipo="banco", saldo_inicial=0, ativo=1))
    db.add(Conta(id=2, nome="Conta inativa", tipo="banco", saldo_inicial=0, ativo=0))
    db.add(Jogador(id=1, nome="Julio Cezar Soares", tipo="jogador", ativo=1))
    db.add(Jogador(id=2, nome="Luciano Pinto Vieira", tipo="jogador", ativo=1))
    db.add(Jogador(id=3, nome="Leonir De Bortoli", tipo="jogador", ativo=1))
    for mes in ("2026-01", "2026-02", "2026-03"):
        db.add(Mensalidade(jogador_id=1, mes_referencia=mes, valor=60.0, valor_pago=0, status="pendente"))
    for i, mes in enumerate(("2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07")):
        db.add(Mensalidade(jogador_id=3, mes_referencia=mes, valor=60.0, valor_pago=0,
                           status="atrasado" if i < 2 else "pendente"))
    db.commit()
    db.close()

    def _override_get_db():
        s = TestingSession()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _login(api, username="admin", password="senha-admin"):
    r = api.post("/api/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def jwt_admin(api):
    return _login(api)


@pytest.fixture()
def chave(api, jwt_admin):
    r = api.post("/api/admin/api-keys", json={"nome": "Agente teste"}, headers=jwt_admin)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture()
def agente(chave):
    return {"Authorization": f"Bearer {chave['chave']}"}


# ─── 1. Chave de servico ────────────────────────────────────────────────────

def test_chave_criada_uma_vez_e_guardada_so_como_hash(api, chave, TestingSession):
    assert re.fullmatch(r"vp_[0-9a-f]{8}_[A-Za-z0-9_-]{40,}", chave["chave"])
    assert chave["ativa"] and chave["usuario_id"] == 1
    db = TestingSession()
    registro = db.query(ApiKey).one()
    assert chave["chave"] not in (registro.key_hash, registro.prefixo, registro.nome)
    assert len(registro.key_hash) == 64
    db.close()
    lista = api.get("/api/admin/api-keys", headers=_login(api)).json()
    assert "chave" not in lista[0] and lista[0]["prefixo"] == chave["prefixo"]


def test_chave_autentica_por_bearer_e_por_x_api_key(api, chave):
    for headers in ({"Authorization": f"Bearer {chave['chave']}"}, {"X-API-Key": chave["chave"]}):
        r = api.get("/api/me", headers=headers)
        assert r.status_code == 200 and r.json()["username"] == "admin"
        assert api.get("/api/jogadores", headers=headers).status_code == 200


def test_chave_registra_ultimo_uso(api, chave, agente, TestingSession):
    api.get("/api/jogadores", headers=agente)
    db = TestingSession()
    assert db.query(ApiKey).one().ultimo_uso_em is not None
    db.close()


def test_chave_revogada_e_invalida_sao_recusadas(api, jwt_admin, chave, agente):
    assert api.get("/api/jogadores", headers={"X-API-Key": "vp_00000000_inventada"}).status_code == 401
    r = api.delete(f"/api/admin/api-keys/{chave['id']}", headers=jwt_admin)
    assert r.status_code == 200 and r.json()["ativa"] is False
    assert api.get("/api/jogadores", headers=agente).status_code == 401


def test_chave_nao_gerencia_chave_e_so_admin_cria(api, agente):
    assert api.post("/api/admin/api-keys", json={"nome": "x"}, headers=agente).status_code == 403
    assert api.get("/api/admin/api-keys", headers=agente).status_code == 403
    comum = _login(api, "tesoureiro", "senha-t")
    assert api.post("/api/admin/api-keys", json={"nome": "x"}, headers=comum).status_code == 403


def test_login_do_app_continua_igual(api, jwt_admin):
    assert api.get("/api/me", headers=jwt_admin).json()["username"] == "admin"
    # Sem credencial: mesmo 403 de antes; token ruim: mesmo 401 de antes.
    r = api.get("/api/jogadores")
    assert r.status_code == 403 and r.json()["detail"] == "Not authenticated"
    r = api.get("/api/jogadores", headers={"Authorization": "Bearer nao-e-jwt"})
    assert r.status_code == 401 and r.json()["detail"] == "Token invalido ou expirado"
    assert api.post("/api/login", json={"username": "admin", "password": "errada"}).status_code == 401


def test_script_de_chaves_cria_lista_e_revoga():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{path}"}
    env.pop("DATABASE_PATH", None)
    try:
        eng = create_engine(f"sqlite:///{path}")
        Base.metadata.create_all(bind=eng)
        with eng.begin() as conn:
            conn.execute(text("INSERT INTO usuarios (username, password_hash, nome, role) VALUES ('admin','x','A','admin')"))
        eng.dispose()

        def run(*args):
            return subprocess.run([sys.executable, "scripts/api_keys.py", *args], cwd=BACKEND_DIR,
                                  env=env, capture_output=True, text=True, timeout=60)

        criar = run("criar", "Agente Velhos Parceiros")
        assert criar.returncode == 0, criar.stderr
        assert re.search(r"CHAVE .*: vp_[0-9a-f]{8}_", criar.stdout)
        assert "ativa" in run("listar").stdout
        assert run("revogar", "1").returncode == 0
        assert "revogada" in run("listar").stdout
    finally:
        os.remove(path)


# ─── 2. Segredo do JWT por ambiente ─────────────────────────────────────────

def _secret_em_processo(env_extra):
    env = {k: v for k, v in os.environ.items() if k != "JWT_SECRET_KEY"}
    env.update(env_extra)
    out = subprocess.run([sys.executable, "-c", "import auth; print(auth.SECRET_KEY)"],
                         cwd=BACKEND_DIR, env=env, capture_output=True, text=True, timeout=60)
    assert out.returncode == 0, out.stderr
    return out.stdout.strip().splitlines()[-1]


def test_segredo_do_jwt_vem_do_ambiente():
    assert _secret_em_processo({"JWT_SECRET_KEY": "segredo-do-coolify"}) == "segredo-do-coolify"


def test_sem_env_segredo_e_sorteado_e_nao_esta_no_codigo():
    a = _secret_em_processo({})
    b = _secret_em_processo({})
    assert a != b and len(a) >= 40
    fonte = open(os.path.join(BACKEND_DIR, "auth.py"), encoding="utf-8").read()
    assert "velhos-parceiros-fc-secret-key" not in fonte


def test_token_assinado_com_outro_segredo_e_recusado(api):
    from jose import jwt
    falso = jwt.encode({"sub": "1"}, "outro-segredo", algorithm="HS256")
    assert api.get("/api/me", headers={"Authorization": f"Bearer {falso}"}).status_code == 401


# ─── 3. Importacao de extrato ───────────────────────────────────────────────

LINHAS = [
    {"data": "2026-02-10", "valor": 60.0, "tipo": "entrada", "descricao": "Julio Cezar Soares"},
    {"data": "2026-02-10", "valor": 15.0, "tipo": "entrada", "descricao": "49.370.706 Luciano Pinto Vieira"},
    {"data": "2026-02-10", "valor": 318.69, "tipo": "saida", "descricao": "Mercado Dornelles E Brizolla Ltda"},
    {"data": "2026-06-01", "valor": 420.0, "tipo": "entrada", "descricao": "Leonir De Bortoli"},
]


def test_previa_nao_grava_e_sugere_vinculos(api, agente, TestingSession):
    r = api.post("/api/importacao-extrato/previa", json={"conta_id": 1, "linhas": LINHAS}, headers=agente)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["resumo"] == {"total": 4, "novas": 4, "duplicadas": 0, "erros": 0, "com_sugestao": 3}
    l0, l1, l2, l3 = body["linhas"]
    assert l0["sugestao"]["jogador_id"] == 1 and l0["sugestao"]["confianca"] == "alta"
    # 60 = a mensalidade aberta mais antiga
    assert l0["sugestao"]["mensalidade_ids_sugeridas"] == [l0["sugestao"]["mensalidades_em_aberto"][0]["id"]]
    assert l1["sugestao"]["jogador_id"] == 2  # CNPJ de MEI na frente do nome nao atrapalha
    assert l1["sugestao"]["mensalidade_ids_sugeridas"] == [] and l1["sugestao"]["acao_sugerida"] == "transacao"
    assert l2["sugestao"] is None  # saida nao sugere jogador
    assert len(l3["sugestao"]["mensalidade_ids_sugeridas"]) == 7  # 420 = 7 x 60
    db = TestingSession()
    assert db.query(Transacao).count() == 0 and db.query(ExtratoLinha).count() == 0
    assert db.query(ImportacaoExtrato).count() == 0
    db.close()


def test_previa_aponta_linha_invalida_sem_derrubar_as_outras(api, agente):
    linhas = [
        {"data": "10/02/2026", "valor": 60, "tipo": "entrada", "descricao": "x"},
        {"data": "2026-02-10", "valor": 60, "tipo": "entrada", "descricao": "x", "conta_id": 2},
        {"data": "2026-02-10", "valor": 0, "tipo": "entrada", "descricao": "x"},
        LINHAS[2],
    ]
    body = api.post("/api/importacao-extrato/previa", json={"conta_id": 1, "linhas": linhas}, headers=agente).json()
    assert [l["status"] for l in body["linhas"]] == ["erro", "erro", "erro", "nova"]


def _confirmar(api, headers, linhas, conta_id=1):
    r = api.post("/api/importacao-extrato/confirmar", json={"conta_id": conta_id, "linhas": linhas}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_confirmar_quita_mensalidade_pela_regra_do_app(api, agente, jwt_admin, TestingSession):
    db = TestingSession()
    m_jan = db.query(Mensalidade).filter_by(jogador_id=1, mes_referencia="2026-01").one().id
    m_fev = db.query(Mensalidade).filter_by(jogador_id=1, mes_referencia="2026-02").one().id
    db.close()

    res = _confirmar(api, agente, [{**LINHAS[0], "acao": "mensalidade", "mensalidade_ids": [m_jan]}])
    assert res["resumo"]["gravadas"] == 1

    # Mesmo resultado que a tela produz ao marcar a mensalidade de fevereiro como paga.
    api.put(f"/api/mensalidades/{m_fev}", headers=jwt_admin, json={
        "status": "pago", "valor_pago": 60.0, "data_pagamento": "2026-02-10", "forma_pagto": "pix", "conta_id": 1,
    })
    db = TestingSession()
    jan = db.get(Mensalidade, m_jan)
    assert (jan.status, jan.valor_pago, jan.data_pagamento, jan.forma_pagto, jan.conta_id) == \
        ("pago", 60.0, "2026-02-10", "pix", 1)
    tx_jan = db.query(Transacao).filter_by(mensalidade_id=m_jan).one()
    tx_fev = db.query(Transacao).filter_by(mensalidade_id=m_fev).one()
    for campo in ("tipo", "categoria", "valor", "data", "jogador_id", "conta_id"):
        assert getattr(tx_jan, campo) == getattr(tx_fev, campo)
    assert tx_jan.descricao == "Mensalidade 2026-01 - Julio Cezar Soares"
    assert (tx_jan.origem, tx_jan.importacao_lote_id) == ("importacao", res["lote_id"])
    assert tx_fev.origem == "app"
    db.close()


def test_confirmar_varias_mensalidades_numa_linha(api, agente, TestingSession):
    prev = api.post("/api/importacao-extrato/previa", json={"conta_id": 1, "linhas": [LINHAS[3]]}, headers=agente).json()
    ids = prev["linhas"][0]["sugestao"]["mensalidade_ids_sugeridas"]
    res = _confirmar(api, agente, [{**LINHAS[3], "acao": "mensalidade", "mensalidade_ids": ids}])
    assert res["resumo"]["gravadas"] == 1 and len(res["linhas"][0]["transacao_ids"]) == 7
    db = TestingSession()
    assert db.query(Mensalidade).filter_by(jogador_id=3, status="pago").count() == 7
    assert sum(t.valor for t in db.query(Transacao).filter_by(importacao_lote_id=res["lote_id"])) == 420.0
    db.close()


def test_confirmar_recusa_mensalidade_ja_paga_ou_soma_errada(api, agente, TestingSession):
    db = TestingSession()
    ids = [m.id for m in db.query(Mensalidade).filter_by(jogador_id=1).order_by(Mensalidade.mes_referencia)]
    db.close()
    errada = _confirmar(api, agente, [{**LINHAS[3], "acao": "mensalidade", "mensalidade_ids": ids[:2]}])
    assert errada["linhas"][0]["status"] == "erro" and "soma" in errada["linhas"][0]["erro"]
    _confirmar(api, agente, [{**LINHAS[0], "acao": "mensalidade", "mensalidade_ids": [ids[0]]}])
    outra = {**LINHAS[0], "data": "2026-02-11", "acao": "mensalidade", "mensalidade_ids": [ids[0]]}
    assert _confirmar(api, agente, [outra])["linhas"][0]["status"] == "erro"


def test_confirmar_lanca_transacao_avulsa_e_ignora(api, agente, TestingSession):
    res = _confirmar(api, agente, [
        {**LINHAS[2], "acao": "transacao", "categoria": "despesa"},
        {**LINHAS[1], "acao": "ignorar"},
        {**LINHAS[0], "acao": "transacao"},  # sem categoria: erro so nesta linha
    ])
    assert [l["status"] for l in res["linhas"]] == ["gravada", "ignorada", "erro"]
    db = TestingSession()
    tx = db.query(Transacao).one()
    assert (tx.tipo, tx.categoria, tx.valor, tx.conta_id, tx.origem) == ("saida", "despesa", 318.69, 1, "importacao")
    db.close()


def test_reimportar_nao_duplica(api, agente, TestingSession):
    linhas = [{**LINHAS[2], "acao": "transacao", "categoria": "despesa"}]
    _confirmar(api, agente, linhas)
    segunda = _confirmar(api, agente, linhas)
    assert segunda["linhas"][0]["status"] == "duplicada" and segunda["resumo"]["gravadas"] == 0
    prev = api.post("/api/importacao-extrato/previa", json={"conta_id": 1, "linhas": [LINHAS[2]]}, headers=agente).json()
    assert prev["linhas"][0]["status"] == "duplicada" and prev["linhas"][0]["lote_existente_id"]
    # Caixa e acentos na descricao nao driblam a trava.
    variante = {**LINHAS[2], "descricao": "  MERCADO dornelles e brizolla LTDA ", "acao": "transacao", "categoria": "despesa"}
    assert _confirmar(api, agente, [variante])["linhas"][0]["status"] == "duplicada"
    db = TestingSession()
    assert db.query(Transacao).count() == 1
    db.close()


def test_duas_linhas_identicas_no_mesmo_dia_sao_duas(api, agente, TestingSession):
    par = [{**LINHAS[2], "acao": "transacao", "categoria": "despesa"}] * 2
    assert _confirmar(api, agente, par)["resumo"]["gravadas"] == 2
    assert _confirmar(api, agente, par)["resumo"]["duplicadas"] == 2
    db = TestingSession()
    assert db.query(Transacao).count() == 2
    db.close()


def test_constraint_do_banco_segura_impressao_repetida(api, agente, TestingSession):
    _confirmar(api, agente, [{**LINHAS[2], "acao": "transacao", "categoria": "despesa"}])
    db = TestingSession()
    existente = db.query(ExtratoLinha).one()
    db.add(ExtratoLinha(lote_id=existente.lote_id, data="2026-02-10", tipo="saida", valor=1, acao="transacao",
                        impressao_digital=existente.impressao_digital))
    with pytest.raises(IntegrityError):
        db.commit()
    db.close()


def test_desfazer_lote_volta_tudo(api, agente, TestingSession):
    db = TestingSession()
    m_jan = db.query(Mensalidade).filter_by(jogador_id=1, mes_referencia="2026-01").one().id
    db.close()
    res = _confirmar(api, agente, [
        {**LINHAS[0], "acao": "mensalidade", "mensalidade_ids": [m_jan]},
        {**LINHAS[2], "acao": "transacao", "categoria": "despesa"},
    ])
    detalhe = api.get(f"/api/importacao-extrato/lotes/{res['lote_id']}", headers=agente).json()
    assert detalhe["linhas_gravadas"] == 2 and len(detalhe["transacoes"]) == 2

    r = api.post(f"/api/importacao-extrato/lotes/{res['lote_id']}/desfazer", headers=agente)
    assert r.status_code == 200, r.text
    assert r.json()["mensalidades_restauradas"] == 1
    db = TestingSession()
    jan = db.get(Mensalidade, m_jan)
    assert (jan.status, jan.valor_pago, jan.data_pagamento, jan.conta_id) == ("pendente", 0, None, None)
    assert db.query(Transacao).count() == 0 and db.query(ExtratoLinha).count() == 0
    assert db.get(ImportacaoExtrato, res["lote_id"]).status == "desfeito"
    db.close()
    assert api.post(f"/api/importacao-extrato/lotes/{res['lote_id']}/desfazer", headers=agente).status_code == 409
    # Desfeito, o extrato pode ser importado de novo.
    assert _confirmar(api, agente, [{**LINHAS[2], "acao": "transacao", "categoria": "despesa"}])["resumo"]["gravadas"] == 1


def _ler_extrato_pan():
    linhas = []
    for ln in open(EXTRATO_PAN, encoding="utf-8"):
        m = re.match(r"\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(recebido|enviado)\s*\|\s*([+-])R\$\s*([\d.]+)\s*\|\s*(.+?)\s*\|", ln)
        if m:
            linhas.append({"data": m[1], "tipo": "entrada" if m[2] == "recebido" else "saida",
                           "valor": float(m[4]), "descricao": m[5]})
    return linhas


@pytest.mark.skipif(not os.path.exists(EXTRATO_PAN), reason="extrato do vault indisponivel")
def test_extrato_real_do_banco_pan(api, agente, TestingSession):
    linhas = _ler_extrato_pan()
    assert len(linhas) == 127
    assert round(sum(l["valor"] for l in linhas if l["tipo"] == "entrada"), 2) == 6641.74
    assert round(sum(l["valor"] for l in linhas if l["tipo"] == "saida"), 2) == 4448.67

    prev = api.post("/api/importacao-extrato/previa", json={"conta_id": 1, "linhas": linhas}, headers=agente).json()
    assert prev["resumo"]["novas"] == 127 and prev["resumo"]["erros"] == 0

    acoes = []
    for l, p in zip(linhas, prev["linhas"]):
        s = p["sugestao"]
        if s and s["mensalidade_ids_sugeridas"]:
            acoes.append({**l, "acao": "mensalidade", "mensalidade_ids": s["mensalidade_ids_sugeridas"]})
        else:
            acoes.append({**l, "acao": "transacao", "categoria": "outros"})
    res = _confirmar(api, agente, acoes)
    # Sugestoes de linhas diferentes podem apontar a mesma mensalidade: a segunda vira erro, nunca pagamento duplo.
    assert res["resumo"]["gravadas"] + res["resumo"]["erros"] == 127 and res["resumo"]["duplicadas"] == 0

    de_novo = api.post("/api/importacao-extrato/previa", json={"conta_id": 1, "linhas": linhas}, headers=agente).json()
    assert de_novo["resumo"]["duplicadas"] == res["resumo"]["gravadas"]
    db = TestingSession()
    lancado = sum(t.valor if t.tipo == "entrada" else -t.valor for t in db.query(Transacao))
    gravadas = {p["indice"] for p in res["linhas"] if p["status"] == "gravada"}
    esperado = sum(l["valor"] if l["tipo"] == "entrada" else -l["valor"] for i, l in enumerate(linhas) if i in gravadas)
    assert round(lancado, 2) == round(esperado, 2)
    db.close()


# ─── 4. Origem dos lancamentos ──────────────────────────────────────────────

def test_origem_app_e_agente_nas_rotas_atuais(api, jwt_admin, agente, TestingSession):
    corpo = {"tipo": "entrada", "categoria": "outros", "valor": 10.0, "data": "2026-03-01", "conta_id": 1}
    pelo_app = api.post("/api/transacoes", json=corpo, headers=jwt_admin).json()
    pelo_agente = api.post("/api/transacoes", json=corpo, headers=agente).json()
    assert (pelo_app["origem"], pelo_agente["origem"]) == ("app", "agente")
    assert pelo_app["importacao_lote_id"] is None

    db = TestingSession()
    m = db.query(Mensalidade).filter_by(jogador_id=1, mes_referencia="2026-03").one().id
    db.close()
    api.put(f"/api/mensalidades/{m}", headers=agente, json={"status": "pago", "valor_pago": 60.0, "conta_id": 1})
    db = TestingSession()
    assert db.query(Transacao).filter_by(mensalidade_id=m).one().origem == "agente"
    db.close()
    lista = api.get("/api/transacoes", headers=jwt_admin).json()
    assert {t["origem"] for t in lista} == {"app", "agente"}


def test_origem_nao_vem_do_corpo_da_requisicao(api, agente):
    corpo = {"tipo": "entrada", "categoria": "outros", "valor": 10.0, "data": "2026-03-01", "origem": "importacao"}
    assert api.post("/api/transacoes", json=corpo, headers=agente).json()["origem"] == "agente"


def test_migracao_adiciona_colunas_em_banco_legado(legacy_engine):
    from migrations import run_additive_migrations
    with legacy_engine.begin() as conn:
        conn.execute(text("""CREATE TABLE transacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL,
            categoria TEXT NOT NULL, descricao TEXT, valor REAL NOT NULL, data TEXT NOT NULL)"""))
        conn.execute(text("INSERT INTO transacoes (tipo, categoria, valor, data) VALUES ('entrada','outros',5,'2026-01-01')"))
    Base.metadata.create_all(bind=legacy_engine)  # como o boot do main.py
    run_additive_migrations(legacy_engine)
    run_additive_migrations(legacy_engine)  # idempotente
    insp = inspect(legacy_engine)
    cols = {c["name"] for c in insp.get_columns("transacoes")}
    assert {"origem", "importacao_lote_id"} <= cols
    assert {"api_keys", "importacoes_extrato", "extrato_linhas"} <= set(insp.get_table_names())
    uniques = insp.get_unique_constraints("extrato_linhas")
    assert any(u["column_names"] == ["impressao_digital"] for u in uniques)
    with legacy_engine.connect() as conn:
        assert conn.execute(text("SELECT origem FROM transacoes")).scalar() is None  # legado fica NULL (= app)
