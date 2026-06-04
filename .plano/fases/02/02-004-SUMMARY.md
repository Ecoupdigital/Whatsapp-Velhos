---
phase: 02-frontend-portal
plan: 02-004
subsystem: frontend
tags: [recharts, grafico, portal, caixa, fluxo]
dependency_graph:
  requires: [02-003]
  provides: [FluxoChart, slot-fluxo-preenchido]
  affects: [CaixaBloco, portal/index.ts]
tech_stack:
  added: []
  patterns: [recharts BarChart responsivo, custom tooltip tipagem manual, estado vazio]
key_files:
  created:
    - frontend/src/components/portal/FluxoChart.tsx
  modified:
    - frontend/src/components/portal/CaixaBloco.tsx
    - frontend/src/components/portal/index.ts
decisions:
  - "Tipagem manual para CustomTooltip (active?: boolean, payload?: Array<...>) em vez de TooltipContentProps do recharts v3 — mesmo padrao adotado no dashboard interno; TooltipContentProps exige props de contexto interno do recharts que o caller nao passa, causando TS2739"
  - "Entradas em emerald (#10B981), Saidas em brand-red (#E31E24) — semantica positivo/negativo do portal; diferente do dashboard interno que usa vermelho para entradas"
metrics:
  duration_approx: "10min"
  completed_at: "2026-06-04T14:38:04Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Fase 02 Plano 004: Grafico de fluxo 12 meses (recharts) - Summary

**One-liner:** BarChart recharts responsivo com Entradas (emerald) vs Saidas (brand-red) a partir de `caixa.fluxo_12m`, encaixado no slot `data-slot="fluxo"` do CaixaBloco.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | Criar FluxoChart.tsx | f28089f | Completo |
| 2 | Encaixar no CaixaBloco + barrel | f28089f | Completo |

## O que foi implementado

### FluxoChart.tsx

Componente client ("use client") com:

- `BarChart` + `ResponsiveContainer` do recharts, altura 200px mobile / 260px sm+
- Duas barras agrupadas: Entradas (`#10B981` emerald) e Saidas (`#E31E24` brand-red)
- `XAxis` com `labelMes()` encurtando "2026-06" para "Jun" via array `MESES_CURTOS`
- `YAxis` com `tickFormatter` exibindo "1k", "2k" para valores >= 1000
- `CartesianGrid` horizontal apenas (vertical=false), stroke escuro
- `CustomTooltip` com tipagem manual compativel com recharts v3, exibindo mes + Entradas/Saidas via `formatCurrency`
- Estado vazio: quando `fluxo` e vazio ou nulo, renderiza card com mensagem discreta em vez de grafico quebrado

### CaixaBloco.tsx

- Import adicionado: `import { FluxoChart } from "./FluxoChart";`
- Slot `data-slot="fluxo"` substituido de placeholder texto para `<FluxoChart fluxo={caixa.fluxo_12m} />`
- Comentario de plano 003 removido

### portal/index.ts

- `export { FluxoChart } from "./FluxoChart";` descomentado/adicionado

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] Tipagem TooltipProps incompativel com recharts v3**

- **Encontrado durante:** Tarefa 1, primeira rodada de `tsc --noEmit`
- **Issue:** O plano especificava `type TooltipProps<number, string>` para o CustomTooltip, mas em recharts v3 `TooltipProps` omite `active`, `payload` e `label` (lidos do contexto interno). Resultado: TS2339 (property does not exist) e TS7006 (implicit any).
- **Tentativa 1:** Trocar para `TooltipContentProps<number, string>` — gerou TS2739 (objeto `{}` falta 6 propriedades obrigatorias do contexto interno do recharts).
- **Correcao final:** Tipagem manual `{ active?: boolean; payload?: Array<...>; label?: string }` — identico ao padrao ja adotado no dashboard interno (page.tsx linha 129-132). Zero mudanca de comportamento, 100% compativel.
- **Arquivos modificados:** `frontend/src/components/portal/FluxoChart.tsx`
- **Commit:** f28089f

## Verificacao Funcional

```
tsc --noEmit: PASSOU (saida vazia = sem erros)

npm run build:
  ✓ Compiled successfully
  ✓ Linting and checking validity of types
  Route /transparencia: 5.52 kB | 256 kB First Load JS (recharts incluso)
  18 paginas geradas com sucesso
```

Warning irrelevante no build: `useCallback unnecessary dependency` em `/eventos/[id]/page.tsx` (pre-existente, fora do escopo deste plano).

## Self-Check

```
FluxoChart.tsx: ENCONTRADO
CaixaBloco.tsx (FluxoChart import): ENCONTRADO
CaixaBloco.tsx (data-slot="fluxo"): ENCONTRADO
portal/index.ts (export FluxoChart): ENCONTRADO
commit f28089f: ENCONTRADO
```

## Self-Check: PASSOU
