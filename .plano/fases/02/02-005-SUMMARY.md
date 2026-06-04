---
phase: 02-frontend-portal
plan: 02-005
subsystem: frontend
tags: [portal, eventos, card, liquido-colorido, empty-state]
requires: [02-002, 02-001]
provides: [EventosBloco]
affects: [transparencia/page.tsx, portal/index.ts]
tech_stack:
  patterns: [motion.section, Record<PortalCustoOrigem, string>, condicional-cor-liquido, EmptyState]
key_files:
  created:
    - frontend/src/components/portal/EventosBloco.tsx
  modified:
    - frontend/src/components/portal/index.ts
    - frontend/src/app/(public)/transparencia/page.tsx
decisions:
  - "Reutilizar Card e EmptyState existentes (criados nos planos 003/004), sem recriar"
  - "ROTULO_CUSTO como Record<PortalCustoOrigem, string> garante type-safety via exhaustive check"
  - "Cor do liquido via funcao corLiquido em vez de classes condicionais inline"
metrics:
  duration: ~10min
  completed: 2026-06-04
  tasks_completed: 2/2
  files_created: 1
  files_modified: 2
---

# Fase 02 Plano 005: Bloco Eventos (card por evento, liquido colorido) Summary

EventosBloco com card por evento exibindo arrecadado/custo/liquido, liquido colorido verde/vermelho por sinal, rotulo de custo conforme `custo_origem` (3 valores) e EmptyState quando lista vazia.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Criar EventosBloco.tsx | 11a0dbc | frontend/src/components/portal/EventosBloco.tsx |
| 2 | Atualizar barrel portal/index.ts + ligar na page | 11a0dbc | portal/index.ts, transparencia/page.tsx |

## O que foi implementado

### EventosBloco (`frontend/src/components/portal/EventosBloco.tsx`)

Componente client com `framer-motion` (section com `whileInView`). Props: `{ eventos: PortalEvento[] }`.

Logica central:

- `ROTULO_CUSTO`: `Record<PortalCustoOrigem, string>` mapeando `real->"Custo"`, `estimado->"Custo previsto"`, `sem_custo->"A confirmar"`. Type-safe: cobre exatamente os 3 valores do tipo `PortalCustoOrigem`.
- `corLiquido(n)`: retorna `"text-emerald-400"` (positivo), `"text-brand-red"` (negativo) ou `"text-txt-secondary"` (zero).
- Card por evento com `Card padding="md"` (reutilizado do plano 003):
  - Header: titulo (`font-display`, truncate) + data formatada via `formatDate` + chips de tipo e "em breve" (amber, so se `status === "planejado"`).
  - Grid 3 colunas: Arrecadou / rotulo-custo / Sobrou, com `formatCurrency` em cada valor.
  - Sobrou com classe de cor condicional via `corLiquido`.
- Estado vazio: `EmptyState` com icone `CalendarRange` (lucide), "Nenhum evento ainda".

### Barrel e page (edicao aditiva)

- `portal/index.ts`: linha `// export { EventosBloco }...` descomentada (exportacao ativa).
- `transparencia/page.tsx`: import adicionado ao destructuring existente; placeholder `<section>[eventos]</section>` substituido por `<EventosBloco eventos={data.eventos} />`. Hero, Caixa e placeholder de jogos preservados.

## Verificacao

```
tsc --noEmit: sem erros
npm run build: compilado com sucesso
  /transparencia  6.47 kB  257 kB first load
  18 paginas geradas sem erro
  Warning pré-existente em (app)/eventos/[id]/page.tsx (fora do escopo)
```

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

- [x] `frontend/src/components/portal/EventosBloco.tsx` existe
- [x] `ROTULO_CUSTO` presente com as 3 chaves (real/estimado/sem_custo)
- [x] "Custo previsto" e "A confirmar" no arquivo
- [x] `corLiquido` implementado
- [x] "Nenhum evento ainda" no EmptyState
- [x] `export { EventosBloco }` no barrel index.ts
- [x] `EventosBloco eventos={data.eventos}` na page de transparencia
- [x] HeroCaixa e CaixaBloco preservados na page
- [x] `tsc --noEmit` sem erros
- [x] `npm run build` limpo
- [x] Commit 11a0dbc no worktree
