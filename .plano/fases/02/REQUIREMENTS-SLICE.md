# Requisitos da Fase 02

> Slice gerado automaticamente. Versao completa em `.plano/REQUIREMENTS.md`.
> Design detalhado em `.plano/SYSTEM-DESIGN.md` secoes 4, 5 e 7.

## API-01: CRUD faixas
`GET/POST/PUT/DELETE /eventos/{id}/participantes/{pid}/faixas[/{faixa_id}]` (auth, 404 se participante nao bate evento). Numerada: exige `numero_inicio`, `numero_fim`, `fim>=ini`, deriva `quantidade=fim-ini+1` (ignora qtd do payload). Sem numero: exige `quantidade>=1`, zera numeros. Validacao opcional de colisao numerada DENTRO do mesmo participante (entre participantes nao bloqueia). Retorna `ParticipanteOut`.

## API-02: Recebidos derivado
Helper `_recalc_recebidos(p)`: `p.qtd_cartoes_recebidos = sum(f.quantidade for f in p.faixas)`. Chamar apos toda mutacao de faixa, antes da validacao de reconciliacao e do recalculo de valor. Cliente nunca dita recebidos.

## API-03: PUT itens por tipo
`PUT /eventos/{id}/participantes/{pid}/itens` body `{itens: [{tipo, qtd_vendido, qtd_pedido}]}`. Semantica de substituicao total (tipos omitidos sao removidos). Cada `tipo` deve estar em `evento.tipos_item` (400 senao). Upsert por `(participante, tipo)`. Validacao: `sum(qtd_vendido) == p.qtd_vendidos` (400 com mensagem clara se nao fecha). `qtd_pedido` livre.

## API-04: popular_elenco
Para cada jogador com `qtd > 0`, criar 1 `EventoCartaoFaixa` numerada usando `_proximo_numero` global; recebidos derivado via `_recalc_recebidos`. Nao setar mais `numero_inicio/fim` inline no participante como fonte.

## API-05: atualizar_cartoes
Aplica `qtd_vendidos`/`qtd_devolvidos`/`qtd_pagou_custo`; mantem reconciliacao `vendidos+devolvidos+pagou_custo <= recebidos` (recebidos vem das faixas). `qtd_cartoes_recebidos` do payload deixa de ser fonte de verdade (documentar no docstring).

## API-06: resumo com itens_por_tipo
`GET /eventos/{id}/resumo` agrega por tipo (group_by `tipo`, join participantes do evento): lista `{tipo, total_vendido, total_pedido}` em `EventoResumo.itens_por_tipo`. `cartoes_emitidos` soma `qtd_cartoes_recebidos` (ja derivado).

## API-07: tipos_item no Evento
`EventoCreate/Update/Out` ganham `tipos_item: Optional[list[str]]`. Escrita serializa `json.dumps` antes de setar coluna; leitura desserializa via `field_validator(mode="before")` em `EventoOut.tipos_item` (aceita str JSON, devolve list). `PUT /eventos/{id}` salva.

## API-08: _proximo_numero
Considerar `max(numero_fim)` tanto de `EventoParticipante` (legado) quanto de `EventoCartaoFaixa`.

## API-09: ParticipanteOut
Incluir `faixas: list[FaixaOut] = []` e `itens: list[ItemOut] = []`. Schemas novos: `FaixaCreate/Update/Out`, `ItemTipo/ItensUpdate/ItemOut`, `ResumoItemTipo`.

## API-10: GET participante singular (refetch)
`GET /eventos/{id}/participantes/{pid}` (SINGULAR, auth, 404 se nao bate evento) retorna `ParticipanteOut` completo (jogador + faixas + itens). Suporta o `refetchParticipante` do grid inline da Fase 3 (03-04): apos editar uma celula, revalida apenas aquela linha em vez de refetch global da lista. Carregar colecoes com `selectinload` (evita produto cartesiano). Adicionado para fechar handoff INC-001 (Fase 3 consumia endpoint inexistente).

## TEST-02: Faixas quebradas
Adicionar 1-12 e depois 45-50 + lote sem numero a um jogador; `qtd_cartoes_recebidos` soma certo.

## TEST-03: Fechamento de itens
Split que nao fecha com vendidos -> 400; que fecha -> persiste.
