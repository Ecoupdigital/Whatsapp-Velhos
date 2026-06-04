# Fase 02: Frontend — Portal

**Objetivo:** Entregar a página pública `/transparencia` que consome `/api/portal`
e renderiza os 4 blocos, responsiva, com gráfico de fluxo e noindex.

**Requisitos cobertos:** UI-01, UI-02, UI-03, UI-04, UI-05, DEPLOY-01, DEPLOY-02 (same-origin)

**Critérios de sucesso:**
- [ ] `/transparencia` abre sem login (não redireciona pro `/login`) e renderiza os 4 blocos + footer
- [ ] Gráfico de fluxo 12 meses renderiza com recharts e dado real
- [ ] Hero mostra saldo herói + carimbo "atualizado em DD/MM HH:MM" (BRT); usável em mobile
- [ ] Badges de atraso exibem os COUNTs; líquido em verde/vermelho com rótulo de custo conforme `custo_origem`
- [ ] HTML contém meta tag `noindex`; navegador não fala direto com o backend (same-origin via rewrite)

**Dependências:** Fase 01 (contrato `/api/portal` pronto e estável).
**Estimativa:** 1-2 planos (route group + página + componentes + gráfico).
