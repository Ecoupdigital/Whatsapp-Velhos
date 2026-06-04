# Requisitos da Fase 02 — Frontend Portal

> Slice gerado automaticamente. Versão completa em `.plano/REQUIREMENTS.md`.

## UI-01: Route group público sem guard
`frontend/src/app/(public)/` com `layout.tsx` sem guard de auth (header limpo:
escudo + nome, sem sidebar). Fora de `(app)`, não herda o redirect pro login.
*Testável:* acessar `/transparencia` sem token não redireciona pro `/login`.

## UI-02: Página com 4 blocos
`(public)/transparencia/page.tsx` faz fetch de `/api/portal` e renderiza Hero,
Caixa, Eventos, Em campo (jogos) + footer.
*Testável:* a página renderiza os 4 blocos com dado real do endpoint.

## UI-03: Gráfico de fluxo 12 meses
Gráfico recharts (entradas vs saídas) a partir de `caixa.fluxo_12m`.
*Testável:* o gráfico aparece com as séries de dado real (não placeholder).

## UI-04: Hero + carimbo + responsividade
Hero com `saldo_atual` em número herói e carimbo "atualizado em DD/MM HH:MM"
(BRT, de `meta.atualizado_em`). Layout mobile-first.
*Testável:* carimbo formatado aparece; página usável em viewport mobile.

## UI-05: Badges e líquido colorido
Bloco Caixa: cards entrou/saiu + 2 badges de atraso (N mensalidades, N jogadores).
Bloco Eventos: líquido em verde (positivo) / vermelho (negativo), rótulo de custo
conforme `custo_origem`.
*Testável:* badges exibem os COUNTs; líquido negativo aparece em vermelho.

## DEPLOY-01: noindex
A página define `metadata.robots = { index: false, follow: false }`.
*Testável:* o HTML servido contém a meta tag `noindex`.

## DEPLOY-02 (parte same-origin): rewrite, sem container novo
Front chama `/api` same-origin via rewrite (Next server). Sem env nova, sem container novo.
*Testável:* nenhuma chamada do navegador vai direto ao backend.
