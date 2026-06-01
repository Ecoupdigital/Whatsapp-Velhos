# Fase 02: API (faixas + itens + resumo)

**Objetivo:** Endpoints para gerir faixas e split por tipo, recebidos derivado, validacoes de fechamento e resumo consolidado.
**Requisitos cobertos:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10, TEST-02, TEST-03
**Criterios de sucesso:**
- [ ] Criar faixa numerada quebrada e lote sem numero via API; recebidos reflete a soma
- [ ] PUT itens valida fechamento (400 quando soma != vendidos do participante)
- [ ] `popular_elenco` cria faixa numerada por jogador; reconciliacao mantida
- [ ] `GET /resumo` retorna `itens_por_tipo` com total vendido e pedido por tipo
- [ ] `PUT /eventos/{id}` salva e `GET` retorna `tipos_item` como lista
- [ ] `GET /eventos/{id}/participantes/{pid}` (singular) retorna participante com faixas e itens (refetch Fase 3)

**Dependencias:** Fase 1
**Estimativa:** 5 planos
**Arquivos:** `backend/routers/eventos.py`, `backend/schemas.py`, `backend/tests/`
