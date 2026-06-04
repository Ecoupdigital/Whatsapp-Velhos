# REQUIREMENTS: Portal de Transparência — Velhos Parceiros F.C.

> Feature brownfield. Requisitos escopados SÓ ao Portal de Transparência.
> Cada REQ é específico e testável. Rastreabilidade pra fase no fim.

## Backend — API pública (API)

- [ ] **API-01**: `backend/routers/portal.py` existe com `prefix="/api/portal"` e é
  registrado em `backend/main.py` via `app.include_router(portal.router)`.
  *Testável:* `GET /api/portal` retorna 200 sem header `Authorization`.

- [ ] **API-02**: `GET /api/portal` entrega o pacote agregado completo numa única request,
  com as chaves de topo `meta`, `caixa`, `eventos`, `jogos`.
  *Testável:* o JSON de resposta contém exatamente essas 4 chaves no nível raiz.

- [ ] **API-03**: Bloco `caixa` traz `saldo_atual`, `total_entrou`, `total_saiu`,
  `entrou_mes`, `saiu_mes`, `fluxo_12m` (lista de `{mes, entradas, saidas}` ≤ 12 itens)
  e `atrasos`. `saldo_atual` = soma de `_calcular_saldo_atual` das contas ativas.
  *Testável:* `saldo_atual` bate com a soma manual; `fluxo_12m` tem no máximo 12 itens.

- [ ] **API-04**: Cada item de `eventos` traz `titulo, tipo, data, arrecadado, custo,
  custo_origem, liquido, status`. `custo` = `custo_real` se > 0, senão `custo_estimado`;
  `custo_origem` ∈ {`real`, `estimado`, `sem_custo`}; `liquido = arrecadado - custo`.
  *Testável:* para um evento com `custo_real > 0`, `custo_origem == "real"` e
  `liquido == arrecadado - custo_real`.

- [ ] **API-05**: Bloco `jogos` traz `resumo` (`vitorias, empates, derrotas, gols_pro,
  gols_contra`), `artilharia`, `assistencias`, `destaques` (listas `{nome, quantidade}`),
  `ultimos_resultados` (`{data, adversario, placar}`) e `proximos_jogos`
  (`{data, horario, local, adversario}`).
  *Testável:* `resumo` bate com `/api/jogos/estatisticas`; rankings batem com `/api/jogos/rankings`.

- [ ] **API-06**: Schemas Pydantic v2 `Portal*` definidos em `backend/schemas.py` tipam
  a resposta inteira; o endpoint usa `response_model=PortalResponse`.
  *Testável:* a resposta valida contra `PortalResponse` (FastAPI rejeita campo fora do schema).

- [ ] **API-07**: Filtro de eventos: inclui status `concluido` e `em_andamento`;
  `planejado` só entra se `arrecadado > 0`; `cancelado` é excluído; ordenado por data desc.
  *Testável:* um evento `cancelado` não aparece; um `planejado` com 0 arrecadado não aparece.

## Backend — Privacidade (SEC)

- [ ] **SEC-01**: `caixa.atrasos.mensalidades` = COUNT de mensalidades `status='atrasado'`
  no mês corrente; `caixa.atrasos.jogadores` = COUNT DISTINCT `jogador_id` dessas.
  Ambos inteiros, nunca lista.
  *Testável:* os dois campos são `int`; nenhuma lista de mensalidades é retornada.

- [ ] **SEC-02**: Nenhum nome de jogador aparece ligado a pagamento/financeiro no payload.
  Nome só existe em `jogos.artilharia/assistencias/destaques`.
  *Testável:* varredura do payload não encontra nome de jogador fora de `jogos.*`.

- [ ] **SEC-03**: O payload não contém lista de transações individuais nem PII
  (telefone, apelido em contexto financeiro, registro cru de mensalidade/participante).
  *Testável:* nenhuma chave do payload expõe `transacoes[]`, `participantes[]`, `telefone`.

## Frontend — Portal público (UI)

- [ ] **UI-01**: Route group `frontend/src/app/(public)/` com `layout.tsx` sem guard de
  auth (header limpo: escudo + nome, sem sidebar). Não herda o redirect de `(app)`.
  *Testável:* acessar `/transparencia` sem token não redireciona pro `/login`.

- [ ] **UI-02**: `frontend/src/app/(public)/transparencia/page.tsx` faz fetch de
  `/api/portal` e renderiza os 4 blocos: Hero, Caixa, Eventos, Em campo (jogos) + footer.
  *Testável:* a página renderiza os 4 blocos com dado real do endpoint.

- [ ] **UI-03**: Gráfico de fluxo 12 meses (entradas vs saídas) renderizado com recharts
  a partir de `caixa.fluxo_12m`.
  *Testável:* o gráfico aparece com as 12 séries de dado real (não placeholder).

- [ ] **UI-04**: Hero mostra `saldo_atual` em número herói e carimbo
  "atualizado em DD/MM HH:MM" (BRT, formatado a partir de `meta.atualizado_em`).
  Layout responsivo mobile-first.
  *Testável:* o carimbo aparece formatado; a página é usável em viewport mobile.

- [ ] **UI-05**: Bloco Caixa mostra cards de total entrou/saiu e 2 badges de atraso
  (N mensalidades, N jogadores). Bloco Eventos mostra líquido em verde (positivo) /
  vermelho (negativo) com rótulo de custo conforme `custo_origem`.
  *Testável:* badges exibem os COUNTs; líquido negativo aparece em vermelho.

## Deploy (DEPLOY)

- [ ] **DEPLOY-01**: A página `/transparencia` define `metadata.robots = { index: false,
  follow: false }` (noindex).
  *Testável:* o HTML servido contém a meta tag `noindex`.

- [ ] **DEPLOY-02**: CORS do backend permanece inalterado; o front chama `/api`
  same-origin via rewrite. Sem container novo, sem env nova, sem migration.
  *Testável:* `main.py` mantém a allowlist de CORS atual; nenhuma migration foi adicionada.

## Rastreabilidade

| Requisito | Fase | Status |
|-----------|------|--------|
| API-01 | Fase 1 | Pendente |
| API-02 | Fase 1 | Pendente |
| API-03 | Fase 1 | Pendente |
| API-04 | Fase 1 | Pendente |
| API-05 | Fase 1 | Pendente |
| API-06 | Fase 1 | Pendente |
| API-07 | Fase 1 | Pendente |
| SEC-01 | Fase 1 | Pendente |
| SEC-02 | Fase 1 | Pendente |
| SEC-03 | Fase 1 | Pendente |
| UI-01 | Fase 2 | Pendente |
| UI-02 | Fase 2 | Pendente |
| UI-03 | Fase 2 | Pendente |
| UI-04 | Fase 2 | Pendente |
| UI-05 | Fase 2 | Pendente |
| DEPLOY-01 | Fase 2 | Pendente |
| DEPLOY-02 | Fase 1 + Fase 2 | Pendente |
