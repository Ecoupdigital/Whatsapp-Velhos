---
audited_at: 2026-06-04T14:05:00Z
auditor: up-revisor
planning_confidence: 96
recommendation: READY_FOR_BUILD
---

# Planning Audit Report — Portal de Transparencia (Velhos Parceiros F.C.)

**Planning Confidence Score:** 96/100

**Recomendacao:** READY_FOR_BUILD

> Feature brownfield, 2 fases (Fase 1 backend: 3 planos; Fase 2 frontend: 7 planos).
> Auditoria two-stage adaptada ao planejamento. Stage 1 cetico (cobertura de spec)
> rodou antes do Stage 2 (qualidade cross-fase). Referencias cruzadas com o codebase real.

---

## Completude por Estagio

| Estagio | Items | Completed | Missing | Score |
|---------|-------|-----------|---------|-------|
| Intake (E1) | 5 | 5 | 0 | 100% |
| Arquitetura (E2) | 7 | 7 | 0 | 100% |
| Planejamento (E2.5) | 10 planos | 10 | 0 | 100% |
| **TOTAL** | **22** | **22** | **0** | **100%** |

---

## STAGE 1 — Spec-Compliance (cetico)

### Cobertura de Requisitos: 17/17 (100%)

| REQ-ID | Mapeado a fase? | Coberto por plano? | Prova automatizada planejada | Status |
|--------|-----------------|--------------------|------------------------------|--------|
| API-01 | Sim (Fase 1) | 01-002 (t3), 01-003 (t1) | pytest: GET 200 SEM Authorization | OK |
| API-02 | Sim (Fase 1) | 01-002, 01-003 | pytest: 4 chaves de topo exatas | OK |
| API-03 | Sim (Fase 1) | 01-002, 01-003 | pytest: saldo==soma manual, fluxo<=12 asc | OK |
| API-04 | Sim (Fase 1) | 01-002, 01-003 | pytest: liquido==arrecadado-custo, custo_origem=="real" | OK |
| API-05 | Sim (Fase 1) | 01-002, 01-003 | pytest: resumo V/E/D+gols, rankings, resultados, proximos | OK |
| API-06 | Sim (Fase 1) | 01-001, 01-002 | response_model=PortalResponse + import-check dos 11 models | OK |
| API-07 | Sim (Fase 1) | 01-002, 01-003 | pytest: cancelado e planejado-sem-arrecadacao ausentes | OK |
| SEC-01 | Sim (Fase 1) | 01-001, 01-002, 01-003 | tipo int (model_fields) + COUNT + teste isinstance int (nao bool) | OK |
| SEC-02 | Sim (Fase 1) | 01-002, 01-003 | pytest: varredura recursiva do JSON, nome fora de jogos.* falha | OK |
| SEC-03 | Sim (Fase 1) | 01-001, 01-002, 01-003 | pytest: set de chaves proibidas (telefone/transacoes/participantes/jogador_id/valor_pago) | OK |
| UI-01 | Sim (Fase 2) | 02-002, 02-007 | Playwright: URL final continua /transparencia (sem redirect) | OK |
| UI-02 | Sim (Fase 2) | 02-002/005/006/007 | Playwright: 4 [data-block] no DOM | OK |
| UI-03 | Sim (Fase 2) | 02-004, 02-007 | Playwright: <svg> recharts no [data-slot="fluxo"] OU estado vazio | OK |
| UI-04 | Sim (Fase 2) | 02-001, 02-003, 02-007 | Playwright: texto "atualizado em" DD/MM as HH:MM + screenshot mobile 390x844 | OK |
| UI-05 | Sim (Fase 2) | 02-003, 02-005 | Playwright: badges COUNT + liquido verde/vermelho por custo_origem | OK |
| DEPLOY-01 | Sim (Fase 2) | 02-002 (layout), 02-007 | Playwright: head meta[name=robots] contem noindex | OK |
| DEPLOY-02 | Sim (Fase 1+2) | 01-002, 02-001, 02-007 | CORS allowlist intacta (grep) + Playwright same-origin (host==localhost:3000) | OK |

**Cobertura:** 17/17 (100%). Nenhum REQ orfao. Nenhum plano "rapido demais": cada
requisito testavel tem asserção concreta (pytest no backend, Playwright no frontend),
nao apenas afirmacao.

### TRAVA DE PRIVACIDADE (SEC-01/02/03) — tem prova automatizada real?

**SIM, em tres camadas independentes e nao-bypassaveis:**

1. **Tipagem (01-001):** `PortalCaixaAtrasos.mensalidades` e `.jogadores` sao
   `int` no schema Pydantic. O verify roda `model_fields[...].annotation is int`.
   Pydantic v2 com `response_model` REJEITA serializar lista onde o tipo e int.
   A trava esta no contrato, nao so na intencao.

2. **Construcao do handler (01-002):** `_montar_caixa` usa `func.count(...)` e
   `func.count(func.distinct(Mensalidade.jogador_id))` — SQL agregado puro, nunca
   seleciona `Jogador.nome`. `_montar_eventos` usa `func.sum(EventoParticipante.valor_pago)`
   — aggregate, nunca le `nome_avulso` (campo de convidado existente no modelo).
   O verify por AST garante ausencia de `commit/add/delete` (read-only) e de `get_current_user`.

3. **Varredura de payload (01-003):** dois testes funcionais provam a trava em runtime:
   - `test_privacidade_nenhum_nome_de_jogador_fora_de_jogos`: serializa o payload,
     REMOVE o bloco `jogos` (onde nome em ranking e legitimo), varre recursivamente
     `meta`/`caixa`/`eventos` procurando os nomes do seed (Carlao/Pedrinho). Se um nome
     de devedor vazasse em `caixa.atrasos`, o teste pegaria. O plano ja blinda contra
     falso-positivo (nomes do seed nao colidem com contas/eventos).
   - `test_privacidade_sem_chaves_de_pii_nem_registro_cru`: coleta TODAS as chaves do
     JSON e cruza com um set proibido (telefone, transacoes, participantes, jogador_id,
     valor_pago, data_pagamento, apelido, password_hash, comprovante).

A trava e a parte mais bem-coberta do plano. Prova real, automatizada, em camadas.

### Stage 1 Score

```
PASS = 17, FAIL = 0, PARTIAL = 0
Confidence Stage 1 = 17 / 17 * 100 = 100/100
```

Zero FAIL critico. **STAGE_1_PASS** — prossegue para Stage 2.

---

## STAGE 2 — Qualidade do Planejamento (cross-fase)

### Coerencia do contrato GET /api/portal (3 camadas)

Cruzei campo a campo: **SYSTEM-DESIGN §3** (fonte da verdade) -> **Fase 1 implementa**
(schemas 01-001 + handler 01-002) -> **Fase 2 consome** (types 02-001).

| Campo | SYSTEM-DESIGN | Schema Pydantic (01-001) | Type TS (02-001) | Bate? |
|-------|---------------|--------------------------|------------------|-------|
| `meta.time_nome` | string | str | string | SIM |
| `meta.atualizado_em` | string ISO | str | string | SIM |
| `caixa.saldo_atual` | float | float | number | SIM |
| `caixa.fluxo_12m[].{mes,entradas,saidas}` | obj | PortalFluxoMes | PortalFluxoMes | SIM |
| `caixa.atrasos.{mensalidades,jogadores}` | int | int | number | SIM |
| `eventos[].{titulo,tipo,data,arrecadado,custo,custo_origem,liquido,status}` | mix | PortalEvento | PortalEvento | SIM |
| `eventos[].data` nullable | string\|null | Optional[str]=None | string \| null | SIM |
| `eventos[].custo_origem` | "real"\|"estimado"\|"sem_custo" | str | PortalCustoOrigem (union) | SIM |
| `jogos.resumo.{vitorias,empates,derrotas,gols_pro,gols_contra}` | int | int | number | SIM |
| `jogos.{artilharia,assistencias,destaques}[]` | {nome,quantidade} | PortalRankingEntry | PortalRankingEntry | SIM |
| `jogos.ultimos_resultados[].{data,adversario,placar}` | obj | PortalResultado | PortalResultado | SIM |
| `jogos.proximos_jogos[].{data,horario,local,adversario}` | obj | PortalProximoJogo | PortalProximoJogo | SIM |

**Nomes e tipos batem 1:1 nas tres camadas.** O frontend (02-001) declara explicitamente
"espelho de SYSTEM-DESIGN secao 3". Zero drift de contrato.

### Pontos especificos solicitados — todos verificados

1. **Fase 2 usa fetch dedicado (nao apiFetch)?**
   SIM. Confirmado no codebase: `apiFetch` (lib/api.ts:26-29) faz `window.location.href = "/login"`
   no status 401. O plano 02-001 cria `fetchPortal()` com `fetch` nativo, sem Authorization,
   `cache: "no-store"`, e justifica explicitamente que NAO usa apiFetch pra nao redirecionar.
   02-002 e 02-007 tem verify negativo: `! grep apiFetch|api.get|useAuth` na page. Coberto.

2. **noindex no lugar certo (layout server component)?**
   SIM. O plano 02-002 poe `export const metadata: Metadata = { robots: { index: false,
   follow: false } }` no `(public)/layout.tsx`, que e SERVER COMPONENT (sem "use client").
   A page e client (precisa de useEffect/fetch), por isso o metadata vive no layout, nao na
   page. Decisao correta: o Next so coleta `metadata` de server components. Cobre DEPLOY-01
   pra toda rota dentro de `(public)`. 02-007 prova via Playwright lendo o `<head>`.

3. **Endpoint nunca retorna 401 (publico) -> consumo sem token funciona?**
   SIM. O router (01-002) NAO tem `Depends(get_current_user)` e o app NAO tem dependency
   global de auth (confirmado: auth e por-router; main.py registra cada router sem guard
   global). O verify do 01-002 (t3) bate em `/api/portal` SEM header e exige 200. O fetch
   publico do front nunca recebe 401, entao o redirect de apiFetch nem seria acionado — mas
   o fetch dedicado e cinto-e-suspensorio correto.

4. **Filtro de status de eventos + regra de custo/liquido batem nas 3 camadas?**
   SIM, com uma sutileza de implementacao ja antecipada no plano.
   - SYSTEM-DESIGN §3: inclui concluido+em_andamento; planejado so se arrecadado>0; exclui
     cancelado; ordena data desc.
   - Fase 1 (01-002 _montar_eventos): query `status.in_(["concluido","em_andamento","planejado"])`
     e DEPOIS `if e.status=="planejado" and arrecadado<=0: continue`. Cancelado nunca entra
     na query. Resultado identico ao spec. (Nota: a query inclui "planejado" e filtra por
     arrecadacao no Python — correto porque arrecadado depende de sum(participantes), nao da
     pra filtrar so no SQL do Evento.)
   - Regra de custo: `custo_real>0 -> real`; senao `custo_estimado>0 -> estimado`; senao
     `sem_custo`. Identica em SYSTEM-DESIGN §3, no handler 01-002 e nos rotulos do front
     (02-005 ROTULO_CUSTO: real->"Custo", estimado->"Custo previsto", sem_custo->"A confirmar").
   - `liquido = arrecadado - custo` consistente. 01-003 prova com seed (Galeto: 400-200=200).

5. **Mapeamento gols_marcados->gols_pro / gols_sofridos->gols_contra consistente?**
   SIM. Confirmei no codebase: `jogos.estatisticas` retorna `gols_marcados`/`gols_sofridos`
   (jogos.py:51-52). O handler do portal (01-002) NAO chama o endpoint; replica a logica inline
   somando `gols_favor`/`gols_contra` dos Jogo realizados e os expoe como `gols_pro`/`gols_contra`.
   SYSTEM-DESIGN §4 documenta o rename explicitamente ("gols_marcados->gols_pro"). Front (02-001
   PortalJogosResumo) consome `gols_pro`/`gols_contra`. Coerente ponta a ponta.

### Dependencias / Waves

| Plano | Wave | depends_on | Coerente? |
|-------|------|-----------|-----------|
| 01-001 | 0 | [] | SIM (schemas + fixture, infra) |
| 01-002 | 1 | [01-001] | SIM (handler precisa dos schemas) |
| 01-003 | 2 | [01-001, 01-002] | SIM (suite precisa do endpoint + fixture) |
| 02-001 | 0 | [] | SIM (types + fetch, infra) |
| 02-002 | 1 | [02-001] | SIM (page usa fetchPortal/types) |
| 02-003 | 2 | [02-002] | SIM (blocos no scaffold) |
| 02-004 | 2 | [02-003] | SIM (FluxoChart encaixa no slot do CaixaBloco) |
| 02-005 | 2 | [02-002] | SIM (paralelo a 003) |
| 02-006 | 2 | [02-002] | SIM (paralelo a 003) |
| 02-007 | 3 | [02-003,004,005,006] | SIM (montagem final + prova visual) |

- Sem ciclos. Waves bem atribuidas. Paralelismo correto (02-003/005/006 na wave 2 em paralelo;
  02-004 depende de 003 porque injeta no slot dele).
- **Fase 2 declara dependencia da Fase 1?** SIM, em multiplos pontos: ROADMAP ("Depende de:
  Fase 1"), PHASE.md da Fase 2 ("Dependencias: Fase 01"), e cada plano de Fase 2 tem secao
  "Dependencia de fase" explicita. 02-007 marca como CRITICA ("Fase 01 rodando pra prova de
  runtime") e cria `seed-portal-dev.sh` como GATE que falha se `/api/portal` nao responder 200.

### Sonnet-readiness

| Plano | Imports | Tipos | Endpoints/SQL | Codigo exato | Verify automatizado | Score |
|-------|---------|-------|---------------|--------------|---------------------|-------|
| 01-001 | exatos | 11 models completos | N/A | bloco completo | python -c import-check | 100% |
| 01-002 | exatos | reusa schemas | SQL func.count/sum + reuso explicito | 4 helpers + handler completos | AST read-only/publico | 100% |
| 01-003 | exatos | N/A | usa fixture | suite completa | pytest -k | 100% |
| 02-001 | exatos | types completos | fetch path | bloco completo | tsc + node Intl check | 100% |
| 02-002 | exatos | reusa types | rewrite | tsx completo | grep + tsc | 100% |
| 02-003 | exatos | props tipadas | N/A | tsx completo | grep + tsc | 100% |
| 02-004 | exatos | recharts TooltipProps | N/A | tsx completo | grep + tsc | 100% |
| 02-005 | exatos | Record typesafe | N/A | tsx completo | grep + tsc | 100% |
| 02-006 | exatos | props tipadas | N/A | tsx completo | grep + tsc | 100% |
| 02-007 | exatos | barrel | rewrite + Playwright | montagem + roteiro | tsc + Playwright snippet | 100% |

**Score medio Sonnet-ready: 100%.** Cada plano traz codigo EXATO (nao pseudo), imports
literais, verify automatizado, e cita arquivo:linha do codebase real pra reuso. Um executor
Sonnet roda sem ambiguidade. Todas as referencias de codigo foram cruzadas e existem:
`_calcular_saldo_atual` (contas.py:14), `_parse_entries`/`estatisticas` (jogos.py:56/38),
`resumo_evento` valor_pago (eventos.py), colunas de Evento/Jogo/Mensalidade/Configuracao/Conta
(models.py), CORS allowlist (main.py:32), apiFetch 401 (api.ts:26-29), rewrite (next.config.mjs:7-8),
tokens tailwind (shadow-brand, border-border, brand-red-muted, surface-card todos presentes),
componentes UI (Card/EmptyState/Skeleton/SkeletonCard exportados no barrel), icon-192.svg.

### Brownfield respeitado

- **Nao reescreve logica existente:** os planos REUSAM (`_calcular_saldo_atual`, `_parse_entries`
  importados) e REPLICAM regras simples inline (estatisticas, fluxo_mensal) sem tocar nos routers
  originais. Nenhum plano edita contas.py/jogos.py/financeiro.py/eventos.py.
- **Nao instala lib nova:** recharts ^3.8, framer-motion ^12, lucide-react ja no package.json.
  Backend usa so SQLAlchemy/Pydantic existentes. Verifies reforcam "nenhuma lib nova".
- **CORS intacto:** 01-002 (t2) tem verify que falha se a allowlist mudar; instrucao explicita
  "NAO mexer no CORS".
- **Nao toca codigo do app autenticado:** o router e publico por construcao (sem guard); o
  `(public)` fica FORA do `(app)`; o modelo de auth JWT interno fica inalterado. main.py so
  ganha 1 import + 1 include_router. schemas.py so ganha bloco Portal* ao fim (existentes intactos).
- **Sem migration, sem env nova, sem container novo:** read-only, mesma pipeline Coolify.

---

## Inconsistencias Detectadas

### INC-001: Timezone de `meta.atualizado_em` — naive vs UTC (cross-fase, nao bloqueante)
**Tipo:** conflito sutil entre contrato e implementacao
**Severidade:** importante (nao critica; afeta exibicao do carimbo, nao a trava nem o contrato)
**Descricao:**
- SYSTEM-DESIGN §3 comenta `atualizado_em` como "ISO 8601 do momento da request (UTC->BRT no front)".
- O plano 01-002 implementa `atualizado_em=datetime.now().isoformat()` — isso gera um datetime
  NAIVE (sem sufixo `Z`, sem offset), no fuso local do processo do backend.
- O plano 02-001 `formatAtualizadoEm` faz `new Date(iso)` + `Intl` com `timeZone:
  "America/Sao_Paulo"`, e o sanity check da tarefa 3 usa input com `Z` ("2026-06-04T17:30:00Z"
  -> 14:30 BRT), assumindo que o backend manda UTC.
- Descompasso: se o backend prod roda em UTC e manda string naive sem `Z`, o `new Date()` do
  navegador interpreta como horario LOCAL do browser e o `Intl` reconverte pra Sao_Paulo,
  resultando em horario deslocado pelo offset. O sanity check do front passaria (usa `Z`
  hardcoded), mas o runtime real exibiria hora errada. Se o backend ja roda em BRT (o codebase
  tem `_now_brt()` em campanhas.py, sinalizando que o app pensa em BRT), o carimbo fica certo
  por coincidencia de fuso, mas continua fragil.
**Acao sugerida (resolver no build da Fase 1, ajuste de 1 linha):**
Padronizar o backend pra emitir um instante inequivoco. Duas opcoes equivalentes:
- (a) emitir UTC com Z: `datetime.now(timezone.utc).isoformat()` (vira "...+00:00", o `new Date`
  do front interpreta corretamente como UTC e o Intl converte pra BRT). OU
- (b) reusar o `_now_brt()` ja existente no codebase e emitir com offset `-03:00`, e o front so
  precisa garantir que o ISO tem offset.
Recomendo (a): UTC com timezone-aware bate exatamente com o comentario do SYSTEM-DESIGN
("UTC->BRT no front") e com o sanity check ja escrito no 02-001 (que usa `Z`). E uma linha no
handler `_montar_meta`. Nao bloqueia o planejamento; e um ajuste pontual de execucao.

### INC-002: `entrou_mes`/`saiu_mes` sem asserção propria nos testes (menor)
**Tipo:** gap de cobertura de teste (nao de implementacao)
**Severidade:** menor
**Descricao:** o testavel de API-03 cobre `saldo_atual` e `fluxo_12m`; `entrou_mes`/`saiu_mes`
sao calculados no handler (01-002) mas o teste 01-003 ja os assere via `seed_portal_data`
(`assert caixa["entrou_mes"]==exp["entrou_mes"]`). Na pratica ESTA coberto no plano de teste,
entao e so uma observacao do REQUIREMENTS-VALIDATION carregada — sem acao necessaria.

### INC-003: `nome_avulso` (convidado) nao exercitado no seed de privacidade (menor)
**Tipo:** gap de cobertura de teste (nao de vazamento)
**Severidade:** menor / informativo
**Descricao:** `EventoParticipante.nome_avulso` e PII potencial (nome de convidado). O handler
01-002 NUNCA o seleciona (so faz `sum(valor_pago)`), entao nao ha vazamento. Mas o seed do teste
01-003 nao cria um participante avulso, logo o teste de privacidade nao exercita esse caminho
especifico. Sugestao opcional (nao bloqueante): no seed, adicionar 1 EventoParticipante com
`nome_avulso="Visitante X"` e incluir esse nome na varredura de `test_privacidade_*`, blindando
contra uma futura regressao que serialize participantes. Pode ser feito direto no build.

---

## Aprovacoes Faltantes

| Item | Esperado | Atual |
|------|----------|-------|
| REQUIREMENTS-VALIDATION | APROVADO | presente, score 100, blocking:false |
| Planos por fase | 10 PLAN.md com frontmatter | 10/10 presentes e validos |
| PLAN-REVIEW por plano (planning-supervisor) | opcional neste fluxo | nao presente (o up-revisor consolida o gate) |

Nota: este fluxo usa o up-revisor como revisor unico do planejamento (substitui supervisores
separados). O gate `approvals.log` e atualizado por este relatorio.

---

## Pendencias Conhecidas

PENDING.md nao foi localizado em `.plano/`. As pendencias de execucao estao internalizadas nos
planos como NOTAS (ex: recalculo de saldo no 01-001, ordenacao None-por-ultimo no 01-002, gate
de seed no 02-007). Sao notas de execucao, nao blockers de planejamento.

- 0 blockers de planejamento.
- 3 inconsistencias: 1 importante (INC-001 timezone, ajuste de 1 linha no build) + 2 menores.

Nenhuma bloqueia o build. INC-001 deve ser resolvida no inicio do build da Fase 1.

---

## Veredito

**READY_FOR_BUILD** (Planning Confidence 96/100)

O planejamento esta solido e pronto pra build. Stage 1 fechou 100/100: os 10 planos cobrem
17/17 requisitos, cada um com prova automatizada concreta (pytest no backend, Playwright no
frontend), sem requisito orfao e sem plano "rapido demais". A TRAVA DE PRIVACIDADE (SEC-01/02/03)
tem prova real em tres camadas (tipo int no schema, COUNT/SUM agregado no handler sem selecionar
nome, e varredura recursiva do payload nos testes) — e a parte mais bem-blindada do plano. Stage 2
confirmou coerencia perfeita do contrato `GET /api/portal` nas tres camadas (SYSTEM-DESIGN ->
schemas Pydantic -> types TS batem 1:1), waves/dependencias sem ciclo com Fase 2 declarando
dependencia explicita da Fase 1 (inclusive com gate de runtime), Sonnet-readiness de 100% (codigo
exato, imports literais, todas as referencias de codebase cruzadas e existentes), e brownfield
integralmente respeitado (reuso sem reescrita, zero lib nova, CORS intacto, app autenticado
intocado, sem migration).

O score nao e 100 por causa da INC-001 (timezone naive de `atualizado_em`): um descompasso real
entre o comentario "UTC" do contrato e o `datetime.now().isoformat()` do handler, que pode exibir
o carimbo com hora deslocada em prod se o servidor nao rodar em BRT. E um ajuste de uma linha
(`datetime.now(timezone.utc)`) a fazer no inicio do build da Fase 1, nao um defeito de planejamento.
As outras duas inconsistencias sao menores e opcionais. Nada bloqueia.

### Pronto pra Build

Proximos passos:
1. Gerar PLAN-READY.md
2. Apresentar ao dono via CEO
3. No build da Fase 1 (plano 01-002), aplicar o ajuste do INC-001: emitir
   `atualizado_em=datetime.now(timezone.utc).isoformat()` (ou reusar `_now_brt()` com offset)
   pra o carimbo BRT do front bater em qualquer fuso de servidor.
4. Aguardar `/up:build`.
