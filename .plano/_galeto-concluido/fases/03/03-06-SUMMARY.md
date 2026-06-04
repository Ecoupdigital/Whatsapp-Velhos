---
phase: 03-frontend
plan: 03-06
subsystem: frontend
tags: [grid, inline-edit, participantes, evento]
dependency_graph:
  requires: [03-04]
  provides: [UI-01, UI-03, TEST-05]
  affects: [frontend/src/app/(app)/eventos/[id]/page.tsx]
tech_stack:
  patterns: [ParticipantesGrid, EditableCell, inline-edit, renderExpanded]
key_files:
  modified:
    - frontend/src/app/(app)/eventos/[id]/page.tsx
decisions:
  - "Remover openCartoesModal (funcao sem callers apos remocao do card antigo); modal de cartoes permanece no JSX para aposentadoria no 03-05"
  - "AnimatePresence, X, ChevronDown removidos do import lucide pois eram usados apenas nos cards antigos"
metrics:
  completed_date: "2026-06-01"
  tasks_completed: 3
  tasks_total: 4
  files_changed: 1
---

# Fase 03 Plano 06: Integrar grid na pagina (substituir lista) + build + prova

Grid inline editavel integrado na pagina do evento substituindo a lista de cards de participantes por tabela com autosave em blur/Enter, colunas dinamicas por tipo e historico expansivel.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | Import ParticipantesGrid no page.tsx | ad946b5 | completo |
| 2 | Substituir lista de cards pelo grid com props completas | ad946b5 | completo |
| 3 | Build limpo (tsc + eslint + next build) | ad946b5 | completo |
| 4 | Checkpoint visual (UI-01, UI-03, TEST-05) | - | aguarda verificacao |

## O que foi feito

### Tarefa 1 e 2 - Integracao do grid

Substituido o bloco `AnimatePresence` + `filtered.map` de cards (~168 linhas) pelo componente `<ParticipantesGrid>` (~35 linhas) com:

- `participantes={filtered}` e `evento={evento}` passados diretamente
- `expandedId`/`onToggleExpand` preservando o estado de historico expandido
- `onPay={openPayModal}` e `onRemove={handleRemoverParticipante}` mantendo pagar e remover funcionais
- `commitCartaoCampo` e `commitItemCampo` ligados (handlers do 03-04)
- `nomeParticipante` e `statusDerivado={pStatusDerivado}` passados como funcoes
- `renderExpanded` inline renderizando historico de pagamentos com botao de estorno

### Tarefa 3 - Build limpo

Removidos 4 items orfaos apos a remocao dos cards:
- `AnimatePresence` do import framer-motion (usada so nos cards)
- `X` e `ChevronDown` do import lucide (usados so nos cards)
- `openCartoesModal` (funcao que abria o modal antigo via botao no card)

`npm run build` passou: tsc sem erros, eslint sem warnings, 17 paginas geradas.

## Desvios do Plano

Nenhum - plano executado exatamente como escrito. Os 4 imports orfaos apontados pelo build eram os exatamente previstos no plano ("Corrigir: imports lucide agora orfaos por causa da remocao da lista de cards").

## Self-Check

```
[ -f "frontend/src/app/(app)/eventos/[id]/page.tsx" ] -> ENCONTRADO
git log --oneline | grep ad946b5 -> ENCONTRADO
npm run build -> PASSOU (17 paginas, sem erros)
```

## Self-Check: PASSOU

Arquivo modificado existe, commit `ad946b5` existe, build passou sem erros.

## Proximo Passo

Tarefa 4 e checkpoint:human-verify. Backend Fase 2 rodando com evento Galeto (tipos_item configurados) e participantes. Verificar no navegador:
1. Grid renderiza com colunas por tipo
2. Edicao inline salva e recalcula Valor sem modal
3. Erro 400 reverte celula + toast
4. Pagar/remover/historico/estornar funcionam
5. Evento sem tipos_item: colunas de split ausentes
