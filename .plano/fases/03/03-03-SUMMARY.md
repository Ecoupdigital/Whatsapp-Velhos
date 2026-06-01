---
phase: 03-frontend
plan: 03-03
subsystem: frontend
tags: [ui, estatistica, cru-assado, card, galeto]
dependency_graph:
  requires: [03-01]
  provides: [UI-05, TEST-04-parcial]
  affects: [frontend/src/app/(app)/eventos/[id]/page.tsx]
tech_stack:
  patterns: [motion.div, condicional por dados, tabela com tfoot de totais]
key_files:
  modified:
    - frontend/src/app/(app)/eventos/[id]/page.tsx
decisions:
  - "Total a repassar calculado como quantidade (unidades), nao valor monetario, conforme SYSTEM-DESIGN 5.3"
  - "Card condicional: so aparece quando itens_por_tipo tem ao menos 1 entrada; evento sem tipos nao mostra o bloco"
metrics:
  duration_secs: ~120
  completed_date: "2026-06-01T16:20:52Z"
  tasks_completed: 3
  tasks_total: 4
  files_modified: 1
---

# Fase 03 Plano 03: Card de Estatistica Consolidada (Cru x Assado) - Summary

Card de resumo "Relacao Cru x Assado" inserido em page.tsx, lendo `resumo.itens_por_tipo` via estado ja carregado, exibindo por tipo (vendido + pedido) e totalizando linha de rodape com soma geral.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | Import icone `Flame` de lucide-react | e89fac9 | Concluida |
| 2 | Inserir card condicional com tabela cru x assado | e89fac9 | Concluida |
| 3 | tsc --noEmit sem erros novos | e89fac9 | Concluida |
| 4 | Checkpoint visual (TEST-04) | - | Aguardando verificacao humana |

## O que foi implementado

### Card "Relacao Cru x Assado (a repassar)"

Inserido entre o bloco "Stats Cartoes" e o bloco "Toolbar + Filtros" em page.tsx. O card:

- Renderiza somente quando `resumo && resumo.itens_por_tipo && resumo.itens_por_tipo.length > 0`
- Cabecalho: icone `Flame` (laranja) + label "Relacao Cru x Assado (a repassar)"
- Tabela responsiva (overflow-x-auto) com 4 colunas: Tipo, Vendido, Pedido, Total a repassar
- Corpo: uma linha por tipo do array `itens_por_tipo`, com capitalize no nome do tipo
- Cores: vendido em `text-emerald-400`, pedido em `text-blue-400`, total a repassar em bold
- Rodape: linha "Total geral" com `reduce` somando as tres colunas; total geral em `text-orange-400`
- Animacao `motion.div` com `delay: 0.09` (entre cartoes em 0.08 e toolbar em 0.1)

### Logica de calculo

- Por tipo: `it.total_vendido + it.total_pedido` (cartoes vendidos a clientes + consumo do jogador)
- Total geral vendido: `reduce((s, it) => s + it.total_vendido, 0)`
- Total geral pedido: `reduce((s, it) => s + it.total_pedido, 0)`
- Total geral a repassar: `reduce((s, it) => s + it.total_vendido + it.total_pedido, 0)`
- Sem fetch extra: le exclusivamente do estado `resumo` ja populado pelo `fetchAll` via `GET /eventos/${id}/resumo`

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito.

## Self-Check

- [x] `Flame` importado: `grep -nE "^\s*Flame," page.tsx` retorna linha 28
- [x] Card inserido: `grep -nE "Relacao Cru x Assado|itens_por_tipo\.map|Total a repassar"` retorna 4 matches
- [x] Commit e89fac9 existe: `git log --oneline | grep e89fac9` confirma
- [x] `tsc --noEmit` sem erros em page.tsx: retornou "OK"

## Self-Check: PASSOU

## Pendente

Tarefa 4 (checkpoint:human-verify - TEST-04): verificacao visual com backend rodando e evento Galeto com tipos preenchidos. Card nao aparece para eventos sem tipos, o que e o comportamento correto.
