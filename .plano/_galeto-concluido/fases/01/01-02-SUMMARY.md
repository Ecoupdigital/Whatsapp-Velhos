---
phase: 01-schema-migracao-backfill
plan: 01-02
subsystem: backend/database
tags: [migrations, backfill, sqlite, postgres, idempotent]
dependency_graph:
  requires: [01-01]
  provides: [run_additive_migrations, _add_column_tipos_item, _backfill_faixas]
  affects: [main.py boot, eventos.tipos_item coluna, evento_cartao_faixa backfill]
tech_stack:
  added: []
  patterns: [inspect()-before-alter, engine.begin() transacao, import-local-dentro-funcao]
key_files:
  created:
    - backend/migrations.py
  modified:
    - backend/main.py
decisions:
  - "Import de models dentro de _backfill_faixas (import local) para evitar ciclo de import no modulo de migracoes"
  - "Faixa numerada usa qtd=fim-ini+1 como fonte de verdade; nao reconcilia com qtd_cartoes_recebidos legado (divergencias aparecem nos testes 01-03)"
  - "run_additive_migrations chamada em escopo de modulo (nao em on_startup) para manter consistencia com o padrao atual de create_all no main.py"
metrics:
  duration_approx: "~8 min"
  completed_at: "2026-06-01T15:36:34Z"
  tasks_completed: 4
  tasks_total: 4
  files_created: 1
  files_modified: 1
---

# Fase 01 Plano 01-02: migrations.py (ADD COLUMN idempotente + backfill) e wiring no boot Summary

**One-liner:** Migracao aditiva idempotente via inspect() + backfill de faixas legadas via guard COUNT==0, com wiring no boot do FastAPI apos create_all.

## Tarefas Completadas

| Tarefa | Nome | Status | Verificacao |
|--------|------|--------|-------------|
| 1 | _add_column_tipos_item (ADD COLUMN idempotente) | PASSOU | inspect antes+depois, 2x sem duplicar |
| 2 | _backfill_faixas (backfill idempotente) | PASSOU | numerada/sem_numero/vazio OK |
| 3 | Wiring em main.py (import + chamada apos create_all) | PASSOU | AST check + ordem correta |
| 4 | Boot e2e SQLite limpo + 2a execucao sem erro | PASSOU | DATABASE_PATH=/tmp, tabelas + coluna OK |

## Commit

| Hash | Descricao | Arquivos |
|------|-----------|----------|
| eeb9f8a | feat(01-02): migrations.py aditivo/idempotente + wiring no boot | backend/migrations.py (novo), backend/main.py |

## Descricao tecnica

### backend/migrations.py

Modulo novo com 3 funcoes publicas:

- `run_additive_migrations(engine)`: ponto de entrada, chama (1) `_add_column_tipos_item` depois (2) `_backfill_faixas`. Seguro rodar N vezes.
- `_add_column_tipos_item(engine)`: usa `sqlalchemy.inspect(engine)` para listar colunas da tabela `eventos`. Se `tipos_item` nao estiver na lista, executa `ALTER TABLE eventos ADD COLUMN tipos_item TEXT` dentro de `engine.begin()` (transacao automatica). Portavel Postgres+SQLite sem `IF NOT EXISTS`.
- `_backfill_faixas(engine)`: para cada `EventoParticipante`, verifica `COUNT(EventoCartaoFaixa WHERE evento_participante_id == p.id) == 0` antes de agir (guard de idempotencia). Se o participante tem `numero_inicio` E `numero_fim`: cria 1 faixa numerada com `qtd = fim - ini + 1`, `sem_numero=0`. Se nao tem numeros mas tem `qtd_cartoes_recebidos > 0`: cria 1 faixa com `sem_numero=1`, `qtd = qtd_cartoes_recebidos`. Se qtd == 0: nenhuma faixa. Import de models dentro da funcao (import local) para evitar ciclo de import.

### backend/main.py (alteracao cirurgica)

Duas mudancas:
1. Import adicionado apos `from auth import hash_password`: `from migrations import run_additive_migrations`
2. Bloco L18-19 atualizado: comentario revisado + chamada `run_additive_migrations(engine)` na linha imediatamente apos `Base.metadata.create_all(bind=engine)`

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Criterios de Sucesso - Verificacao

- [x] `backend/migrations.py` existe com `run_additive_migrations`, `_add_column_tipos_item`, `_backfill_faixas`
- [x] ADD COLUMN `eventos.tipos_item` so roda se a coluna falta (via inspect), sem `IF NOT EXISTS`, portavel Postgres+SQLite
- [x] Backfill cria 1 faixa numerada ou 1 sem_numero por participante sem faixa; guard COUNT==0 garante idempotencia
- [x] `main.py` chama `run_additive_migrations(engine)` logo apos `create_all`
- [x] Boot e2e em SQLite limpo cria tabelas + coluna; rodar migracao 2x nao falha
- [x] Nenhum DROP/rename (MIG-05): codigo so contem ADD COLUMN e INSERT

## Self-Check: PASSOU

- backend/migrations.py: ENCONTRADO
- backend/main.py: ENCONTRADO
- commit eeb9f8a: ENCONTRADO
