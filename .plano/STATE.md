# Estado do Projeto

## Referencia do Projeto
**Projeto:** Eventos Galeto - Faixas multiplas + Cru/Assado (feature brownfield Velhos Parceiros FC)
**Valor Central:** Gerir eventos galeto com faixas de cartao quebradas e split cru x assado, editaveis em planilha inline, com relacao consolidada para a cozinha.
**Foco Atual:** Fase 1 - Schema + Migracao + Backfill

## Posicao Atual
**Fase:** 1 de 3
**Plano:** 3 de 3 (01-01, 01-02 e 01-03 completos)
**Status:** Fase 1 COMPLETA
**Progresso:** [███░░░░░░░] 33%
**Requisitos:** 30 (novos)

## Contexto Acumulado

### Decisoes
Ver PROJECT.md Key Decisions e SYSTEM-DESIGN.md.
- [Phase 0]: Migracao so aditiva no boot, sistema B (CartaoBaile) fora de escopo, grid inline estilo planilha
- [01-02]: Import de models dentro de _backfill_faixas (import local) para evitar ciclo de import
- [01-02]: Faixa numerada usa qtd=fim-ini+1 como fonte de verdade; divergencias com legado aparecem nos testes 01-03
- [01-02]: run_additive_migrations em escopo de modulo (nao em on_startup) para consistencia com create_all

### Planos Completos
- 01-01: Modelos EventoCartaoFaixa, EventoParticipanteItem, coluna tipos_item em Evento (commit do plano anterior)
- 01-02: migrations.py ADD COLUMN idempotente + backfill + wiring no boot (eeb9f8a)
- 01-03: suite pytest 4 testes (MIG-04/05, TEST-01/06) + infra (pytest.ini, conftest, tempfile engine) (c10702f)

### Bloqueios
Nenhum

## Continuidade de Sessao
Ultimo trabalho: 01-03 completo - suite pytest criada, 4 testes passando, gate da Fase 1 verde.
Proxima acao: Fase 2 (planos 02-xx) - rotas de API para faixas de cartao e itens por tipo.
