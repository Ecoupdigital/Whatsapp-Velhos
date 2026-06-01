"""Fixtures de teste para a Fase 1 (schema + migracoes).

A fixture `legacy_engine` cria um banco SQLite temporario com o schema
LEGADO de producao: tabela `eventos` SEM a coluna `tipos_item`, e
`evento_participantes` completa, SEM as tabelas novas (evento_cartao_faixa
e evento_participante_item).

Isso forca a migracao a exercitar o caminho real de ADD COLUMN e create_all
das tabelas novas, exatamente como ocorre no banco de producao.

NOTA PARA FASE 2 (plano 02-01):
Este conftest sera mesclado com fixtures de API (TestClient, app override).
Mantenha a fixture legacy_engine independente para nao acoplar os testes.
"""
import os
import tempfile

import pytest
from sqlalchemy import create_engine, text

import models  # registra os mappers no Base.metadata (necessario para relationships)
from database import Base  # noqa: F401 -- importado para garantir metadados carregados


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
