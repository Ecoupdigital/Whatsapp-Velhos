---
phase: 02-frontend-portal
plan: 02-003
subsystem: frontend
tags: [portal, hero, caixa, components, framer-motion]
requires: [02-001, 02-002]
provides: [HeroCaixa, CaixaBloco, components/portal/index.ts]
affects: [frontend/src/app/(public)/transparencia/page.tsx]
tech_stack:
  patterns: [framer-motion fade+slide, lucide-react icons, Card reutilizavel, design tokens Tailwind]
key_files:
  created:
    - frontend/src/components/portal/HeroCaixa.tsx
    - frontend/src/components/portal/CaixaBloco.tsx
    - frontend/src/components/portal/index.ts
  modified:
    - frontend/src/app/(public)/transparencia/page.tsx
decisions:
  - "Card.tsx ja existia com padding='md'; reutilizado sem modificacao"
  - "Barrel index.ts criado com linhas comentadas para planos 004/005/006"
  - "transparencia/page.tsx: imports descomentados, placeholders substituidos pelos componentes reais"
metrics:
  duration_mins: 15
  completed_at: "2026-06-04T14:34:27Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 1
---

# Fase 02 Plano 003: Bloco Hero + Bloco Caixa (cards e badges) - Summary

Hero com escudo + saldo heroi formatado + carimbo BRT; CaixaBloco com cards entrou/saiu e badges de atraso; barrel portal exportando os dois; page transparencia ligada.

## Tarefas Executadas

| # | Tarefa | Status | Commit |
|---|--------|--------|--------|
| 1 | HeroCaixa.tsx | Completo | 7de022b |
| 2 | CaixaBloco.tsx | Completo | 7de022b |
| 3 | Barrel index.ts + page ligada | Completo | 7de022b |

## O que foi implementado

### HeroCaixa.tsx

Componente client com framer-motion. Recebe `PortalMeta` e `PortalCaixa` por props.

- Escudo `icon-192.svg` 64px com `shadow-brand`
- `h1` "Velhos Parceiros F.C." em `font-display text-xl`
- Label "Prestacao de Contas" em `font-body uppercase tracking-[0.2em] text-txt-secondary`
- Label "Saldo em caixa" em `text-txt-tertiary text-xs uppercase`
- Numero heroi `text-4xl sm:text-5xl font-display tabular-nums`: `text-brand-red` se negativo, `text-txt-primary` se positivo
- Carimbo `formatAtualizadoEm(meta.atualizado_em)` em `text-xs text-txt-tertiary`
- Animacao `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}`

### CaixaBloco.tsx

Componente client com framer-motion `whileInView`. Recebe `PortalCaixa`.

- Titulo com icone `<Wallet>` lucide em `text-brand-red`
- Grid 2 colunas: card "Entrou" com valor em `text-emerald-400`, card "Saiu" com valor em `text-brand-red`
- Slot `<div data-slot="fluxo">` preservado para plano 004 injetar `FluxoChart`
- Badges `rounded-full`: se `atrasos.mensalidades > 0 || atrasos.jogadores > 0`, dois badges `bg-brand-red-muted text-brand-red` com `<AlertTriangle>`; se ambos zero, um badge `bg-emerald-500/10 text-emerald-400` com `<CheckCircle2>`

### Barrel + page

- `components/portal/index.ts` exporta `HeroCaixa` e `CaixaBloco`; linhas futuras comentadas para planos 004-006
- `transparencia/page.tsx`: import `{ HeroCaixa, CaixaBloco } from "@/components/portal"` ativo; placeholders `[hero]` e `[caixa]` substituidos pelos componentes com props reais (`data.meta`, `data.caixa`)

## Prova de Build

```
tsc --noEmit: 0 erros (saida vazia = sucesso)

npm run build:
  ✓ Compiled successfully
  ✓ Linting and checking validity of types
  ✓ Generating static pages (18/18)

Route /transparencia: 4.83 kB | 145 kB First Load JS
```

O warning `react-hooks/exhaustive-deps` em `eventos/[id]/page.tsx` e pre-existente, fora do escopo deste plano.

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

- `Card.tsx` ja existia com a API `padding="md"` exigida pelo plano. Reutilizado sem nenhuma modificacao (tarefa "CRIAR se nao existir" = nao foi necessario criar).
- O barrel `index.ts` foi criado de forma limpa com os exports dos planos futuros ja comentados.

## Self-Check

```bash
[ -f "frontend/src/components/portal/HeroCaixa.tsx" ]  -> ENCONTRADO
[ -f "frontend/src/components/portal/CaixaBloco.tsx" ]  -> ENCONTRADO
[ -f "frontend/src/components/portal/index.ts" ]         -> ENCONTRADO
git log: 7de022b                                          -> ENCONTRADO
```

## Self-Check: PASSOU
