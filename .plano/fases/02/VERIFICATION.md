---
phase: 02-frontend-portal
verified: 2026-06-04T18:20:00Z
status: passed
score: 7/7 must-haves verificados
code_type: ui
evidence:
  - "ui:visual"
gaps: []
---

# Fase 02: Frontend Portal /transparencia - Relatorio de Verificacao

**Objetivo da Fase:** rota publica `/transparencia` (sem login) com 4 blocos (Hero/Caixa, Eventos, Em campo), grafico de fluxo recharts, noindex, mobile-first.
**Verificado:** 2026-06-04T18:20:00Z
**Status:** passed
**Tipo de codigo:** ui (frontend: componentes React + rota Next.js). Evidencia exigida: prova visual antes/depois -> produzida pelo up-tester (DCRV) com capturas pos-fix.

---

## Alcance do Objetivo

### Verdades Observaveis

| # | Verdade | Status | Evidencia |
|---|---------|--------|-----------|
| 1 | `/transparencia` acessivel sem token, sem redirect pro `/login` | VERIFIED | route group `(public)` sem guard; DCRV check 2: `page.url()` permanece `/transparencia`. `layout.tsx` sem useAuth/router.replace; `portal.ts` nao usa apiFetch |
| 2 | Pagina renderiza os 4 blocos com dado real (Hero, Caixa, Eventos, Em campo) | VERIFIED | `page.tsx` monta `<HeroCaixa>/<CaixaBloco>/<EventosBloco>/<JogosBloco>` via barrel; DCRV check 3 + capturas pos-fix mobile/desktop mostram os 4 blocos visiveis com dados do seed |
| 3 | Grafico de fluxo 12 meses (recharts, entradas vs saidas) | VERIFIED | `FluxoChart.tsx` BarChart recharts a partir de `caixa.fluxo_12m`; DCRV check 4: `<svg>` com 24 paths em `[data-slot="fluxo"]`; eixos visiveis na captura mobile pos-fix |
| 4 | Hero com saldo heroi + carimbo "atualizado em DD/MM HH:MM" BRT, mobile-first | VERIFIED | `HeroCaixa.tsx` saldo `text-4xl sm:text-5xl` + `formatAtualizadoEm`; captura: R$ 4.440,00 + "atualizado em 04/06 as 12:15"; layout `max-w-2xl px-4` |
| 5 | Badges de atraso (COUNTs) + liquido colorido por sinal + rotulo de custo | VERIFIED | `CaixaBloco` badges "3 mensalidades/3 jogadores em atraso"; `EventosBloco` liquido verde (+1.300) / vermelho (-1.400) via `corLiquido`; `ROTULO_CUSTO` 3 valores. DCRV check 7 + capturas |
| 6 | noindex servido no `<head>` | VERIFIED | `layout.tsx` `robots: { index: false, follow: false }`; DCRV check 1 runtime = `"noindex, nofollow"`; build estatico `.next/server/app/transparencia.html` contem `noindex, nofollow` |
| 7 | Same-origin: navegador chama `/api` via rewrite, sem container/CORS novo | VERIFIED | `portal.ts` faz `fetch("/api/portal")` relativo; DCRV check 6: requests vao a `localhost:3010/api/portal`, nenhuma direta ao backend; sem env nova |

**Score:** 7/7 verdades verificadas

### Artefatos Requeridos

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `src/app/(public)/layout.tsx` | server component noindex, header limpo, sem guard | VERIFIED | metadata.robots noindex; sem Sidebar/useAuth/redirect |
| `src/app/(public)/transparencia/page.tsx` | montagem 4 blocos + 3 estados | VERIFIED | loading/erro/ready; barrel import; sem apiFetch |
| `src/components/portal/HeroCaixa.tsx` | hero + saldo + carimbo | VERIFIED | animate ao mount (sem whileInView) |
| `src/components/portal/CaixaBloco.tsx` | cards entrou/saiu + badges + slot fluxo | VERIFIED | animate ao mount; data-slot=fluxo |
| `src/components/portal/FluxoChart.tsx` | recharts BarChart 12m | VERIFIED | entradas emerald / saidas brand-red; estado vazio tratado |
| `src/components/portal/EventosBloco.tsx` | card por evento + liquido colorido + rotulo custo | VERIFIED | corLiquido + ROTULO_CUSTO 3 valores |
| `src/components/portal/JogosBloco.tsx` | stats V/E/D + gols + 3 rankings + resultados + proximos | VERIFIED | grid-cols-3 sm:grid-cols-5 (fix VIS-04) |
| `src/lib/portal.ts` | fetch publico sem interceptor 401 + formatador BRT | VERIFIED | fetch nativo relativo; formatAtualizadoEm Intl BRT |
| `src/types/portal.ts` | tipos espelhando contrato /api/portal | VERIFIED | PortalResponse + subtipos |

### Verificacao de Links Chave (Wiring)

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| page.tsx | componentes portal | barrel `@/components/portal` | WIRED | 4 blocos importados e renderizados no estado ready |
| page.tsx | /api/portal | `fetchPortal()` (lib/portal.ts) | WIRED | useEffect->carregar->fetchPortal; sem apiFetch |
| portal.ts | backend | `fetch("/api/portal")` same-origin | WIRED | rewrite Next; DCRV confirmou nenhuma chamada direta ao backend |
| CaixaBloco | FluxoChart | `<FluxoChart fluxo={caixa.fluxo_12m} />` | WIRED | slot data-slot=fluxo; SVG 24 paths |
| layout.tsx | head | `metadata.robots` | WIRED | noindex no transparencia.html buildado |

### Cobertura de Requisitos (REQ -> Evidencia)

| Requisito | Descricao | Status | Evidencia |
|-----------|-----------|--------|-----------|
| UI-01 | Route group publico sem guard; `/transparencia` sem token nao redireciona | SATISFIED | `(public)/layout.tsx` sem auth; DCRV check 2 (URL permanece); portal.ts sem apiFetch |
| UI-02 | Pagina com 4 blocos + footer, dado real do endpoint | SATISFIED | page.tsx monta Hero/Caixa/Eventos/Jogos + footer; DCRV check 3 + capturas |
| UI-03 | Grafico recharts entradas vs saidas de `fluxo_12m` | SATISFIED | FluxoChart.tsx; DCRV check 4 (SVG 24 paths) |
| UI-04 | Hero saldo heroi + carimbo BRT + mobile-first | SATISFIED | HeroCaixa.tsx + formatAtualizadoEm; captura R$ 4.440,00 / "04/06 as 12:15"; mobile 390px usavel |
| UI-05 | Badges de atraso (COUNTs) + liquido colorido + rotulo custo | SATISFIED | CaixaBloco badges; EventosBloco corLiquido + ROTULO_CUSTO; DCRV check 7 |
| DEPLOY-01 | `metadata.robots = { index:false, follow:false }`; HTML com noindex | SATISFIED | layout.tsx; DCRV check 1 runtime; build transparencia.html contem "noindex, nofollow" |
| DEPLOY-02 | Same-origin via rewrite, sem env/container novo, sem mudanca CORS | SATISFIED | fetch relativo /api/portal; DCRV check 6; git diff sem env/config novo |

Nenhum requisito orfao. Os 7 REQs da fase (UI-01..05, DEPLOY-01, DEPLOY-02) tem evidencia direta.

### Build / TSC (saida real)

**`npx tsc --noEmit`** -> exit 0, sem nenhuma saida (zero erros de tipo).

**`npm run build`** -> exit 0:
```
> next build
  ▲ Next.js 14.2.35
 ✓ Compiled successfully
   Linting and checking validity of types ...
./src/app/(app)/eventos/[id]/page.tsx
488:5  Warning: React Hook useCallback has an unnecessary dependency: 'evento'. (react-hooks/exhaustive-deps)
 ✓ Generating static pages (18/18)

Route (app)                              Size     First Load JS
...
└ ○ /transparencia                       5.55 kB         258 kB
○  (Static)   prerendered as static content
```
`/transparencia` compila como pagina estatica (○ Static), 5.55 kB. O unico warning e PRE-EXISTENTE em `(app)/eventos/[id]/page.tsx:488`, fora do escopo da fase (nenhum arquivo `(app)` foi tocado).

### Anti-Padroes Encontrados

| Arquivo | Linha | Padrao | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| (nenhum) | - | - | - | Nenhum placeholder `[hero]/[caixa]/...`, TODO, FIXME ou return vazio nos componentes do portal. Estados vazios sao tratados com EmptyState real |

**VIS-01 (blocker) RESOLVIDO:** os 3 componentes (`CaixaBloco`, `EventosBloco`, `JogosBloco`) trocaram `whileInView` por `animate` ao mount. Confirmado: `grep whileInView frontend/src/components/portal/` retorna vazio. DCRV re-verificacao pos-fix mediu `opacity: 1` nos blocos abaixo da dobra sem scroll.

### Prova Visual (tipo ui)

Evidencia produzida pelo up-tester (DCRV-REPORT.md), confirmada por este verificador:
- 7/7 checks funcionais PASS (noindex, no-redirect, 4 blocos no DOM, grafico SVG 24 paths, console sem erro, same-origin, badges).
- Secao RE-VERIFICACAO POS-FIX presente: blocker VIS-01 RESOLVIDO (opacity=1 confirmado via getComputedStyle sem scroll); VIS-04 resolvido (sem overflow de label mobile).
- Capturas pos-fix existem e foram inspecionadas:
  - `.plano/fases/02/captures/mobile-390x844-pos-fix.png` (313842 bytes) - 4 blocos + grafico com eixos + StatCards grid-cols-3 sem quebra.
  - `.plano/fases/02/captures/desktop-1280x900-pos-fix.png` (131626 bytes) - 4 blocos com dados do seed corretos.

**evidence=ui:visual** (par de capturas pos-fix + DCRV report com diff antes/depois do blocker VIS-01).

### Guardrail: nenhum arquivo `(app)` alterado

`git diff main..HEAD` sobre `frontend/src/` lista APENAS arquivos novos do portal:
```
(public)/layout.tsx
(public)/transparencia/page.tsx
components/portal/{HeroCaixa,CaixaBloco,FluxoChart,EventosBloco,JogosBloco,index}.{tsx,ts}
lib/portal.ts
types/portal.ts
```
`git diff main..HEAD --name-only | grep '(app)/'` -> VAZIO. Nenhum arquivo do app autenticado foi modificado. Guardrail CONFIRMADO.

### Verificacao Humana Necessaria

Nenhuma bloqueante. A prova visual ja foi executada (DCRV). Observacao nao-bloqueante: na captura desktop full-page o grafico recharts aparece sem barras visiveis (artefato conhecido de ResponsiveContainer em screenshot full-page de Recharts), porem o render real foi confirmado programaticamente (SVG 24 paths via DOM no DCRV) e visivelmente na captura mobile (eixos 3k/2k/850 + meses). Recomenda-se confirmacao visual rapida do grafico em browser desktop real no deploy, sem bloquear a fase.

### Resumo de Gaps

Nenhum gap. Os 7 requisitos da fase (UI-01..05, DEPLOY-01, DEPLOY-02) estao satisfeitos com evidencia tripla quando aplicavel (source + runtime DCRV + build output). Build estatico compila com `/transparencia` como pagina Static, tsc limpo, blocker VIS-01 resolvido e confirmado, guardrail intacto (zero arquivos `(app)` tocados). A evidencia do tipo ui (capturas antes/depois + DCRV) existe e confere.
