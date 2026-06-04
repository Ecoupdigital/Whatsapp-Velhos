# Fase 01: Backend — API pública

**Objetivo:** Entregar `GET /api/portal` público, read-only, com o pacote agregado
completo (caixa + eventos líquido + jogos), respeitando a trava de privacidade.

**Requisitos cobertos:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, SEC-01, SEC-02, SEC-03, DEPLOY-02 (CORS)

**Critérios de sucesso:**
- [ ] `GET /api/portal` responde 200 sem token, com as 4 chaves de topo (`meta`, `caixa`, `eventos`, `jogos`)
- [ ] `caixa.saldo_atual` bate com soma de `_calcular_saldo_atual` das contas ativas; `fluxo_12m` ≤ 12 itens
- [ ] Líquido de evento bate: `custo_real > 0` → `custo_origem == "real"` e `liquido == arrecadado - custo`
- [ ] `atrasos` são COUNTs inteiros; payload sem nome de jogador fora de `jogos.*`, sem lista de transações/participantes, sem PII
- [ ] Resposta valida contra `PortalResponse`; CORS inalterado

**Dependências:** Nenhuma (codebase existente, sem migration).
**Estimativa:** 1-2 planos (router + schemas + verificação).
