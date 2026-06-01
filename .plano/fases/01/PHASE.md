# Fase 01: Schema + Migracao + Backfill

**Objetivo:** Estrutura de dados pronta e dados legados migrados sem perda, em Postgres e SQLite.
**Requisitos cobertos:** DB-01, DB-02, DB-03, DB-04, MIG-01, MIG-02, MIG-03, MIG-04, TEST-01, TEST-06
**Criterios de sucesso:**
- [ ] App sobe em SQLite e Postgres com as 2 tabelas novas + coluna `tipos_item`
- [ ] Apos boot, `sum(faixas.quantidade) == qtd_cartoes_recebidos` legado para todo participante
- [ ] Migracao rodada 2x nao duplica faixas nem falha no ADD COLUMN
- [ ] Colunas legadas `numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos` intactas

**Dependencias:** Nenhuma
**Estimativa:** 1-2 planos
**Arquivos:** `backend/models.py`, `backend/migrations.py` (novo), `backend/main.py`
