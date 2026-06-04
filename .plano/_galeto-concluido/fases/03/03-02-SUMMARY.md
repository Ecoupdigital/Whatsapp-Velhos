---
phase: 03-frontend
plan: 03-02
subsystem: frontend
tags: [ui, modal, evento, tipos_item, galeto]
dependency_graph:
  requires: [03-01]
  provides: [tipos_item-config-ui]
  affects: [03-03, 03-04]
tech_stack:
  patterns: [controlled-input, csv-to-array, edit-form-pattern]
key_files:
  modified:
    - frontend/src/app/(app)/eventos/[id]/page.tsx
decisions:
  - "Campo tipos_item armazenado como string CSV no EditForm para simplicidade de edicao; convertido para string[] normalizado (trim+lowercase) no submit"
metrics:
  completed_date: "2026-06-01"
  tasks_completed: 4
  tasks_total: 5
  files_modified: 1
---

# Fase 03 Plano 02: Config de tipos de item no evento - Summary

**One-liner:** Campo "Tipos de item (Galeto)" no modal de editar evento com persistencia CSV->array via PUT /eventos/{id}.tipos_item.

## O que foi implementado

Adicao cirurgica ao modal "Editar Evento" em `frontend/src/app/(app)/eventos/[id]/page.tsx`:

1. `interface EditForm` recebeu campo `tipos_item: string` (CSV no form).
2. Estado default inicializado com `tipos_item: ""`.
3. `openEditModal` pre-preenche o campo com `(evento.tipos_item || []).join(", ")`, garantindo round-trip correto.
4. Novo bloco UI inserido apos "Cartoes (opcional)" e antes de "Custo Estimado/Real": secao com label "Tipos de item (Galeto)", `<Input>` com placeholder "cru, assado" e texto explicativo.
5. `handleEditSubmit` serializa o CSV para `string[]` via `.split(",").map(trim+lowercase).filter(naoVazio)` no payload PUT.

## Commits

| Tarefa | Descricao | Commit |
|--------|-----------|--------|
| 1-4 | EditForm + UI + serializacao + tsc OK | 174f1cc |

## Verificacao funcional

- `npx tsc --noEmit` sem erros em `eventos/[id]/page.tsx` nem em nenhum outro arquivo do projeto.
- `updateEditField("tipos_item", ...)` funciona diretamente pois a funcao e generica sobre `keyof EditForm` (sem modificacao necessaria).

## Checkpoint visual pendente

Tarefa 5 e `checkpoint:human-verify`. O gate visual da fase cobrira:
- Campo "Tipos de item (Galeto)" visivel no modal ao clicar "Editar"
- Digitar "cru, assado", salvar: PUT deve conter `"tipos_item":["cru","assado"]`
- Reabrir modal: campo deve mostrar "cru, assado" pre-preenchido

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito.

## Self-Check: PASSOU

- [x] `frontend/src/app/(app)/eventos/[id]/page.tsx` modificado e presente
- [x] Commit 174f1cc existe no repositorio
- [x] `tsc --noEmit` limpo (sem output = sem erros)
- [x] `tipos_item` presente em `interface EditForm`, no estado default, em `openEditModal` e em `handleEditSubmit`
