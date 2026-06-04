---
phase: 02-api-faixas-itens-resumo
verified: 2026-06-01T16:15:00Z
status: passed
score: 12/12 must-haves verificados
evidence:
  - "logic:test_pass"
gaps: []
---

# Fase 02: API (faixas + itens + resumo) - Relatorio de Verificacao

**Objetivo da Fase:** Endpoints para gerir faixas e split por tipo, recebidos derivado, validacoes de fechamento e resumo consolidado.
**Verificado:** 2026-06-01
**Status:** passed
**Tipo de codigo:** logic (backend/API propria, parser/calculo, validacoes; sem integracao externa, sem UI)

## Evidencia Fresca (logic:test_pass)

Rodado pelo verificador nesta sessao (nao confiando nos SUMMARYs):

```
$ cd backend && python3 -m pytest tests/ -q
..........................                                               [100%]
26 passed, 21 warnings in 2.49s
```

Os 26 testes (verbose) cobrem cada requisito da fase e incluem `test_migrations.py` da Fase 1 rodando junto (legacy_engine preservado):

```
tests/test_evento_tipos_e_popular.py::test_criar_e_atualizar_tipos_item PASSED
tests/test_evento_tipos_e_popular.py::test_evento_sem_tipos_item_retorna_none PASSED
tests/test_evento_tipos_e_popular.py::test_popular_elenco_cria_faixa_por_jogador PASSED
tests/test_evento_tipos_e_popular.py::test_atualizar_cartoes_ignora_recebidos_do_payload PASSED
tests/test_evento_tipos_e_popular.py::test_atualizar_cartoes_reconciliacao_400 PASSED
tests/test_faixas.py::test_faixa_numerada_quebrada_e_lote_sem_numero_soma_recebidos PASSED
tests/test_faixas.py::test_numerada_deriva_quantidade_ignora_payload PASSED
tests/test_faixas.py::test_numerada_fim_menor_que_inicio_400 PASSED
tests/test_faixas.py::test_sem_numero_sem_quantidade_400 PASSED
tests/test_faixas.py::test_delete_que_quebra_reconciliacao_400_e_nao_remove PASSED
tests/test_faixas.py::test_proximo_numero_considera_faixas PASSED
tests/test_faixas.py::test_get_participante_singular_retorna_faixas PASSED
tests/test_faixas.py::test_get_participante_singular_404 PASSED
tests/test_itens.py::test_split_que_nao_fecha_400 PASSED
tests/test_itens.py::test_split_que_fecha_persiste PASSED
tests/test_itens.py::test_tipo_fora_do_evento_400 PASSED
tests/test_itens.py::test_substituicao_total_remove_tipo_omitido PASSED
tests/test_itens.py::test_lista_vazia_exige_vendidos_zero PASSED
tests/test_migrations.py::test_mig05_estritamente_aditiva PASSED
tests/test_migrations.py::test_test01_contagem_recebidos_preservada PASSED
tests/test_migrations.py::test_test06_idempotencia PASSED
tests/test_migrations.py::test_backfill_ramos PASSED
tests/test_resumo.py::test_resumo_itens_por_tipo_consolida PASSED
tests/test_resumo.py::test_resumo_sem_itens_lista_vazia PASSED
tests/test_schemas_smoke.py::test_get_evento_retorna_tipos_item_como_lista PASSED
tests/test_schemas_smoke.py::test_participante_out_tem_faixas_e_itens_vazios PASSED
```

Os testes nao sao vacuos: asseguram somas concretas (12+6+5=23 recebidos), 400 com substring de mensagem ("8" e "10"), recebidos derivado ignorando payload 999 -> 10, consolidacao cru/assado 6+3=9, etc. Todos verificados linha a linha contra `routers/eventos.py`.

## Alcance do Objetivo

### Verdades Observaveis

| # | Verdade | Status | Evidencia |
|---|---------|--------|-----------|
| 1 | Faixa numerada quebrada + lote sem numero; recebidos = soma | VERIFIED | `criar_faixa` -> `_aplicar_dados_faixa` -> `_pos_mutacao_faixa` -> `_recalc_recebidos`; test_faixas asserta 12+6+5=23 |
| 2 | Recebidos derivado da soma das faixas (cliente nao dita) | VERIFIED | `_recalc_recebidos` (eventos.py:177) `sum(f.quantidade for f in p.faixas)`; chamado em toda mutacao antes da reconciliacao |
| 3 | PUT itens valida fechamento (400 se soma != vendidos) | VERIFIED | `atualizar_itens` (eventos.py:493-498) compara `soma_vendido != p.qtd_vendidos`; test_split_que_nao_fecha_400 |
| 4 | popular_elenco cria 1 faixa numerada/jogador; reconciliacao mantida | VERIFIED | popular_elenco (eventos.py:230-243) cria faixa + `_recalc_recebidos`; test asserta 1 faixa/jogador, numeros nao colidem |
| 5 | atualizar_cartoes coexiste com faixas sem quebrar reconciliacao | VERIFIED | ignora recebidos do payload, `selectinload(faixas)`, `_recalc_recebidos` + `_validar_reconciliacao`; test 999->10 e 400 |
| 6 | GET /resumo agrega itens_por_tipo entre participantes | VERIFIED | resumo_evento (eventos.py:656-670) group_by(tipo)+join; test cru 9/2, assado 9/4 |
| 7 | tipos_item persistido como Text JSON e devolvido como lista | VERIFIED | criar/atualizar `json.dumps`; `EventoOut.field_validator(mode=before)` desserializa; test POST/GET/PUT |
| 8 | _proximo_numero considera faixas e legado | VERIFIED | _proximo_numero (eventos.py:151-164) max de participante e faixa; test proximo=13 apos 1-12 |
| 9 | ParticipanteOut com faixas + itens | VERIFIED | schemas.py:421-422; models relationships back_populates |
| 10 | GET singular participante retorna faixas+itens | VERIFIED | detalhe_participante (eventos.py:387) `_carregar_participante` com selectinload; test_get_participante_singular_retorna_faixas + 404 |
| 11 | TEST-02: faixas quebradas somam certo | VERIFIED | test_faixa_numerada_quebrada_e_lote_sem_numero_soma_recebidos |
| 12 | TEST-03: fechamento de itens (nao fecha->400, fecha->persiste) | VERIFIED | test_split_que_nao_fecha_400 + test_split_que_fecha_persiste |

**Score:** 12/12 verdades verificadas

### Artefatos Requeridos

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| backend/schemas.py | Faixa/Item/ResumoItemTipo/tipos_item | VERIFIED | 7 schemas novos + tipos_item em Create/Update/Out + faixas/itens em ParticipanteOut + itens_por_tipo em EventoResumo |
| backend/routers/eventos.py | CRUD faixas, PUT itens, resumo, GET singular, helpers | VERIFIED | Implementacao completa, sem stubs, sem TODO/placeholder |
| backend/models.py | EventoCartaoFaixa, EventoParticipanteItem, Evento.tipos_item | VERIFIED | tabelas + relationships back_populates + indices (unique part+tipo) |
| backend/tests/test_faixas.py | TEST-02, API-01/02/08/10 | VERIFIED | 8 testes, asserts concretos |
| backend/tests/test_itens.py | API-03/TEST-03 | VERIFIED | 5 testes |
| backend/tests/test_resumo.py | API-06 | VERIFIED | 2 testes |
| backend/tests/test_evento_tipos_e_popular.py | API-04/05/07 | VERIFIED | 5 testes |
| backend/tests/conftest.py | legacy_engine preservado + fixtures API | VERIFIED | legacy_engine intacto; fixtures API ao final |

### Verificacao de Links Chave (Wiring)

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| criar/atualizar/remover faixa | _recalc_recebidos | _pos_mutacao_faixa | WIRED | flush->refresh->recalc->reconcile->valor->commit |
| atualizar_cartoes | p.faixas | selectinload | WIRED | evita lazy-load fora da sessao (corrigido em 02-04) |
| resumo_evento | EventoParticipanteItem | join+group_by(tipo) | WIRED | coalesce(0); filtra por evento_id |
| atualizar_itens | evento.tipos_item | _tipos_do_evento | WIRED | 400 se tipo fora; desserializa Text JSON defensivamente |
| EventoOut.tipos_item | coluna Text JSON | field_validator(before) | WIRED | aceita str->list, None/"" -> None |
| detalhe_participante | faixas+itens | _carregar_participante selectinload | WIRED | sem produto cartesiano |

### Cobertura de Requisitos

| Requisito | Status | Evidencia |
|-----------|--------|-----------|
| API-01 CRUD faixas | SATISFIED | GET/POST/PUT/DELETE faixas, 404 cross-evento, deriva quantidade |
| API-02 Recebidos derivado | SATISFIED | _recalc_recebidos antes de reconciliacao |
| API-03 PUT itens por tipo | SATISFIED | substituicao total, validacao tipo+fechamento |
| API-04 popular_elenco | SATISFIED | 1 faixa numerada/jogador |
| API-05 atualizar_cartoes | SATISFIED | recebidos derivado, payload ignorado, docstring documenta |
| API-06 resumo itens_por_tipo | SATISFIED | agregacao por tipo |
| API-07 tipos_item no Evento | SATISFIED | json.dumps escrita, field_validator leitura, PUT salva |
| API-08 _proximo_numero | SATISFIED | max participante+faixa |
| API-09 ParticipanteOut | SATISFIED | faixas+itens + todos schemas novos presentes |
| API-10 GET singular | SATISFIED | selectinload, fecha handoff INC-001 |
| TEST-02 | SATISFIED | test_faixas |
| TEST-03 | SATISFIED | test_itens |

### Anti-Padroes Encontrados

| Arquivo | Padrao | Severidade | Impacto |
|---------|--------|------------|---------|
| eventos.py / schemas.py / models.py | nenhum TODO/FIXME/placeholder/stub | - | Nenhum bloqueador. Apenas DeprecationWarnings pre-existentes (FastAPI on_event, Pydantic class Config, SQLAlchemy Query.get) - nao afetam funcionalidade |

### Verificacao Humana Necessaria

Nenhuma. Fase 100% logic (API/backend), totalmente coberta por testes deterministicos. UI consumidora destes endpoints e responsabilidade da Fase 3.

### Resumo de Gaps

Sem gaps. Todos os 12 must-haves verificados nos tres niveis (existe, substantivo, conectado). A evidencia logic:test_pass foi rodada fresca pelo verificador (26 passed), os testes asseguram comportamento concreto (somas, status 400 com mensagem, derivacao ignorando payload, consolidacao por tipo) e batem com a implementacao real em routers/eventos.py. test_migrations.py da Fase 1 roda junto sem regressao (legacy_engine preservado).
