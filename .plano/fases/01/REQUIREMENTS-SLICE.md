# Requisitos da Fase 01

> Slice gerado automaticamente. Versao completa em `.plano/REQUIREMENTS.md`.
> Design detalhado em `.plano/SYSTEM-DESIGN.md` secoes 3 e 6.

## DB-01: Tabela `evento_cartao_faixa`
Modelo SQLAlchemy `EventoCartaoFaixa` em `backend/models.py`: `id`, `evento_participante_id` (FK CASCADE para `evento_participantes.id`), `numero_inicio` (Integer null), `numero_fim` (Integer null), `quantidade` (Integer not null), `sem_numero` (Integer 0/1 default 0), `created_at` (Text ISO). Indice `ix_faixa_participante` em `evento_participante_id`.

## DB-02: Tabela `evento_participante_item`
Modelo `EventoParticipanteItem`: `id`, `evento_participante_id` (FK CASCADE), `tipo` (Text not null), `qtd_vendido` (Integer default 0), `qtd_pedido` (Integer default 0). Indice unico `(evento_participante_id, tipo)` + indice `ix_item_participante`.

## DB-03: Coluna `eventos.tipos_item`
Adicionar `tipos_item = Column(Text)` em `class Evento` (JSON serializado, ex `'["cru","assado"]'`, nullable).

## DB-04: Relationships
Em `EventoParticipante`: `faixas` e `itens` com `cascade="all, delete-orphan"`, `order_by` por id, `back_populates`. Nos novos modelos, `participante = relationship(..., back_populates=...)`.

## MIG-01: `backend/migrations.py`
Funcao `run_additive_migrations(engine)` chamada em `main.py` logo apos `Base.metadata.create_all(bind=engine)`. Usa `sqlalchemy.inspect(engine)` para checar se `tipos_item` existe em `eventos`; se nao, `ALTER TABLE eventos ADD COLUMN tipos_item TEXT` dentro de `engine.begin()`. Em seguida chama `_backfill_faixas(engine)`.

## MIG-02: Backfill idempotente
Para cada `EventoParticipante` que ainda nao tem nenhuma faixa (count == 0): se `numero_inicio` e `numero_fim` preenchidos -> 1 faixa numerada (`sem_numero=0`, `quantidade=fim-ini+1`); senao se `qtd_cartoes_recebidos > 0` -> 1 faixa `sem_numero=1` com `quantidade=qtd_cartoes_recebidos`; senao nada. A checagem "ja tem faixa" garante idempotencia.

## MIG-03: Compatibilidade Postgres + SQLite
`ALTER TABLE ... ADD COLUMN ... TEXT` (valido nos dois). Checagem via inspector (nao usar `IF NOT EXISTS`). JSON como Text (nao JSONB). `sem_numero` como Integer 0/1 (nao Boolean nativo). `created_at` Text ISO.

## MIG-04: Contagem preservada
Pos-migracao, para todo participante `sum(faixas.quantidade) == qtd_cartoes_recebidos` legado. Verificavel por assert/script.

## TEST-01: Dados intactos
Contagem de recebidos por participante igual antes e depois da migracao.

## TEST-06: Idempotencia
`run_additive_migrations` rodada 2x nao duplica faixas nem falha no ADD COLUMN.
