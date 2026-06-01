# SYSTEM-DESIGN: Eventos Galeto - Faixas multiplas + Relacao Cru/Assado

> Feature brownfield no app Velhos Parceiros F.C (FastAPI + Next.js).
> Alvo: Sistema A (`EventoParticipante` + tela `/eventos/[id]`). Sistema B
> (`CartaoBaile` / `/cartoes`) NAO e tocado.

---

## 1. Stack (preservada do codebase, nao mudar)

| Camada | Tecnologia | Observacao |
|--------|-----------|------------|
| Backend | Python 3 + FastAPI | routers em `backend/routers/` |
| ORM | SQLAlchemy 2.x (`DeclarativeBase`) | `backend/models.py`, `backend/database.py` |
| DB | Postgres (prod) OU SQLite (legacy/dev) | `DATABASE_URL` > `DATABASE_PATH` > sqlite local |
| Schema bootstrap | `Base.metadata.create_all` em `main.py:19` | cria TABELAS novas, NAO adiciona COLUNAS |
| Auth | `get_current_user` (dependency no router) | manter em todos os endpoints novos |
| Validacao | Pydantic v2 (`model_dump`, `from_attributes`) | `backend/schemas.py` |
| Frontend | Next.js (App Router) + React + Tailwind | `frontend/src/app/(app)/eventos/[id]/page.tsx` |
| HTTP client | `api` em `frontend/src/lib/api.ts` (`api.get/post/put/delete`) | base ja prefixa `/eventos` -> `/api/eventos` |
| Tipos FE | `frontend/src/types/index.ts` | espelhar schemas Pydantic |
| UI kit | `@/components/ui` (Button, Card, Input, Select, Modal, EmptyState) | reaproveitar |
| Notificacao | `react-hot-toast` | `toast.success/error` |

### Convencoes do codebase (seguir, vencem qualquer default)
- Nomes em **snake_case** no backend (colunas, campos Pydantic), **camelCase** no FE (interfaces TS).
- Colunas de data/hora sao `Text` com ISO string (`datetime.now().isoformat()`), nao `DateTime`.
- JSON em coluna: armazenar como `Text` com `json.dumps`/`json.loads` (compativel Postgres + SQLite). NAO usar tipo `JSON`/`JSONB` nativo (quebra portabilidade do backfill).
- Routers usam `APIRouter(prefix="/api/...", dependencies=[Depends(get_current_user)])`.
- `response_model` Pydantic em toda rota.
- Reconciliacao de cartoes ja existente: `vendidos + devolvidos + pagou_custo <= recebidos` (manter).

---

## 2. Roles e Permissoes

App single-tenant, um unico role real hoje: `admin` (seed `admin`/`velhos2026` em `main.py`). Toda a tela de eventos exige usuario autenticado. A feature NAO introduz novos roles.

| Modulo | admin |
|--------|-------|
| Evento (config + tipos_item) | FULL |
| Participantes / cartoes / faixas / itens | FULL |
| Resumo / estatistica cru x assado | READ |

Sem matriz multi-role: o `dependencies=[Depends(get_current_user)]` no router ja cobre autorizacao. Nenhuma policy de RLS (banco e Postgres direto via SQLAlchemy, sem Supabase aqui).

---

## 3. Schema de Banco

### 3.1 Visao de relacoes

```
eventos (1) ──< evento_participantes (N)
                      │
                      ├──< evento_cartao_faixa (N)   [NOVO]
                      └──< evento_participante_item (N)  [NOVO]

eventos.tipos_item  [NOVA COLUNA, Text/JSON]  -> ex: '["cru","assado"]'
```

`qtd_cartoes_recebidos` do participante passa a ser DERIVADO da soma de `evento_cartao_faixa.quantidade`. Os campos legados `numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos` permanecem na tabela (rollback + Sistema B nao mexe), mas deixam de ser fonte de verdade para "recebidos".

### 3.2 Nova tabela: `evento_cartao_faixa`

Faixa de cartoes que um participante recebeu. 1:N. Pode ser numerada (contigua) ou um lote sem numero (so quantidade).

```sql
CREATE TABLE evento_cartao_faixa (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,  -- SERIAL no Postgres (SQLAlchemy resolve)
    evento_participante_id INTEGER NOT NULL REFERENCES evento_participantes(id),
    numero_inicio          INTEGER,            -- NULL quando sem_numero
    numero_fim             INTEGER,            -- NULL quando sem_numero
    quantidade             INTEGER NOT NULL,   -- numerada: fim-ini+1 ; sem numero: qtd digitada
    sem_numero             INTEGER NOT NULL DEFAULT 0,  -- bool (0/1), padrao do projeto p/ bool
    created_at             TEXT
);
CREATE INDEX ix_faixa_participante ON evento_cartao_faixa (evento_participante_id);
```

Modelo SQLAlchemy (`backend/models.py`):
```python
class EventoCartaoFaixa(Base):
    __tablename__ = "evento_cartao_faixa"
    __table_args__ = (
        Index("ix_faixa_participante", "evento_participante_id"),
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_participante_id = Column(
        Integer, ForeignKey("evento_participantes.id", ondelete="CASCADE"), nullable=False
    )
    numero_inicio = Column(Integer)          # null = lote sem numero
    numero_fim = Column(Integer)
    quantidade = Column(Integer, nullable=False, default=0)
    sem_numero = Column(Integer, default=0)  # 0/1 (padrao bool do projeto)
    created_at = Column(Text, default=lambda: datetime.now().isoformat())

    participante = relationship("EventoParticipante", back_populates="faixas")
```

Adicionar em `EventoParticipante`:
```python
    faixas = relationship(
        "EventoCartaoFaixa", back_populates="participante",
        cascade="all, delete-orphan", order_by="EventoCartaoFaixa.id",
    )
    itens = relationship(
        "EventoParticipanteItem", back_populates="participante",
        cascade="all, delete-orphan", order_by="EventoParticipanteItem.id",
    )
```

Regras de dominio da faixa:
- `sem_numero=0` (numerada): `numero_inicio` e `numero_fim` obrigatorios, `numero_fim >= numero_inicio`, `quantidade = numero_fim - numero_inicio + 1` (servidor recalcula, ignora qtd enviada).
- `sem_numero=1`: `numero_inicio`/`numero_fim` ficam NULL, `quantidade` vem do payload (`>= 1`).
- NAO gerar numero fake para lote sem numero (decisao do briefing, evita colisao com numeros reais).
- Faixas numeradas NAO precisam ser contiguas entre si (jogador pode ter 1-12 e depois 45-50).

### 3.3 Nova tabela: `evento_participante_item`

Split por tipo de item (cru/assado/...) do que foi vendido e do pedido pessoal do jogador.

```sql
CREATE TABLE evento_participante_item (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_participante_id INTEGER NOT NULL REFERENCES evento_participantes(id),
    tipo                   TEXT NOT NULL,     -- "cru" | "assado" | ... (vem de eventos.tipos_item)
    qtd_vendido            INTEGER NOT NULL DEFAULT 0,
    qtd_pedido             INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_item_participante ON evento_participante_item (evento_participante_id);
```

```python
class EventoParticipanteItem(Base):
    __tablename__ = "evento_participante_item"
    __table_args__ = (
        Index("ix_item_participante", "evento_participante_id"),
        Index("ix_item_part_tipo", "evento_participante_id", "tipo", unique=True),
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_participante_id = Column(
        Integer, ForeignKey("evento_participantes.id", ondelete="CASCADE"), nullable=False
    )
    tipo = Column(Text, nullable=False)
    qtd_vendido = Column(Integer, default=0)
    qtd_pedido = Column(Integer, default=0)

    participante = relationship("EventoParticipante", back_populates="itens")
```

Indice unico `(evento_participante_id, tipo)`: cada tipo aparece no maximo 1x por participante (o PUT faz upsert por tipo).

### 3.4 Nova coluna: `eventos.tipos_item`

```python
# em class Evento
    tipos_item = Column(Text)  # JSON serializado, ex: '["cru","assado"]'. NULL/"[]" = evento sem split por tipo.
```

- `create_all` NAO adiciona essa coluna em tabela existente -> exige **migracao explicita** (ver secao 6).
- Default na criacao de evento novo: `None` (sem tipos). Galeto configura `["cru","assado"]`.

---

## 4. Schemas Pydantic (`backend/schemas.py`)

### 4.1 Faixas

```python
class FaixaCreate(BaseModel):
    sem_numero: bool = False
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    quantidade: Optional[int] = None  # usado so quando sem_numero=True

class FaixaUpdate(BaseModel):
    sem_numero: Optional[bool] = None
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    quantidade: Optional[int] = None

class FaixaOut(BaseModel):
    id: int
    evento_participante_id: int
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    quantidade: int
    sem_numero: bool
    created_at: Optional[str] = None
    class Config:
        from_attributes = True
```

Nota: `sem_numero` no banco e `Integer` 0/1; no `FaixaOut` mapeia para `bool` (Pydantic v2 coage 0/1 -> bool; validar com `field_validator` se necessario, ou expor como int seguindo o padrao `pago: int`). **Decisao:** expor como `bool` no schema novo (mais limpo no FE) e converter no endpoint.

### 4.2 Itens por tipo

```python
class ItemTipo(BaseModel):
    tipo: str
    qtd_vendido: int = 0
    qtd_pedido: int = 0

class ItensUpdate(BaseModel):
    itens: list[ItemTipo] = []

class ItemOut(BaseModel):
    id: int
    tipo: str
    qtd_vendido: int
    qtd_pedido: int
    class Config:
        from_attributes = True
```

### 4.3 Alteracoes em schemas existentes

`EventoCreate` / `EventoUpdate` / `EventoOut`: adicionar
```python
    tipos_item: Optional[list[str]] = None
```
- No `EventoOut`, como o banco guarda Text JSON, NAO usar `from_attributes` direto na coluna. Resolver com um `@computed_field`/validator que faz `json.loads`, OU montar o dict manualmente no router de leitura. **Decisao:** adicionar `field_validator(mode="before")` em `EventoOut.tipos_item` que aceita str JSON e devolve `list[str]` (centraliza a desserializacao, evita tocar todos os endpoints que retornam Evento). Na escrita (`criar`/`atualizar`), serializar `json.dumps(tipos_item)` antes de setar na coluna.

`CartoesUpdate`: manter como esta para retrocompatibilidade, MAS `qtd_cartoes_recebidos` deixa de ser fonte de verdade (servidor passa a derivar de faixas; se vier no payload, e ignorado para "recebidos" e apenas os campos de venda/devolucao/custo sao aplicados). Documentar no docstring.

`ParticipanteOut`: adicionar
```python
    faixas: list[FaixaOut] = []
    itens: list[ItemOut] = []
```
(`qtd_cartoes_recebidos` continua presente e passa a refletir a soma das faixas, recalculada no servidor.)

`EventoResumo`: adicionar a relacao consolidada por tipo
```python
    itens_por_tipo: list["ResumoItemTipo"] = []  # [{tipo, total_vendido, total_pedido}]

class ResumoItemTipo(BaseModel):
    tipo: str
    total_vendido: int
    total_pedido: int
```

---

## 5. Rotas e Paginas

### 5.1 Rotas API (todas sob `/api/eventos`, auth obrigatoria)

| Metodo | Rota | Proposito | Status |
|--------|------|-----------|--------|
| GET | `/{evento_id}/participantes/{pid}/faixas` | listar faixas do participante | NOVO |
| POST | `/{evento_id}/participantes/{pid}/faixas` | criar faixa (numerada ou sem numero) | NOVO |
| PUT | `/{evento_id}/participantes/{pid}/faixas/{faixa_id}` | editar faixa | NOVO |
| DELETE | `/{evento_id}/participantes/{pid}/faixas/{faixa_id}` | remover faixa | NOVO |
| PUT | `/{evento_id}/participantes/{pid}/itens` | upsert lista de itens por tipo | NOVO |
| GET | `/{evento_id}/participantes/{pid}/itens` | listar itens (opcional; ja vem em ParticipanteOut) | NOVO (opcional) |
| PUT | `/{evento_id}/participantes/{pid}/cartoes` | atualizar vendas/devolucao/custo (NAO mais recebidos) | ALTERADO |
| POST | `/{evento_id}/popular` | popular elenco; recebidos via faixa numerada/sem-numero | ALTERADO |
| GET | `/{evento_id}/resumo` | agrega + `itens_por_tipo` consolidado | ALTERADO |
| PUT | `/{evento_id}` | agora aceita `tipos_item` | ALTERADO |

Helper novo: `_recalc_recebidos(p)` -> `p.qtd_cartoes_recebidos = sum(f.quantidade for f in p.faixas)`. Chamado apos qualquer mutacao de faixas e antes da validacao de reconciliacao.

### 5.2 Comportamento detalhado das rotas alteradas

**`POST /{id}/participantes/{pid}/faixas`** (criar faixa):
1. Carregar participante (404 se nao existe ou nao bate evento_id).
2. Se `sem_numero=True`: exigir `quantidade >= 1`; `numero_inicio/fim = None`.
3. Se `sem_numero=False`: exigir `numero_inicio`, `numero_fim`, `numero_fim >= numero_inicio`; `quantidade = fim - ini + 1`.
4. (Opcional, validacao leve) avisar/erro se a faixa numerada colide com outra faixa numerada do MESMO participante. Colisao entre participantes diferentes NAO e bloqueada nesta versao (YAGNI; o controle de numero unico global era do modelo antigo de coluna unica e nao se sustenta com faixas quebradas). **Decisao registrada no PROJECT.md.**
5. Persistir, `_recalc_recebidos`, revalidar reconciliacao (`vendidos+devolvidos+pagou_custo <= recebidos`), `_recalcular_valor_esperado`, commit, retornar `ParticipanteOut`.

**`PUT .../faixas/{faixa_id}`** e **`DELETE`**: mesma cadeia (mutar -> `_recalc_recebidos` -> revalidar reconciliacao -> recalcular valor -> commit). DELETE que deixaria `recebidos < vendidos+devolvidos+pagou_custo` retorna 400.

**`PUT .../itens`** (upsert por tipo):
1. Carregar participante + evento.
2. Validar que cada `tipo` enviado esta em `evento.tipos_item` (se evento tem tipos definidos). Tipo fora da lista -> 400.
3. Upsert por `(participante_id, tipo)`: atualiza existente ou cria. Tipos omitidos no payload mas existentes no banco: manter ou zerar? **Decisao:** o PUT e o estado completo da lista de itens daquele participante -> tipos ausentes no payload sao REMOVIDOS (substituicao total, semantica PUT). Simples e previsivel para a grid.
4. Validacao de fechamento: `sum(qtd_vendido) == p.qtd_vendidos`. Se nao fecha -> 400 com mensagem clara (`"Soma cru+assado vendidos (X) deve bater com vendidos do participante (Y)"`). `qtd_pedido` e livre (sem validacao de soma).
5. Commit, retornar `ParticipanteOut`.

**`POST /{id}/popular`** (alterado):
- Em vez de setar `numero_inicio/numero_fim` inline, criar 1 `EventoCartaoFaixa` numerada por jogador quando `qtd > 0`, usando `_proximo_numero` global do evento (somar tambem `max(numero_fim)` das faixas, nao so da coluna legada).
- `_proximo_numero` passa a considerar `max` entre `EventoParticipante.numero_fim` (legado/backfill) e `EventoCartaoFaixa.numero_fim`. Apos backfill, a fonte real e a faixa.
- `qtd_cartoes_recebidos` derivado via `_recalc_recebidos`.

**`GET /{id}/resumo`** (alterado): alem dos agregados atuais, computar `itens_por_tipo`:
```python
rows = (
    db.query(
        EventoParticipanteItem.tipo,
        func.coalesce(func.sum(EventoParticipanteItem.qtd_vendido), 0),
        func.coalesce(func.sum(EventoParticipanteItem.qtd_pedido), 0),
    )
    .join(EventoParticipante, EventoParticipante.id == EventoParticipanteItem.evento_participante_id)
    .filter(EventoParticipante.evento_id == evento_id)
    .group_by(EventoParticipanteItem.tipo)
    .all()
)
```
`cartoes_emitidos` no resumo passa a somar `qtd_cartoes_recebidos` (ja derivado das faixas) - sem mudanca de formula, so de fonte.

### 5.3 Pagina (frontend)

Rota existente: `/eventos/[id]`. Sem rota nova. Mudancas dentro da pagina:
- **Grid inline (planilha)**: substituir/complementar os cards de participante por uma tabela. 1 linha por participante. Colunas com edicao in-place + autosave (blur/Enter) + recalculo otimista:
  - Nome (read-only) | Recebidos (read-only, = soma faixas, com botao expandir faixas) | Vendidos | Devolvidos | Pagou custo | [por tipo] Cru vend | Assado vend | Cru ped | Assado ped | Valor (derivado, read-only) | Status pago (badge) | acoes (pagar, remover).
  - Colunas de tipo sao dinamicas: renderizadas a partir de `evento.tipos_item`. Evento sem `tipos_item` nao mostra colunas de split.
- **Sub-linha expansivel de faixas** (1:N): ao expandir um participante, lista faixas; botoes "Adicionar faixa numerada" (inputs inicio/fim) e "Adicionar lote sem numero" (input quantidade); editar/remover por faixa. Lote sem numero exibido como "Sem numero (N cartoes)".
- **Config do evento** (modal existente, ~L406): adicionar campo "Tipos de item" (input de tags/chips ou texto separado por virgula -> array). Salva via `PUT /eventos/{id}` com `tipos_item`.
- **Estatistica do evento** (card de resumo): bloco "Relacao Cru x Assado" lendo `resumo.itens_por_tipo`: por tipo mostra vendido e pedido; total a repassar a cozinha = soma (vendido + pedido) ou vendido (definir no FE conforme uso; expor ambos). 
- Autosave: cada celula chama o endpoint correspondente; em erro de validacao (400 do fechamento de itens / reconciliacao), faz `toast.error` com a mensagem do backend e reverte a celula ao valor anterior (refetch participante).

Tipos TS novos em `frontend/src/types/index.ts`: `FaixaOut`, `FaixaCreate`, `FaixaUpdate`, `ItemTipo`, `ItensUpdate`, `ItemOut`, `ResumoItemTipo`; estender `EventoOut`, `ParticipanteOut`, `EventoResumo`, `EventoCreate/Update`.

---

## 6. Estrategia de Migracao (aditiva, idempotente, Postgres + SQLite)

Hoje NAO existe sistema de migracao (so `create_all`). A feature precisa de: (a) 2 tabelas novas (cobertas por `create_all`), (b) 1 coluna nova em tabela existente (`eventos.tipos_item`, NAO coberta), (c) backfill de faixas a partir dos dados legados.

### 6.1 Onde rodar
Criar `backend/migrations.py` com funcao `run_additive_migrations(engine)` chamada em `main.py` **logo apos** `Base.metadata.create_all(bind=engine)` (linha 19). Assim roda no boot, idempotente, sem cron host (consistente com a escolha do projeto de centralizar no app).

```python
# main.py (apos create_all)
from migrations import run_additive_migrations
Base.metadata.create_all(bind=engine)
run_additive_migrations(engine)
```

### 6.2 ALTER idempotente compativel
Detectar dialeto e checar coluna antes de adicionar (nao depender de `IF NOT EXISTS`, que SQLite antigo nao suporta de forma uniforme):

```python
from sqlalchemy import inspect, text

def run_additive_migrations(engine):
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("eventos")]
    if "tipos_item" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE eventos ADD COLUMN tipos_item TEXT"))
    _backfill_faixas(engine)
```
`ALTER TABLE ... ADD COLUMN ... TEXT` e valido em Postgres e SQLite. Usar `engine.begin()` (transacao). A checagem via `inspector` torna o ADD idempotente nos dois bancos.

### 6.3 Backfill de faixas (idempotente)
Para cada `EventoParticipante`, criar no maximo as faixas que faltam. Idempotencia: so processa participante que **ainda nao tem nenhuma faixa** (`COUNT(evento_cartao_faixa WHERE evento_participante_id = p.id) == 0`). Rodar 2x nao duplica.

Regras:
- Participante com `numero_inicio` E `numero_fim` preenchidos -> 1 faixa numerada (`sem_numero=0`, `quantidade = fim - ini + 1`).
- Participante sem numeros mas com `qtd_cartoes_recebidos > 0` -> 1 faixa `sem_numero=1` com `quantidade = qtd_cartoes_recebidos`.
- Participante sem numeros e `qtd_cartoes_recebidos == 0` -> nenhuma faixa.

```python
def _backfill_faixas(engine):
    from models import EventoParticipante, EventoCartaoFaixa
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        parts = db.query(EventoParticipante).all()
        for p in parts:
            ja_tem = db.query(EventoCartaoFaixa).filter(
                EventoCartaoFaixa.evento_participante_id == p.id
            ).count()
            if ja_tem:
                continue
            if p.numero_inicio is not None and p.numero_fim is not None:
                qtd = p.numero_fim - p.numero_inicio + 1
                db.add(EventoCartaoFaixa(
                    evento_participante_id=p.id,
                    numero_inicio=p.numero_inicio, numero_fim=p.numero_fim,
                    quantidade=qtd, sem_numero=0,
                ))
            elif (p.qtd_cartoes_recebidos or 0) > 0:
                db.add(EventoCartaoFaixa(
                    evento_participante_id=p.id,
                    numero_inicio=None, numero_fim=None,
                    quantidade=p.qtd_cartoes_recebidos, sem_numero=1,
                ))
        db.commit()
    finally:
        db.close()
```

### 6.4 Rollback
- NAO dropar `numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos` do participante (preservados).
- Reverter codigo = voltar ao commit anterior. As tabelas novas e a coluna `tipos_item` ficam orfas mas inertes (nao quebram o app antigo, que nao as le). Sistema B (`CartaoBaile`) intocado.
- Criterio de validacao pos-migracao: para todo participante, `sum(faixas.quantidade) == qtd_cartoes_recebidos_legado` (contagem preservada).

### 6.5 Compatibilidade de tipos
- Coluna JSON como `Text` + `json.dumps`/`json.loads`: funciona identico em Postgres e SQLite. Nunca usar `JSONB`.
- `sem_numero` como `Integer` 0/1 (mesmo padrao de `pago`, `ativo` no projeto), nao `Boolean` nativo.
- `created_at` como `Text` ISO (padrao do projeto).

---

## 7. Validacoes (resumo consolidado)

| Regra | Onde | Erro |
|-------|------|------|
| Faixa numerada: `fim >= ini`, qtd derivada | POST/PUT faixas | 400 |
| Faixa sem numero: `quantidade >= 1` | POST/PUT faixas | 400 |
| `qtd_cartoes_recebidos = soma(faixas.quantidade)` | servidor (derivado, nunca confiar no cliente) | n/a |
| `vendidos + devolvidos + pagou_custo <= recebidos` | atualizar_cartoes + apos mutar faixas | 400 (mantida) |
| `sum(item.qtd_vendido por tipo) == p.qtd_vendidos` | PUT itens | 400 |
| `qtd_pedido` livre | - | sem validacao |
| `tipo` do item deve estar em `evento.tipos_item` | PUT itens | 400 |
| `(participante, tipo)` unico | indice unico + upsert | n/a |

Ordem nas mutacoes de faixa: mutar -> `_recalc_recebidos` -> validar reconciliacao -> `_recalcular_valor_esperado` -> recalcular `pago` -> commit.

---

## 8. Integracoes

Nenhuma integracao externa nova. Feature 100% interna (DB + API + UI). WhatsApp/uazapi nao envolvidos.

| Integracao | Proposito | Como |
|------------|-----------|------|
| Postgres/SQLite (existente) | persistencia | SQLAlchemy |
| (nenhuma nova) | - | - |

---

## 9. Modulos do Sistema (mapa da feature)

| Modulo | Features | Tabelas | Rotas | Role | Origem |
|--------|----------|---------|-------|------|--------|
| Faixas de cartao | CRUD faixas numeradas/sem-numero; recebidos derivado | `evento_cartao_faixa` | `/eventos/{id}/participantes/{pid}/faixas*` | admin | briefing |
| Split cru/assado | upsert itens por tipo; fechamento c/ vendidos | `evento_participante_item` | `/.../itens` | admin | briefing |
| Config de tipos | `tipos_item` por evento | `eventos.tipos_item` | `PUT /eventos/{id}` | admin | briefing |
| Estatistica consolidada | relacao cru x assado (vendido + pedido) | (agregacao) | `GET /eventos/{id}/resumo` | admin | briefing |
| Grid inline | edicao planilha autosave/recalc | - | consome rotas acima | admin | briefing |
| Migracao aditiva | tabelas + coluna + backfill idempotente | todas | boot (`migrations.py`) | - | restricao do usuario |
