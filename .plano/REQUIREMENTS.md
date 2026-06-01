# Requisitos: Eventos Galeto - Faixas multiplas + Cru/Assado

> Feature brownfield. Versao desta feature: v1 (Galeto). Sistema B fora de escopo.

## Requisitos

### Banco de Dados (DB)
- [ ] DB-01: Criar modelo/tabela `evento_cartao_faixa` (`id`, `evento_participante_id` FK CASCADE, `numero_inicio` null, `numero_fim` null, `quantidade` not null, `sem_numero` 0/1, `created_at`) com indice `ix_faixa_participante`.
- [ ] DB-02: Criar modelo/tabela `evento_participante_item` (`id`, `evento_participante_id` FK CASCADE, `tipo`, `qtd_vendido` default 0, `qtd_pedido` default 0) com indice unico `(evento_participante_id, tipo)`.
- [ ] DB-03: Adicionar coluna `eventos.tipos_item` (Text, JSON serializado, nullable).
- [ ] DB-04: Adicionar relationships em `EventoParticipante` (`faixas`, `itens`) com `cascade="all, delete-orphan"` e back_populates.

### Migracao (MIG)
- [ ] MIG-01: Criar `backend/migrations.py` com `run_additive_migrations(engine)` chamada em `main.py` apos `create_all`; faz `ALTER TABLE eventos ADD COLUMN tipos_item TEXT` apenas se a coluna nao existe (via `inspect`).
- [ ] MIG-02: Backfill idempotente: cada participante SEM faixa recebe 1 faixa numerada (se tem numero_inicio+fim) ou 1 faixa sem_numero (se qtd_cartoes_recebidos > 0). Rodar 2x nao duplica.
- [ ] MIG-03: Migracao funciona em Postgres E SQLite (Text JSON, ADD COLUMN portavel, bool 0/1). Nao usar JSONB nem IF NOT EXISTS.
- [ ] MIG-04: Pos-migracao, para todo participante `sum(faixas.quantidade) == qtd_cartoes_recebidos_legado` (contagem preservada, verificavel por script/assert).
- [ ] MIG-05: Migracao estritamente aditiva - sem DROP nem rename de tabelas/colunas existentes; colunas legadas (`numero_inicio`, `numero_fim`, `qtd_cartoes_recebidos` do EventoParticipante) permanecem intactas. Verificavel: o schema pos-migracao contem TODAS as colunas pre-migracao (assert via `inspect()`).

### API (API)
- [ ] API-01: `GET/POST/PUT/DELETE /eventos/{id}/participantes/{pid}/faixas[/{faixa_id}]` com validacao: numerada exige `fim>=ini` e deriva quantidade; sem_numero exige `quantidade>=1` e zera numeros.
- [ ] API-02: Helper `_recalc_recebidos(p)` define `qtd_cartoes_recebidos = sum(faixas.quantidade)`; chamado apos toda mutacao de faixa; cliente nunca dita recebidos.
- [ ] API-03: `PUT /eventos/{id}/participantes/{pid}/itens` faz upsert por tipo (substituicao total da lista), valida tipo em `evento.tipos_item` e fechamento `sum(qtd_vendido)==p.qtd_vendidos` (400 se nao fecha); `qtd_pedido` livre.
- [ ] API-04: `popular_elenco` cria 1 faixa numerada por jogador (qtd>0) usando `_proximo_numero` global; recebidos derivado.
- [ ] API-05: `atualizar_cartoes` aplica vendidos/devolvidos/pagou_custo e mantem reconciliacao `<= recebidos`; nao usa mais payload para definir recebidos.
- [ ] API-06: `GET /eventos/{id}/resumo` retorna `itens_por_tipo` (lista `{tipo, total_vendido, total_pedido}`) agregado por tipo no evento.
- [ ] API-07: `EventoCreate/Update/Out` aceitam/retornam `tipos_item: list[str]`; escrita serializa json.dumps, leitura desserializa via field_validator; `PUT /eventos/{id}` salva tipos.
- [ ] API-08: `_proximo_numero` passa a considerar `max(numero_fim)` tambem das faixas.
- [ ] API-09: `ParticipanteOut` inclui `faixas: list[FaixaOut]` e `itens: list[ItemOut]`.

### Frontend (UI)
- [ ] UI-01: Grid inline (tabela planilha) de participantes na tela `/eventos/[id]`: colunas editaveis in-place com autosave (blur/Enter), recalculo otimista e revert em erro 400.
- [ ] UI-02: Sub-linha expansivel de faixas por participante: add faixa numerada (inicio/fim), add lote sem numero (quantidade), editar e remover cada faixa; lote sem numero exibe "Sem numero (N cartoes)".
- [ ] UI-03: Colunas de tipo (cru vend / assado vend / cru ped / assado ped) renderizadas dinamicamente a partir de `evento.tipos_item`; salvam via PUT itens.
- [ ] UI-04: Modal de config do evento ganha campo "Tipos de item" (chips/csv -> array) salvo via PUT evento.
- [ ] UI-05: Card de estatistica do evento mostra relacao consolidada cru x assado (vendido + pedido por tipo) e total a repassar, lendo `resumo.itens_por_tipo`.
- [ ] UI-06: Tipos TS novos (`FaixaOut/Create/Update`, `ItemTipo/ItensUpdate/ItemOut`, `ResumoItemTipo`) e estensoes (`EventoOut`, `ParticipanteOut`, `EventoResumo`, `EventoCreate/Update`).

### Testes/Validacao (TEST)
- [ ] TEST-01: Dados atuais intactos apos migracao (mesma contagem de recebidos por participante).
- [ ] TEST-02: Adicionar faixa numerada quebrada (ex: 1-12 e depois 45-50) E lote sem numero a um jogador; recebidos soma corretamente.
- [ ] TEST-03: Split cru/assado que nao fecha com vendidos retorna 400; que fecha persiste.
- [ ] TEST-04: Estatistica do evento mostra a relacao total (cru/assado vendido + pedido).
- [ ] TEST-05: Edicao inline recalcula e persiste sem modal; erro de validacao reverte celula.
- [ ] TEST-06: `run_additive_migrations` rodada 2x nao duplica faixas nem coluna (idempotencia).

## Rastreabilidade

| Requisito | Fase | Status |
|-----------|------|--------|
| DB-01 | Fase 1 | Pendente |
| DB-02 | Fase 1 | Pendente |
| DB-03 | Fase 1 | Pendente |
| DB-04 | Fase 1 | Pendente |
| MIG-01 | Fase 1 | Pendente |
| MIG-02 | Fase 1 | Pendente |
| MIG-03 | Fase 1 | Pendente |
| MIG-04 | Fase 1 | Pendente |
| MIG-05 | Fase 1 | Pendente |
| TEST-01 | Fase 1 | Pendente |
| TEST-06 | Fase 1 | Pendente |
| API-01 | Fase 2 | Pendente |
| API-02 | Fase 2 | Pendente |
| API-03 | Fase 2 | Pendente |
| API-04 | Fase 2 | Pendente |
| API-05 | Fase 2 | Pendente |
| API-06 | Fase 2 | Pendente |
| API-07 | Fase 2 | Pendente |
| API-08 | Fase 2 | Pendente |
| API-09 | Fase 2 | Pendente |
| TEST-02 | Fase 2 | Pendente |
| TEST-03 | Fase 2 | Pendente |
| UI-01 | Fase 3 | Pendente |
| UI-02 | Fase 3 | Pendente |
| UI-03 | Fase 3 | Pendente |
| UI-04 | Fase 3 | Pendente |
| UI-05 | Fase 3 | Pendente |
| UI-06 | Fase 3 | Pendente |
| TEST-04 | Fase 3 | Pendente |
| TEST-05 | Fase 3 | Pendente |
