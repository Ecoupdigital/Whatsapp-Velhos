---
phase: 02-frontend-portal
plan: 02-006
subsystem: frontend
tags: [portal, jogos, rankings, resultados, framer-motion]
dependency_graph:
  requires: [02-002, 02-001]
  provides: [JogosBloco]
  affects: [transparencia/page.tsx, portal/index.ts]
tech_stack:
  patterns: [framer-motion whileInView, grid-cols-5 stat cards, RankingList sub-component, lucide icons]
key_files:
  created:
    - frontend/src/components/portal/JogosBloco.tsx
  modified:
    - frontend/src/components/portal/index.ts
    - frontend/src/app/(public)/transparencia/page.tsx
decisions:
  - "RankingList como sub-componente interno reutilizado nos 3 rankings"
  - "grid-cols-5 para os 5 stat cards mantido mobile-first (labels curtos V/E/D)"
  - "EmptyState com apenas title nas sub-secoes de listas vazias"
metrics:
  duration: "~15min"
  completed: "2026-06-04"
  tasks: 3
  files: 3
---

# Fase 02 Plano 006: Bloco Em campo (jogos) Summary

Bloco `JogosBloco` implementado com cards V/E/D + gols_pro/gols_contra, 3 rankings top-5 com icone lucide (Goal/Handshake/Star), ultimos resultados com placar e proximos jogos com agenda. Ligado na page de transparencia substituindo o placeholder `[jogos]`.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Arquivos |
|--------|-----------|--------|----------|
| 1 | Criar JogosBloco.tsx com todas as sub-secoes | abae9af | JogosBloco.tsx (criado) |
| 2 | Atualizar barrel index.ts | abae9af | index.ts |
| 3 | Ligar JogosBloco na page.tsx | abae9af | transparencia/page.tsx |

## Verificacao Funcional

- `npx tsc --noEmit`: saida vazia (sem erros)
- `npm run build`: compilado com sucesso, 18/18 paginas geradas
- Rota `/transparencia` aparece no output com 5.53 kB (First Load JS 258 kB incluindo framer-motion/recharts)
- Unico warning pre-existente em `(app)/eventos/[id]/page.tsx` (fora do escopo)

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

- [x] `frontend/src/components/portal/JogosBloco.tsx` existe
- [x] `resumo.vitorias` presente no componente
- [x] `RankingList` presente
- [x] `ultimos_resultados` presente
- [x] `proximos_jogos` presente
- [x] `export { JogosBloco }` no barrel index.ts
- [x] `JogosBloco` importado e usado em transparencia/page.tsx
- [x] Commit abae9af existe
- [x] tsc --noEmit limpo
- [x] npm run build passou
