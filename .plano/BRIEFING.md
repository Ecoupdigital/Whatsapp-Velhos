# BRIEFING — Eventos Galeto: faixas múltiplas + relação Cru/Assado

## Contexto

Tela de evento (`/eventos/[id]`) usa o **sistema A**: `EventoParticipante` com campos
de cartão inline (`numero_inicio`/`numero_fim` ÚNICOS, `qtd_cartoes_recebidos`,
`qtd_vendidos`, `qtd_devolvidos`, `qtd_pagou_custo`). Existe um sistema B legado
(`CartaoBaile`, tela `/cartoes` "Cartões de Baile") que já suporta N faixas mas está
desconectado do fluxo de evento — **não será tocado** aqui (candidato a deprecar depois).

Banco: SQLAlchemy, prod Postgres / sqlite legacy. Tabelas criadas via
`Base.metadata.create_all` (`backend/main.py:19`) → cria TABELAS novas sozinho (seguro),
mas NÃO adiciona COLUNAS em tabelas existentes.

## Objetivo

1. **Faixas múltiplas e não-sequenciais por jogador.** Jogador recebe 12 sequenciais,
   depois recebe mais cartões com números quebrados (não contíguos). Cada faixa pode ser
   **numerada** (ex: 45-50) OU **sem número** (só quantidade, quando não se sabe os números).
2. **Relação Cru × Assado.** Registrar, por participante, quantos dos cartões VENDIDOS
   foram cru e quantos assado (split de venda), E o pedido pessoal do jogador por tipo.
   Consolidar numa estatística do evento pra repassar ao fornecedor/cozinha.

## Restrições (do usuário)

- **NÃO quebrar dados existentes.** Migração só aditiva + backfill. Rollback possível.
- **Edição estilo planilha:** grid inline na tela do evento. Clica na célula, edita,
  recalcula e salva sozinho. Sem modal pesado.
- Solução durável > atalho (CLAUDE.md).

## Design aprovado

### Dados

**Nova tabela `evento_cartao_faixa`** (faixas de cartão por participante):
```
id
evento_participante_id  FK
numero_inicio   int  null    -- null = lote sem número
numero_fim      int  null
quantidade      int  not null -- numerada: fim-ini+1 ; sem número: qtd digitada
sem_numero      bool default false
created_at
```
- `qtd_cartoes_recebidos` do participante = SOMA das quantidades das faixas.
- Lote sem número: guarda só quantidade, exibe "Sem número (N cartões)".
  **Decisão:** NÃO gerar número fake (evita colisão com reais).

**Nova tabela `evento_participante_item`** (split por tipo):
```
id
evento_participante_id  FK
tipo            text  -- "cru" | "assado" | ...
qtd_vendido     int default 0
qtd_pedido      int default 0
```

**Coluna nova `Evento.tipos_item`** (text/JSON, ex: `["cru","assado"]`). Configurável por
evento; galeto preenche cru/assado. **Precisa migração explícita** (create_all não adiciona).

### Migração (aditiva, idempotente)

1. `create_all` cria as 2 tabelas novas automaticamente.
2. Script de migração idempotente:
   - ALTER TABLE eventos ADD COLUMN tipos_item (se não existir).
   - Backfill: cada `EventoParticipante` com `numero_inicio`/`numero_fim` preenchidos →
     cria 1 linha em `evento_cartao_faixa` (numerada). Quem não tem números mas tem
     `qtd_cartoes_recebidos > 0` → 1 faixa sem_numero com essa quantidade.
   - NÃO dropar `numero_inicio`/`numero_fim` do participante (mantém pra rollback).
3. Idempotência: checar existência antes de inserir/alterar (rodável 2x sem duplicar).

### Validações

- Soma das faixas (quantidade) = `qtd_cartoes_recebidos`.
- Soma `qtd_vendido` por tipo = `qtd_vendidos` do participante (a relação tem que fechar).
- `qtd_pedido` por tipo = livre.
- Reconciliação existente mantida: vendidos+devolvidos+pagou_custo <= recebidos.

### API

- CRUD faixas: `POST/PUT/DELETE /eventos/{id}/participantes/{pid}/faixas`.
- `popular` e `atualizar_cartoes`: passam a derivar `qtd_cartoes_recebidos` da soma das faixas.
- PUT itens por tipo: `/eventos/{id}/participantes/{pid}/itens` (lista `{tipo, qtd_vendido, qtd_pedido}`).
- `resumo` do evento: agrega por tipo → total cru vendido / assado vendido / cru pedido /
  assado pedido (a relação consolidada).
- Salvar `tipos_item`: via PUT evento existente.

### Frontend

- **Grid inline (planilha)** na tela do evento: 1 linha por participante. Colunas editáveis
  in-place com autosave + recálculo: recebidos (via faixas), vendidos, devolvidos, pagou_custo,
  cru vendido, assado vendido, cru pedido, assado pedido, valor (derivado).
- Faixas (1:N) editadas em sub-linha expansível: add faixa numerada / add lote sem número,
  editar/remover cada.
- Config do evento: campo tipos de item.
- Estatística do evento: relação consolidada cru × assado (vendido + pedido) + total a repassar.

### Fora de escopo

- Sistema B (`CartaoBaile` / tela `/cartoes`). Fica como está.

## Critério de sucesso

- Dados atuais intactos após migração (mesma contagem de recebidos por participante).
- Dá pra adicionar faixa numerada quebrada E lote sem número a um jogador.
- Split cru/assado fecha com vendidos; estatística do evento mostra a relação total.
- Edição inline na grid recalcula e persiste sem modal.
