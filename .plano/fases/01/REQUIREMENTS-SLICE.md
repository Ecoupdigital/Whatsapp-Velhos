# Requisitos da Fase 01 — Backend API pública

> Slice gerado automaticamente. Versão completa em `.plano/REQUIREMENTS.md`.

## API-01: Router público registrado
`backend/routers/portal.py` com `prefix="/api/portal"`, registrado em `main.py`
via `app.include_router(portal.router)`. SEM `Depends(get_current_user)`.
*Testável:* `GET /api/portal` retorna 200 sem header `Authorization`.

## API-02: Pacote agregado numa request
`GET /api/portal` entrega `meta`, `caixa`, `eventos`, `jogos` no nível raiz.
*Testável:* o JSON contém exatamente essas 4 chaves de topo.

## API-03: Bloco caixa
`saldo_atual` (soma `_calcular_saldo_atual` das contas ativas), `total_entrou`,
`total_saiu`, `entrou_mes`, `saiu_mes`, `fluxo_12m` (≤12 itens `{mes, entradas, saidas}`),
`atrasos`.
*Testável:* `saldo_atual` bate com soma manual; `fluxo_12m` ≤ 12 itens.

## API-04: Líquido por evento
Cada evento: `titulo, tipo, data, arrecadado, custo, custo_origem, liquido, status`.
`custo` = `custo_real` se >0 senão `custo_estimado`; `custo_origem` ∈ {real, estimado,
sem_custo}; `liquido = arrecadado - custo`. `arrecadado` = `sum(valor_pago)` dos participantes.
*Testável:* `custo_real > 0` → `custo_origem == "real"` e `liquido == arrecadado - custo_real`.

## API-05: Bloco jogos
`resumo` (vitorias, empates, derrotas, gols_pro, gols_contra), `artilharia`,
`assistencias`, `destaques` (`{nome, quantidade}`), `ultimos_resultados`
(`{data, adversario, placar}`), `proximos_jogos` (`{data, horario, local, adversario}`).
*Testável:* `resumo` bate com `/api/jogos/estatisticas`; rankings com `/api/jogos/rankings`.

## API-06: Schemas Pydantic v2
Models `Portal*` em `schemas.py`; endpoint usa `response_model=PortalResponse`.
*Testável:* a resposta valida contra `PortalResponse`.

## API-07: Filtro de eventos
Inclui `concluido` e `em_andamento`; `planejado` só se `arrecadado > 0`; exclui
`cancelado`; ordena por data desc.
*Testável:* evento `cancelado` não aparece; `planejado` com 0 arrecadado não aparece.

## SEC-01: Atrasos como COUNT
`atrasos.mensalidades` = COUNT mensalidades `status='atrasado'` no mês corrente;
`atrasos.jogadores` = COUNT DISTINCT `jogador_id`. Ambos `int`.
*Testável:* os dois campos são inteiros; nenhuma lista de mensalidades retornada.

## SEC-02: Sem nome em contexto financeiro
Nenhum nome de jogador ligado a pagamento. Nome só em `jogos.*` (rankings).
*Testável:* varredura do payload não acha nome fora de `jogos.*`.

## SEC-03: Sem PII / sem transações cruas
Payload não contém `transacoes[]`, `participantes[]`, telefone, nem registro cru.
*Testável:* nenhuma chave expõe transação individual ou PII.

## DEPLOY-02 (parte CORS): CORS inalterado
`main.py` mantém a allowlist de CORS atual; sem migration nova.
*Testável:* allowlist de CORS intacta; nenhuma migration adicionada.
