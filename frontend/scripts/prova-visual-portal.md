# Prova visual do Portal (/transparencia)

## Pre-requisitos
1. Fase 01 de pe: backend respondendo `/api/portal` (rodar `bash frontend/scripts/seed-portal-dev.sh`).
2. Frontend em dev apontando pro backend:
   ```bash
   cd frontend && BACKEND_URL=http://localhost:8000 npm run dev
   ```
   (o rewrite de next.config.mjs leva `/api` -> BACKEND_URL, same-origin)
3. Rota: http://localhost:3000/transparencia

## Pontos a verificar (Playwright)
- [ ] A rota NAO redireciona pro /login (URL final continua /transparencia). -> UI-01
- [ ] Os 4 blocos aparecem: `[data-block="hero"]`, `[data-block="caixa"]`,
      `[data-block="eventos"]`, `[data-block="jogos"]` presentes no DOM. -> UI-02
- [ ] Dentro de caixa, `[data-slot="fluxo"]` contem um `<svg>` do recharts (grafico real),
      OU o estado vazio "Sem movimentacao". -> UI-03
- [ ] O Hero mostra o texto "atualizado em" + um padrao DD/MM as HH:MM. -> UI-04
- [ ] Badges de atraso presentes (texto "em atraso" ou "Sem atrasos no mes"). -> UI-05
- [ ] `<head>` contem `<meta name="robots" content="noindex,nofollow">` (ou index:false). -> DEPLOY-01
- [ ] Todas as requests de rede vao pro mesmo host (localhost:3000), nenhuma direto ao backend. -> DEPLOY-02

## Screenshots
- Mobile: viewport 390x844 (iPhone 12), screenshot full-page -> prova-portal-mobile.png
- Desktop: viewport 1280x900, screenshot full-page -> prova-portal-desktop.png

## Snippet Playwright (referencia pra a fase de build)
```js
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const [name, opts] of [
    ['mobile', devices['iPhone 12']],
    ['desktop', { viewport: { width: 1280, height: 900 } }],
  ]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const reqs = [];
    page.on('request', r => reqs.push(new URL(r.url()).host));
    await page.goto('http://localhost:3000/transparencia', { waitUntil: 'networkidle' });
    // nao redirecionou:
    if (!page.url().endsWith('/transparencia')) throw new Error('redirecionou: ' + page.url());
    // 4 blocos:
    for (const b of ['hero','caixa','eventos','jogos'])
      await page.locator(`[data-block="${b}"]`).first().waitFor({ state: 'attached' });
    // noindex:
    const robots = await page.locator('head meta[name="robots"]').getAttribute('content');
    if (!robots || !/noindex/i.test(robots)) throw new Error('sem noindex: ' + robots);
    // same-origin (todas as requests no host localhost:3000):
    const externos = [...new Set(reqs)].filter(h => h && h !== 'localhost:3000');
    if (externos.length) throw new Error('request fora do same-origin: ' + externos.join(','));
    await page.screenshot({ path: `prova-portal-${name}.png`, fullPage: true });
    console.log(name, 'OK');
    await ctx.close();
  }
  await browser.close();
})();
```
