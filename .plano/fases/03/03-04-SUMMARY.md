---
phase: 03-frontend
plan: 03-04
subsystem: frontend
tags: [componentes, grid, editavel, autosave, participantes]
completed_at: "2026-06-01"
duration_approx: "~15min"
tasks_completed: 4/4
commits:
  - hash: 49d206f
    msg: "feat(03-04): criar EditableCell - celula numerica editavel com autosave/revert"
  - hash: 76c4458
    msg: "feat(03-04): adicionar handlers de commit inline ao page.tsx"
  - hash: 69f9a73
    msg: "feat(03-04): criar ParticipantesGrid - tabela de participantes com colunas editaveis"
key_files:
  created:
    - frontend/src/components/eventos/EditableCell.tsx
    - frontend/src/components/eventos/ParticipantesGrid.tsx
  modified:
    - frontend/src/app/(app)/eventos/[id]/page.tsx
decisions:
  - "ItemTipo importado via import type em vez de import normal para consistencia com os outros tipos"
  - "refetchParticipante usa GET /eventos/{id}/participantes/{pid} como caminho primario com fallback fetchAll no catch"
  - "commitItemCampo envia sempre a lista completa de tipos_item (substituicao total), conforme SYSTEM-DESIGN 5.2"
---

# Fase 03 Plano 04: Componentes do grid editavel + handlers de commit - Summary

**One-liner:** EditableCell com autosave/revert + ParticipantesGrid com colunas dinamicas por tipo + handlers commitCartaoCampo/commitItemCampo/refetchParticipante no page.tsx.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Status |
|--------|-----------|--------|--------|
| 1 | EditableCell.tsx | 49d206f | OK |
| 2 | Handlers no page.tsx | 76c4458 | OK |
| 3 | ParticipantesGrid.tsx | 69f9a73 | OK |
| 4 | tsc --noEmit sem erros | (verificacao) | OK - EXIT:0 |

## O que foi criado

### EditableCell (frontend/src/components/eventos/EditableCell.tsx)

Celula numerica editavel in-place com ciclo de vida completo:
- Clique no botao abre input focado + selecionado
- Enter ou blur commita o valor
- Escape cancela e restaura o valor original sem chamar onCommit
- onCommit rejeitando: reverte `draft` para o `value` original; o pai e responsavel pelo toast
- Estado `saving` com `animate-pulse` enquanto aguarda resposta
- Props: `value`, `onCommit`, `min`, `disabled`, `className`, `align`

### Handlers no page.tsx

Tres funcoes adicionadas apos `handleSaveCartoes`:

**refetchParticipante(pid):** GET singular `/eventos/{eventoId}/participantes/{pid}`, atualiza o item no array `participantes` via setParticipantes map. Em erro, cai no `fetchAll()` completo como fallback.

**commitCartaoCampo(part, campo, valor):** PUT `/participantes/{id}/cartoes` com os tres campos de cartao, mantendo os outros inalterados. Apos sucesso: refetchParticipante + atualiza resumo. Em erro: toast com mensagem do backend + throw (para EditableCell reverter).

**commitItemCampo(part, tipo, campo, valor):** Constroi a lista completa de itens a partir de `evento.tipos_item` (substituicao total, conforme SYSTEM-DESIGN 5.2), substitui o campo do tipo afetado. PUT `/participantes/{id}/itens`. Apos sucesso: refetchParticipante + atualiza resumo. Em erro: toast + throw.

### ParticipantesGrid (frontend/src/components/eventos/ParticipantesGrid.tsx)

Tabela responsiva com:
- Coluna Participante: botao de toggle expand com ChevronDown animado
- Coluna Receb.: read-only com icone Ticket
- Colunas Vend./Devol./Custo: EditableCell conectado a commitCartaoCampo
- Colunas dinamicas por tipo (`evento.tipos_item`): par vendido/pedido por tipo, so renderizadas quando tipos_item tem elementos (UI-03)
- Coluna Valor: read-only formatado (pago/total)
- Coluna Status: badge colorido (pago=emerald, parcial=blue, pendente=yellow)
- Coluna Acoes: botao Pagar + botao remover (X)
- Linha expandida: slot `renderExpanded` com colSpan calculado para cobrir todas as colunas
- `colCount` = 6 (fixas) + tipos.length * 2 (dinamicas) + 3 (valor/status/acoes)

## Verificacao Funcional

tsc --noEmit no diretorio frontend retornou EXIT:0 sem nenhum erro de tipo.

Integracao na pagina (substituir lista de cards pelo grid) e feita no plano 03-06.

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

- [x] frontend/src/components/eventos/EditableCell.tsx existe
- [x] frontend/src/components/eventos/ParticipantesGrid.tsx existe
- [x] page.tsx tem refetchParticipante, commitCartaoCampo, commitItemCampo, ItemTipo importado
- [x] commits 49d206f, 76c4458, 69f9a73 existem
- [x] tsc --noEmit: EXIT:0
