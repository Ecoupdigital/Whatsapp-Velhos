---
phase: 02-api
plan: 02-03
subsystem: backend
tags: [api, itens, galeto, validacao, testes]
requirements_covered: [API-03, TEST-03]
depends_on: [02-01]
tech_stack:
  patterns:
    - upsert-por-tipo com substituicao total (DELETE ausentes + INSERT/UPDATE presentes)
    - validacao de fechamento soma == campo de referencia (400 com mensagem clara)
    - helper de desserializacao defensiva de JSON armazenado em coluna Text
key_files:
  modified:
    - backend/routers/eventos.py
  created:
    - backend/tests/test_itens.py
decisions:
  - "_carregar_participante ja existia (criado pelo 02-02 em paralelo); reutilizado sem redefini-lo"
  - "_tipos_do_evento adicionado apos _carregar_participante por clareza de dominio"
  - "endpoints de itens inseridos antes da secao de pagamentos para agrupamento logico"
metrics:
  completed_at: "2026-06-01T15:59:50Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 1
  files_created: 1
  commit: "4c34899"
---

# Fase 02 Plano 03: PUT Itens por Tipo (Cru/Assado) Summary

Implementacao de substituicao total dos itens por tipo de um participante de evento, com validacao de pertencimento ao evento e fechamento da soma de vendidos.

## Tarefas Executadas

| Tarefa | Descricao | Status | Commit |
|--------|-----------|--------|--------|
| 1 | Imports + helpers `_tipos_do_evento` / `_carregar_participante` | Concluida | 4c34899 |
| 2 | GET + PUT `/itens` endpoints com upsert e validacao | Concluida | 4c34899 |
| 3 | `tests/test_itens.py` com 5 casos TEST-03 | Concluida | 4c34899 |

## Criterios de Sucesso

- [x] PUT itens com soma != vendidos retorna 400 com mensagem clara
- [x] PUT itens que fecha persiste e aparece em `ParticipanteOut.itens`
- [x] Tipo fora de `evento.tipos_item` retorna 400
- [x] Substituicao total: tipo omitido no payload e removido
- [x] `qtd_pedido` aceito sem validacao de soma
- [x] `pytest tests/test_itens.py` verde (5/5)

## Saida do pytest

```
collected 5 items

tests/test_itens.py::test_split_que_nao_fecha_400 PASSED
tests/test_itens.py::test_split_que_fecha_persiste PASSED
tests/test_itens.py::test_tipo_fora_do_evento_400 PASSED
tests/test_itens.py::test_substituicao_total_remove_tipo_omitido PASSED
tests/test_itens.py::test_lista_vazia_exige_vendidos_zero PASSED

5 passed, 20 warnings in 0.72s
```

Suite completa (19 testes, incluindo test_migrations + test_schemas_smoke + test_faixas): 19 passed, 0 failed.

## Desvios do Plano

### Desvios Auto-resolvidos

**[Regra 4 - Adaptacao] `_carregar_participante` ja existia (02-02 aplicado em paralelo)**
- Encontrado durante: Tarefa 1
- Situacao: O plano previa que `_carregar_participante` poderia nao existir. O 02-02 ja o havia criado com `selectinload` para `faixas` e `itens`, o que e superior ao loader minimo do plano (apenas `joinedload(evento)`).
- Acao: Nao redefini o helper; reutilizei como estava. O `selectinload(itens)` ja carregado beneficia o `db.refresh(p)` do PUT.
- Nenhum conflito de merge.

Nenhum outro desvio - plano executado praticamente como escrito.

## Self-Check: PASSOU

- [x] `backend/routers/eventos.py` modificado existe
- [x] `backend/tests/test_itens.py` criado existe
- [x] Commit `4c34899` existe no historico git
- [x] `python3 -c "from routers.eventos import _tipos_do_evento, _carregar_participante, EventoParticipanteItem"` retorna ok
- [x] `python3 -c "from routers.eventos import atualizar_itens, listar_itens"` retorna ok
- [x] 5 testes de itens passando; 19 testes totais passando
