---
phase: 03-frontend
plan: 03-05
subsystem: frontend
tags: [faixas, grid, crud-inline, cartoes, participantes]
dependency_graph:
  requires: [03-01, 03-04, 03-06]
  provides: [FaixasPanel, renderExpanded com faixas]
  affects: [eventos/[id]/page.tsx, ParticipantesGrid renderExpanded]
tech_stack:
  added: []
  patterns: [crud-inline-expandable, optimistic-update-from-response]
key_files:
  created:
    - frontend/src/components/eventos/FaixasPanel.tsx
  modified:
    - frontend/src/app/(app)/eventos/[id]/page.tsx
decisions:
  - "Usar ParticipanteOut retornado pelo endpoint direto para atualizar state (sem refetch extra)"
  - "Aposentar modal Cartoes antigo pois inline + faixas cobrem 100% do caso de uso"
metrics:
  duration_secs: ~420
  completed_at: "2026-06-01T16:30:56Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 1
---

# Fase 03 Plano 05: Sub-linha expansivel de faixas - Summary

FaixasPanel com CRUD completo de faixas de cartao (numerada e lote sem numero), integrado ao slot `renderExpanded` do grid, com atualizacao otimista via resposta do endpoint e aposentadoria do modal Cartoes orfao.

## Tarefas Completadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|---------|
| 1 | Criar FaixasPanel.tsx | 9529f60 | FaixasPanel.tsx (novo) |
| 2 | Integrar FaixasPanel ao renderExpanded | 9529f60 | page.tsx |
| 3 | Build limpo + aposentar modal Cartoes | 9529f60 | page.tsx |

## Detalhes de Implementacao

### FaixasPanel.tsx

Componente `"use client"` com todo o CRUD de faixas inline:

- Lista cada faixa com label derivado: numerada exibe `ini - fim (N cartoes)`, lote sem numero exibe `Sem numero (N cartoes)`
- Adicionar faixa numerada: inputs `inicio`/`fim` com validacao (fim >= ini)
- Adicionar lote sem numero: input `quantidade` com validacao (>= 1)
- Editar in-place: numerada mostra inputs ini/fim, lote mostra input quantidade
- Remover com `confirm()` + toast de sucesso/erro

Cada mutacao chama `api.post/put/delete` e passa a resposta (`ParticipanteOut`) para `onMutated`. O pai usa o `ParticipanteOut` retornado para atualizar o estado diretamente, sem refetch extra (Recebidos ja recalculado no backend).

### Integracao no page.tsx

`renderExpanded` agora retorna:
1. `<FaixasPanel>` com `onMutated` que: atualiza o participante no state (ou faz refetch se resposta nao vier tipada), e reatualiza o resumo do evento via `api.get resumo`
2. Divisor `border-t`
3. Historico de pagamentos (logica anterior mantida intacta)

### Modal Cartoes aposentado

Simbolos removidos completamente de `page.tsx`:
- States: `cartoesModalOpen`, `cartoesParticipante`, `cartoesForm`, `cartoesSaving`
- Handler: `handleSaveCartoes`
- JSX: `<Modal open={cartoesModalOpen}>...</Modal>` (~78 linhas)

Nenhuma referencia remanescente (verificado via grep).

## Desvios do Plano

Nenhum - plano executado exatamente como escrito. As tarefas 2 e 3 foram executadas sequencialmente no mesmo arquivo (`page.tsx`) e commitadas atomicamente junto com a tarefa 1 (todos os artefatos do plano num unico commit coeso).

## Self-Check

### Arquivos criados existem

- `frontend/src/components/eventos/FaixasPanel.tsx`: ENCONTRADO
- `frontend/src/app/(app)/eventos/[id]/page.tsx` (modificado): ENCONTRADO

### Commits existem

- `9529f60`: ENCONTRADO

### Build

- `npx tsc --noEmit`: OK (sem output = sem erros)
- `npm run build`: OK (17/17 paginas, `/eventos/[id]` 11.8 kB, sem erros)

### Criterios de sucesso

- [x] Expandir participante mostra painel de faixas
- [x] Adicionar faixa numerada (inicio/fim) funciona, inclusive faixas quebradas
- [x] Adicionar lote sem numero (quantidade) funciona e exibe "Sem numero (N cartoes)"
- [x] Editar e remover faixa funcionam; remocao invalida retorna 400 com toast
- [x] Recebidos do participante recalcula apos mutacao (via ParticipanteOut retornado)
- [x] `npx tsc --noEmit` e `npm run build` passam; modal antigo aposentado
- [ ] Capturas visuais (checkpoint:human-verify - tarefa 4)

## Self-Check: PASSOU
