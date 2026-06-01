# Estado do Projeto

## Referencia do Projeto
**Projeto:** Eventos Galeto - Faixas multiplas + Cru/Assado (feature brownfield Velhos Parceiros FC)
**Valor Central:** Gerir eventos galeto com faixas de cartao quebradas e split cru x assado, editaveis em planilha inline, com relacao consolidada para a cozinha.
**Foco Atual:** Fase 2 COMPLETA - API faixas + itens + resumo

## Posicao Atual
**Fase:** 2 de 3
**Plano:** 5 de 5 (02-01..02-05 completos)
**Status:** Fase 2 COMPLETA
**Progresso:** [██████░░░░] 67%
**Requisitos:** 30 (novos)

## Contexto Acumulado

### Decisoes
Ver PROJECT.md Key Decisions e SYSTEM-DESIGN.md.
- [Phase 0]: Migracao so aditiva no boot, sistema B (CartaoBaile) fora de escopo, grid inline estilo planilha
- [01-02]: Import de models dentro de _backfill_faixas (import local) para evitar ciclo de import
- [01-02]: Faixa numerada usa qtd=fim-ini+1 como fonte de verdade; divergencias com legado aparecem nos testes 01-03
- [01-02]: run_additive_migrations em escopo de modulo (nao em on_startup) para consistencia com create_all
- [Phase 3]: Feature entregue na main; deploy roda migracao aditiva no boot; testar com dados reais de producao apos deploy

### Planos Completos
- 01-01: Modelos EventoCartaoFaixa, EventoParticipanteItem, coluna tipos_item em Evento (commit do plano anterior)
- 01-02: migrations.py ADD COLUMN idempotente + backfill + wiring no boot (eeb9f8a)
- 01-03: suite pytest 4 testes (MIG-04/05, TEST-01/06) + infra (pytest.ini, conftest, tempfile engine) (c10702f)
- 02-01: schemas Pydantic v2 (FaixaCreate/Out, ItemTipo/Out, ResumoItemTipo, EventoResumo.itens_por_tipo, ParticipanteOut.faixas/itens, EventoOut.tipos_item)
- 02-02: GET /faixas, POST faixa (numerada/sem-numero), PUT faixa, DELETE faixa, helper _aplicar_dados_faixa
- 02-03: PUT /itens upsert-substitui-total por tipo, fechamento sum(qtd_vendido)==qtd_vendidos
- 02-04: popular_elenco com faixas numeradas, atualizar_cartoes ignora recebidos do payload, tipos_item serializado
- 02-05: resumo_evento agrega itens_por_tipo via group_by tipo (5880373, 8b5548c) - 26 testes passando

### Bloqueios
Nenhum

## Continuidade de Sessao
Ultimo trabalho: 02-05 completo - itens_por_tipo no resumo, suite 26 testes verde, Fase 2 encerrada.
Proxima acao: Fase 3 (planos 03-xx) - frontend grid inline e UI de faixas/itens.
