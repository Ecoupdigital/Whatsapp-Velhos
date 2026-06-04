---
phase: 01-backend-api-publica
plan: 01-002
subsystem: backend
tags: [portal, api-publica, read-only, privacidade]
dependency_graph:
  requires: ["01-001"]
  provides: ["GET /api/portal publico, PortalResponse completo"]
  affects: ["backend/main.py (CORS intacto)"]
tech_stack:
  added: []
  patterns: ["APIRouter publico sem Depends(get_current_user)", "handler agregador read-only", "timezone-aware datetime"]
key_files:
  created: ["backend/routers/portal.py"]
  modified: ["backend/main.py"]
decisions:
  - "INC-001: meta.atualizado_em usa datetime.now(timezone.utc).isoformat() (offset +00:00 garantido ao frontend)"
  - "Ordenacao de eventos: com_data sorted desc + sem_data no fim (sem duplo sort instavel)"
  - "fluxo_12m: all-transacoes em memoria depois slice [-12:] em vez de GROUP BY SQL (consistente com financeiro.fluxo_mensal)"
metrics:
  duration_mins: 15
  completed_date: "2026-06-04"
  tasks_completed: 3
  files_created: 1
  files_modified: 1
---

# Fase 01 Plano 002: Router publico /api/portal (handler agregador) Summary

**One-liner:** Router FastAPI publico `/api/portal` sem auth que agrega caixa+eventos+jogos+meta num unico payload read-only com trava de privacidade inline.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | Criar `backend/routers/portal.py` com 4 helpers e handler | 1a41fb8 | OK |
| 2 | Registrar `portal.router` em `backend/main.py` | 1a41fb8 | OK |
| 3 | Prova de integracao: GET /api/portal sem token -> 200 + 4 chaves | - | OK |

## Prova de Integracao (saida real)

```
OK 200 sem token, 4 chaves de topo, atrasos int
status_code: 200
chaves: ['caixa', 'eventos', 'jogos', 'meta']
caixa.atrasos: {'mensalidades': 0, 'jogadores': 0}
meta.atualizado_em: 2026-06-04T14:10:49.525503+00:00
```

O endpoint respondeu 200 sem nenhum header `Authorization`, com exatamente as 4 chaves de topo, atrasos como int e timestamp com offset UTC.

## Criterios de Sucesso

- [x] `GET /api/portal` responde 200 SEM token (API-01)
- [x] Payload tem as 4 chaves de topo e valida contra `PortalResponse` (API-02, API-06)
- [x] `caixa.saldo_atual` = soma de `_calcular_saldo_atual` das contas ativas; `fluxo_12m` <= 12 itens (API-03)
- [x] Cada evento traz `liquido = arrecadado - custo` com `custo_origem` correto; `cancelado` ausente; `planejado` sem arrecadacao ausente (API-04, API-07)
- [x] `resumo`/rankings batem com a logica de jogos.py (`_parse_entries` importado diretamente) (API-05)
- [x] `atrasos` sao COUNTs inteiros; nenhum nome fora de `jogos.*`; sem PII (SEC-01, SEC-02, SEC-03)
- [x] CORS inalterado; sem migration (DEPLOY-02)
- [x] `portal.py` e read-only (sem commit/add/delete)

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug / INC-001] `meta.atualizado_em` timezone-aware**

- **Encontrado durante:** Leitura do AUDIT-PLAN no prompt de execucao
- **Issue:** O PLAN.md original usava `datetime.now().isoformat()` (naive, sem offset), mas o SYSTEM-DESIGN e o AUDIT-PLAN exigem sufixo de offset UTC para o frontend
- **Correcao:** `datetime.now(timezone.utc).isoformat()` com `from datetime import datetime, timezone`
- **Resultado:** Timestamp com `+00:00` confirmado na prova de integracao
- **Arquivos:** `backend/routers/portal.py`

**2. [Regra 2 - Clareza] Ordenacao de eventos com None estavel**

- **Encontrado durante:** Implementacao do `_montar_eventos`
- **Issue:** O PLAN.md mostrava dois `sort()` consecutivos que podem ser instavel quando `ev.data` e None
- **Correcao:** Separar `com_data` (sorted desc) + `sem_data` em listas separadas e concatenar, conforme a propria nota do PLAN.md sugeria
- **Arquivos:** `backend/routers/portal.py`

## Self-Check

```bash
[ -f "backend/routers/portal.py" ] && echo "ENCONTRADO: backend/routers/portal.py" || echo "FALTANDO"
git log --oneline | grep -q "1a41fb8" && echo "ENCONTRADO: 1a41fb8" || echo "FALTANDO: 1a41fb8"
```
