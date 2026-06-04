---
phase: 02-api
plan: 02-05
subsystem: backend
tags: [api, resumo, agregacao, itens_por_tipo]
requires: [02-01, 02-03]
provides: [API-06]
affects: [EventoResumo, resumo_evento]
tech-stack:
  added: []
  patterns: [SQLAlchemy group_by + func.sum + func.coalesce, join cross-table aggregation]
key-files:
  modified: [backend/routers/eventos.py]
  created: [backend/tests/test_resumo.py]
decisions:
  - "Agrega EventoParticipanteItem via join em EventoParticipante filtrando evento_id (sem subquery)"
  - "func.coalesce garante 0 ao inves de NULL quando nenhum item existe para o tipo"
metrics:
  tasks_completed: 3
  tests_added: 2
  tests_total: 26
  completed_date: "2026-06-01"
---

# Fase 02 Plano 05: Resumo com itens_por_tipo - Summary

Endpoint `GET /eventos/{id}/resumo` estendido com `itens_por_tipo`: agregacao SQLAlchemy de `EventoParticipanteItem` via `group_by(tipo)` + `join(EventoParticipante)`, retornando `{tipo, total_vendido, total_pedido}` consolidado sobre todos os participantes do evento.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Agregacao itens_por_tipo em resumo_evento | 5880373 | backend/routers/eventos.py |
| 2 | Testes API-06 | 8b5548c | backend/tests/test_resumo.py |
| 3 | Verificacao regressao suite completa | (no-commit) | - |

## O que foi feito

### Tarefa 1 - Agregacao no resumo_evento

Adicionado `ResumoItemTipo` ao import de schemas em `eventos.py`.

Query inserida em `resumo_evento` antes do `return`:

```python
rows = (
    db.query(
        EventoParticipanteItem.tipo,
        func.coalesce(func.sum(EventoParticipanteItem.qtd_vendido), 0),
        func.coalesce(func.sum(EventoParticipanteItem.qtd_pedido), 0),
    )
    .join(EventoParticipante, EventoParticipante.id == EventoParticipanteItem.evento_participante_id)
    .filter(EventoParticipante.evento_id == evento_id)
    .group_by(EventoParticipanteItem.tipo)
    .all()
)
itens_por_tipo = [
    ResumoItemTipo(tipo=t, total_vendido=int(v or 0), total_pedido=int(ped or 0))
    for (t, v, ped) in rows
]
```

`itens_por_tipo=itens_por_tipo` passado ao construtor de `EventoResumo`. Campos de cartoes (`cartoes_emitidos`, `cartoes_vendidos`, etc.) preservados intactos.

### Tarefa 2 - Testes

`test_resumo.py` com 2 testes:
- `test_resumo_itens_por_tipo_consolida`: 2 participantes com splits diferentes; verifica soma correta por tipo (cru: 9+2, assado: 9+4).
- `test_resumo_sem_itens_lista_vazia`: evento sem itens retorna `itens_por_tipo: []`.

### Tarefa 3 - Regressao

Suite completa:

```
26 passed, 21 warnings in 2.70s
```

Todos os testes de faixas (02-02), itens (02-03), tipos/popular (02-04), migracoes (01-02/01-03) e resumo (02-05) passam juntos sem conflito.

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

- [x] `backend/routers/eventos.py` modificado com aggregation e import
- [x] `backend/tests/test_resumo.py` criado com 2 testes
- [x] Commit `5880373` existe (feat 02-05)
- [x] Commit `8b5548c` existe (test 02-05)
- [x] Suite 26 passed, 0 failed
