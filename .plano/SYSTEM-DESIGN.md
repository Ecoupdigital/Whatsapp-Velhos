# SYSTEM-DESIGN: Portal de Transparência — Velhos Parceiros F.C.

> Feature brownfield. Adiciona uma camada pública read-only ao app existente
> (FastAPI + SQLite/Postgres backend, Next.js 14 App Router frontend).
> Zero coleta de dado nova: tudo agrega o que já existe. Escopo travado pelo BRIEFING.

## 1. Stack (respeitada, sem libs novas)

| Camada | Tecnologia já no projeto | Uso na feature |
|--------|--------------------------|----------------|
| Backend | FastAPI + SQLAlchemy + Pydantic v2 | 1 router público novo + schemas |
| DB | SQLite (dev) / Postgres (prod) | só leitura, sem migration |
| Frontend | Next.js 14.2 App Router + TypeScript | 1 route group público novo + 1 página |
| Estilo | Tailwind dark + brand.red #E31E24 | reuso do tema existente |
| Gráfico | recharts ^3.8 | gráfico de fluxo 12 meses |
| Animação | framer-motion ^12 | entrada suave dos blocos |
| Ícones | lucide-react | ícones dos blocos |
| Deploy | Coolify (front + back já em prod) | sem container novo, sem mudança de CORS |

Nada de novo é instalado. Tudo que a feature precisa já está no `package.json` e nos `requirements` do backend.

## 2. Módulos novos

### 2.1 Backend: `backend/routers/portal.py`
- Router com `prefix="/api/portal"`, `tags=["portal"]`.
- **SEM** `Depends(get_current_user)` em nenhuma rota (público por construção).
- 1 endpoint: `GET /api/portal` → entrega o pacote agregado inteiro numa request.
- Read-only: não cria, não atualiza, não deleta. Nenhum `db.commit()`.
- Registrado em `backend/main.py` via `app.include_router(portal.router)` (junto dos demais).

### 2.2 Backend: schemas Pydantic (em `backend/schemas.py`)
Novos models, todos `BaseModel` v2, prefixo `Portal*` para não colidir:
`PortalMeta`, `PortalCaixaAtrasos`, `PortalFluxoMes`, `PortalCaixa`,
`PortalEvento`, `PortalJogoResumo`, `PortalRankingEntry`, `PortalResultado`,
`PortalProximoJogo`, `PortalJogos`, `PortalResponse`.
(Reaproveitar shapes equivalentes aos existentes onde fizer sentido, mas com nomes
próprios pro contrato público ficar isolado e estável.)

### 2.3 Frontend: route group `frontend/src/app/(public)/`
```
frontend/src/app/(public)/
  layout.tsx              header limpo (escudo + nome), SEM sidebar, SEM guard de auth
  transparencia/
    page.tsx              página (client component, fetch /api/portal), metadata noindex
```
Fora do route group `(app)`, então não herda o redirect pro login.

### 2.4 Frontend: componentes de apoio
```
frontend/src/components/portal/
  HeroCaixa.tsx           escudo + nome + saldo herói + carimbo "atualizado em"
  CaixaBloco.tsx          cards entrou/saiu + badges de atraso
  FluxoChart.tsx          gráfico recharts entradas vs saídas (12 meses)
  EventosBloco.tsx        card por evento (arrecadou/custou/sobrou)
  JogosBloco.tsx          V/E/D + gols + rankings + resultados + próximos jogos
```
(Componentização pode ser ajustada pelo executor desde que entregue os 4 blocos do BRIEFING.)

## 3. Contrato exato: `GET /api/portal`

### Request
- Método: `GET`
- Path: `/api/portal`
- Auth: nenhuma. Sem header `Authorization`. Sem query params.
- Sucesso: `200` com o corpo abaixo. Sem paginação.

### Response (campo a campo, com tipos)

```jsonc
{
  "meta": {
    "time_nome": "string",          // configuracoes.time_nome (fallback "Velhos Parceiros F.C.")
    "atualizado_em": "string"        // ISO 8601 do momento da request (UTC->BRT no front)
  },
  "caixa": {
    "saldo_atual": 0.0,              // float, soma dos saldos das contas ativas
    "total_entrou": 0.0,             // float, soma de todas transacoes tipo='entrada'
    "total_saiu": 0.0,               // float, soma de todas transacoes tipo='saida'
    "entrou_mes": 0.0,               // float, entradas do mes corrente (YYYY-MM)
    "saiu_mes": 0.0,                 // float, saidas do mes corrente
    "fluxo_12m": [
      { "mes": "2026-06", "entradas": 0.0, "saidas": 0.0 }  // ate 12 itens, ordem cronologica asc
    ],
    "atrasos": {
      "mensalidades": 0,             // int, COUNT mensalidades status='atrasado' no mes corrente
      "jogadores": 0                 // int, COUNT DISTINCT jogador_id dessas mensalidades
    }
  },
  "eventos": [
    {
      "titulo": "string",           // eventos.titulo
      "tipo": "string",             // eventos.tipo (viagem|baile|...)
      "data": "string|null",        // eventos.data_inicio (YYYY-MM-DD) ou null
      "arrecadado": 0.0,            // float, sum(valor_pago) dos participantes do evento
      "custo": 0.0,                 // float, custo_real se >0, senao custo_estimado
      "custo_origem": "string",     // "real" | "estimado" | "sem_custo"
      "liquido": 0.0,               // float, arrecadado - custo
      "status": "string"            // eventos.status (concluido|em_andamento|planejado)
    }
  ],
  "jogos": {
    "resumo": {
      "vitorias": 0,                // int
      "empates": 0,                 // int
      "derrotas": 0,                // int
      "gols_pro": 0,                // int (= gols_marcados de estatisticas)
      "gols_contra": 0              // int (= gols_sofridos de estatisticas)
    },
    "artilharia":   [ { "nome": "string", "quantidade": 0 } ],  // top N, desc
    "assistencias": [ { "nome": "string", "quantidade": 0 } ],
    "destaques":    [ { "nome": "string", "quantidade": 0 } ],
    "ultimos_resultados": [
      { "data": "string", "adversario": "string", "placar": "2x1" }  // jogos realizados, recentes primeiro
    ],
    "proximos_jogos": [
      { "data": "string", "horario": "string|null", "local": "string|null", "adversario": "string" }
    ]
  }
}
```

### Regra de líquido de evento
```
custo, custo_origem =
    (custo_real, "real")        se custo_real and custo_real > 0
    (custo_estimado, "estimado") senao se custo_estimado and custo_estimado > 0
    (0.0, "sem_custo")          senao
liquido = arrecadado - custo
```
- `arrecadado` = `sum(valor_pago)` dos `evento_participantes` do evento (mesma conta de `resumo_evento`).
- `custo_origem` permite o front rotular: "real" -> "custo", "estimado" -> "custo previsto",
  "sem_custo" -> "a confirmar".
- **Filtro de eventos**: incluir status em `("concluido", "em_andamento")`. Eventos `planejado`
  só entram se tiverem arrecadação (`arrecadado > 0`); marcados como "em breve" pelo front via status.
  Excluir `cancelado`. Ordenar por `data_inicio` desc.

### Regra de atrasos (privacidade)
```
mes_corrente = strftime "%Y-%m" de hoje (BRT)
q = mensalidades WHERE status = 'atrasado' AND mes_referencia = mes_corrente
atrasos.mensalidades = COUNT(q)
atrasos.jogadores    = COUNT(DISTINCT q.jogador_id)
```
- NUNCA seleciona `jogador.nome`, nem retorna linhas de mensalidade. Só os dois inteiros.

## 4. Mapeamento campo -> fonte de dado (reuso explícito)

| Campo do payload | Origem / função reusada |
|------------------|--------------------------|
| `meta.time_nome` | `configuracoes` chave `time_nome` (query direta, fallback constante) |
| `meta.atualizado_em` | `datetime.now()` no handler |
| `caixa.saldo_atual` | `sum(_calcular_saldo_atual(db, c) for c in contas ativas)` — `routers/contas.py` |
| `caixa.total_entrou` | `sum(Transacao.valor) WHERE tipo='entrada'` (cálculo direto novo, trivial) |
| `caixa.total_saiu` | `sum(Transacao.valor) WHERE tipo='saida'` (cálculo direto novo, trivial) |
| `caixa.entrou_mes` / `saiu_mes` | mesma lógica de `entradas_mes`/`saidas_mes` em `financeiro.balanco` (filtro `data LIKE 'YYYY-MM%'`) |
| `caixa.fluxo_12m` | mesma agregação de `financeiro.fluxo_mensal` (`data[:7]`, soma por tipo), reordenada asc |
| `caixa.atrasos.*` | COUNT em `mensalidades` (regra acima) — lógica nova, sem reuso |
| `eventos[].arrecadado` | `sum(valor_pago)` dos participantes — mesma conta de `eventos.resumo_evento` |
| `eventos[].custo` / `custo_origem` / `liquido` | regra de líquido (acima) sobre `Evento.custo_real`/`custo_estimado` |
| `eventos[].titulo/tipo/data/status` | colunas de `Evento` |
| `jogos.resumo.*` | `jogos.estatisticas` (vitorias/empates/derrotas/gols_marcados->gols_pro/gols_sofridos->gols_contra) |
| `jogos.artilharia/assistencias/destaques` | `jogos.rankings` (`_parse_entries` sobre `gols_descricao`/`assistencias`/`destaque`) |
| `jogos.ultimos_resultados` | `Jogo WHERE realizado=1` ordenado por `data` desc, placar `f"{gols_favor}x{gols_contra}"` |
| `jogos.proximos_jogos` | `Jogo WHERE realizado=0 AND data >= hoje` ordenado por `data` asc |

Onde a lógica já existe em outro router como função reutilizável, o portal **chama/replica a regra**
(não duplica modelo de dado nem cria endpoint redundante). O `portal.py` consolida as agregações
numa só passagem read-only.

## 5. Estrutura de pastas (delta da feature)

```
backend/
  main.py                         (EDIT: + app.include_router(portal.router))
  routers/portal.py               (NOVO)
  schemas.py                      (EDIT: + Portal* models)
  tests/test_portal.py            (NOVO, se a suite existir; senao script de verificação)

frontend/src/
  app/(public)/layout.tsx         (NOVO)
  app/(public)/transparencia/page.tsx  (NOVO)
  components/portal/*.tsx          (NOVO)
  lib/api.ts                       (sem edição: apiFetch já serve, token é opcional)
```

## 6. Segurança e privacidade (trava dura)

- **Endpoint público por construção**: a ausência de `Depends(get_current_user)` é a decisão de design;
  a trava de privacidade vive **dentro** do handler, não no auth.
- O handler **nunca serializa registro cru** de pagamento. Mensalidade vira `COUNT`. Transação vira `SUM`.
- **Nenhum nome de jogador em contexto financeiro.** Nome só aparece em ranking esportivo
  (artilharia/assistência/destaque), que não tem vínculo com pagamento.
- Sem PII: sem telefone, sem apelido em finanças, sem lista de transações, sem participantes nominais.
- Verificação automatizável: o payload de `/api/portal` não deve conter nenhuma string de nome
  fora de `jogos.*` (artilharia/assistencias/destaques/proximos_jogos.adversario/ultimos_resultados.adversario).
  Adversário é nome de time, não PII.

## 7. Plano de deploy

- **CORS não muda.** O front chama `/api` via rewrite same-origin (Next server-side,
  `next.config.mjs`), o navegador nunca fala direto com o backend. A allowlist de CORS
  (`localhost:3000`) permanece intacta.
- **Sem container novo.** Mesma pipeline Coolify: backend `velhos-backend.ecoup.digital`,
  front `app.velhosparceiros.com.br`. URL pública: `app.velhosparceiros.com.br/transparencia`.
- **noindex**: `metadata.robots = { index: false, follow: false }` na página `transparencia`.
  Sem necessidade de mexer em `robots.txt` global (a meta tag basta pro escopo).
- Sem variável de ambiente nova. Sem migration. Deploy = build normal do front + restart do back.

## 8. Roles e permissões

A feature introduz um nível de acesso novo: **público anônimo (sem autenticação)**.

| Recurso | Anônimo (público) | Usuário autenticado (admin/diretoria) |
|---------|-------------------|----------------------------------------|
| `GET /api/portal` | READ (agregado) | READ |
| `/transparencia` (front) | acesso livre | acesso livre |
| Todo o resto do app (`/api/*`, `(app)/*`) | -- (negado, JWT exigido) | FULL (inalterado) |

Não há novos papéis internos. O app interno segue com o mesmo modelo de auth JWT de hoje.
O único delta é a superfície pública read-only e agregada.

## 9. Integrações

Nenhuma integração externa nova. A feature é 100% interna (lê o próprio banco do app).
Sem Stripe, sem e-mail, sem WhatsApp/uazapi nesta feature.
