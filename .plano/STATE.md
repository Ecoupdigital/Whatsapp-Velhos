# Estado do Projeto

## Referência do Projeto
**Projeto:** Portal de Transparência — Velhos Parceiros F.C. (feature brownfield)
**Valor Central:** Construir confiança via transparência. Link público em tempo real com os números do time (caixa, eventos, jogos), sem nunca expor quem deve.
**Foco Atual:** Fase 1 - Backend API pública

## Posição Atual
**Fase:** 1 de 2
**Plano:** 0 de ?
**Status:** Pronto para planejar
**Progresso:** [░░░░░░░░░░] 0%
**Requisitos:** 17 (novos)

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

### Planos Completos
Nenhum ainda (acabou de ser estruturado).

### Bloqueios
Nenhum.

## Continuidade de Sessão
Modo builder brownfield ativo. Feature escopada SÓ ao Portal de Transparência.
O `.plano/_galeto-concluido/` é de feature anterior já entregue (referência de estilo, ignorar).
Próxima ação: planejar Fase 1 (backend `backend/routers/portal.py` + schemas `Portal*` + registro em main.py + verificação de privacidade).
