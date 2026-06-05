---
phase: rapido
plan: "2"
subsystem: portal
tags: [mensalidades, estatisticas, portal-publico, privacidade]
tech-stack:
  added: []
  patterns: [helper-cache-por-mes, particao-em-dia-em-atraso]
key-files:
  created: []
  modified:
    - backend/schemas.py
    - backend/routers/portal.py
    - backend/tests/test_portal.py
    - frontend/src/types/portal.ts
    - frontend/src/components/portal/CaixaBloco.tsx
decisions:
  - "Campo mensalidades em PortalCaixa e obrigatorio (sempre preenchido por _montar_caixa)"
  - "Cache vencido_por_mes evita query repetida a configuracoes para cada mensalidade do mesmo mes"
  - "Jogador sem nenhuma mensalidade registrada nao entra em jogadores_total (particao consistente)"
metrics:
  duration: ~15min
  completed: "2026-06-05"
  tasks_completed: 2
  files_changed: 5
---

# Plano Rapido 2: Estatisticas GERAIS de Mensalidades - Summary

Adicionado ao portal publico o campo `caixa.mensalidades` com agregados gerais de todas as competencias: pagas, em_atraso, a_vencer, isentas, jogadores_total, jogadores_em_dia, jogadores_em_atraso.

## Commits

| Hash | Mensagem |
|------|---------|
| 18e8de6 | feat(portal): expoe estatisticas gerais de mensalidades no portal publico |
| 17b26eb | feat(portal): renderiza mensalidades em dia/atraso no bloco caixa |

## Tarefas Completadas

### Tarefa 1 - Backend
- `backend/schemas.py`: novo modelo `PortalMensalidadesGeral` (7 campos int) inserido apos `PortalCaixaAtrasos`; campo `mensalidades: PortalMensalidadesGeral` adicionado em `PortalCaixa`.
- `backend/routers/portal.py`: importa `PortalMensalidadesGeral`; cria helper `_montar_mensalidades_geral(db)` que (a) busca todas as mensalidades em uma query so, (b) usa cache `vencido_por_mes` para evitar queries repetidas a `configuracoes`, (c) aplica regra de negocio mes<atual/==atual/>atual via `_mes_vencido` existente, (d) computa particao `jog_todos - jog_atraso = jog_em_dia`; chamado em `_montar_caixa`.
- `backend/tests/test_portal.py`: 6 novos testes cobrindo shape, mes-passado-pendente->em_atraso, mes-atual-pendente-nao-vencido->a_vencer, pago/isento, particao em_dia+em_atraso==total, jogador-com-1-atraso-so-em-atraso.

**Verificacao:** 24/24 testes passando (pytest tests/test_portal.py -v, exit code 0).

### Tarefa 2 - Frontend
- `frontend/src/types/portal.ts`: nova interface `PortalMensalidadesGeral` espelhando o schema do backend; campo `mensalidades: PortalMensalidadesGeral` adicionado em `PortalCaixa`.
- `frontend/src/components/portal/CaixaBloco.tsx`: adiciona icone `Users` do lucide-react; insere secao "Mensalidades (geral)" apos chips de atraso do mes (sem tocar no bloco existente). Layout: cabecalho com icone Users, grid 2x2 com jogadores_em_dia (emerald-400) e jogadores_em_atraso (brand-red), sub-linha "{em_dia} de {total} jogadores em dia", grid 2x2 de contagens pagas/em_atraso/a_vencer/isentas. Tokens usados: `border-border-subtle`, `bg-surface-tertiary`, `text-txt-secondary`, `text-txt-primary`, `text-emerald-400`, `text-brand-red`, `font-display`, `font-body`, `tabular-nums`.

**Verificacao:** `npx tsc --noEmit` sem erros (exit code 0, output vazio).

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check

- [x] `backend/schemas.py` contem `PortalMensalidadesGeral` e campo em `PortalCaixa`
- [x] `backend/routers/portal.py` contem `_montar_mensalidades_geral` e chamada em `_montar_caixa`
- [x] `backend/tests/test_portal.py` contem 6 novos testes de mensalidades_geral
- [x] `frontend/src/types/portal.ts` contem interface e campo
- [x] `frontend/src/components/portal/CaixaBloco.tsx` renderiza secao
- [x] Commits 18e8de6 e 17b26eb existem em main
- [x] 24/24 testes pytest verdes
- [x] tsc --noEmit sem erros

## Self-Check: PASSOU
