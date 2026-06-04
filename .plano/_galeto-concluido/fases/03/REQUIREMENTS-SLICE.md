# Requisitos da Fase 03

> Slice gerado automaticamente. Versao completa em `.plano/REQUIREMENTS.md`.
> Design detalhado em `.plano/SYSTEM-DESIGN.md` secao 5.3.

## UI-01: Grid inline (planilha)
Tabela na tela `/eventos/[id]`, 1 linha por participante. Colunas editaveis in-place (Vendidos, Devolvidos, Pagou custo, por tipo: cru/assado vend e ped) com autosave em blur/Enter, recalculo otimista da UI e revert ao valor anterior em erro 400 (refetch participante). Nome, Recebidos e Valor sao read-only.

## UI-02: Sub-linha de faixas
Ao expandir um participante, listar faixas; botoes "Adicionar faixa numerada" (inputs inicio/fim) e "Adicionar lote sem numero" (input quantidade); editar e remover cada faixa. Lote sem numero exibe "Sem numero (N cartoes)". Consome CRUD de faixas (Fase 2).

## UI-03: Colunas dinamicas por tipo
Colunas de split (cru vend / assado vend / cru ped / assado ped) renderizadas a partir de `evento.tipos_item`. Evento sem tipos nao mostra colunas de split. Edicao salva via `PUT .../itens` (envia a lista completa de itens do participante).

## UI-04: Config tipos de item
Modal de config do evento ganha campo "Tipos de item" (chips ou csv -> array). Salva via `PUT /eventos/{id}` com `tipos_item`.

## UI-05: Estatistica consolidada
Card de resumo com bloco "Relacao Cru x Assado" lendo `resumo.itens_por_tipo`: por tipo mostra vendido e pedido; exibe total a repassar (vendido + pedido por tipo e somatorio).

## UI-06: Tipos TS
Adicionar em `frontend/src/types/index.ts`: `FaixaOut`, `FaixaCreate`, `FaixaUpdate`, `ItemTipo`, `ItensUpdate`, `ItemOut`, `ResumoItemTipo`. Estender `EventoOut` (`tipos_item`), `ParticipanteOut` (`faixas`, `itens`), `EventoResumo` (`itens_por_tipo`), `EventoCreate/Update`.

## TEST-04: Estatistica visivel
Tela mostra a relacao total cru/assado (vendido + pedido).

## TEST-05: Edicao inline persiste
Editar celula recalcula e persiste sem modal; erro de validacao reverte a celula com toast.
