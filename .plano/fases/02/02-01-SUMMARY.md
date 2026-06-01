---
phase: 02-api
plan: 02-01
subsystem: backend
tags: [schemas, pydantic, pytest, harness, faixas, itens, tipos_item]
dependency_graph:
  provides:
    - FaixaCreate/Update/Out (schemas Pydantic)
    - ItemTipo/ItensUpdate/ItemOut (schemas Pydantic)
    - ResumoItemTipo (schema Pydantic)
    - EventoOut.tipos_item com field_validator (desserializacao JSON)
    - EventoCreate/Update.tipos_item
    - ParticipanteOut.faixas + ParticipanteOut.itens
    - EventoResumo.itens_por_tipo
    - Harness pytest (TestClient + auth override + db in-memory)
    - Fixtures: db_engine, TestingSession, client, evento_galeto, participante
  requires:
    - Fase 1: EventoCartaoFaixa, EventoParticipanteItem, Evento.tipos_item (models.py)
    - Fase 1: legacy_engine em tests/conftest.py (test_migrations.py)
  affects:
    - Planos 02-02..02-05 (consomem schemas e harness)
tech_stack:
  added: []
  patterns:
    - field_validator(mode="before") para coercao int->bool e desserializacao JSON
    - StaticPool sqlite in-memory para testes isolados
    - dependency_overrides em TestClient (get_db + get_current_user)
    - monkeypatch start_scheduler no startup do app
key_files:
  modified:
    - backend/schemas.py
    - backend/tests/conftest.py
  created:
    - backend/requirements-dev.txt
    - backend/tests/test_schemas_smoke.py
decisions:
  - "sem_numero exposto como bool no schema (FaixaOut) com field_validator coercao 0/1->bool"
  - "tipos_item desserializado via field_validator(mode=before) centralizado em EventoOut (nao toca endpoints)"
  - "monkeypatch de start_scheduler via main.start_scheduler (namespace onde esta importado)"
  - "legacy_engine preservado intacto; fixtures de API adicionadas ao FINAL do conftest"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-01"
  tasks_completed: 4
  files_changed: 4
  tests_passed: 6
---

# Fase 02 Plano 01: Schemas + Harness de Teste - Summary

Schemas Pydantic para faixas multiplas, itens por tipo (cru/assado) e harness de testes FastAPI com TestClient + SQLite in-memory isolado, mesclado ao conftest da Fase 1 sem quebrar nenhum teste existente.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Arquivos |
|--------|-----------|--------|----------|
| 1 | 7 schemas novos (Faixa, Item, ResumoItemTipo) | 5b8aea4 | backend/schemas.py |
| 2 | tipos_item/faixas/itens em schemas Evento/Participante/Resumo | fab45f6 | backend/schemas.py |
| 3 | Mescla fixtures de API no conftest da Fase 1 | 90e49bc | backend/tests/conftest.py |
| 4 | requirements-dev.txt + smoke tests + suite completa | 544d626 | backend/requirements-dev.txt, backend/tests/test_schemas_smoke.py |

## Resultado da Suite de Testes

```
6 passed, 20 warnings in 0.90s

tests/test_migrations.py::test_add_column_tipos_item_idempotente ... PASSED
tests/test_migrations.py::test_backfill_faixa_numerada ... PASSED
tests/test_migrations.py::test_backfill_faixa_sem_numero ... PASSED
tests/test_migrations.py::test_backfill_participante_sem_cartoes_nao_cria_faixa ... PASSED
tests/test_schemas_smoke.py::test_get_evento_retorna_tipos_item_como_lista ... PASSED
tests/test_schemas_smoke.py::test_participante_out_tem_faixas_e_itens_vazios ... PASSED
```

Warnings sao deprecation notices pre-existentes: `on_event` do FastAPI e class-based `Config` do Pydantic. Nao afetam funcionalidade.

## Criterios de Sucesso - Verificacao

- [x] Os 7 schemas novos (`FaixaCreate/Update/Out`, `ItemTipo/ItensUpdate/ItemOut`, `ResumoItemTipo`) importam sem erro
- [x] `EventoOut.tipos_item` desserializa str JSON do banco em `list[str]` (aceita None)
- [x] `EventoCreate/Update` aceitam `tipos_item: list[str]`
- [x] `ParticipanteOut` expoe `faixas` e `itens`; `EventoResumo` expoe `itens_por_tipo`
- [x] Harness pytest de API roda: smoke verde com client autenticado e DB isolado
- [x] Fixture `legacy_engine` da Fase 1 PRESERVADA; suite completa `pytest tests/` verde (6 passed)

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

Observacao: `pytest==9.0.2` encontrado no `requirements.txt` existente (em vez de 8.3.4 do plano). O `requirements-dev.txt` foi criado com a versao instalada (9.0.2) para nao gerar conflito.

## Self-Check: PASSOU

- [x] `backend/schemas.py` modificado com todos os schemas
- [x] `backend/tests/conftest.py` mesclado (legacy_engine preservado + fixtures de API)
- [x] `backend/requirements-dev.txt` criado
- [x] `backend/tests/test_schemas_smoke.py` criado
- [x] Commits: 5b8aea4, fab45f6, 90e49bc, 544d626 todos existem
- [x] `pytest tests/ -q` retorna `6 passed`
