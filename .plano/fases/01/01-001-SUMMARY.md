---
phase: 01-backend-api-publica
plan: 01-001
subsystem: backend
tags: [schemas, pydantic-v2, portal, testes, scaffold]
dependency_graph:
  provides: [schemas-Portal*, test-scaffold-seed]
  requires: []
  affects: [01-002, 01-003]
tech_stack:
  added: []
  patterns: [Pydantic v2 BaseModel sem Config, fixture pytest com TestingSession]
key_files:
  created:
    - backend/tests/test_portal.py
  modified:
    - backend/schemas.py
decisions:
  - "Models Portal* isolados dos schemas internos (prefixo Portal*) para contrato publico estavel"
  - "PortalCaixaAtrasos com int (nao list, nao str) como trava de privacidade tipada (SEC-01)"
  - "Sem class Config/from_attributes nos Portal* pois sao montados no handler, nao lidos direto do ORM"
metrics:
  duration_secs: ~480
  completed_at: "2026-06-04T14:07:41Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Fase 01 Plano 001: Schemas Portal* + scaffold de teste - Summary

**One-liner:** 11 models Pydantic v2 com prefixo `Portal*` adicionados a `schemas.py` isolando o contrato publico do portal, mais scaffold de testes com fixture de seed deterministica para as ondas seguintes.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Schemas Portal* em schemas.py | 7aeaf6f | backend/schemas.py |
| 2 | Scaffold test_portal.py + fixture seed | 7aeaf6f | backend/tests/test_portal.py |

## Prova de Verificacao (saida real)

### Tarefa 1 - verificacao automatizada dos schemas

```
$ cd backend && python3 -c "from schemas import PortalResponse, PortalCaixa, PortalCaixaAtrasos, PortalEvento, PortalJogos, PortalMeta, PortalFluxoMes, PortalRankingEntry, PortalResultado, PortalProximoJogo, PortalJogoResumo; import inspect; assert PortalCaixaAtrasos.model_fields['mensalidades'].annotation is int; assert PortalCaixaAtrasos.model_fields['jogadores'].annotation is int; assert set(PortalResponse.model_fields.keys()) == {'meta','caixa','eventos','jogos'}; print('OK schemas Portal*')"

OK schemas Portal*
```

### Tarefa 2 - smoke test + collect-only

```
$ cd backend && python3 -m pytest tests/test_portal.py::test_schemas_portal_importam_e_shape_topo -q

.                                                                        [100%]
1 passed, 16 warnings in 0.09s
```

```
$ cd backend && python3 -m pytest tests/test_portal.py --collect-only -q

tests/test_portal.py::test_schemas_portal_importam_e_shape_topo
1 test collected in 0.00s
```

## Criterios de Sucesso - Checagem

- [x] Os 11 models Portal* existem em schemas.py e importam sem erro
- [x] `PortalResponse` tem exatamente {meta, caixa, eventos, jogos}
- [x] `PortalCaixaAtrasos.mensalidades` e `.jogadores` sao `int` (trava SEC-01 tipada)
- [x] Nenhum model Portal* expoe PII (sem telefone/transacoes/participantes/jogador_id)
- [x] `tests/test_portal.py` existe com a fixture `seed_portal_data` e o smoke test passando
- [x] Schemas internos existentes intactos (nada renomeado)

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

- [x] `backend/schemas.py` - ENCONTRADO e contendo bloco Portal* (linhas 720-788)
- [x] `backend/tests/test_portal.py` - ENCONTRADO com fixture seed_portal_data e smoke test
- [x] Commit 7aeaf6f - ENCONTRADO no historico git
- [x] Smoke test passa (1 passed)
- [x] collect-only sem erros de import (1 test collected)
