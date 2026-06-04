---
version: "0.6.0"
planned_at: "2026-06-04T14:02:32Z"
planned_by:
  runtime: "claude-code"
  ceo_name: ""
  user_preferred_name: "Jonathan"
intended_execution:
  runtime: "same"
project_name: "Portal de Transparencia - Velhos Parceiros F.C."
mode: "brownfield"
total_phases: 2
total_plans: 10
total_requirements: 17
estimated_tasks: 27
status: ready_for_execution
planning_confidence: 96
---

# Projeto Pronto Para Execucao

Feature brownfield completamente planejada. Arquitetura, requisitos e os 10 planos
(Sonnet-ready) gerados e revisados. Planning Confidence: 96/100 (READY_FOR_BUILD).

## Como executar

```
/up:build --solo
```

Estado completo em `.plano/`.

## Resumo do Projeto

**Briefing:** Portal publico de prestacao de contas do Velhos Parceiros F.C. Link aberto,
tempo real, com caixa (saldo/entrou/saiu/fluxo 12m/atrasos), eventos (resultado liquido)
e jogos (V/E/D, gols, rankings, proximos jogos). Nunca expoe quem deve.

**Stack:** FastAPI + Pydantic v2 (backend) / Next.js 14 App Router + Tailwind + recharts
(frontend). Sem libs novas, sem migration, CORS inalterado.

**Mode:** brownfield

## Fases Planejadas

| # | Fase | Planos | Tarefas | Wave | Status |
|---|------|--------|---------|------|--------|
| 1 | Backend - API publica (/api/portal) | 3 | 8 | 0 | planejada |
| 2 | Frontend - Portal publico (/transparencia) | 7 | 19 | 1 | planejada |

## Aprovacoes Obtidas

Registradas em `.plano/governance/approvals.log`:

- [x] Brainstorm aprovado pelo usuario (4 decisoes + escopo)
- [x] up-arquiteto: SYSTEM-DESIGN + PROJECT + ROADMAP + REQUIREMENTS gerados
- [x] up-sintetizador: REQUIREMENTS validados 100% (13/13 checks)
- [x] up-planejador: 10 planos Sonnet-ready com self-check
- [x] up-revisor: Planning Confidence 96/100 — READY_FOR_BUILD

## Achados nao-bloqueantes (corrigir no build)

- INC-001 (importante): `meta.atualizado_em` deve usar `datetime.now(timezone.utc).isoformat()`
  (timezone-aware com Z), nao naive. Ajuste de 1 linha na Fase 1. Existe `_now_brt()` em
  campanhas.py como alternativa.
- INC-002 / INC-003 (menores): ver `.plano/AUDIT-PLAN.md`.

## Artefatos Disponiveis

```
.plano/
├── BRIEFING.md
├── SYSTEM-DESIGN.md        ← contrato campo a campo de GET /api/portal
├── PROJECT.md
├── ROADMAP.md
├── REQUIREMENTS.md          ← 17 REQs (API/SEC/UI/DEPLOY)
├── REQUIREMENTS-VALIDATION.md
├── DESIGN-TOKENS.md
├── AUDIT-PLAN.md            ← Planning Confidence 96/100
├── PLAN-READY.md            ← este arquivo
├── _galeto-concluido/       ← feature anterior (arquivada)
└── fases/
    ├── 01/  (PHASE.md, REQUIREMENTS-SLICE.md, 01-001..003-PLAN.md)
    └── 02/  (PHASE.md, REQUIREMENTS-SLICE.md, 02-001..007-PLAN.md)
```

## Credenciais

- [x] Nenhuma credencial nova. Reusa banco/infra existente. Sem variaveis novas.

## Listagem Completa de Planos

| ID | Path | Wave | Fase |
|----|------|------|------|
| 01-001 | fases/01/01-001-PLAN.md | 0 | Backend |
| 01-002 | fases/01/01-002-PLAN.md | 1 | Backend |
| 01-003 | fases/01/01-003-PLAN.md | 2 | Backend |
| 02-001 | fases/02/02-001-PLAN.md | 0 | Frontend |
| 02-002 | fases/02/02-002-PLAN.md | 1 | Frontend |
| 02-003 | fases/02/02-003-PLAN.md | 2 | Frontend |
| 02-004 | fases/02/02-004-PLAN.md | 2 | Frontend |
| 02-005 | fases/02/02-005-PLAN.md | 2 | Frontend |
| 02-006 | fases/02/02-006-PLAN.md | 2 | Frontend |
| 02-007 | fases/02/02-007-PLAN.md | 3 | Frontend |
