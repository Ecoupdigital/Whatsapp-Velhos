# Roadmap: Portal de Transparência — Velhos Parceiros F.C.

> Feature brownfield, 2 fases. Backend público primeiro (contrato estável),
> depois o frontend consome. Cada fase tem critérios mensuráveis.

## Fases

- [ ] **Fase 1: Backend — API pública** - Router `/api/portal` agregador, schemas, trava de privacidade, testes
- [ ] **Fase 2: Frontend — Portal** - Route group público, página `/transparencia`, gráfico, noindex, verificação visual

## Detalhes das Fases

### Fase 1: Backend — API pública
**Objetivo:** Entregar `GET /api/portal` público, read-only, com o pacote agregado
completo (caixa + eventos líquido + jogos), respeitando a trava de privacidade.
**Depende de:** Nada (parte do codebase existente, sem migration).
**Requisitos:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, SEC-01, SEC-02, SEC-03, DEPLOY-02 (parte CORS)
**Critérios de Sucesso:**
  1. `GET /api/portal` responde **200 sem token** com as 4 chaves de topo (`meta`, `caixa`, `eventos`, `jogos`).
  2. `caixa.saldo_atual` bate com a soma de `_calcular_saldo_atual` das contas ativas; `fluxo_12m` tem ≤ 12 itens.
  3. Líquido de evento bate: para evento com `custo_real > 0`, `custo_origem == "real"` e `liquido == arrecadado - custo`.
  4. `caixa.atrasos.mensalidades` e `.jogadores` são inteiros (COUNT), e o payload **não contém** nenhum nome de jogador fora de `jogos.*`, nem lista de transações/participantes, nem PII.
  5. A resposta valida contra `PortalResponse`; CORS do backend permanece inalterado.

### Fase 2: Frontend — Portal
**Objetivo:** Entregar a página pública `/transparencia` que consome `/api/portal`
e renderiza os 4 blocos, responsiva, com gráfico de fluxo e noindex.
**Depende de:** Fase 1 (contrato `/api/portal` pronto e estável).
**Requisitos:** UI-01, UI-02, UI-03, UI-04, UI-05, DEPLOY-01, DEPLOY-02 (parte same-origin)
**Critérios de Sucesso:**
  1. `/transparencia` abre **sem login** (não redireciona pro `/login`) e renderiza os 4 blocos (hero, caixa, eventos, em campo) + footer.
  2. Gráfico de fluxo 12 meses renderiza com recharts e dado real do endpoint.
  3. Hero mostra saldo herói + carimbo "atualizado em DD/MM HH:MM" (BRT); página usável em viewport mobile.
  4. Badges de atraso exibem os COUNTs; líquido de evento aparece em verde (positivo) / vermelho (negativo) com rótulo de custo conforme `custo_origem`.
  5. O HTML da página contém a meta tag `noindex`; nenhuma chamada do navegador vai direto ao backend (same-origin via rewrite).

## Tabela de Progresso

| Fase | Planos Completos | Status | Completado |
|------|-----------------|--------|------------|
| 1 | 0/? | Pendente | -- |
| 2 | 0/? | Pendente | -- |
