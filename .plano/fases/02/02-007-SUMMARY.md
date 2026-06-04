---
phase: 02-frontend-portal
plan: 02-007
subsystem: frontend
tags: [portal, assembly, polish, noindex, tsc, playwright]
dependency_graph:
  requires: [02-003, 02-004, 02-005, 02-006]
  provides: [pagina-transparencia-final, roteiro-playwright, gate-backend]
  affects: [frontend/src/app/(public)/transparencia/page.tsx]
tech_stack:
  added: []
  patterns: [client-component-3-estados, barrel-import, mobile-first, data-block-attributes]
key_files:
  created:
    - frontend/scripts/seed-portal-dev.sh
    - frontend/scripts/prova-visual-portal.md
  verified:
    - frontend/src/app/(public)/transparencia/page.tsx
    - frontend/src/app/(public)/layout.tsx
decisions:
  - "page.tsx ja estava montada com 4 blocos reais desde o commit 7de022b (plano 003); nenhuma alteracao necessaria na tarefa 1"
  - "prova visual (Playwright + screenshots) delegada ao up-tester (DCRV) conforme instrucao do orquestrador"
metrics:
  duration_mins: 15
  completed_at: 2026-06-04T14:47:48Z
  tasks_completed: 4
  tasks_total: 4
  files_created: 2
  files_verified: 2
---

# Fase 02 Plano 007: Montagem final + estados + prova visual - Summary

Assembly e polish do Portal de Transparencia: confirmacao que page.tsx monta os 4 blocos reais via barrel, noindex no layout, tsc --noEmit limpo, script de gate do backend e roteiro Playwright para o up-tester (DCRV).

## Tarefas Executadas

| Tarefa | Descricao | Status | Commit |
|--------|-----------|--------|--------|
| 1 | Confirmacao montagem 4 blocos (page.tsx) | Confirmado - ja implementado | 7de022b (plano 003) |
| 2 | Script seed-portal-dev.sh (gate backend) | Criado e verificado | 5b274ec |
| 3 | Roteiro prova-visual-portal.md (Playwright) | Criado e verificado | 29491dd |
| 4 | Gate build estatico (tsc --noEmit) | Passou limpo | verificacao inline |
| 5 | Checkpoint visual Playwright | Delegado ao up-tester (DCRV) | - |

## Estado da Montagem Final

### page.tsx - 4 blocos confirmados

O arquivo `/frontend/src/app/(public)/transparencia/page.tsx` ja estava com a montagem final desde o commit `7de022b` do plano 003. Confirmado:

- Importacao do barrel: `import { HeroCaixa, CaixaBloco, EventosBloco, JogosBloco } from "@/components/portal"`
- Estado loading: 4 SkeletonCards com `data-state="loading"`
- Estado erro: mensagem + botao "Tentar de novo" com `data-state="error"`
- Estado sucesso: 4 blocos na ordem Hero -> Caixa -> Eventos -> Jogos + footer, com `data-state="ready"`
- Footer discreto: `"Velhos Parceiros F.C. - prestacao de contas em tempo real"`
- Nenhum placeholder `[hero]`/`[caixa]`/`[eventos]`/`[jogos]` presente

### layout.tsx - noindex confirmado

```typescript
robots: { index: false, follow: false }
```

Next.js traduz para `<meta name="robots" content="noindex,nofollow">` no `<head>`.

### Tokens de design - consistentes entre blocos

Todos os tokens usados pelos 4 blocos existem no `tailwind.config.ts`:

- `txt-tertiary` (#5C5C6A), `txt-secondary` (#8E8E9A), `txt-primary` (#F5F5F7)
- `brand-red` (#E31E24), `brand-red-muted`, `brand-red-hover`
- `surface-card` (#14141A), `surface-tertiary` (#1A1A1F), `surface-elevated` (#222228)
- `border-subtle` (#1F1F27), `border` (#2A2A35)
- `shadow-card`, `shadow-brand`
- `font-display` (Oswald), `font-body` (DM Sans)

### Espacamentos mobile-first - consistentes

- Page: `space-y-8` entre blocos (gap 32px)
- Cada bloco usa `space-y-4` internamente (gap 16px)
- Footer com `pt-6` (padding-top 24px)
- Layout: `max-w-2xl px-4 pb-16 pt-4` (centrado, padding lateral 16px)

### Estados vazios por bloco

| Bloco | Estado vazio |
|-------|-------------|
| HeroCaixa | N/A (sempre tem meta e caixa da API) |
| CaixaBloco/FluxoChart | "Sem movimentacao nos ultimos meses" (h-40, centralizado) |
| EventosBloco | EmptyState com CalendarRange icon + "Nenhum evento ainda" |
| JogosBloco - ultimos_resultados | EmptyState "Sem jogos registrados" |
| JogosBloco - proximos_jogos | EmptyState "Sem jogos agendados" |
| JogosBloco - rankings | "sem registros" (inline) |

### data-block e data-slot para Playwright

- `[data-block="hero"]` - em HeroCaixa.tsx (motion.section)
- `[data-block="caixa"]` - em CaixaBloco.tsx (motion.section)
- `[data-slot="fluxo"]` - dentro de CaixaBloco, envolve FluxoChart
- `[data-block="eventos"]` - em EventosBloco.tsx (motion.section)
- `[data-block="jogos"]` - em JogosBloco.tsx (motion.section)

## Gate Build Estatico

```
cd frontend && npx tsc --noEmit
# Saida: (nenhuma - zero erros)
# Confirmado: OK: tsc --noEmit limpo em todo o frontend (portal integrado)
```

Nenhum erro de tipo ou import. Nenhuma lib nova adicionada.

## Artefatos Criados

### frontend/scripts/seed-portal-dev.sh

Script de gate que verifica se o backend da Fase 01 esta respondendo antes da prova visual:
- Checa `GET /api/portal` retorna HTTP 200 sem token
- Sinaliza (sem falhar) se eventos ou fluxo_12m estao vazios
- `chmod +x` aplicado; `bash -n` passa limpo

Uso: `BACKEND_URL=http://localhost:8000 bash frontend/scripts/seed-portal-dev.sh`

### frontend/scripts/prova-visual-portal.md

Roteiro reproduzivel para o up-tester (DCRV) executar a prova visual com Playwright:
- Pre-requisitos (backend + frontend dev + BACKEND_URL)
- 7 pontos de verificacao mapeados a UI-01..05 e DEPLOY-01/02
- Screenshots mobile 390x844 (iPhone 12) e desktop 1280x900
- Snippet Playwright completo como referencia de implementacao

## Prova Visual Playwright - A CARGO DO UP-TESTER (DCRV)

A verificacao visual com Playwright NAO foi executada neste plano. Conforme instrucao do orquestrador, ela sera realizada pelo up-tester (DCRV) em sessao separada.

### Pontos a verificar pelo up-tester

1. **4 blocos renderizam mobile + desktop:** `[data-block="hero"]`, `[data-block="caixa"]`, `[data-block="eventos"]`, `[data-block="jogos"]` presentes no DOM em viewport 390x844 e 1280x900.
2. **Grafico aparece:** `[data-slot="fluxo"]` contem `<svg>` do recharts OU estado vazio "Sem movimentacao".
3. **noindex no head:** `<meta name="robots">` com `content` contendo "noindex".
4. **Same-origin:** todas as requests de rede vao para `localhost:3000`, nenhuma direto ao backend.
5. **Sem redirect para /login:** URL final continua `/transparencia`.
6. **Texto "atualizado em"** presente no Hero com padrao DD/MM as HH:MM.
7. **Badges de atraso** presentes ("em atraso" ou "Sem atrasos no mes").

O roteiro completo e o snippet Playwright estao em `frontend/scripts/prova-visual-portal.md`.

## Desvios do Plano

Nenhum - plano executado exatamente como escrito. A tarefa 1 (montagem dos 4 blocos) ja estava implementada desde o plano 003 (commit 7de022b), o que e o comportamento esperado dado que depends_on inclui 02-003.

## Self-Check

Arquivos criados existem:
- [x] `frontend/scripts/seed-portal-dev.sh` - ENCONTRADO
- [x] `frontend/scripts/prova-visual-portal.md` - ENCONTRADO

Commits existem:
- [x] 5b274ec - ENCONTRADO (chore(02-007): script de gate seed-portal-dev.sh)
- [x] 29491dd - ENCONTRADO (docs(02-007): roteiro prova visual portal (Playwright))

Verificacoes passaram:
- [x] tsc --noEmit - LIMPO (zero erros)
- [x] bash -n seed-portal-dev.sh - SINTAXE OK
- [x] grep data-block/noindex/same-origin/iPhone 12 no roteiro - OK
- [x] 4 blocos na page.tsx + import do barrel - CONFIRMADO
- [x] robots noindex no layout.tsx - CONFIRMADO

## Self-Check: PASSOU

---

## Correcoes DCRV (2026-06-04 - pos-prova visual)

Aplicadas apos o DCRV-REPORT da prova visual. Commit: ver `fix(02): VIS-01...` no git log.

### VIS-01 (BLOCKER) - Animacao no mount substituindo whileInView

**Problema:** `CaixaBloco.tsx`, `EventosBloco.tsx` e `JogosBloco.tsx` usavam `whileInView` com `viewport={{ once: true, margin: "-40px" }}`. Blocos abaixo da dobra (top: 997px e 1346px) ficavam com `opacity: 0` em capturas fullPage sem scroll simulado (bots OG, screenshot-as-a-service, testes E2E Playwright).

**Correcao:** Em todos os 3 arquivos, trocado `whileInView={{ opacity: 1, y: 0 }}` por `animate={{ opacity: 1, y: 0 }}` e removida a prop `viewport`. O `initial` e o `transition` foram mantidos. Mesmo padrao ja usado no `HeroCaixa.tsx` (referencia).

**Arquivos:** `CaixaBloco.tsx:22`, `EventosBloco.tsx:31`, `JogosBloco.tsx:89`

### VIS-04 (minor, responsivo) - Grid StatCards mobile

**Problema:** Grid `grid-cols-5` fixo em 390px resultava em cards de ~62px, o label "Gols Contra" quebrava em duas linhas.

**Correcao:** Alterado para `grid-cols-3 sm:grid-cols-5`. Em mobile os 3 primeiros cards (V/E/D) ficam na primeira linha e os 2 de gols na segunda. Labels normalizados para "Gols Pro" / "Gols Contra" (Title Case). Em `>= 640px` volta a exibir todos os 5 em linha.

**Arquivo:** `JogosBloco.tsx:98`

### VIS-02 (minor, a11y) - Contraste txt-tertiary em labels informativos

**Problema:** `txt-tertiary` (#5C5C6A) sobre `surface-card` (#14141A) = ratio 2.79:1, abaixo do WCAG AA 3:1. Afetava labels de dados (Arrecadou, Custo, Sobrou, StatCard labels, "Saldo em caixa").

**Correcao:** Labels informativos relevantes elevados de `text-txt-tertiary` para `text-txt-secondary` (#8E8E9A, ratio ~3.8:1) nos seguintes locais:
- `EventosBloco.tsx` labels da grid financeira (Arrecadou, Custo previsto, Sobrou)
- `JogosBloco.tsx` label dos StatCard (V/E/D/Gols)
- `HeroCaixa.tsx` label "Saldo em caixa"

Textos de metadata menos prioritaria (`atualizado em`, datas de jogos) mantidos em `txt-tertiary` intencionalmente.

### VIS-03 (minor) - Custo estimado/a confirmar visualmente diferenciado

**Problema:** Custo previsto e custo "a confirmar" usavam mesmo estilo do custo real, potencialmente confundindo o leitor.

**Correcao:** Quando `ev.custo_origem !== "real"`, o valor do custo recebe `italic text-txt-tertiary` (em vez de `text-txt-secondary`) mais um asterisco em `text-amber-500` (`*`). O label ja diferenciava o texto ("Custo previsto" / "A confirmar") via `ROTULO_CUSTO`.

**Arquivo:** `EventosBloco.tsx:84-91`

### Build pos-correcoes

```
npx tsc --noEmit  ->  (sem output, zero erros)
npm run build     ->  Compiled successfully, 18 paginas estaticas
```

O warning `useCallback unnecessary dependency` em `(app)/eventos/[id]/page.tsx:488` e pre-existente e fora do escopo desta correcao.
