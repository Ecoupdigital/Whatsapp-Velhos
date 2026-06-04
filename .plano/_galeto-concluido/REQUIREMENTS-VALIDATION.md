---
validated: 2026-06-01
score: 92
grade: EXCELLENT
checks_passed: 12/13
blocking: nao
feature: Eventos Galeto - Faixas multiplas + Cru/Assado (brownfield, v1)
---

# Validacao de Requisitos: Eventos Galeto

> Spec de feature **brownfield** dentro de um app ja em producao (Velhos Parceiros F.C, FastAPI + Next.js). Os 13 checks foram aplicados com lente de feature: checks pensados para "app novo do zero" (auth completa, setup/deploy, responsividade generica) sao avaliados pela relevancia ao escopo desta feature, nao por contagem absoluta. O criterio dominante aqui e: cada REQ e especifico, testavel, mapeado a fase e fiel ao BRIEFING/SYSTEM-DESIGN.

## Resultado

**Score: 92% (12/13) - EXCELLENT. Build LIBERADO.**

29 requisitos, 5 categorias (DB/MIG/API/UI/TEST), 100% mapeados na tabela de rastreabilidade, IDs unicos e sequenciais. Cobertura fiel ao briefing e ao system-design, com criterios de aceite testaveis. Uma unica lacuna menor (nao bloqueante) detalhada abaixo.

## Tabela de Checks

| # | Check | Resultado | Nota |
|---|-------|-----------|------|
| 1 | Secoes obrigatorias (prefixos, rastreabilidade, >=3 categorias) | PASSOU | 5 categorias com prefixo (DB/MIG/API/UI/TEST), tabela de rastreabilidade presente. |
| 2 | Testaveis (sem vaguidao) | PASSOU | Sem "rapido/bom/amigavel" solto. Cada REQ aponta tabela, endpoint, helper ou regra concreta. |
| 3 | Metricas SMART | PASSOU (contextual) | Feature interna sem SLA de perf. Os "numeros" criticos sao invariantes de dados, todos quantificados: `sum(faixas.quantidade)==recebidos`, `sum(qtd_vendido)==qtd_vendidos`, `quantidade>=1`, `fim>=ini`, idempotencia "2x". |
| 4 | Auth/Users | PASSOU (contextual) | App single-tenant ja autenticado; SYSTEM-DESIGN sec.2 define que a feature NAO adiciona roles e que `Depends(get_current_user)` cobre toda rota nova. Nao cabem 5 REQs de login/signup numa feature brownfield. Recomenda-se 1 linha explicita (ver melhoria opcional M2). |
| 5 | Error handling (>=3) | PASSOU | 400 em faixa invalida (API-01), fechamento itens (API-03/TEST-03), reconciliacao no DELETE/atualizar (API-05), revert de celula em 400 (UI-01/TEST-05). |
| 6 | UI states (>=3) | PASSOU (contextual) | UI-01 (recalculo otimista + revert), UI-02 (faixas / "Sem numero (N cartoes)"), UI-05 (estatistica consolidada). Loading/empty herdam o padrao da tela existente. |
| 7 | Responsividade | N/A (contextual) | Feature reusa a pagina `/eventos/[id]` existente; grid inline herda o layout do app. Nenhum REQ novo de breakpoint exigido pelo briefing. |
| 8 | Seguranca (>=2) | PASSOU | Validacao server-side de toda mutacao; cliente nunca dita `recebidos` (API-02); `tipo` restrito a `evento.tipos_item` (API-03); auth herdada no router. |
| 9 | Dependencias mapeadas | PASSOU | 29/29 REQs com fase na tabela; fases ordenadas por dependencia (Schema -> API -> UI) e coerentes com ROADMAP. |
| 10 | Edge cases (>=2) | PASSOU | Faixas nao-contiguas + lote sem numero (TEST-02), split que nao fecha (TEST-03), idempotencia rodando 2x (MIG-02/TEST-06), participante sem cartoes nao gera faixa (MIG-02). |
| 11 | Setup/Deploy (>=2) | PASSOU (contextual) | Sem setup novo de infra; o "deploy concern" real e a migracao no boot: MIG-01 (chamada apos `create_all` em `main.py`) e MIG-03 (portabilidade Postgres+SQLite) cobrem isso. |
| 12 | Quantidade minima | PASSOU | 29 REQs para feature de escopo medio. Acima do piso e proporcional ao escopo. |
| 13 | IDs unicos e sequenciais | PASSOU | DB-01..04, MIG-01..04, API-01..09, UI-01..06, TEST-01..06. Sem duplicatas, sequencia limpa por categoria. |

## Pontos de Atencao Solicitados (todos verificados)

| Exigencia do briefing | REQ que cobre | Status |
|-----------------------|---------------|--------|
| Migracao SO aditiva | MIG-01 (ADD COLUMN so se nao existe), MIG-03 (sem JSONB / sem IF NOT EXISTS) | COBERTO |
| Backfill idempotente | MIG-02 ("cada participante SEM faixa..."), TEST-06 (2x nao duplica) | COBERTO |
| Preservacao da contagem de recebidos por participante | MIG-04 (`sum(faixas.quantidade) == qtd_cartoes_recebidos_legado`), TEST-01 | COBERTO |
| Compatibilidade Postgres + SQLite | MIG-03 (Text JSON, ADD COLUMN portavel, bool 0/1) | COBERTO |
| Validacao "soma das faixas = qtd_cartoes_recebidos" | API-02 (derivacao server-side) + MIG-04 (pos-migracao) | COBERTO |
| Validacao "soma qtd_vendido por tipo = qtd_vendidos" | API-03 (`sum(qtd_vendido)==p.qtd_vendidos`, 400 se nao fecha), TEST-03 | COBERTO |
| Grid inline com autosave/recalc no frontend | UI-01 (autosave blur/Enter, recalculo otimista, revert em 400), TEST-05 | COBERTO |
| Sistema B (CartaoBaile) fora de escopo | REQUIREMENTS.md L3 (cabecalho explicito) + reforco em BRIEFING L98-100 e SYSTEM-DESIGN L4-5 | COBERTO |

## O que Falta (lacuna nao bloqueante)

### G1 - "Nao dropar colunas legadas" nao tem REQ proprio (UNICO GAP)

O briefing (L69) e o system-design (L62, L389) sao explicitos: `numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos` do participante **devem permanecer na tabela** (rollback + Sistema B). Hoje isso aparece como:
- criterio de sucesso no ROADMAP (Fase 1, item 4: "Colunas legadas permanecem intactas"); e
- implicitamente em MIG-04 (que so afirma a igualdade da contagem, nao a preservacao da coluna).

Mas nao existe um REQ acionavel afirmando "a migracao NAO faz DROP/rename das colunas legadas". E uma restricao central de seguranca de dados que merece virar requisito testavel proprio.

**Correcao sugerida (adicionar):**

> - [ ] MIG-05: Migracao e estritamente aditiva: nenhum `DROP COLUMN`/`DROP TABLE`/rename sobre `evento_participantes` ou tabelas existentes. Colunas legadas `numero_inicio`/`numero_fim`/`qtd_cartoes_recebidos` permanecem (rollback + Sistema B). Verificavel: schema pos-migracao contem todas as colunas pre-migracao. -> Fase 1

(adicionar tambem a linha `MIG-05 | Fase 1 | Pendente` na tabela de rastreabilidade.)

## Melhorias Opcionais (cosmeticas, nao exigidas para liberar)

- **M1 (idempotencia da coluna):** TEST-06 cita "nem coluna" mas MIG-01 ja garante o ADD condicional via `inspect`. Coberto; sem acao.
- **M2 (auth explicita):** acrescentar 1 REQ tipo `API-10: toda rota nova herda Depends(get_current_user)` para deixar o check de auth literal, alem de contextual. So clareza de rastreabilidade.
- **M3 (colisao de faixas):** SYSTEM-DESIGN L271 registra a decisao de NAO bloquear colisao de numeros entre participantes (YAGNI). Como e decisao consciente e documentada, nao precisa de REQ; opcionalmente um REQ "nao-objetivo" tornaria a omissao rastreavel.

## Veredito

Spec aprovada para build. Recomenda-se incorporar **G1 (MIG-05)** antes de iniciar a Fase 1, por ser a restricao de dados mais sensivel do projeto (nao quebrar producao). As demais sao opcionais. Nada bloqueia o arquiteto de prosseguir.
