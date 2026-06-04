---
phase: 01-backend-api-publica
plan: "01-003"
subsystem: backend
tags: [pytest, testes, privacidade, portal]
dependency_graph:
  requires: ["01-001", "01-002"]
  provides: ["suite-test-portal"]
  affects: []
tech_stack:
  added: []
  patterns: [pytest-fixture, TestClient, varredura-recursiva-json]
key_files:
  created: []
  modified:
    - backend/tests/test_portal.py
decisions:
  - "Suite completa em arquivo unico, aproveitando fixture seed_portal_data e client do conftest sem alterar portal.py ou schemas.py (nenhum bug encontrado que exigisse correcao)"
metrics:
  duration_mins: 8
  completed_at: "2026-06-04T14:14:16Z"
  tasks_completed: 2
  files_changed: 1
---

# Fase 01 Plano 003: Suite pytest do portal (funcional + privacidade) Summary

Suite pytest completa para GET /api/portal usando TestClient sem token sobre banco SQLite in-memory, cobrindo shape do payload, regras de negocio (saldo/fluxo/eventos/jogos) e trava de privacidade por varredura recursiva do JSON.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|---------|
| 1 | Testes funcionais (API-01 a API-07) | d5a93aa | backend/tests/test_portal.py |
| 2 | Testes de privacidade (SEC-01/02/03) | d5a93aa | backend/tests/test_portal.py |

(Tarefas 1 e 2 foram comitadas juntas no mesmo arquivo em um unico commit atomico, pois ambas so tocaram `test_portal.py`.)

## Testes Implementados (12 ao total)

### Testes Funcionais (9)

| Teste | Requisito | O que prova |
|-------|-----------|-------------|
| `test_schemas_portal_importam_e_shape_topo` | API-02 | Schema PortalResponse tem exatamente 4 chaves |
| `test_portal_responde_200_sem_token` | API-01 | GET /api/portal retorna 200 sem Authorization, shape 4 chaves |
| `test_portal_meta` | API-02 | meta.time_nome == "Velhos Parceiros F.C.", atualizado_em e string nao vazia |
| `test_portal_caixa_saldo_e_totais` | API-03 | saldo_atual=1200, total_entrou=1500, total_saiu=450, entrou_mes=500, saiu_mes=50 |
| `test_portal_fluxo_12m_max_12_itens` | API-03 | fluxo_12m <= 12 itens, ordem cronologica asc, chaves {mes, entradas, saidas} |
| `test_portal_atrasos_count_int` | SEC-01 | atrasos.mensalidades==2, atrasos.jogadores==2, ambos int (nao bool) |
| `test_portal_evento_liquido_e_custo_origem` | API-04, API-07 | "Galeto Junho" presente, custo_origem=="real", liquido==200; "Baile Cancelado" e "Viagem Futura" ausentes |
| `test_portal_jogos_resumo_e_rankings` | API-05 | V=1/E=0/D=1, gols_pro=3, gols_contra=3, artilharia Carlao=2/Pedrinho=1, ranking desc |
| `test_portal_resultados_e_proximos` | API-05 | placares "3x1"/"0x2", datas desc, Time C futuro com horario/local corretos |

### Testes de Privacidade (3)

| Teste | Requisito | O que prova |
|-------|-----------|-------------|
| `test_privacidade_nenhum_nome_de_jogador_fora_de_jogos` | SEC-02 | Remove bloco `jogos`, varre strings de meta/caixa/eventos, nenhum de ["Carlao", "Pedrinho"] aparece |
| `test_privacidade_sem_chaves_de_pii_nem_registro_cru` | SEC-02, SEC-03 | 12 chaves proibidas (telefone, transacoes, participantes, jogador_id...) nao existem no payload inteiro |
| `test_privacidade_atrasos_sao_int_nunca_lista` | SEC-01, SEC-03 | atrasos tem exatamente {mensalidades, jogadores}, ambos int, nao bool, nao list/dict |

## Prova de Execucao Real

```
$ cd backend && python3 -m pytest tests/test_portal.py -q
............                                                             [100%]
=============================== warnings summary ===============================
tests/test_portal.py: 16 warnings
  /usr/local/lib/python3.12/dist-packages/pydantic/_internal/_config.py:295:
  PydanticDeprecatedSince20: Support for class-based `config` is deprecated,
  use ConfigDict instead.
-- Docs: https://pytest.org/
12 passed, 20 warnings in 1.18s
```

12/12 passando. Warnings sao de deprecacao do Pydantic v2 (pre-existentes no projeto, nao introduzidos por este plano).

## Desvios do Plano

Nenhum. O endpoint `portal.py` e os schemas estavam corretos; nenhum bug foi encontrado que exigisse correcao. O plano foi executado exatamente como escrito.

## Self-Check: PASSOU

- [x] `backend/tests/test_portal.py` existe com 12 testes
- [x] Commit d5a93aa existe no worktree
- [x] `python3 -m pytest tests/test_portal.py -q` retornou `12 passed`
- [x] Nenhum arquivo fora de `test_portal.py` foi modificado
