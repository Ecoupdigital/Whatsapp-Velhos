---
phase: 02-frontend-portal
plan: 02-001
subsystem: frontend
tags: [types, fetch, utils, portal, public]
dependency_graph:
  provides:
    - PortalResponse e subtipos (types/portal.ts)
    - fetchPortal() fetch publico sem interceptor 401 (lib/portal.ts)
    - formatAtualizadoEm() formatador ISO->BRT (lib/portal.ts)
  requires: []
  affects:
    - todos os componentes da fase 02 (portal/*)
    - app/(public)/transparencia/page.tsx
tech_stack:
  added: []
  patterns:
    - Intl.DateTimeFormat com timeZone fixo (sem date-fns) para fuso BRT
    - fetch nativo sem interceptor para endpoint publico
    - tipos TS isolados em arquivo proprio (portal.ts vs index.ts)
key_files:
  created:
    - frontend/src/types/portal.ts
    - frontend/src/lib/portal.ts
  modified: []
decisions:
  - "formatAtualizadoEm usa Intl.DateTimeFormat em vez de date-fns: mais simples para fuso fixo, zero dependencia adicional"
  - "fetchPortal nao usa apiFetch: o interceptor de 401 redireciona pro /login, quebraria pagina publica"
metrics:
  duration_mins: 8
  completed_at: "2026-06-04T17:35:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 0
---

# Fase 02 Plano 001: Tipos Portal + fetch publico + formatacao BRT - Summary

Fundacao de dados do portal publico: tipos TypeScript espelhando campo a campo o contrato de `GET /api/portal`, funcao de fetch publica sem interceptor de 401, e formatador de data em fuso de Brasilia.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | Criar frontend/src/types/portal.ts | 379ee4d | Concluida |
| 2 | Criar frontend/src/lib/portal.ts | 0642762 | Concluida |
| 3 | Sanity check runtime formatador BRT | (sem commit, verificacao inline) | Concluida |

## Verificacoes Funcionais

### tsc --noEmit

```
(sem saida - zero erros)
```

Resultado: PASSOU. Ambos os arquivos compilam sem erro proprio nem propagado.

### Sanity check runtime formatAtualizadoEm

Comando executado:
```
node -e "...Intl.DateTimeFormat America/Sao_Paulo...new Date('2026-06-04T17:30:00Z')..."
```

Saida: `04/06 as 14:30`

Resultado: PASSOU. 17:30 UTC convertido corretamente para 14:30 BRT (offset -3h).

## Criterios de Sucesso

- [x] `frontend/src/types/portal.ts` exporta `PortalResponse` e todos os subtipos espelhando SYSTEM-DESIGN secao 3
- [x] `frontend/src/lib/portal.ts` exporta `fetchPortal()` com fetch nativo, sem Authorization, sem redirect de 401
- [x] `frontend/src/lib/portal.ts` exporta `formatAtualizadoEm()` entregando "DD/MM as HH:MM" em BRT
- [x] `tsc --noEmit` sem erro nos dois arquivos novos
- [x] Nenhuma lib nova instalada (so fetch nativo e Intl)

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito.

## Self-Check: PASSOU

Arquivos criados verificados:
```
ENCONTRADO: frontend/src/types/portal.ts
ENCONTRADO: frontend/src/lib/portal.ts
```

Commits verificados:
```
379ee4d - feat(02-001): tipos TypeScript Portal*...
0642762 - feat(02-001): fetchPortal() publico...
```

Ambos presentes no log do worktree `up/fase-02-frontend-portal`.
