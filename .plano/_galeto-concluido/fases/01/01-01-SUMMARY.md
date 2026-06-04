---
phase: 01-schema-migracao-backfill
plan: 01-01
subsystem: backend/database
tags: [sqlalchemy, models, schema, sqlite, postgres]
dependency_graph:
  requires: []
  provides: [EventoCartaoFaixa, EventoParticipanteItem, Evento.tipos_item, EventoParticipante.faixas, EventoParticipante.itens]
  affects: [backend/models.py]
tech_stack:
  added: []
  patterns: [Integer-as-bool, Text-ISO-dates, ForeignKey-ondelete-CASCADE, cascade-delete-orphan, unique-composite-index]
key_files:
  created: []
  modified: [backend/models.py]
decisions:
  - "tipos_item posicionada antes de created_at em Evento para manter ordem logica das colunas de configuracao do evento"
  - "EventoCartaoFaixa e EventoParticipanteItem adicionadas apos CampanhaDestinatario (ultimo modelo existente) para manter coesao historica do arquivo"
metrics:
  duration_mins: 8
  completed_at: "2026-06-01T15:34:14Z"
  tasks_completed: 5
  tasks_total: 5
  files_modified: 1
---

# Fase 01 Plano 01-01: Modelos SQLAlchemy + coluna tipos_item - Summary

Declaracao estritamente aditiva de dois novos modelos SQLAlchemy (EventoCartaoFaixa, EventoParticipanteItem) com FK CASCADE, indices e relationships bidirecionais em EventoParticipante com cascade delete-orphan, mais coluna Evento.tipos_item como Text nullable para armazenar JSON de tipos de item por evento.

## Tarefas Completadas

| Tarefa | Nome | Commit | Verificacao |
|--------|------|--------|-------------|
| 1 | Classe EventoCartaoFaixa | f4b97c8 | OK DB-01 |
| 2 | Classe EventoParticipanteItem | f4b97c8 | OK DB-02 |
| 3 | Coluna Evento.tipos_item | f4b97c8 | OK DB-03 + legadas intactas |
| 4 | Relationships faixas/itens em EventoParticipante | f4b97c8 | OK DB-04 + legadas participante intactas |
| 5 | Gate create_all SQLite in-memory | f4b97c8 | OK create_all gera 2 tabelas novas + tipos_item |

## O que foi implementado

### EventoCartaoFaixa (tabela `evento_cartao_faixa`)

7 colunas: `id`, `evento_participante_id` (FK CASCADE), `numero_inicio`, `numero_fim`, `quantidade`, `sem_numero` (Integer 0/1), `created_at` (Text ISO).
Indice: `ix_faixa_participante` em `evento_participante_id`.
Relationship: `participante` -> `EventoParticipante.faixas` (back_populates bidirecional).

### EventoParticipanteItem (tabela `evento_participante_item`)

5 colunas: `id`, `evento_participante_id` (FK CASCADE), `tipo` (Text not null), `qtd_vendido`, `qtd_pedido`.
Indices: `ix_item_participante` (simples) + `ix_item_part_tipo` (UNIQUE em `(evento_participante_id, tipo)`) -- garante upsert seguro na Fase 2.
Relationship: `participante` -> `EventoParticipante.itens` (back_populates bidirecional).

### Evento.tipos_item

Coluna Text nullable inserida antes de `created_at` em `class Evento`. Armazena JSON serializado (ex: `'["cru","assado"]'`). NULL ou `"[]"` significa sem split por tipo. Serializacao/deserializacao fica na camada de aplicacao (Fase 2).

### Relationships em EventoParticipante

`faixas` e `itens` adicionados apos os relationships existentes `evento` e `jogador`. Ambos com `cascade="all, delete-orphan"` e `order_by` por `id` para ordenacao deterministica. `configure_mappers()` valida os dois grafos bidirecionais sem erro.

## Conformidade MIG-05

Nenhuma coluna existente foi removida ou renomeada:
- `Evento`: 18 colunas legadas intactas (verificado por assert no DB-03)
- `EventoParticipante`: colunas `numero_inicio`, `numero_fim`, `qtd_cartoes_recebidos`, `qtd_vendidos`, `qtd_devolvidos`, `qtd_pagou_custo` intactas (verificado por assert no DB-04)

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check

**Arquivos verificados:**
- `backend/models.py`: ENCONTRADO (modificado, 54 linhas inseridas)

**Commits verificados:**
- `f4b97c8`: ENCONTRADO (feat(01-01): modelos EventoCartaoFaixa e EventoParticipanteItem + coluna tipos_item)

**Verificacoes automatizadas (todas passaram):**
- DB-01: EventoCartaoFaixa - estrutura, indice, FK CASCADE
- DB-02: EventoParticipanteItem - estrutura, indices (simples + UNIQUE), FK CASCADE
- DB-03: Evento.tipos_item presente + 18 colunas legadas intactas
- DB-04: relationships faixas/itens com delete-orphan + colunas legadas de participante intactas
- Tarefa 5: create_all SQLite in-memory cria as 2 tabelas novas + tipos_item em eventos

## Self-Check: PASSOU
