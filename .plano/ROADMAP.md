# Roadmap: Eventos Galeto - Faixas multiplas + Cru/Assado

## Fases

- [ ] **Fase 1: Schema + Migracao + Backfill** - Modelos novos, coluna, migracao aditiva idempotente
- [ ] **Fase 2: API (faixas + itens + resumo)** - Endpoints e regras de negocio
- [ ] **Fase 3: Frontend (grid inline + config + estatistica)** - Planilha editavel e consolidacao

## Detalhes das Fases

### Fase 1: Schema + Migracao + Backfill
**Objetivo:** Estrutura de dados pronta e dados legados migrados sem perda, em Postgres e SQLite.
**Depende de:** Nada
**Requisitos:** DB-01, DB-02, DB-03, DB-04, MIG-01, MIG-02, MIG-03, MIG-04, TEST-01, TEST-06
**Criterios de Sucesso:**
  1. App sobe (boot) em SQLite e em Postgres e as 2 tabelas novas + coluna `tipos_item` existem.
  2. Apos boot, todo participante com cartoes tem faixa(s) e `sum(faixas.quantidade) == qtd_cartoes_recebidos` legado.
  3. Rodar a migracao 2x nao duplica faixas nem falha no ADD COLUMN.
  4. Colunas legadas `numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos` permanecem intactas.

### Fase 2: API (faixas + itens + resumo)
**Objetivo:** Endpoints para gerir faixas e split por tipo, com recebidos derivado e validacoes de fechamento, e resumo consolidado.
**Depende de:** Fase 1
**Requisitos:** API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, TEST-02, TEST-03
**Criterios de Sucesso:**
  1. Da pra criar faixa numerada quebrada e lote sem numero via API; `qtd_cartoes_recebidos` reflete a soma.
  2. PUT itens valida fechamento: soma cru+assado vendidos diferente de vendidos do participante retorna 400; igual persiste.
  3. `popular_elenco` cria faixa numerada por jogador e a reconciliacao continua valendo.
  4. `GET /resumo` retorna `itens_por_tipo` com total vendido e pedido por tipo.
  5. `PUT /eventos/{id}` salva e `GET` retorna `tipos_item` como lista.

### Fase 3: Frontend (grid inline + config + estatistica)
**Objetivo:** Edicao estilo planilha na tela do evento, config de tipos e estatistica cru x assado.
**Depende de:** Fase 2
**Requisitos:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, TEST-04, TEST-05
**Criterios de Sucesso:**
  1. Grid inline: editar vendidos/devolvidos/custo/cru/assado numa celula salva e recalcula sem abrir modal.
  2. Faixas editadas em sub-linha expansivel (add numerada, add sem numero, editar, remover).
  3. Config do evento permite definir tipos de item; colunas de tipo aparecem dinamicamente.
  4. Card de estatistica mostra a relacao consolidada cru x assado (vendido + pedido) e total a repassar.
  5. Erro de validacao (400) reverte a celula e mostra a mensagem do backend.

## Tabela de Progresso

| Fase | Planos Completos | Status | Completado |
|------|-----------------|--------|------------|
| 1 | 0/? | Pendente | -- |
| 2 | 0/? | Pendente | -- |
| 3 | 0/? | Pendente | -- |
