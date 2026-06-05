---
plan: rapido-1
title: Estatisticas de quantidade de galetos no portal de transparencia
status: complete
date: 2026-06-05
commits:
  - hash: 2b893dc
    msg: "feat(portal): expoe quantidade de galetos por evento no portal publico"
  - hash: 2fadeaf
    msg: "feat(portal): renderiza estatisticas de galeto no card de eventos"
---

# Rapido 1: Estatisticas de galeto no portal de transparencia - Summary

Exposicao de estatisticas de galeto/cartao (emitidos, vendidos, devolvidos, split por tipo) no endpoint publico GET /api/portal e no card de eventos de /transparencia. Aditivo, sem migration, so agregados (privacidade mantida).

## Tarefas Completadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Backend: schema + agregacao no portal | 2b893dc | backend/schemas.py, backend/routers/portal.py, backend/tests/test_portal.py |
| 2 | Frontend: tipo + render no card | 2fadeaf | frontend/src/types/portal.ts, frontend/src/components/portal/EventosBloco.tsx |

## Detalhes de implementacao

### Backend (Tarefa 1)

**schemas.py:** `PortalRankingEntry` movido para antes de `PortalEventoGaleto` (resolve dependencia de ordem sem forward ref). `PortalEventoGaleto` com campos `emitidos: int`, `vendidos: int`, `devolvidos: int`, `por_tipo: list[PortalRankingEntry]`. Campo `galeto: Optional[PortalEventoGaleto] = None` adicionado em `PortalEvento`.

**routers/portal.py:** Importa `EventoParticipanteItem` e `PortalEventoGaleto`. Helper `_tipos_do_evento_local` copiado localmente de eventos.py (evita import cruzado router->router). Helper `_montar_galeto(db, evento)` reusa exatamente a semantica de `resumo_evento`: binario complementar onde tipo[0] (cru) e armazenado via query group-by em `EventoParticipanteItem.qtd_vendido`, tipo[1] (assado) = `max(0, vendidos - cru_total)`. Retorna `None` quando `emitidos <= 0`. Integrado em `_montar_eventos` via `galeto=_montar_galeto(db, e)`.

### Frontend (Tarefa 2)

**types/portal.ts:** `PortalRankingEntry` movido antes de `PortalEventoGaleto` (consistencia com backend). Interface `PortalEventoGaleto` com shape identico ao schema Python. Campo `galeto?: PortalEventoGaleto | null` em `PortalEvento` (opcional para retrocompatibilidade).

**EventosBloco.tsx:** Import `Drumstick` de lucide-react. Bloco galeto condicional `{ev.galeto && ...}` inserido apos o grid financeiro. Grid 3 colunas (Emitidos/Vendidos/Devolvidos) com padrao tipografico identico ao grid Arrecadou/Custo/Sobrou. Pills de split por tipo com `capitalize` + `tabular-nums`, tokens `bg-surface-tertiary`/`txt-*`/`border-border-subtle` ja presentes no projeto. Evento sem cartoes (galeto=null/undefined) nao altera layout.

## Verificacao

### Backend
```
pytest tests/test_portal.py: 18 passed, 20 warnings
(15 testes pre-existentes + 3 novos: test_galeto_bloco_presente_com_cartoes,
test_galeto_por_tipo_cru_assado, test_galeto_none_sem_cartoes)
```

### Frontend
```
npx tsc --noEmit: sem erros de tipo
```

## Desvios do Plano

**[Regra 1 - Ordem de dependencia em schemas.py]** O plano sugeriu `list["PortalRankingEntry"]` como forward ref string. Em vez disso, `PortalRankingEntry` foi movido para antes de `PortalEventoGaleto` no arquivo, eliminando a necessidade de forward ref e tornando o tipo direto (`list[PortalRankingEntry]`). Mesma decisao aplicada ao `portal.ts`. Resultado mais limpo e sem dependencia de resolucao lazy do Pydantic.

**[Regra 1 - Import local de _tipos_do_evento]** Helper copiado localmente em portal.py como `_tipos_do_evento_local` em vez de importar de routers.eventos, evitando import cruzado entre routers. Conforme sugestao do proprio plano ("manter parse simples local e mais limpo").

## Self-Check

- [x] backend/schemas.py modificado e correto
- [x] backend/routers/portal.py modificado com _montar_galeto
- [x] backend/tests/test_portal.py com 3 novos testes
- [x] frontend/src/types/portal.ts com PortalEventoGaleto e galeto em PortalEvento
- [x] frontend/src/components/portal/EventosBloco.tsx com bloco galeto
- [x] Commits 2b893dc e 2fadeaf existem
- [x] 18 testes pytest passando
- [x] tsc --noEmit sem erros

## Self-Check: PASSOU
