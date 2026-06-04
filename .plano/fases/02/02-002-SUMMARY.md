---
phase: 02-frontend-portal
plan: 02-002
subsystem: frontend
tags: [route-group, public, noindex, scaffold, skeleton, fetch]
requires: [02-001]
provides: [rota-publica-transparencia, layout-publico-noindex, scaffold-4-blocos]
affects: [frontend/src/app/(public)]
tech-stack:
  added: []
  patterns: [server-component-metadata, client-component-fetch, useCallback-useEffect, skeleton-loading]
key-files:
  created:
    - frontend/src/app/(public)/layout.tsx
    - frontend/src/app/(public)/transparencia/page.tsx
decisions:
  - "Usar <img> com eslint-disable em vez de next/image para SVG estatico (evita config adicional)"
  - "useCallback envolve carregar() para evitar re-render infinito no useEffect"
  - "Slots data-block e data-state como ganchos para Playwright do plano 007"
metrics:
  duration_mins: 8
  completed_date: "2026-06-04"
  tasks_total: 3
  tasks_completed: 3
  files_created: 2
  files_modified: 0
---

# Fase 02 Plano 002: Route group (public) + scaffold da pagina /transparencia - Summary

Route group `(public)` criado fora do `(app)` com layout server component (noindex) e pagina `/transparencia` client component com estados loading/erro/sucesso e slots dos 4 blocos.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | Layout publico server component com metadata.robots noindex | 1d90cdc | OK |
| 2 | Pagina /transparencia: fetchPortal, 3 estados, 4 slots data-block | 174a0b0 | OK |
| 3 | Verificacao tsc --noEmit + npm run build | (sem codigo novo) | OK |

## Arquivos Criados

### `frontend/src/app/(public)/layout.tsx`

Server component (sem "use client"). Exporta `metadata` com:
- `robots: { index: false, follow: false }` - cobre DEPLOY-01 para toda rota dentro de `(public)`
- `title: "Prestacao de Contas | Velhos Parceiros F.C."`

Header sticky com `backdrop-blur`: escudo `icon-192.svg` + nome "Velhos Parceiros F.C." em `font-display`.
`max-w-2xl` mobile-first. Sem Sidebar, sem MobileNav, sem useAuth, sem redirect.
Herda `<html>/<body>` do root layout (dark, fontes, bg-surface-primary).

### `frontend/src/app/(public)/transparencia/page.tsx`

Client component ("use client"). Fluxo de dados:
- `useCallback` envolve `carregar()` que chama `fetchPortal()` e atualiza `data/loading/erro`
- `useEffect([carregar])` dispara no mount
- NAO usa `apiFetch` nem `useAuth` (ambos redirecionam em 401; a rota e publica)

Estados renderizados:
- `data-state="loading"`: 4x `SkeletonCard` com alturas escalonadas (40/64/48/56)
- `data-state="error"`: mensagem pt-BR amigavel + botao "Tentar de novo" (dispara `carregar()`)
- `data-state="ready"`: 4 `<section data-block="...">` (hero/caixa/eventos/jogos) + footer

Os blocos sao placeholders `[texto]` com comentarios indicando qual plano preenche cada um (003-006).
`data-block` e `data-state` sao ganchos para os testes Playwright do plano 007.

## Prova de Compilacao

```
npx tsc --noEmit   -> sem output (limpo)
npm run build      -> sucesso

Route (app)                   Size     First Load JS
...
o /transparencia              3.38 kB  143 kB
...
o (Static) prerendered as static content
```

A rota `/transparencia` compila como pagina estatica (sem SSR dinamico), 3.38 kB.
Warnings de ESLint no build sao pre-existentes em outros arquivos, nenhum no route group `(public)`.

## Verificacoes Funcionais

- `test -f "src/app/(public)/layout.tsx"` -> encontrado
- `grep -q "robots"` layout.tsx -> encontrado
- `grep -q "index: false"` layout.tsx -> encontrado
- `grep -q "icon-192.svg"` layout.tsx -> encontrado
- `! grep -q "useAuth|use client|router.replace"` layout.tsx -> correto (nao tem)
- `test -f "src/app/(public)/transparencia/page.tsx"` -> encontrado
- `grep -q "fetchPortal"` page.tsx -> encontrado
- `! grep -q "apiFetch|api.get|useAuth"` page.tsx -> correto (nao tem)
- `grep -q 'data-block="hero"'` page.tsx -> encontrado
- `tsc --noEmit | grep -iE "\(public\)"` -> sem output (nenhum erro no route group)

## Criterios de Sucesso

- [x] `(public)/layout.tsx` e server component com `metadata.robots` noindex e header escudo+nome, sem guard
- [x] `(public)/transparencia/page.tsx` e client component que usa `fetchPortal` (nunca apiFetch/useAuth)
- [x] Estados loading (skeletons) e erro (mensagem + retry) implementados
- [x] Os 4 slots `data-block` (hero/caixa/eventos/jogos) + footer presentes
- [x] `tsc --noEmit` limpo pro route group; nenhuma importacao de Sidebar/useAuth no `(public)`

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

- ENCONTRADO: frontend/src/app/(public)/layout.tsx
- ENCONTRADO: frontend/src/app/(public)/transparencia/page.tsx
- ENCONTRADO: .plano/fases/02/02-002-SUMMARY.md
- ENCONTRADO: commit 1d90cdc (layout publico)
- ENCONTRADO: commit 174a0b0 (pagina transparencia)
