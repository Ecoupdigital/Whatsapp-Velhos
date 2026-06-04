---
phase: 02-frontend-portal
reviewed: 2026-06-04T18:40:00Z
stage_1_confidence: 100/100
stage_1_decision: PASS
stage_2_quality_score: 9/10
stage_2_security_score: 9/10
issues_critical: 0
issues_important: 0
issues_minor: 3
verdict: APPROVED
---

# Review Two-Stage - Fase 02: Frontend Portal /transparencia

## Stage 1: Spec-Compliance (Confidence 100/100)
**Metodo:** validacao cega ao codigo. Lidos apenas REQUIREMENTS-SLICE, PHASE, DCRV-REPORT,
VERIFICATION e as capturas visuais pos-fix. Evidencia ui:visual fresca (capturas pos-fix
mobile/desktop) inspecionada diretamente + DCRV 7/7 checks PASS + RE-VERIFICACAO POS-FIX.

| REQ-ID | Requisito | Status | Evidencia |
|--------|-----------|--------|-----------|
| UI-01 | Route group `(public)` sem guard; `/transparencia` sem token nao redireciona | PASS | DCRV check 2: `page.url()` permanece `/transparencia`. Guardrail: `(public)` isolado de `(app)` |
| UI-02 | Pagina com 4 blocos + footer, dado real do endpoint | PASS | Capturas pos-fix mobile/desktop: Hero, Caixa, Eventos, Em campo + footer visiveis com dados do seed |
| UI-03 | Grafico recharts entradas vs saidas de `fluxo_12m` | PASS | DCRV check 4: SVG 24 paths; eixos visiveis na captura mobile (3k/2k/850 + meses) |
| UI-04 | Hero saldo heroi + carimbo BRT + mobile-first | PASS | R$ 4.440,00 em numero heroi + "atualizado em 04/06 as 12:15"; mobile 390px usavel |
| UI-05 | Badges de atraso (COUNTs) + liquido colorido + rotulo de custo | PASS | "3 mensalidades / 3 jogadores em atraso"; +R$ 1.300 verde, -R$ 1.400 vermelho; rotulo "Custo previsto" para estimado |
| DEPLOY-01 | `metadata.robots = {index:false, follow:false}`; HTML com noindex | PASS | DCRV check 1 runtime = "noindex, nofollow" + build estatico |
| DEPLOY-02 | Same-origin via rewrite, sem env/container novo | PASS | DCRV check 6: requests a `localhost:3010/api/portal`, nenhuma direta ao backend; diff sem env/docker/config novo |

**Confidence = 7 / (7 + 0 + 0) * 100 = 100/100, zero FAIL.** -> STAGE_1_PASS, prossegue para Stage 2.

### Faltantes / Extra (YAGNI) / Mal-entendidos
- Nenhum requisito faltante. Os 7 REQs da fase tem evidencia direta.
- Extra (nao-YAGNI, suporte a prova): `frontend/scripts/prova-visual-portal.md` e `seed-portal-dev.sh`.
  Scripts de dev/prova, fora do bundle de producao. Aceitavel.
- Nenhum mal-entendido. Dados do seed conferem 1:1 com o esperado (DCRV "Verificacao de Dados vs Seed").

## Stage 2: Code-Quality + Seguranca

**Quality:** 9/10 | **Security:** 9/10

Arquivos lidos (diff main..HEAD, frontend/src): `(public)/layout.tsx`,
`(public)/transparencia/page.tsx`, `components/portal/{HeroCaixa,CaixaBloco,FluxoChart,EventosBloco,JogosBloco,index}`,
`lib/portal.ts`, `types/portal.ts`. Guardrail confirmado: zero arquivos `(app)/` tocados.

### Eixo A - Code Quality
- DRY: helpers compartilhados (`formatCurrency`, `formatDate`, `corLiquido`, `ROTULO_CUSTO`), zero duplicacao relevante.
- Types: tudo tipado por `types/portal.ts` espelhando o contrato `/api/portal`; zero `any`.
- Funcoes < 50 linhas, single responsibility (StatCard, RankingList, CustomTooltip extraidos).
- Error handling: `page.tsx` try/catch + mensagem especifica + botao "Tentar de novo" (retry real); `fetchPortal` lanca erro com status HTTP.
- Edge cases cobertos: payload vazio (`FluxoChart` length 0 -> EmptyState), listas vazias (eventos/resultados/proximos/rankings), valores negativos (`corLiquido`, `saldoNegativo`), data null ("sem data"), horario/local null (render condicional), `labelMes` com fallback, `formatAtualizadoEm` valida `isNaN`.

### Eixo B - Production Requirements
- Loading (SkeletonCard x4), error state com retry, empty states reais (EmptyState), noindex, alt text nas imagens, transicoes suaves (framer-motion `animate` ao mount). OK.

### Eixo C - Seguranca (OWASP)
- AUTHN/AUTHZ: pagina publica por design. Nao chama endpoint autenticado, nao usa `apiFetch` (sem interceptor 401/redirect), sem header Authorization. Correto.
- INJ/XSS: zero `dangerouslySetInnerHTML`/`innerHTML`/`eval` (grep). React escapa todo o conteudo. `style={{color}}` recebe cor do dataset Recharts, nao input de usuario.
- DATA: zero secret/token/env exposto no client (grep). Comentarios em `portal.ts` confirmam ausencia deliberada de Authorization. `/api/portal` same-origin via rewrite; DCRV: nenhuma chamada direta ao backend, nenhum token vaza.
- API: same-origin, sem CORS novo, sem container novo (DEPLOY-02).

### Issues Menores (debito nao-bloqueante)

### RV-001: Contraste txt-tertiary parcial (VIS-02)
**Arquivo:** tokens de cor / labels em `CaixaBloco`, `EventosBloco`, `JogosBloco`
**Eixo:** Quality (a11y)
**Problema:** `txt-tertiary` rgb(92,92,106) sobre `surface-card` rgb(20,20,26) = ratio 2.79:1, abaixo de WCAG AA. Afeta labels secundarios (datas, "ARRECADOU", ranking).
**Fix sugerido:** elevar `txt-tertiary` para ~rgb(115,115,130) (~3.8:1) ou usar `txt-secondary` nos labels de dado relevante. Iteracao de polimento.

### RV-002: Custo previsto sem badge semantico (VIS-03)
**Arquivo:** `src/components/portal/EventosBloco.tsx:81-95`
**Eixo:** Quality (UX)
**Problema:** "Custo previsto" (estimado) usa italico + asterisco amber discreto; usuario pode confundir com dado menos relevante.
**Fix sugerido:** badge "PREVISTO" amber ao lado do valor quando `custo_origem === 'estimado'`, similar ao badge "em breve". Ja ha label correto ("Custo previsto") e rotulo via `ROTULO_CUSTO` - so polimento visual.

### RV-003: Vulnerabilidades transitivas de deps (npm audit)
**Arquivo:** `frontend/package-lock.json` (Next.js 14.2.35 + PostCSS transitivo)
**Eixo:** Security (DEPS) - severidade MEDIUM, nao-bloqueante
**Problema:** `npm audit --omit=dev` lista 1 high (Next.js, varios advisories de DoS/cache-poison/XSS-CSP-nonce) + 1 moderate (PostCSS). Pre-existentes ao escopo da fase; o diff nao adiciona dependencia nova (sem mudanca em package.json). Mitigadas pelo fato de `/transparencia` ser pagina estatica (Static, sem Image Optimizer, sem RSC dinamico nessa rota, sem middleware).
**Fix sugerido:** upgrade do Next.js no projeto inteiro (manutencao geral, fora desta fase). `npm audit fix --force` instala next@16 (breaking) - tratar em fase de manutencao dedicada, nao bloqueia o deploy do portal.

## Veredito
**APPROVED.** Stage 1 com Confidence 100/100 e zero FAIL, validado por evidencia ui:visual
fresca (capturas pos-fix mobile/desktop inspecionadas + DCRV 7/7 PASS + RE-VERIFICACAO
POS-FIX com blocker VIS-01 resolvido). Stage 2 sem issue critica ou importante: codigo limpo,
tipado, com estados loading/erro/vazio em toda parte async, edge cases cobertos, wiring
correto (fetch publico same-origin sem redirect 401, route group fora do guard, noindex no
lugar certo) e seguranca sem vazamento (nenhum endpoint autenticado, nenhum token exposto).
Os tres minors (VIS-02 contraste, VIS-03 badge previsto, deps transitivas) ficam como debito
de polimento/manutencao, nao bloqueiam.
