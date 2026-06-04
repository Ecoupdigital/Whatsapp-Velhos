---
phase: 03-frontend
plan: 03-01
subsystem: frontend
tags: [types, typescript, foundation]
dependency_graph:
  requires: []
  provides: [FaixaOut, FaixaCreate, FaixaUpdate, ItemTipo, ItensUpdate, ItemOut, ResumoItemTipo, EventoOut.tipos_item, ParticipanteOut.faixas, ParticipanteOut.itens, EventoResumo.itens_por_tipo]
  affects: [frontend/src/types/index.ts]
tech_stack:
  added: []
  patterns: [espelhamento snake_case Pydantic -> TypeScript interface]
key_files:
  modified: [frontend/src/types/index.ts]
decisions:
  - "sem_numero exposto como boolean (nao number) seguindo decisao do SYSTEM-DESIGN secao 4.1 (Pydantic v2 coerce 0/1->bool no FaixaOut)"
  - "FaixaOut/ItemOut/ResumoItemTipo declaradas antes de ParticipanteOut/EventoResumo para garantir ordem logica (em TS de modulo a ordem nao importa para interface, mas seguimos convencao legivel)"
  - "tipos_item em EventoOut declarado como non-optional (string[] | null) espelhando backend onde validator retorna None mas campo sempre presente na resposta"
metrics:
  completed: "2026-06-01"
  tasks_completed: 4
  files_modified: 1
  lines_added: 57
---

# Fase 03 Plano 01: Tipos TS (fundacao de dados) Summary

Adicionados 7 interfaces TypeScript novas em `frontend/src/types/index.ts` e extensao de 5 interfaces existentes para espelhar os schemas Pydantic da Fase 2 (faixas, itens por tipo, resumo consolidado). Nenhuma UI alterada.

## Tarefas Executadas

| Tarefa | Descricao | Commit |
|--------|-----------|--------|
| 1 | Verificacao do contrato backend (grep em schemas.py) | sem commit (verificacao) |
| 2 | 7 interfaces novas (Faixa*, Item*, ResumoItemTipo) | 111334b |
| 3 | Extensoes em EventoCreate/Update/Out, ParticipanteOut, EventoResumo | 111334b |
| 4 | tsc --noEmit: zero erros | 111334b |

## Verificacao do Contrato (Tarefa 1)

Campos confirmados no backend real (main):

- `FaixaOut`: id, evento_participante_id, numero_inicio, numero_fim, quantidade, sem_numero (bool via field_validator coerce), created_at
- `FaixaCreate`: sem_numero=False, numero_inicio?, numero_fim?, quantidade?
- `FaixaUpdate`: todos opcionais
- `ItemTipo`: tipo, qtd_vendido (ge=0), qtd_pedido (ge=0)
- `ItensUpdate`: itens: list[ItemTipo]
- `ItemOut`: id, tipo, qtd_vendido, qtd_pedido
- `ResumoItemTipo`: tipo, total_vendido, total_pedido
- `EventoCreate/Update`: tipos_item?: Optional[list[str]]
- `EventoOut`: tipos_item com field_validator que deserializa JSON do banco
- `ParticipanteOut`: faixas: list[FaixaOut] = [], itens: list[ItemOut] = []
- `EventoResumo`: itens_por_tipo: list[ResumoItemTipo] = []

Nenhuma divergencia entre SYSTEM-DESIGN e implementacao real do backend.

## Criterios de Sucesso

- [x] 7 interfaces novas (FaixaOut, FaixaCreate, FaixaUpdate, ItemTipo, ItensUpdate, ItemOut, ResumoItemTipo) existem
- [x] EventoOut/Create/Update tem tipos_item
- [x] ParticipanteOut tem faixas e itens
- [x] EventoResumo tem itens_por_tipo
- [x] Nenhum campo legado removido (numero_inicio, numero_fim, qtd_cartoes_recebidos intactos)
- [x] npx tsc --noEmit sem erro novo em types/index.ts

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check

Verificacoes:

- `frontend/src/types/index.ts`: ENCONTRADO
- Commit `111334b`: ENCONTRADO (git log confirmado)
- 7 interfaces via grep: ENCONTRADO (linhas 290, 300, 307, 316, 322, 326, 333)
- tipos_item em 3 interfaces: ENCONTRADO (linhas 201, 221, 243)
- faixas + itens em ParticipanteOut: ENCONTRADO (linhas 275, 276)
- itens_por_tipo em EventoResumo: ENCONTRADO (linha 370)
- tsc --noEmit: zero erros (saida vazia = sucesso)

## Self-Check: PASSOU
