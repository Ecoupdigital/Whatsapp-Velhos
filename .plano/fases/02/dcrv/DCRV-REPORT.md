# DCRV-REPORT — Fase 02: Portal de Transparencia

**Data:** 2026-06-04
**Scope:** fase-02-frontend-portal
**URL testada:** http://localhost:3010/transparencia
**Viewport mobile:** 390x844 | **Viewport desktop:** 1280x900
**Screenshots:** `.plano/fases/02/captures/mobile-390x844-full.png` e `desktop-1280x900-full.png`

---

## Tabela dos 7 Checks

| # | Check | Status | Evidencia |
|---|-------|--------|-----------|
| 1 | `<meta name="robots" content="noindex...">` presente no `<head>` | **PASS** | `document.querySelector('meta[name=robots]').content` = `"noindex, nofollow"` |
| 2 | URL permanece `/transparencia` (sem redirect para `/login`) | **PASS** | `page.url()` = `http://localhost:3010/transparencia` apos navegacao |
| 3 | Os 4 blocos existem no DOM (hero, caixa, eventos, jogos) | **PASS** | `data-block=hero/caixa/eventos/jogos` confirmados via `querySelectorAll('section')`. Texto "Prestacao de Contas", "Em campo", "Galeto", "atualizado em" presentes em `document.body.innerText` |
| 4 | Grafico de fluxo renderizou `<svg>` dentro de `[data-slot="fluxo"]` | **PASS** | `SVG presente - paths: 24` (Recharts BarChart com 24 paths) |
| 5 | Console sem erros vermelhos | **PASS** | `browser_console_messages(error)` = `[]` em duas coletas |
| 6 | Requests de dados saem por `localhost:3010/api/portal` (same-origin, via rewrite) | **PASS** | Network: `GET http://localhost:3010/api/portal` (x2). Nenhuma request direta a `:8011` |
| 7 | Badges de atraso mostram "3" | **PASS** | `innerText` contem "3 mensalidades em atraso" e "3 jogadores em atraso" |

**Resultado:** 7/7 checks PASS.

---

## Causa Raiz: Blocos Eventos e Em campo invisiveis em screenshot full-page

### Diagnostico confirmado

`EventosBloco.tsx` (linha 28-34) e `JogosBloco.tsx` (linha 86-92) usam `motion.section` com:

```tsx
initial={{ opacity: 0, y: 16 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: "-40px" }}
```

`CaixaBloco.tsx` (linha 19-25) usa o mesmo padrao, porem como esta no topo da pagina (top: 437px, dentro do viewport inicial de 900px) a animacao dispara normalmente.

O Playwright `screenshot({ fullPage: true })` expande o viewport virtualmente para capturar todo o conteudo, mas **nao faz scroll real**. O `IntersectionObserver` do framer-motion observa a posicao relativa ao viewport real (900px de altura). Os blocos em `top: 997px` (Eventos) e `top: 1346px` (Em campo) nunca entram no viewport real, entao `whileInView` nunca dispara e eles permanecem com `opacity: 0` e `transform: matrix(1,0,0,1,0,16)` (translateY 16px).

**Prova do estado computado antes do scroll:**

| Bloco | top (px) | opacity | transform |
|-------|----------|---------|-----------|
| hero | 77 | 1 | none |
| caixa | 437 | 1 | none |
| eventos | 997 | **0** | `matrix(1,0,0,1,0,16)` |
| jogos | 1346 | **0** | `matrix(1,0,0,1,0,16)` |

**Apos simular scroll programatico** (scrollBy ate o fim, depois volta ao topo), todos os 4 blocos ficam com `opacity: 1` e `transform: none`, e os screenshots mostram a pagina completa corretamente.

---

## Achados Visuais

### BLOCKER (afeta visibilidade em producao)

**VIS-01 — whileInView congela blocos fora do viewport em link direto para ancora / social share**
- Severidade: **blocker**
- Componentes: `EventosBloco.tsx:28-34`, `JogosBloco.tsx:86-92`, `CaixaBloco.tsx:19-25`
- Descricao: Qualquer usuario que acesse `/transparencia` e role rapidamente (ou chegue via deeplink com ancora `#eventos`) pode ver os blocos piscarem ou chegarem invisiveis se o browser nao disparar o IntersectionObserver a tempo. O risco e baixo em uso normal, mas e um antipadrao em portais publicos estaticos: a animacao agrega pouco e quebra a captura programatica (bots de OG preview, screenshot-as-a-service, testes).
- Correcao recomendada: substituir `whileInView` por `animate` com `initial` (dispara imediatamente ao montar) ou adicionar `viewport={{ once: true, amount: 0 }}` (dispara com 0% visivelidade). Opcao mais simples: remover a animacao de entrada nesses 3 componentes e manter apenas transicoes de hover/focus.

```tsx
// ANTES (EventosBloco.tsx linha 28-34 / JogosBloco.tsx linha 86-92 / CaixaBloco.tsx linha 19-25)
<motion.section
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-40px" }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>

// DEPOIS — opcao A: anima ao montar (sem dependencia de viewport)
<motion.section
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>

// DEPOIS — opcao B: dispara com 0% de visibilidade (compativel com fullPage screenshot)
<motion.section
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>
```

---

### MINOR (polimento estetico, nao bloqueiam)

**VIS-02 — Contraste txt-tertiary abaixo do ideal em fundo card**
- Severidade: **minor**
- Descricao: `txt-tertiary` = `rgb(92, 92, 106)` sobre `surface-card` = `rgb(20, 20, 26)` resulta em ratio 2.79:1 (abaixo do WCAG AA 4.5:1 para texto normal e abaixo do AA 3:1 para texto grande). Afeta labels "ARRECADOU", "CUSTO", "SOBROU", datas dos jogos e labels do ranking.
- Impacto: legibilidade reduzida em monitores com brilho baixo ou para usuarios com visao reduzida. Nao e ilegivel em uso normal.
- Sugestao: elevar `txt-tertiary` para ~`rgb(115, 115, 130)` (ratio ~3.8:1) ou usar `txt-secondary` nos labels de dados relevantes.

**VIS-03 — Custo do "Baile de Julho" usa txt-secondary em vez de cor neutra**
- Severidade: **minor**
- Descricao: O campo "Custo previsto" do Baile de Julho mostra `R$ 2.000,00` em `rgb(142,142,154)` (txt-secondary), enquanto o Galeto usa o mesmo estilo para "Custo" real. Semanticamente correto, mas visualmente o usuario pode confundir "custo previsto" com dado menos relevante em vez de "ainda nao confirmado".
- Sugestao: adicionar um badge "PREVISTO" em amber ao lado do valor quando `custo_origem === 'estimado'`, similar ao badge "em breve" ja existente para status planejado.

**VIS-04 — Mobile: grid 5 colunas de StatCards (V/E/D/Gols) fica muito apertado em 390px**
- Severidade: **minor**
- Descricao: Os 5 cards de estatistica (V, E, D, Gols Pro, Gols Contra) estao em `grid-cols-5` sem breakpoint mobile. Em 390px cada card tem ~62px de largura, o texto "GOLS CON-TRA" quebra em duas linhas e o label fica ilegivel.
- Sugestao: `grid-cols-5 sm:grid-cols-5` -> manter 5 colunas ja que o texto e curto, mas reduzir o padding de `p-3` para `p-2` em mobile, ou usar `grid-cols-5` com `text-[9px]` em mobile via responsive class.

---

## Consistencia Cross-pagina

O portal usa route group `(public)` com layout proprio (`src/app/(public)/layout.tsx`), isolado do layout autenticado `(app)`. O header do portal tem estilo proprio (sticky, backdrop-blur, `bg-surface-secondary/60`) consistente entre mobile e desktop. Nao ha inconsistencias de header/footer entre os dois viewports.

---

## Verificacao de Dados vs Seed Esperado

| Dado esperado | Encontrado | Status |
|---------------|-----------|--------|
| Saldo em caixa R$ 4.440,00 | R$ 4.440,00 (font-size: 48px, font-bold) | OK |
| 3 mensalidades em atraso | "3 mensalidades em atraso" | OK |
| 3 jogadores em atraso | "3 jogadores em atraso" | OK |
| Grafico 12 meses | SVG com 24 paths (12 pares entrada/saida) | OK |
| Galeto Junho: arrecadou 2800, custo 1500, sobrou +1300 | R$ 2.800,00 / R$ 1.500,00 / R$ 1.300,00 (verde) | OK |
| Baile de Julho: arrecadou 600, custo previsto 2000, liquido -1400 | R$ 600,00 / R$ 2.000,00 / -R$ 1.400,00 (vermelho) | OK |
| Resumo jogos V1/E1/D1, gols 6x5 | 1V / 1E / 1D / 6 Gols Pro / 5 Gols Contra | OK |
| Artilharia: Carlao(3)/Pedrinho(2)/Silver(1) | Carlao 3 / Pedrinho 2 / Silver 1 | OK |
| Proximos: Amigos do Ze 14/06, Real Varzea 28/06 | vs Amigos do Ze 14/06/2026 as 10:00 / vs Real Varzea 28/06/2026 as 09:30 | OK |

---

## Veredito

**APROVADO COM RESSALVA.**

Todos os 7 checks funcionais passam. Os dados de demonstracao estao 100% corretos e visiveis. O design dark e consistente, hierarquia visual clara, grafico Recharts renderizado, same-origin API confirmada.

A ressalva e o **VIS-01**: o uso de `whileInView` em 3 componentes de bloco (`CaixaBloco`, `EventosBloco`, `JogosBloco`) produz blocos invisiveis em qualquer captura programatica sem scroll simulado (bots de preview OG, screenshot-as-a-service, testes E2E com `fullPage: true`). Em uso humano normal o comportamento e correto. A correcao e trivial (trocar `whileInView` por `animate` ou adicionar `amount: 0` no viewport) e deve ser feita antes do deploy para evitar problemas com link previews em WhatsApp/Telegram.

Os demais achados (VIS-02 contraste tertiary, VIS-03 custo previsto, VIS-04 grid mobile) sao minor e podem ser enderedados em iteracao de polimento.

---

## RE-VERIFICACAO POS-FIX

**Data:** 2026-06-04
**Metodo:** Chrome headless CDP (google-chrome 145.0.7632.159), sem scroll manual, viewport montado antes da navegacao
**Screenshots pos-fix:** `mobile-390x844-pos-fix.png` | `desktop-1280x900-pos-fix.png`

### Opacity medido sem scroll (getComputedStyle)

| Bloco | top (px) | BelowFold? | opacity computado | visibility | transform | Resultado |
|-------|----------|-----------|-------------------|-----------|-----------|-----------|
| Eventos | 981 | Sim (viewport=900px) | **1** | visible | none | PASS |
| Em campo | 1332 | Sim (viewport=900px) | **1** | visible | none | PASS |

Ambos os blocos estavam abaixo da dobra (top > 900px do viewport) e mesmo assim retornaram `opacity: 1` e `transform: none` ao montar, confirmando que o fix de `whileInView -> animate` funciona corretamente. O framer-motion agora anima ao montar, independente do scroll.

### Confirmacao visual dos 4 blocos (ambos os viewports)

**Desktop 1280x900 (full-page 1280x2213px):**
- Hero com saldo R$ 4.440,00 e timestamp: VISIVEL
- Caixa com grafico de 12 meses, ENTROU/SAIU, badges de atraso: VISIVEL
- Eventos com Baile de Julho e Galeto Junho (arrecadado/custo/sobrou): VISIVEL
- Em campo com V/E/D, Gols, Artilharia, Assistencias, Destaques, Ultimos resultados, Proximos jogos: VISIVEL

**Mobile 390x844 (full-page 390x2506px):**
- Hero com saldo, escudo, nome do time: VISIVEL
- Caixa com grafico, ENTROU verde / SAIU vermelho, badges: VISIVEL
- Eventos com 2 cards (Baile de Julho e Galeto Junho) com dados corretos: VISIVEL
- Em campo com todos os subgrupos (stats, rankings, resultados, proximos): VISIVEL

### VIS-01 — Blocker

**RESOLVIDO.** Antes do fix: `opacity: 0` nos blocos abaixo da dobra sem scroll. Apos o fix: `opacity: 1` confirmado via `getComputedStyle` sem nenhum scroll programatico. Todos os 4 blocos vistos em ambos os viewports.

### VIS-04 — Minor: StatCards V/E/D/Gols no mobile

**PARCIALMENTE RESOLVIDO.** O fix aplicou `grid-cols-3 sm:grid-cols-5`, redistribuindo os 5 cards em 2 linhas no mobile: V/E/D na linha 1 (3 cols x 111px cada) e Gols Pro/Gols Contra na linha 2 (2 cards em grid de 3 cols). Labels medidos:
- `Gols Pro`: scrollWidth=85px, clientWidth=85px -> sem overflow, PASS
- `Gols Contra`: scrollWidth=85px, clientWidth=85px -> sem overflow, PASS
- Cards com 111px de largura e fontSize=10px: labels nao quebram nem transbordam

O comportamento e aceitavel visualmente (linha de Gols fica com espaco branco no terceiro slot, nao e ideal esteticamente mas nao e ilegivel). O issue original de quebra de label foi resolvido.

### Veredito pos-fix

**BLOCKER VIS-01: RESOLVIDO.**
**VIS-04: RESOLVIDO (sem overflow de label no mobile).**
VIS-02 e VIS-03 permanecem como minors de polimento, sem alteracao.

A pagina `/transparencia` esta pronta para deploy. Todos os blocos renderizam com conteudo visivel em qualquer captura programatica full-page e em uso humano normal.
