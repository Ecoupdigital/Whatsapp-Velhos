# PROJECT: Eventos Galeto - Faixas multiplas + Relacao Cru/Assado

## What This Is

Feature brownfield no app de gestao do time Velhos Parceiros F.C (FastAPI + Next.js).
Estende o Sistema A de cartoes (na tela `/eventos/[id]`) para suportar:
1. Multiplas faixas de cartao por jogador, nao-sequenciais, numeradas OU sem numero.
2. Split por tipo de item (cru x assado) do que cada jogador vendeu e do seu pedido
   pessoal, consolidado numa estatistica do evento para repassar a cozinha/fornecedor.

## Core Value

Permitir gerir eventos tipo galeto com a realidade do campo: jogadores recebem cartoes
em lotes quebrados ao longo do tempo, e a venda se divide em cru x assado. O gestor edita
tudo numa planilha inline e tem na hora a relacao total para encomendar com a cozinha.

## Requirements - Active

- [ ] DB-01: Tabela `evento_cartao_faixa` (faixas numeradas/sem-numero por participante)
- [ ] DB-02: Tabela `evento_participante_item` (split por tipo: qtd_vendido, qtd_pedido)
- [ ] DB-03: Coluna `eventos.tipos_item` (JSON em Text)
- [ ] DB-04: Relationships SQLAlchemy + cascade delete-orphan em participante
- [ ] MIG-01: Migracao aditiva idempotente no boot (ALTER coluna + backfill faixas)
- [ ] MIG-02: Backfill preserva contagem de recebidos por participante (validavel)
- [ ] MIG-03: Compatibilidade Postgres + SQLite (Text JSON, ADD COLUMN via inspector)
- [ ] MIG-05: Migracao estritamente aditiva (sem DROP/rename; colunas legadas intactas, verificavel via inspect)
- [ ] API-01: CRUD faixas (GET/POST/PUT/DELETE) com validacao numerada/sem-numero
- [ ] API-02: `qtd_cartoes_recebidos` derivado da soma das faixas (servidor)
- [ ] API-03: PUT itens por tipo com upsert e validacao de fechamento c/ vendidos
- [ ] API-04: `popular_elenco` cria faixa numerada por jogador (deriva recebidos)
- [ ] API-05: `atualizar_cartoes` deixa de ser fonte de "recebidos" (mantem reconciliacao)
- [ ] API-06: `resumo` agrega `itens_por_tipo` (relacao cru x assado consolidada)
- [ ] API-07: Evento aceita/retorna `tipos_item` (serializacao JSON)
- [ ] UI-01: Grid inline (planilha) de participantes com autosave + recalculo
- [ ] UI-02: Sub-linha expansivel de faixas (add numerada / add sem numero / editar / remover)
- [ ] UI-03: Colunas dinamicas por tipo (cru/assado) a partir de `tipos_item`
- [ ] UI-04: Config do evento com campo "Tipos de item"
- [ ] UI-05: Estatistica do evento com relacao consolidada cru x assado
- [ ] UI-06: Tipos TS espelhando schemas Pydantic
- [ ] TEST-01: Validar criterios de sucesso (dados intactos, faixas quebradas, fechamento)

## Requirements - Out of Scope

- Sistema B (`CartaoBaile` / tela `/cartoes`): nao tocar, candidato a deprecar depois.
- Unicidade global de numero de cartao entre participantes (o modelo de faixas quebradas
  nao sustenta; validacao so dentro do mesmo participante).
- Dropar colunas legadas `numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos` (mantidas p/ rollback).
- Multi-usuario/roles novos (app continua single admin).
- Gerar numero fake para lotes sem numero.
- Sistema de migracao versionado (Alembic): YAGNI; migracao aditiva idempotente no boot basta.

## Context

- **Stack (preservada):** FastAPI + SQLAlchemy 2 + Postgres(prod)/SQLite(dev), Next.js App Router + Tailwind, Pydantic v2, react-hot-toast, UI kit `@/components/ui`.
- **Schema bootstrap:** `Base.metadata.create_all` em `main.py:19` cria tabelas novas mas NAO adiciona colunas. Por isso `tipos_item` exige migracao explicita.
- **Sem sistema de migracao hoje:** introduzimos `backend/migrations.py` (`run_additive_migrations`) chamado no boot, idempotente.
- **Reconciliacao existente:** `vendidos+devolvidos+pagou_custo <= recebidos` (manter).
- **Codebase analisado:** `models.py`, `routers/eventos.py`, `routers/cartoes.py`, `schemas.py`, `database.py`, `main.py`, `eventos/[id]/page.tsx`, `types/index.ts`, `migrate_sqlite_to_postgres.py`.
- **Credenciais/APIs:** nenhuma nova. Feature interna.

## Constraints

- Migracao SO aditiva. Backfill idempotente (rodavel 2x sem duplicar). Rollback possivel.
- Funcionar em Postgres E SQLite (Text JSON, sem JSONB; ADD COLUMN via inspector; bool como 0/1 int).
- Seguir convencoes do codebase (snake_case backend, camelCase FE, datas Text ISO, bool 0/1).
- Edicao estilo planilha (grid inline autosave), sem modal pesado (restricao do usuario).
- pt-BR sem em-dash/en-dash. Construir pra durar, sem over-engineering (YAGNI).

## Key Decisions

| Decisao | Outcome | Justificativa |
|---------|---------|---------------|
| 2 tabelas novas + 1 coluna nova | Do usuario (briefing) | design aprovado |
| Lote sem numero nao gera numero fake | Do usuario (briefing) | evita colisao com numeros reais |
| Nao dropar colunas legadas | Do usuario (briefing) | rollback |
| `recebidos` derivado da soma de faixas | Do usuario (briefing) | fonte unica de verdade |
| Migracao no boot via `migrations.py` (nao Alembic) | Decisao do arquiteto | projeto nao usa migracao versionada; aditiva idempotente no boot e consistente com a escolha de centralizar tudo no app (sem cron host). Alembic seria over-engineering aqui |
| ADD COLUMN via `inspector` (checar antes) | Decisao do arquiteto | `IF NOT EXISTS` nao e uniforme entre SQLite/Postgres; inspecionar e portavel e idempotente |
| JSON como Text + json.dumps/loads (nao JSONB) | Decisao do arquiteto | unico jeito que funciona identico em Postgres e SQLite (restricao do usuario) |
| `sem_numero` como Integer 0/1 | Decisao do arquiteto | segue padrao do projeto (`pago`, `ativo`); evita Boolean nativo divergente entre bancos |
| PUT itens = substituicao total da lista | Decisao do arquiteto | semantica PUT previsivel para a grid; tipos omitidos sao removidos |
| Validacao de unicidade de numero so dentro do participante | Decisao do arquiteto | faixas quebradas tornam unicidade global impraticavel; YAGNI |
| `(participante, tipo)` unico | Decisao do arquiteto | um item por tipo por jogador; PUT faz upsert |
| `tipos_item` desserializado via field_validator em EventoOut | Decisao do arquiteto | centraliza json.loads; nao precisa tocar todos os endpoints que retornam Evento |
| Backfill idempotente por "participante sem faixa" | Decisao do arquiteto | rodavel 2x sem duplicar, simples de raciocinar |
