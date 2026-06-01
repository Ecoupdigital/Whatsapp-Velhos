"""Fixtures de teste para a Fase 1 (schema + migracoes) e Fase 2 (API).

A fixture `legacy_engine` cria um banco SQLite temporario com o schema
LEGADO de producao: tabela `eventos` SEM a coluna `tipos_item`, e
`evento_participantes` completa, SEM as tabelas novas (evento_cartao_faixa
e evento_participante_item).

Isso forca a migracao a exercitar o caminho real de ADD COLUMN e create_all
das tabelas novas, exatamente como ocorre no banco de producao.

As fixtures db_engine/TestingSession/client/evento_galeto/participante foram
adicionadas na Fase 2 (plano 02-01) para o harness de API.
Mantenha a fixture legacy_engine independente para nao acoplar os testes.
"""
import os
import sys
import tempfile

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import models  # registra os mappers no Base.metadata (necessario para relationships)
from database import Base, get_db  # noqa: F401 -- importado para garantir metadados carregados
from auth import get_current_user
from models import Usuario, Evento, EventoParticipante

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def _criar_schema_legado(engine):
    """Cria APENAS as tabelas que existiam antes da feature de faixas multiplas.

    Tabela `eventos` criada SEM a coluna `tipos_item`.
    Tabela `evento_participantes` criada completa (colunas legadas preservadas).
    NAO cria: evento_cartao_faixa, evento_participante_item.

    Simula o estado de producao pre-migracao, garantindo que o teste de
    ADD COLUMN exercite o caminho real.
    """
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE eventos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT NOT NULL,
                titulo TEXT NOT NULL,
                created_at TEXT
            )
        """))
        conn.execute(text("""
            CREATE TABLE evento_participantes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evento_id INTEGER NOT NULL,
                jogador_id INTEGER,
                nome_avulso TEXT,
                status TEXT,
                pago INTEGER DEFAULT 0,
                valor REAL DEFAULT 0,
                valor_pago REAL DEFAULT 0,
                data_pagamento TEXT,
                forma_pagto TEXT,
                conta_id INTEGER,
                qtd_cartoes_recebidos INTEGER DEFAULT 0,
                numero_inicio INTEGER,
                numero_fim INTEGER,
                qtd_vendidos INTEGER DEFAULT 0,
                qtd_devolvidos INTEGER DEFAULT 0,
                qtd_pagou_custo INTEGER DEFAULT 0,
                observacoes TEXT
            )
        """))


@pytest.fixture
def legacy_engine():
    """Engine SQLite em arquivo temporario com schema legado e dados de teste.

    Dados cobrem os 3 ramos do backfill (MIG-02):
      - p1: numerado 10-21, 12 cartoes recebidos  -> faixa numerada, qtd=12
      - p2: sem numero, 5 recebidos               -> faixa sem_numero=1, qtd=5
      - p3: sem numero, 0 recebidos               -> nenhuma faixa (ramo vazio)
      - p4: numerado 100-100, 1 recebido          -> faixa numerada, qtd=1

    O banco e destruido apos cada teste (yield + cleanup).
    O banco real `velhos.db` NAO e tocado.
    """
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    _criar_schema_legado(engine)

    with engine.begin() as conn:
        # Evento de referencia
        conn.execute(text(
            "INSERT INTO eventos (id, tipo, titulo) VALUES (1, 'confraternizacao', 'Galeto')"
        ))
        # p1: numerado 10-21 (12 cartoes), ramo numero_inicio/numero_fim
        conn.execute(text(
            "INSERT INTO evento_participantes "
            "(id, evento_id, numero_inicio, numero_fim, qtd_cartoes_recebidos, qtd_vendidos) "
            "VALUES (1, 1, 10, 21, 12, 0)"
        ))
        # p2: sem numero, 5 recebidos, ramo sem_numero=1
        conn.execute(text(
            "INSERT INTO evento_participantes "
            "(id, evento_id, qtd_cartoes_recebidos, qtd_vendidos) "
            "VALUES (2, 1, 5, 0)"
        ))
        # p3: sem cartoes, ramo vazio (nenhuma faixa deve ser criada)
        conn.execute(text(
            "INSERT INTO evento_participantes "
            "(id, evento_id, qtd_cartoes_recebidos) "
            "VALUES (3, 1, 0)"
        ))
        # p4: numerado 100-100, 1 cartao
        conn.execute(text(
            "INSERT INTO evento_participantes "
            "(id, evento_id, numero_inicio, numero_fim, qtd_cartoes_recebidos) "
            "VALUES (4, 1, 100, 100, 1)"
        ))

    yield engine

    engine.dispose()
    os.remove(path)


# ─── Fixtures de API (Fase 2) — NAO remover legacy_engine acima ───

@pytest.fixture()
def db_engine():
    # sqlite in-memory unico compartilhado entre conexoes (StaticPool)
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def TestingSession(db_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


@pytest.fixture()
def client(db_engine, TestingSession, monkeypatch):
    # neutraliza scheduler no startup do app (APScheduler nao deve subir nos testes)
    import main
    monkeypatch.setattr(main, "start_scheduler", lambda *a, **kw: None, raising=False)
    from main import app

    def _override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    def _override_user():
        return Usuario(id=1, username="admin", password_hash="x", nome="Admin", role="admin")

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def evento_galeto(TestingSession):
    """Cria um evento galeto com tipos_item cru/assado e devolve seu id."""
    import json
    db = TestingSession()
    try:
        e = Evento(
            tipo="galeto", titulo="Galeto Teste", status="planejado",
            valor_cartao=20.0, custo_cartao=0.0,
            tipos_item=json.dumps(["cru", "assado"]),
        )
        db.add(e)
        db.commit()
        db.refresh(e)
        return e.id
    finally:
        db.close()


@pytest.fixture()
def participante(TestingSession, evento_galeto):
    """Participante no evento_galeto sem faixas, com 0 vendidos. Devolve (evento_id, participante_id)."""
    db = TestingSession()
    try:
        p = EventoParticipante(
            evento_id=evento_galeto, jogador_id=None, nome_avulso="Joao",
            status="pendente", pago=0, valor=0, qtd_cartoes_recebidos=0,
            qtd_vendidos=0, qtd_devolvidos=0, qtd_pagou_custo=0,
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        return evento_galeto, p.id
    finally:
        db.close()
