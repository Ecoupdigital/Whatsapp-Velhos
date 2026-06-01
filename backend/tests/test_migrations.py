"""Suite de testes: prova que a migracao da Fase 1 e nao-destrutiva e idempotente.

Cobre os requisitos:
  MIG-04 / TEST-01 -- contagem de recebidos preservada por participante
  MIG-05           -- migracao estritamente aditiva (nenhuma coluna some)
  TEST-06          -- idempotencia: rodar 2x nao duplica faixas nem falha

Cada teste opera sobre um banco SQLite temporario isolado (fixture legacy_engine
do conftest.py). O banco real velhos.db nunca e tocado.
"""
from sqlalchemy import inspect, func
from sqlalchemy.orm import sessionmaker

import models  # noqa: F401 -- garante mappers registrados
import migrations
from database import Base


def _snapshot_colunas(engine):
    """Retorna {tabela: {col1, col2, ...}} para todas as tabelas existentes."""
    insp = inspect(engine)
    return {t: {c["name"] for c in insp.get_columns(t)} for t in insp.get_table_names()}


def _migrar(engine):
    """Cria tabelas novas (create_all nao toca tabelas ja existentes) e roda migracao.

    Ordem espelhada exatamente ao que main.py faz no boot:
      1. Base.metadata.create_all -> cria evento_cartao_faixa, evento_participante_item etc.
         (eventos e evento_participantes ja existem, nao sao recriadas)
      2. run_additive_migrations -> ADD COLUMN tipos_item + backfill de faixas
    """
    Base.metadata.create_all(bind=engine)
    migrations.run_additive_migrations(engine)


def test_mig05_estritamente_aditiva(legacy_engine):
    """MIG-05: nenhuma coluna pre-migracao some; tabelas legadas preservam estrutura.

    Estrategia: snapshot ANTES (estado legado puro) vs DEPOIS da migracao.
    O conjunto pos-migracao deve ser superconjunto do pre-migracao.
    """
    antes = _snapshot_colunas(legacy_engine)
    _migrar(legacy_engine)
    depois = _snapshot_colunas(legacy_engine)

    for tabela, cols_antes in antes.items():
        assert tabela in depois, f"tabela {tabela} sumiu pos-migracao"
        faltando = cols_antes - depois[tabela]
        assert not faltando, f"colunas removidas de '{tabela}': {faltando}"

    # Colunas legadas especificas em evento_participantes continuam presentes
    ep_depois = depois["evento_participantes"]
    assert {"numero_inicio", "numero_fim", "qtd_cartoes_recebidos"}.issubset(ep_depois), (
        "colunas legadas de evento_participantes desapareceram"
    )

    # Coluna nova foi adicionada pela migracao
    assert "tipos_item" in depois["eventos"], (
        "coluna tipos_item deveria ter sido adicionada em eventos"
    )

    # Tabelas novas foram criadas
    assert "evento_cartao_faixa" in depois, "tabela evento_cartao_faixa nao foi criada"
    assert "evento_participante_item" in depois, "tabela evento_participante_item nao foi criada"


def test_test01_contagem_recebidos_preservada(legacy_engine):
    """TEST-01 / MIG-04: sum(faixas.quantidade) == qtd_cartoes_recebidos legado.

    Para cada participante, a soma das quantidades das faixas criadas pelo
    backfill deve ser igual ao valor de qtd_cartoes_recebidos que existia antes
    da migracao.
    """
    S = sessionmaker(bind=legacy_engine)

    # Captura recebidos ANTES da migracao (estado legado)
    db = S()
    recebidos_antes = {
        p.id: (p.qtd_cartoes_recebidos or 0)
        for p in db.query(models.EventoParticipante).all()
    }
    db.close()

    _migrar(legacy_engine)

    db = S()
    for pid, recebido in recebidos_antes.items():
        soma = (
            db.query(func.coalesce(func.sum(models.EventoCartaoFaixa.quantidade), 0))
            .filter(models.EventoCartaoFaixa.evento_participante_id == pid)
            .scalar()
        )
        assert soma == recebido, (
            f"participante {pid}: soma de faixas {soma} != "
            f"qtd_cartoes_recebidos legado {recebido}"
        )
    db.close()


def test_test06_idempotencia(legacy_engine):
    """TEST-06: rodar run_additive_migrations 2x nao duplica faixas nem falha.

    Apos a 1a execucao, conta as faixas criadas.
    Apos a 2a execucao, a contagem deve ser identica.
    A coluna tipos_item deve existir exatamente uma vez.
    """
    Base.metadata.create_all(bind=legacy_engine)

    # 1a execucao
    migrations.run_additive_migrations(legacy_engine)
    S = sessionmaker(bind=legacy_engine)
    db = S()
    faixas_1 = db.query(models.EventoCartaoFaixa).count()
    db.close()

    # 2a execucao (nao deve falhar nem duplicar)
    migrations.run_additive_migrations(legacy_engine)
    db = S()
    faixas_2 = db.query(models.EventoCartaoFaixa).count()
    db.close()

    assert faixas_1 == faixas_2, (
        f"backfill duplicou faixas na 2a execucao: {faixas_1} -> {faixas_2}"
    )

    # ADD COLUMN idempotente: coluna existe exatamente uma vez
    cols = [c["name"] for c in inspect(legacy_engine).get_columns("eventos")]
    assert cols.count("tipos_item") == 1, (
        f"tipos_item deveria aparecer 1 vez, apareceu {cols.count('tipos_item')}"
    )


def test_backfill_ramos(legacy_engine):
    """Confere os 3 ramos do backfill nos dados da fixture.

    Ramo 1 (numerado): p1 com numero_inicio=10, numero_fim=21
      -> 1 faixa sem_numero=0, quantidade=12
    Ramo 2 (sem numero): p2 com qtd_cartoes_recebidos=5, sem numeros
      -> 1 faixa sem_numero=1, quantidade=5, numero_inicio=None
    Ramo 3 (vazio): p3 com qtd_cartoes_recebidos=0
      -> nenhuma faixa
    Extra: p4 com numero_inicio=100, numero_fim=100 (qtd=1)
      -> 1 faixa sem_numero=0, quantidade=1
    """
    _migrar(legacy_engine)
    S = sessionmaker(bind=legacy_engine)
    db = S()

    def faixas(pid):
        return (
            db.query(models.EventoCartaoFaixa)
            .filter_by(evento_participante_id=pid)
            .all()
        )

    # p1: numerado 10-21
    f1 = faixas(1)
    assert len(f1) == 1, f"p1 deveria ter 1 faixa, tem {len(f1)}"
    assert f1[0].sem_numero == 0, "p1: faixa deveria ser numerada (sem_numero=0)"
    assert f1[0].quantidade == 12, f"p1: quantidade esperada 12, obtida {f1[0].quantidade}"
    assert f1[0].numero_inicio == 10
    assert f1[0].numero_fim == 21

    # p2: sem numero, 5 recebidos
    f2 = faixas(2)
    assert len(f2) == 1, f"p2 deveria ter 1 faixa, tem {len(f2)}"
    assert f2[0].sem_numero == 1, "p2: faixa deveria ser sem_numero=1"
    assert f2[0].quantidade == 5, f"p2: quantidade esperada 5, obtida {f2[0].quantidade}"
    assert f2[0].numero_inicio is None, "p2: numero_inicio deveria ser None"

    # p3: vazio - nenhuma faixa
    f3 = faixas(3)
    assert len(f3) == 0, f"p3 deveria ter 0 faixas, tem {len(f3)}"

    # p4: numerado 100-100
    f4 = faixas(4)
    assert len(f4) == 1, f"p4 deveria ter 1 faixa, tem {len(f4)}"
    assert f4[0].sem_numero == 0
    assert f4[0].quantidade == 1, f"p4: quantidade esperada 1, obtida {f4[0].quantidade}"

    db.close()
