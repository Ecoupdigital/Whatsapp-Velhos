---
phase: 01-backend-api-publica
verified: 2026-06-04T14:25:00Z
status: passed
score: 11/11 must-haves verificados
code_type: logic
evidence:
  - "logic:test_pass"
gaps: []
---

# Fase 01: Backend API publica (GET /api/portal) Relatorio de Verificacao

**Objetivo da Fase:** endpoint publico `GET /api/portal` (sem auth) que entrega o
pacote agregado read-only (caixa/eventos/jogos) com trava de privacidade.

**Verificado:** 2026-06-04
**Status:** passed
**Tipo de codigo:** logic (backend/API propria, sem integracao externa nem UI) -> evidencia exigida = teste red-green verde.

## Prova Fresca (saida real do pytest, rodada nesta sessao)

### 1. Suite do portal (`python3 -m pytest tests/test_portal.py -q`)

```
............                                                             [100%]
12 passed, 20 warnings in 1.24s
```

12/12 verde. Warnings sao deprecacao pre-existente do Pydantic v2 e FastAPI
`on_event` (do projeto, nao introduzidos pela fase).

### 2. Suite backend inteira (`python3 -m pytest -q`) - regressao

```
39 passed, 21 warnings in 3.37s
```

ZERO regressao. Bate exatamente com o alvo de 39 passed.

### 3. Testes de privacidade isolados (`-v`)

```
test_privacidade_nenhum_nome_de_jogador_fora_de_jogos PASSED
test_privacidade_sem_chaves_de_pii_nem_registro_cru   PASSED
test_privacidade_atrasos_sao_int_nunca_lista          PASSED
```

Observacao: o runner usa `python3` (confirmado). `python` puro nao foi usado.

## Alcance do Objetivo

### Verdades Observaveis

| # | Verdade | Status | Evidencia |
|---|---------|--------|-----------|
| 1 | `GET /api/portal` responde 200 sem header Authorization | VERIFIED | `test_portal_responde_200_sem_token` verde; handler sem `Depends(get_current_user)` |
| 2 | Payload tem exatamente as 4 chaves de topo (meta/caixa/eventos/jogos) | VERIFIED | `PortalResponse.model_fields == {meta,caixa,eventos,jogos}`; teste de shape verde |
| 3 | Bloco caixa correto (saldo/totais/fluxo<=12/atrasos) | VERIFIED | `test_portal_caixa_saldo_e_totais` (saldo 1200), `test_portal_fluxo_12m_max_12_itens` |
| 4 | Liquido por evento com custo_origem correto | VERIFIED | `test_portal_evento_liquido_e_custo_origem` (custo_real>0 -> origem real, liquido 200) |
| 5 | Bloco jogos (resumo + rankings + resultados + proximos) | VERIFIED | `test_portal_jogos_resumo_e_rankings`, `test_portal_resultados_e_proximos` |
| 6 | Filtro de eventos (cancelado e planejado-vazio fora) | VERIFIED | seed inclui "Baile Cancelado" e "Viagem Futura"; teste assere ausencia |
| 7 | Atrasos sao COUNT int (sem lista de mensalidades) | VERIFIED | `test_portal_atrasos_count_int` + `int()` no codigo (linhas 88-89) |
| 8 | Nenhum nome de jogador em contexto financeiro | VERIFIED | `test_privacidade_nenhum_nome...` varre meta/caixa/eventos recursivamente |
| 9 | Sem PII / sem registro cru no payload | VERIFIED | `test_privacidade_sem_chaves_de_pii...` (12 chaves proibidas ausentes) |
| 10 | meta.atualizado_em timezone-aware (INC-001) | VERIFIED | `datetime.now(timezone.utc).isoformat()` (portal.py:26) |
| 11 | CORS inalterado / sem migration | VERIFIED | diff main.py = 2 linhas (import+include_router); allowlist intacta; 0 migrations |

**Score:** 11/11 verdades verificadas

### Artefatos Requeridos

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `backend/routers/portal.py` | router `/api/portal` sem auth, 4 helpers + handler | VERIFIED | 206 linhas, substantivo, registrado |
| `backend/schemas.py` (bloco Portal*) | 11 models Pydantic v2 | VERIFIED | PortalResponse + 10 nested; atrasos `int` |
| `backend/tests/test_portal.py` | suite funcional + privacidade | VERIFIED | 12 testes, fixture seed deterministica |
| `backend/main.py` | include_router + CORS intacto | VERIFIED | so 2 linhas adicionadas |

### Verificacao de Links Chave (Wiring)

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| main.py | portal.router | `app.include_router(portal.router)` (linha 52) | WIRED | rota resolve para `/api/portal` (sem trailing slash) |
| portal.py | DB | `Depends(get_db)` | WIRED | handler agregador real, queries por Conta/Transacao/Evento/Jogo |
| portal.py | contas._calcular_saldo_atual | import direto | WIRED | saldo bate com soma manual (1200) no teste |
| portal.py | jogos._parse_entries | import direto | WIRED | rankings batem com logica de jogos.py |
| portal.py | PortalResponse | `response_model=PortalResponse` | WIRED | resposta valida contra o schema |

### Cobertura de Requisitos (REQ -> evidencia)

| Requisito | Status | Evidencia (implementacao + teste) |
|-----------|--------|-----------------------------------|
| API-01 (router publico sem auth) | SATISFIED | sem `Depends(get_current_user)`; `test_portal_responde_200_sem_token` |
| API-02 (pacote agregado, 4 chaves) | SATISFIED | `PortalResponse`; `test_schemas_...` + `test_portal_responde_200_sem_token` |
| API-03 (bloco caixa) | SATISFIED | `_montar_caixa`; `test_portal_caixa_saldo_e_totais` + `test_portal_fluxo_12m_max_12_itens` |
| API-04 (liquido por evento) | SATISFIED | `_montar_eventos` (regra custo_real/estimado/sem_custo); `test_portal_evento_liquido_e_custo_origem` |
| API-05 (bloco jogos) | SATISFIED | `_montar_jogos`; `test_portal_jogos_resumo_e_rankings` + `test_portal_resultados_e_proximos` |
| API-06 (schemas Pydantic v2) | SATISFIED | 11 models Portal*; `response_model=PortalResponse`; validacao no TestClient |
| API-07 (filtro de eventos) | SATISFIED | query `in_([concluido,em_andamento,planejado])` + skip planejado<=0; cancelado excluido; teste assere ausencia |
| SEC-01 (atrasos COUNT int) | SATISFIED | `func.count` + `func.count(distinct)` + `int()`; `test_portal_atrasos_count_int` |
| SEC-02 (sem nome em contexto financeiro) | SATISFIED | nome so em jogos.*; `test_privacidade_nenhum_nome_de_jogador_fora_de_jogos` varre payload |
| SEC-03 (sem PII / sem transacoes cruas) | SATISFIED | `test_privacidade_sem_chaves_de_pii_nem_registro_cru` (12 chaves proibidas) |
| DEPLOY-02 (CORS inalterado) | SATISFIED | diff main.py so import+include_router; allowlist `localhost:3000`/`127.0.0.1:3000` intacta; 0 migrations |

Sem requisitos orfaos: todos os 11 REQs da fase tem implementacao e teste.

### Anti-Padroes Encontrados

| Arquivo | Linha | Padrao | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| (nenhum) | - | - | - | Nenhum stub, TODO/FIXME, return null/[] espurio ou placeholder no codigo da fase |

Notas menores (nao bloqueantes, pre-existentes no projeto inteiro):
- Warnings de deprecacao Pydantic v2 (`class Config`) e FastAPI `on_event` herdados do projeto, fora do escopo desta fase.

### Verificacao Humana Necessaria

Nenhuma. Tipo logic com prova automatizada completa (12 testes funcionais +
privacidade). Sem UI nem integracao externa nesta fase.

### Verificacao da Trava de Privacidade (detalhe)

O teste `test_privacidade_nenhum_nome_de_jogador_fora_de_jogos` NAO e trivial:
- O seed grava "Carlao" e "Pedrinho" como jogadores e participantes pagantes
  (contexto financeiro real no banco).
- Os mesmos nomes APARECEM no bloco `jogos` (artilharia/destaque) -> prova que
  os nomes existem no payload.
- O teste remove `jogos`, faz varredura recursiva de TODAS as strings de
  meta/caixa/eventos e assere que nenhum dos nomes vazou.
- `portal.py` so monta `PortalEvento` com titulo/tipo/data/valores (sem nome de
  participante) e atrasos como `int(...)`, nunca lista. Confirmado em codigo.

### INC-001 (timezone-aware)

`portal.py:26` -> `atualizado_em=datetime.now(timezone.utc).isoformat()`.
Import `from datetime import datetime, timezone` no topo. Gera offset `+00:00`.

## Resumo de Gaps

Nenhum gap. Os 3 planos (01-001 schemas, 01-002 router+registro, 01-003 suite)
entregam o objetivo da fase de ponta a ponta. Os 11 REQs da fase
(API-01..07, SEC-01..03, DEPLOY-02 parte CORS) tem implementacao real e teste
correspondente. A prova fresca do tipo logic foi rodada nesta sessao:
12 passed no portal e 39 passed na suite inteira (zero regressao). CORS intacto,
sem migration nova, endpoint publico responde 200 sem auth, trava de privacidade
varre o payload e atrasos sao int. evidence=logic:test_pass.
