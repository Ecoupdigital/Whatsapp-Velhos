# PROJECT: Portal de Transparência — Velhos Parceiros F.C.

> Feature brownfield adicionada ao app existente (FastAPI + Next.js 14) do
> Velhos Parceiros F.C. Briefing aprovado em 2026-06-04.

## What This Is
Uma página pública única de prestação de contas. Diretoria e jogadores abrem um
link aberto (sem login) e veem, em tempo real: dinheiro em caixa, fluxo financeiro
do time, resultado líquido dos eventos (Galeto, Baile) e as estatísticas esportivas.
Tudo agregado e read-only, sem expor nenhum dado sensível.

## Core Value
Construir confiança via transparência. Um link aberto mostra os números do time
em tempo real, sem nunca expor quem deve. Transparência financeira sem PII.

## Requirements

### Active
- [ ] API-01: Router público `/api/portal` (sem auth) registrado em main.py
- [ ] API-02: Endpoint `GET /api/portal` entrega pacote agregado completo numa request
- [ ] API-03: Bloco `caixa` (saldo atual, total entrou/saiu, mês corrente, fluxo 12m)
- [ ] API-04: Líquido por evento (arrecadado - custo) com `custo_origem`
- [ ] API-05: Bloco `jogos` (V/E/D, gols, rankings, últimos resultados, próximos jogos)
- [ ] API-06: Schemas Pydantic v2 `Portal*` para o contrato público
- [ ] SEC-01: Atrasos sempre como COUNT agregado (mensalidades + jogadores), sem nomes
- [ ] SEC-02: Nenhum nome de jogador ligado a pagamento no payload
- [ ] SEC-03: Sem lista de transações nem PII no payload
- [ ] UI-01: Route group público `(public)` sem guard de auth
- [ ] UI-02: Página `/transparencia` renderiza os 4 blocos (hero, caixa, eventos, jogos)
- [ ] UI-03: Gráfico de fluxo 12 meses com recharts e dado real
- [ ] UI-04: Carimbo "atualizado em DD/MM HH:MM" + responsiva mobile
- [ ] UI-05: Badges de atraso (N mensalidades, N jogadores), líquido em verde/vermelho
- [ ] DEPLOY-01: `noindex` na página (robots index:false, follow:false)
- [ ] DEPLOY-02: CORS inalterado, deploy na mesma pipeline Coolify

### Out of Scope (YAGNI)
- PIN/senha/login no portal (decisão: link totalmente aberto)
- Snapshot/publicação manual (decisão: tempo real, lê o banco direto)
- Painel de configuração do portal
- Export PDF / impressão
- Paginação de histórico de eventos
- Multi-idioma e light mode
- Qualquer coleta de dado nova / endpoint de escrita
- Mudança no modelo de auth interno do app

## Context

**Tipo:** Brownfield. App em produção (Velhos Parceiros F.C.), feature aditiva.

**Stack (respeitada, do codebase existente):**
- Backend: FastAPI + SQLAlchemy + Pydantic v2, SQLite (dev) / Postgres (prod)
- Frontend: Next.js 14.2 App Router + TypeScript + Tailwind (dark, brand.red #E31E24)
- Gráfico: recharts ^3.8 (já instalado). Animação: framer-motion ^12. Ícones: lucide-react
- Deploy: Coolify. Front app.velhosparceiros.com.br, back velhos-backend.ecoup.digital

**Sem libs novas.** Tudo necessário já está instalado.

**Reuso de lógica existente (confirmado no código):**
- `_calcular_saldo_atual` (routers/contas.py) para saldo por conta
- `financeiro.balanco` (entradas_mes/saidas_mes) e `financeiro.fluxo_mensal` (fluxo 12m)
- `jogos.estatisticas` (V/E/D + gols) e `jogos.rankings` (`_parse_entries`)
- `eventos.resumo_evento` (`sum(valor_pago)` por participante = arrecadado)

**Sem pesquisa de ecossistema:** todas as tecnologias já existem e estão validadas em
produção. Não há tecnologia nova a pesquisar.

## Constraints
- Stack travada no que já existe (não trocar framework/ORM/libs)
- Sem migration de banco (feature é read-only)
- Sem mudança de CORS (front chama `/api` same-origin via rewrite)
- Sem variável de ambiente nova
- pt-BR com acentuação correta. Sem em-dash.
- Seguir convenções do codebase (router por arquivo, schemas em schemas.py,
  route group para separar público/protegido no front)

## Key Decisions

| Decisão | Outcome | Justificativa |
|---------|---------|---------------|
| Link totalmente aberto, sem login nem PIN | Do usuário (briefing) | Transparência máxima; portal é prestação de contas pública |
| `noindex` em vez de robots.txt global | Do usuário (briefing) | Não indexar no Google sem bloquear acesso direto |
| Tempo real (lê banco direto), sem snapshot | Do usuário (briefing) | Sempre atualizado, zero trabalho manual |
| Atraso só como COUNT, sem nomes | Do usuário (briefing) | Trava de privacidade dura: nunca expor quem deve |
| 1 endpoint agregador (não vários) | Do usuário (briefing) | Uma request entrega o portal inteiro, front simples |
| Router público sem `Depends(get_current_user)` | Do usuário (briefing) | Padrão do app: rota fica pública não passando a dependência |
| Route group `(public)` fora de `(app)` | Do usuário (briefing) | Não herda o guard client-side do `(app)/layout.tsx` |
| Custo = custo_real se >0 senão estimado, com `custo_origem` | Do usuário (briefing) | Front rotula "custo" / "custo previsto" / "a confirmar" |
| Filtrar eventos `concluido`+`em_andamento` (planejado só se arrecadou) | Decisão do arquiteto | Briefing pede "concluídos e em andamento"; planejado sem arrecadação polui; cancelado sai |
| Schemas com prefixo `Portal*` próprios | Decisão do arquiteto | Isola o contrato público; estável e independente dos schemas internos |
| `meta.atualizado_em` em ISO no payload, formatação no front | Decisão do arquiteto | Backend entrega dado bruto, front decide DD/MM HH:MM em BRT |
| `ultimos_resultados`/`proximos_jogos` derivados de `realizado` | Decisão do arquiteto | Campo `realizado` já separa jogos passados de futuros |
