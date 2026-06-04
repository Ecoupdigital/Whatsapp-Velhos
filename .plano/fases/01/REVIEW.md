---
phase: 01-backend-api-publica
reviewed: 2026-06-04T14:21:27Z
stage_1_confidence: 100/100
stage_1_decision: PASS
stage_2_quality_score: 9/10
stage_2_security_score: 10/10
issues_critical: 0
issues_important: 0
issues_minor: 2
verdict: APPROVED
evidence: logic:test_pass
---

# Review Two-Stage - Fase 01 (Backend API publica / Portal de Transparencia)

## Stage 1: Spec-Compliance (Confidence 100/100)

**Metodo:** validacao comportamental real (tests rodados nesta sessao + introspeccao
de rota em runtime + probe adversarial de privacidade), nao confianca no SUMMARY.

| REQ | Requisito | Status | Evidencia (fresca) |
|-----|-----------|--------|--------------------|
| API-01 | Router publico sem auth | PASS | runtime: rota `/api/portal` deps `['get_db']`, sem `get_current_user`; `test_portal_responde_200_sem_token` verde |
| API-02 | Pacote agregado 4 chaves | PASS | `set(body.keys()) == {meta,caixa,eventos,jogos}` |
| API-03 | Bloco caixa | PASS | saldo 1200 bate soma manual; `fluxo_12m` cortado em `[-12:]`; atrasos COUNT |
| API-04 | Liquido por evento | PASS | custo_real>0 -> origem "real", liquido=200=arrec-custo; branches estimado/sem_custo testados por probe |
| API-05 | Bloco jogos | PASS | resumo V1/E0/D1, artilharia/assist/destaque, resultados+proximos |
| API-06 | Schemas Pydantic v2 | PASS | `response_model=PortalResponse`; payload valida |
| API-07 | Filtro de eventos | PASS | cancelado excluido na query, planejado<=0 skip, data desc |
| SEC-01 | Atrasos COUNT int | PASS | `int(func.count)` puro; probe confirma COUNT=1 sem lista |
| SEC-02 | Sem nome em ctx financeiro | PASS | probe adversarial: token-devedor em descricao/local/nome_avulso NAO vaza fora de jogos.* |
| SEC-03 | Sem PII / sem tx crua | PASS | schema nao tem campos crus; 12 chaves proibidas ausentes; probe limpo |
| DEPLOY-02 | CORS inalterado | PASS | diff main.py = 2 linhas (import+include); bloco CORS intacto; 0 migration |

**Score:** 11 PASS / 0 FAIL / 0 PARTIAL = 100/100.

### Trava de privacidade (ponto critico) - probe adversarial do revisor
Escrevi um teste descartavel que plantou o token `DEVEDOR_SECRETO_XYZ123` em TODOS
os campos free-text que o portal ignora ou agrega:
- `Transacao.descricao` ("pagamento atrasado de DEVEDOR...")
- `Evento.descricao` e `Evento.local`
- `EventoParticipante.nome_avulso` (campo de convidado avulso, candidato n.1 a vazamento)
- `Jogador.nome` com `Mensalidade` atrasada (contexto financeiro real)

Resultado: o token NAO apareceu em `meta/caixa/eventos`, NAO apareceu em `jogos.*`,
e `atrasos.mensalidades` permaneceu `int` (COUNT=1). A trava resiste a dados reais,
nao so ao seed do teste. **Zero brecha de privacidade.**

Razao estrutural: `_montar_eventos` so projeta `titulo/tipo/data/arrecadado/custo/
custo_origem/liquido/status` (nunca `descricao`, `local`, nem qualquer linha de
participante - so `func.sum(valor_pago)`). `_montar_caixa` so projeta agregados e
`int(COUNT)`. Nomes existem unicamente em `jogos.*` (rankings/adversario/local de jogo),
permitido por SEC-02.

### Faltantes / Extra (YAGNI) / Mal-entendidos
Nenhum. Escopo entregue exatamente: 11 REQs, sem over-building. Sem stub/TODO/placeholder.

## Stage 2: Code-Quality + Seguranca

**Quality:** 9/10 | **Security:** 10/10

### Seguranca (OWASP)
- INJ: tudo via ORM SQLAlchemy (`func.sum`, `.filter`); zero SQL cru/concat/eval. OK.
- AUTHZ: rota publica intencional (read-only agregado, sem PII) - design correto, sem IDOR (nao recebe id de usuario). OK.
- DATA: zero secret hardcoded no codigo da fase; payload sem telefone/tx/participante. OK.
- API: CORS allowlist preservada (`localhost:3000`/`127.0.0.1:3000`), nao `*`. Endpoint e GET idempotente read-only (sem CSRF surface). OK.
- INC-001: `datetime.now(timezone.utc).isoformat()` timezone-aware. OK.

### Edge cases (probe do revisor, todos verdes)
- Banco vazio: 200, saldo 0.0, listas vazias, atrasos 0 - sem ZeroDivision nem 500.
- Evento sem custo: `custo_origem=="sem_custo"`, custo 0, liquido = arrecadado.
- Evento so com estimado: `custo_origem=="estimado"`. Divisao: nao ha divisao no fluxo (so somas), risco zero.

### Issues Menores (nao bloqueantes)

### RV-001: total_entrou/saiu somam todas as contas, saldo_atual so as ativas
**Arquivo:** `backend/routers/portal.py:36` vs `:38-43`
**Eixo:** Quality
**Problema:** `saldo_atual` = soma de `_calcular_saldo_atual` so de contas ativas;
`total_entrou`/`total_saiu` somam Transacao de TODAS as contas (ativas+inativas).
Se existir transacao em conta inativa, o front nao consegue reconciliar
`saldo = saldo_inicial + total_entrou - total_saiu`. Esta de acordo com o spec
(API-03 define saldo via contas ativas e totais como agregados separados), entao
nao e bug - so um nuance que a Fase de frontend nao deve tentar reconciliar ingenuamente.
**Fix sugerido:** nenhum exigido; documentar no contrato do portal que `saldo_atual` e
`total_*` tem escopos diferentes de proposito.

### RV-002: ordenacao de eventos sem data vai pro fim por concatenacao manual
**Arquivo:** `backend/routers/portal.py:129-132`
**Eixo:** Quality
**Problema:** eventos sem `data` sao concatenados ao fim (`com_data + sem_data`).
Comportamento correto e deterministico, mas a ordem relativa entre os sem-data
nao e estabilizada. Impacto pratico nulo (eventos publicados normalmente tem data).
**Fix sugerido:** opcional - `key=lambda ev: (ev.data is None, ev.data)` num unico sort.

## Veredito

**APPROVED.** Stage 1 = 100/100 (11/11 REQs PASS, zero FAIL), com evidencia fresca
do tipo logic (12 testes do portal + 39 da suite verdes nesta sessao, zero regressao).
A trava de privacidade - ponto critico desta fase publica - resistiu a um probe
adversarial que plantou nome de devedor em todos os campos free-text ignorados:
nenhum vazamento. Stage 2 sem criticas (quality 9/10, security 10/10); apenas 2
issues menores nao bloqueantes. Wiring ponta a ponta confirmado em runtime (rota
registrada, sem auth na cadeia, CORS intacto, zero migration). evidence=logic:test_pass.
