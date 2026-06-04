# Estado do Projeto

## Referência do Projeto
**Projeto:** Portal de Transparência — Velhos Parceiros F.C. (feature brownfield)
**Valor Central:** Construir confiança via transparência. Link público em tempo real com os números do time (caixa, eventos, jogos), sem nunca expor quem deve.
**Foco Atual:** Fase 1 - Backend API pública

## Posição Atual
**Fase:** 1 de 2
**Plano:** 2 de 3 (01-001 e 01-002 concluidos)
**Status:** Em andamento
**Progresso:** [████░░░░░░] 66%
**Requisitos:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, SEC-01, SEC-02, SEC-03, DEPLOY-02 (marcados completos)

## Contexto Acumulado

### Decisões
Ver PROJECT.md Key Decisions e SYSTEM-DESIGN.md. Destaques:
- Link aberto sem login + noindex (briefing)
- 1 endpoint agregador público `/api/portal` read-only (sem `Depends(get_current_user)`)
- Trava de privacidade: atraso só como COUNT, sem nomes em finanças
- Route group `(public)` fora do guard client-side de `(app)`
- Reuso de lógica existente: `_calcular_saldo_atual` (contas), balanco/fluxo (financeiro), estatisticas/rankings (jogos), resumo_evento (eventos)
- Custo de evento = custo_real se >0 senão custo_estimado, com `custo_origem`
- Eventos filtrados: concluido + em_andamento (planejado só se arrecadou), exclui cancelado
- Sem libs novas, sem migration, CORS inalterado, deploy na mesma pipeline Coolify
- Models Portal* isolados dos schemas internos (prefixo Portal*) para contrato público estável
- PortalCaixaAtrasos com int (não list, não str) como trava de privacidade tipada (SEC-01)
- Sem class Config/from_attributes nos Portal* pois são montados no handler, não lidos direto do ORM

### Planos Completos
- **01-001** (2026-06-04): Schemas Portal* (11 models Pydantic v2) + scaffold test_portal.py com fixture seed_portal_data. Commit: 7aeaf6f.
- **01-002** (2026-06-04): Router publico GET /api/portal (handler agregador read-only). meta.atualizado_em timezone-aware UTC. Prova: 200 sem token, 4 chaves, atrasos int. Commit: 1a41fb8.

### Bloqueios
Nenhum.

## Continuidade de Sessão
Modo builder brownfield ativo. Feature escopada SÓ ao Portal de Transparência.
Plano 01-002 concluído. Próximo: 01-003 (suite de testes test_portal.py).
