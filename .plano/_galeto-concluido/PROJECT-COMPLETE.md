---
version: "0.6.0"
planned_at: "2026-06-01T13:36:07Z"
planned_by:
  runtime: "claude-code"
  ceo_name: "CEO"
  user_preferred_name: "Jonathan"
intended_execution:
  runtime: "same"
project_name: "Eventos Galeto - Faixas multiplas + Relacao Cru/Assado"
mode: "brownfield"
total_phases: 3
total_plans: 14
total_requirements: 31
estimated_tasks: 55
status: ready_for_execution
planning_confidence: 97
---

# Projeto Pronto Para Execucao

Feature brownfield planejada completamente. Arquitetura, REQUIREMENTS validados,
14 planos Sonnet-ready, e review consolidado APPROVE (97/100).

## Como executar

```
/up:build
```

Estado completo em `.plano/`.

## Resumo do Projeto

**Briefing:** Eventos galeto com faixas de cartao quebradas (numeradas + lote sem numero)
por jogador, e relacao Cru x Assado (split de venda + pedido pessoal) consolidada pra
repassar a cozinha. Edicao estilo planilha inline. Migracao so aditiva (nao quebra dados).

**Stack:** FastAPI + SQLAlchemy 2 + Postgres(prod)/SQLite(dev), Next.js App Router + Tailwind, Pydantic v2.

**Mode:** brownfield (app de gestao Velhos Parceiros F.C. existente).

## Fases Planejadas

| # | Fase | Planos | Wave entrada | Status |
|---|------|--------|--------------|--------|
| 1 | Schema + Migracao + Backfill | 3 | 0 | planejada |
| 2 | API (faixas + itens + resumo) | 5 | 0 | planejada |
| 3 | Frontend (grid inline + config + estatistica) | 6 | 0 | planejada |

## Aprovacoes Obtidas

Registradas em `governance/approvals.log`:

- [x] Intake: BRIEFING.md aprovado pelo usuario (brainstorm /up)
- [x] up-arquiteto: SYSTEM-DESIGN + PROJECT + ROADMAP + REQUIREMENTS gerados
- [x] up-sintetizador: REQUIREMENTS validados (92% -> gap MIG-05 fechado)
- [x] up-planejador: 14 planos Sonnet-ready (self-check pass=true)
- [x] up-revisor: READY_FOR_BUILD, Planning Confidence 97/100

## Decisoes-chave

- Migracao aditiva no boot (`backend/migrations.py`, sem Alembic), ADD COLUMN idempotente via `inspect()`, portavel Postgres+SQLite.
- JSON como Text + json.dumps/loads (identico nos dois bancos). `sem_numero` como Integer 0/1.
- Tabelas novas: `evento_cartao_faixa` (1:N por participante), `evento_participante_item` (split por tipo). Coluna nova `Evento.tipos_item`.
- MIG-05: zero DROP/rename; colunas legadas (`numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos`) preservadas.
- Sistema B (`CartaoBaile` / tela `/cartoes`) explicitamente FORA de escopo.

## Listagem Completa de Planos

| ID | Path | Wave |
|----|------|------|
| 01-01 | fases/01/01-01-PLAN.md | 0 |
| 01-02 | fases/01/01-02-PLAN.md | 1 |
| 01-03 | fases/01/01-03-PLAN.md | 1 |
| 02-01 | fases/02/02-01-PLAN.md | 0 |
| 02-02 | fases/02/02-02-PLAN.md | 1 |
| 02-03 | fases/02/02-03-PLAN.md | 1 |
| 02-04 | fases/02/02-04-PLAN.md | 2 |
| 02-05 | fases/02/02-05-PLAN.md | 2 |
| 03-01 | fases/03/03-01-PLAN.md | 0 |
| 03-02 | fases/03/03-02-PLAN.md | 1 |
| 03-03 | fases/03/03-03-PLAN.md | 1 |
| 03-04 | fases/03/03-04-PLAN.md | 1 |
| 03-06 | fases/03/03-06-PLAN.md | 2 |
| 03-05 | fases/03/03-05-PLAN.md | 3 |
