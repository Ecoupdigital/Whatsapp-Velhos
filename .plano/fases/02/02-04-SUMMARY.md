---
phase: 02-api
plan: 02-04
subsystem: backend
tags: [api, eventos, tipos_item, popular_elenco, atualizar_cartoes, faixas]
requires: [02-01, 02-02]
provides: [API-04, API-05, API-07]
affects: [backend/routers/eventos.py, backend/tests/test_evento_tipos_e_popular.py]
tech_stack:
  patterns: [json.dumps/loads, field_validator, selectinload, _recalc_recebidos, _proximo_numero]
key_files:
  modified:
    - backend/routers/eventos.py
  created:
    - backend/tests/test_evento_tipos_e_popular.py
decisions:
  - "atualizar_cartoes carrega faixas com selectinload para _recalc_recebidos ter acesso a p.faixas sem lazy-load"
  - "popular_elenco usa db.flush() + db.refresh(p) antes de _recalc_recebidos para garantir faixa em p.faixas"
metrics:
  completed_at: "2026-06-01"
  tasks: 4
  files_modified: 1
  files_created: 1
  tests_before: 19
  tests_after: 24
---

# Fase 02 Plano 04: tipos_item no Evento + Refactor popular/cartoes - Summary

**One-liner:** Serializacao JSON de tipos_item em criar/atualizar evento + popular_elenco cria 1 faixa numerada por jogador + atualizar_cartoes deriva recebidos das faixas.

## Tarefas Executadas

| Tarefa | Descricao | Commit |
|--------|-----------|--------|
| 1 | Serializar tipos_item (json.dumps) em `criar` e `atualizar` | 4abb809 |
| 2 | Refactor `popular_elenco`: 1 faixa numerada por jogador (API-04) | 6a514e3 |
| 3 | Refactor `atualizar_cartoes`: recebidos derivado, ignora payload (API-05) | b6454f0 |
| 4 | Testes cobrindo API-04, API-05, API-07 | e13c4a8 |

## O que foi implementado

### Tarefa 1 - tipos_item no Evento (API-07)

`criar` e `atualizar` no router agora serializam `tipos_item` com `json.dumps` antes de persistir na coluna Text do SQLite. A leitura ja era tratada pelo `field_validator` em `EventoOut` (adicionado no plano 02-01). O campo `json` ja estava importado no topo do arquivo.

### Tarefa 2 - popular_elenco com faixas (API-04)

Substituido o bloco que setava `numero_inicio`, `numero_fim` e `qtd_cartoes_recebidos` diretamente no `EventoParticipante` por criacao de 1 `EventoCartaoFaixa` numerada para cada jogador com `qtd > 0`. Fluxo:

1. `db.flush()` apos `db.add(p)` para garantir `p.id` disponivel para a FK da faixa
2. Cria `EventoCartaoFaixa` com `_proximo_numero` sequencial (sem colisao entre jogadores)
3. `db.flush()` + `db.refresh(p)` para que `p.faixas` reflita a nova faixa
4. `_recalc_recebidos(p)` deriva `qtd_cartoes_recebidos` da soma da faixa

### Tarefa 3 - atualizar_cartoes derivado (API-05)

Removido o bloco antigo de auto-ajuste de `numero_fim/numero_inicio` baseado no payload. Agora:

- Apenas `qtd_vendidos`, `qtd_devolvidos`, `qtd_pagou_custo` sao aplicados do payload
- `qtd_cartoes_recebidos`, `numero_inicio`, `numero_fim` do payload sao ignorados (retrocompat: schema ainda os aceita mas nao aplica)
- `selectinload(EventoParticipante.faixas)` adicionado ao query para `_recalc_recebidos` ter acesso a `p.faixas` sem acionar lazy-load apos a sessao fechar

### Tarefa 4 - Testes

5 novos testes em `test_evento_tipos_e_popular.py`:

- `test_criar_e_atualizar_tipos_item`: POST cria com lista, GET retorna lista, PUT altera
- `test_evento_sem_tipos_item_retorna_none`: sem tipos_item retorna None
- `test_popular_elenco_cria_faixa_por_jogador`: 2 jogadores, cada um com 1 faixa, numeros sequenciais sem colisao
- `test_atualizar_cartoes_ignora_recebidos_do_payload`: payload recebidos=999 ignorado, resultado = 10 (da faixa)
- `test_atualizar_cartoes_reconciliacao_400`: vendidos > recebidos retorna 400

## Resultado dos Testes

```
24 passed, 21 warnings in 2.33s
```

19 testes pre-existentes + 5 novos = 24 total. Zero regressao.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] selectinload faltando em atualizar_cartoes**

- **Encontrado durante:** Tarefa 3
- **Issue:** O plano especificava carregar o participante com `joinedload(evento)` e `joinedload(jogador)`, mas nao mencionava `selectinload(faixas)`. Sem isso, `_recalc_recebidos(p)` acessa `p.faixas` (lazy-load) apos o contexto de session poder estar fechado, ou retorna colecao vazia em alguns contextos de teste.
- **Correcao:** Adicionado `selectinload(EventoParticipante.faixas)` ao query de `atualizar_cartoes`, identico ao padrao ja usado em `_carregar_participante`.
- **Arquivos modificados:** `backend/routers/eventos.py`
- **Commit:** b6454f0

## Self-Check: PASSOU

- [x] `backend/routers/eventos.py` existe e foi modificado
- [x] `backend/tests/test_evento_tipos_e_popular.py` criado
- [x] Commits 4abb809, 6a514e3, b6454f0, e13c4a8 existem no log
- [x] 24 testes passando, zero regressao
