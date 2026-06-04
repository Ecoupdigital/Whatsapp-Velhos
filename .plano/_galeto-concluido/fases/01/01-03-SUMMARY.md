---
phase: 01-schema-migracao-backfill
plan: 01-03
subsystem: database
type: test
tags: [pytest, migracao, idempotencia, backfill, sqlite]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [suite-testes-fase1]
  affects: []
tech_stack:
  added: [pytest==9.0.2]
  patterns: [fixture-engine-tempfile, snapshot-colunas, legacy-schema-ddl-manual]
key_files:
  created:
    - backend/pytest.ini
    - backend/tests/__init__.py
    - backend/tests/conftest.py
    - backend/tests/test_migrations.py
  modified:
    - backend/requirements.txt
decisions:
  - "Schema legado criado via DDL manual (nao create_all) para garantir que eventos nao tenha tipos_item e exercitar o ADD COLUMN real"
  - "Engine SQLite com arquivo tempfile (nao :memory:) para compatibilidade com inspect() entre conexoes"
  - "conftest.py mantido sem fixtures de API para facilitar merge na Fase 2 (plano 02-01)"
metrics:
  duration: ~8min
  completed_at: "2026-06-01"
  tasks_completed: 4
  tasks_total: 4
  files_created: 4
  files_modified: 1
---

# Fase 01 Plano 01-03: Suite de Testes - Migracao Nao-Destrutiva e Idempotente

Suite pytest que prova, de forma automatizada e repetivel, que a migracao da Fase 1 e estritamente aditiva (MIG-05), preserva a contagem de cartoes recebidos por participante (MIG-04/TEST-01) e idempotente (TEST-06).

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | pytest.ini + pytest em requirements.txt | ed8c14f | OK |
| 2 | tests/__init__.py + conftest.py (fixture legacy_engine) | ad887da | OK |
| 3 | test_migrations.py (4 testes) | c10702f | OK |
| 4 | Gate da fase: 4 passed confirmados | (sem codigo novo) | OK |

## Evidencia de Execucao (Gate Fase 1)

```
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.0.2, pluggy-1.6.0
rootdir: backend
configfile: pytest.ini
collected 4 items

tests/test_migrations.py::test_mig05_estritamente_aditiva PASSED         [ 25%]
tests/test_migrations.py::test_test01_contagem_recebidos_preservada PASSED [ 50%]
tests/test_migrations.py::test_test06_idempotencia PASSED                [ 75%]
tests/test_migrations.py::test_backfill_ramos PASSED                     [100%]

============================== 4 passed in 0.52s ===============================
```

## O Que Foi Construido

### pytest.ini

Configurado com `pythonpath = .` e `testpaths = tests`. O `pythonpath = .` e critico: adiciona `backend/` ao `sys.path` do pytest, permitindo os imports absolutos (`import models`, `import migrations`, `from database import Base`) que o codebase usa. Rodado com cwd em `backend/`.

### conftest.py - fixture `legacy_engine`

Cria um banco SQLite em arquivo temporario (via `tempfile.mkstemp`) com o schema LEGADO de producao:

- Tabela `eventos` criada via DDL manual SEM a coluna `tipos_item`
- Tabela `evento_participantes` criada com todas as colunas legadas
- Tabelas novas (`evento_cartao_faixa`, `evento_participante_item`) NAO existem

Isso forca a migracao a exercitar o caminho real: `Base.metadata.create_all` cria as tabelas novas, e `run_additive_migrations` executa o ADD COLUMN e o backfill, exatamente como acontece em producao.

Dados semeados cobrem os 3 ramos do backfill (MIG-02):

| id | numero_inicio | numero_fim | qtd_cartoes_recebidos | Ramo esperado |
|----|--------------|------------|----------------------|---------------|
| 1  | 10           | 21         | 12                   | numerado, qtd=12 |
| 2  | NULL         | NULL       | 5                    | sem_numero=1, qtd=5 |
| 3  | NULL         | NULL       | 0                    | vazio (nenhuma faixa) |
| 4  | 100          | 100        | 1                    | numerado, qtd=1 |

### test_migrations.py - 4 testes

**test_mig05_estritamente_aditiva (MIG-05)**
Snapshot de `{tabela: set(colunas)}` antes e depois da migracao. Para cada tabela que existia antes, verifica que (a) a tabela ainda existe, (b) nenhuma coluna sumiu. Verifica tambem que `tipos_item` foi adicionada em `eventos` e que as duas tabelas novas foram criadas.

**test_test01_contagem_recebidos_preservada (MIG-04 / TEST-01)**
Captura `qtd_cartoes_recebidos` de cada participante antes da migracao. Apos `_migrar()`, verifica `sum(faixas.quantidade) == recebidos_legado` para cada participante. Prova que o backfill preserva a contagem de forma exata.

**test_test06_idempotencia (TEST-06)**
Roda `run_additive_migrations` duas vezes. Conta faixas apos cada execucao: deve ser identico. Verifica que `tipos_item` aparece exatamente uma vez nas colunas (sem duplicatas). Garante que rodar no boot multiplas vezes nao corrompe dados.

**test_backfill_ramos**
Verifica os 3 ramos do backfill nos dados da fixture com asserts granulares: `sem_numero`, `quantidade`, `numero_inicio`, `numero_fim` por participante. Cobre o caso de 0 faixas (p3) explicitamente.

## Decisoes de Implementacao

**DDL manual para schema legado:** Em vez de usar `Base.metadata.create_all` e depois tentar remover colunas (inviavel em SQLite), o conftest cria a tabela `eventos` diretamente via DDL sem `tipos_item`. Isso garante que o teste de ADD COLUMN exercite o caminho real de producao.

**Arquivo tempfile em vez de `:memory:`:** O SQLite in-memory (`:memory:`) cria um banco novo para cada conexao. Como `inspect()` e a session ORM usam conexoes separadas, o in-memory causaria "table not found". Com arquivo tempfile, todas as conexoes enxergam o mesmo banco.

**conftest.py separado de fixtures de API:** A fixture `legacy_engine` opera diretamente no motor SQLAlchemy sem o app FastAPI. Isso preserva espaco para a Fase 2 (plano 02-01) adicionar fixtures de `TestClient`/`app` no mesmo conftest sem conflito.

## Criterios de Sucesso

- [x] `backend/pytest.ini` + `backend/tests/` com infra de teste isolada (SQLite temporario, sem tocar velhos.db)
- [x] TEST-01/MIG-04: `sum(faixas.quantidade) == qtd_cartoes_recebidos` legado por participante (provado por teste)
- [x] TEST-06: rodar `run_additive_migrations` 2x nao duplica faixas nem falha no ADD COLUMN (provado por teste)
- [x] MIG-05: snapshot de colunas antes/depois prova que nenhuma coluna legada some (provado por teste)
- [x] 3 ramos do backfill cobertos (numerada, sem_numero, vazio)
- [x] `pytest tests/test_migrations.py` = 4 passed

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

| Item | Status |
|------|--------|
| backend/pytest.ini | ENCONTRADO |
| backend/tests/__init__.py | ENCONTRADO |
| backend/tests/conftest.py | ENCONTRADO |
| backend/tests/test_migrations.py | ENCONTRADO |
| .plano/fases/01/01-03-SUMMARY.md | ENCONTRADO |
| commit ed8c14f | ENCONTRADO |
| commit ad887da | ENCONTRADO |
| commit c10702f | ENCONTRADO |
