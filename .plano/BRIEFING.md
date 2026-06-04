# BRIEFING: Portal de Transparência — Velhos Parceiros F.C.

> Feature brownfield. Adiciona uma camada pública (sem login) ao app existente
> (FastAPI + SQLite/Postgres backend, Next.js 14 App Router frontend).
> Brainstorm aprovado em 2026-06-04. Próximo passo: `/up:plan`.

## Valor Central
Página pública única de prestação de contas. Diretoria e jogadores abrem um link
e veem, em tempo real: dinheiro em caixa, fluxo do time, resultado dos eventos
(Galeto, Baile) e as estatísticas esportivas. Construir confiança via transparência,
sem expor dado sensível (quem deve).

## Decisões aprovadas (do brainstorm)

| Tema | Decisão |
|------|---------|
| **Acesso** | Link totalmente aberto, sem login nem PIN. `noindex` no robots pra não indexar no Google. |
| **Caixa** | Macro (saldo atual, total entrou, total saiu) + gráfico de fluxo 12 meses + contagem de atrasos (quantas mensalidades e quantos jogadores em atraso, SEM nomes). |
| **Eventos** | Resultado líquido por evento: arrecadou X, custou Y, sobrou Z. |
| **Jogos** | Completo: aproveitamento (V/E/D), gols pró/contra, rankings (artilharia, assistências, destaques), últimos resultados E próximos jogos (agenda). |
| **Atualização** | Tempo real (lê o banco direto), com carimbo "atualizado em DD/MM HH:MM". Sem snapshot manual. |
| **URL** | `app.velhosparceiros.com.br/transparencia` (mesma app, rota fora do guard). |

## TRAVA DE PRIVACIDADE (requisito duro)
O portal NUNCA expõe:
- Nome de jogador ligado a status de pagamento (quem pagou, quem deve).
- Lista de transações individuais.
- Telefone, dado pessoal, qualquer PII.

Atraso é sempre `COUNT` agregado. Nome de jogador só aparece em ranking esportivo
(artilheiro/assistência/destaque), jamais em contexto financeiro. Essa trava vive
no endpoint público: ele só monta números agregados, nunca serializa o registro cru.

## Arquitetura (2 camadas novas, zero coleta nova)

### Backend — router público novo
- Arquivo: `backend/routers/portal.py`. Prefixo `/api/portal`. SEM `Depends(get_current_user)`.
- Registrar em `backend/main.py` via `app.include_router(portal.router)`.
- Read-only. Um endpoint agregador entrega o pacote inteiro numa request:

`GET /api/portal` →
```
{
  meta:    { time_nome, atualizado_em }
  caixa:   { saldo_atual, total_entrou, total_saiu, entrou_mes, saiu_mes,
             fluxo_12m: [{ mes, entradas, saidas }],
             atrasos: { mensalidades: N, jogadores: N } }
  eventos: [{ titulo, tipo, data, arrecadado, custo, custo_origem, liquido, status }]
  jogos:   { resumo: { vitorias, empates, derrotas, gols_pro, gols_contra },
             artilharia: [...], assistencias: [...], destaques: [...],
             ultimos_resultados: [{ data, adversario, placar }],
             proximos_jogos:     [{ data, horario, local, adversario }] }
}
```
- Reusa lógica existente: `_calcular_saldo_atual` (contas.py), `/financeiro/balanco`,
  `/financeiro/fluxo`, `/jogos/estatisticas`, `/jogos/rankings`, `eventos/{id}/resumo`.
- `saldo_atual` = soma do saldo de todas as contas ativas.
- `total_entrou`/`total_saiu` = soma de `transacoes` por tipo (cálculo direto novo, trivial).
- `atrasos.mensalidades` = COUNT de mensalidades com status atrasado no mês corrente.
  `atrasos.jogadores` = COUNT distinto de jogadores com mensalidade atrasada.

### Backend — regra do líquido de evento
- `liquido = arrecadado - custo`.
- `custo` = `custo_real` se > 0, senão `custo_estimado`. `custo_origem` marca qual usou
  ("real" | "estimado" | "sem_custo") pro front rotular ("custo previsto" / "a confirmar").
- Considerar só eventos relevantes (concluídos e em andamento). Planejados sem
  arrecadação podem aparecer como "em breve".

### Frontend — route group público novo
```
frontend/src/app/(public)/
  layout.tsx              → header limpo (escudo + nome), sem sidebar, sem guard de auth
  transparencia/page.tsx  → a página (client component, fetch /api/portal)
```
- Fora do route group `(app)`, então não herda o redirect pro login.
- Metadata `robots: { index: false, follow: false }` na página.
- Reusa tema dark + vermelho #E31E24. `recharts` (já instalado) pro gráfico de fluxo.
  `framer-motion` entrada suave. `lucide-react` ícones. Mobile-first.

### Layout da página (uma rolagem, 4 blocos)
1. **Hero:** escudo + "Velhos Parceiros F.C." + "Prestação de Contas" + saldo atual
   em número herói + "atualizado em DD/MM HH:MM".
2. **Caixa:** total entrou / total saiu (dois cards) + gráfico fluxo 12 meses
   (entradas vs saídas) + 2 badges de alerta (N mensalidades em atraso, N jogadores em atraso).
3. **Eventos:** card por evento com arrecadou / custou / sobrou (líquido em verde/vermelho).
4. **Em campo:** cards V/E/D + gols pró/contra, rankings (artilharia/assistências/destaques),
   últimos resultados (placares), próximos jogos (agenda).
5. Footer discreto.

## Deploy
- CORS: NÃO muda. Front chama `/api` via rewrite same-origin (Next server), navegador
  nunca fala direto com o backend.
- Mesma pipeline Coolify, sem container novo. Backend `velhos-backend.ecoup.digital`,
  front `app.velhosparceiros.com.br`.

## Fora de escopo (YAGNI)
PIN/senha, snapshot/publicação manual, painel de config do portal, export PDF,
paginação de histórico de eventos, multi-idioma, light mode.

## Critérios de sucesso
- `GET /api/portal` responde sem token, com o pacote agregado completo.
- Nenhum nome de jogador aparece ligado a pagamento (verificável no payload).
- `/transparencia` abre sem login, renderiza os 4 blocos, responsiva no mobile.
- Gráfico de fluxo 12 meses renderiza com dado real.
- Líquido de evento (Galeto) bate com arrecadado - custo.
- Página com `noindex`.

## Modo de execução
`/up:build --solo` (autônomo total, mantém GitHub: worktree → issue → PR → merge por fase,
sem menu nem gate visual).
