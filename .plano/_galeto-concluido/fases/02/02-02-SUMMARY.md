---
phase: 02-api
plan: 02-02
subsystem: backend
tags: [faixas, crud, recebidos-derivado, get-singular, api-01, api-02, api-08, api-10, test-02]
dependency_graph:
  requires: [02-01]
  provides: [faixas-crud, recebidos-derivado, proximo-numero-faixas, get-participante-singular]
  affects: [resumo-endpoint, atualizar-cartoes]
tech_stack:
  added: []
  patterns: [selectinload-colecoes, flush-refresh-cadeia, rollback-por-excecao-pre-commit]
key_files:
  modified:
    - backend/routers/eventos.py
  created:
    - backend/tests/test_faixas.py
decisions:
  - "selectinload para faixas/itens (evita produto cartesiano do joinedload em 1:N)"
  - "rollback do DELETE invalido: excecao em _validar_reconciliacao antes do commit - sessao fecha sem commit no finally do get_db"
  - "ordem do GET singular declarada antes das rotas de faixas (3 segmentos) sem conflito - FastAPI casa por path exato"
metrics:
  duration_minutes: ~10
  completed_date: "2026-06-01"
  tasks_completed: 3
  files_modified: 1
  files_created: 1
---

# Fase 02 Plano 02: CRUD de Faixas + Recebidos Derivado - Summary

Implementou CRUD completo de faixas de cartao por participante, recebidos derivado da soma das faixas, `_proximo_numero` considerando faixas, e GET singular de participante para refetch granular do grid da Fase 3.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | Imports + _proximo_numero + _recalc_recebidos + _validar_reconciliacao | e93030e | OK |
| 2 | _carregar_participante + _aplicar_dados_faixa + _pos_mutacao_faixa + GET singular + CRUD faixas | e93030e | OK |
| 3 | test_faixas.py (8 testes cobrindo TEST-02, API-01/02/08/10) | e93030e | OK |

## Criterios de Sucesso

- [x] Criar faixa numerada e lote sem numero via API; qtd_cartoes_recebidos reflete a soma
- [x] Faixa numerada deriva quantidade = fim - ini + 1 ignorando qtd do payload
- [x] Validacoes 400: fim < ini, sem numero sem quantidade
- [x] DELETE que viola reconciliacao retorna 400 e nao remove
- [x] _proximo_numero considera max(numero_fim) das faixas (resumo reflete)
- [x] GET singular /eventos/{id}/participantes/{pid} retorna ParticipanteOut com jogador, faixas e itens (API-10); 404 se nao existe
- [x] pytest tests/test_faixas.py verde

## Resultado pytest

```
$ cd backend && python3 -m pytest tests/test_faixas.py -x -q
........                                                                 [100%]
8 passed, 21 warnings in 0.95s
```

Suite completa (14 testes, sem regressao):
```
$ python3 -m pytest -x -q
..............                                                           [100%]
14 passed, 21 warnings in 1.64s
```

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check

- [x] backend/routers/eventos.py modificado e funcional
- [x] backend/tests/test_faixas.py criado e 8/8 tests verdes
- [x] Commit e93030e existe

## Self-Check: PASSOU
