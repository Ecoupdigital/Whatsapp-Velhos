# API para o agente Velhos Parceiros

Base: `https://velhos-backend.ecoup.digital`. Documentação interativa em `/docs`.

## Autenticação

O agente usa uma **chave de serviço**, que não expira e pode ser revogada. Ela vale em todas as rotas `/api/...` do app, com as mesmas permissões do usuário a quem está ligada (por padrão, o admin que a criou). Há dois jeitos de mandar a chave:

```
Authorization: Bearer vp_xxxxxxxx_...
```
ou
```
X-API-Key: vp_xxxxxxxx_...
```

O login do app (`POST /api/login`, JWT de 72 h) continua igual.

### Criar, listar e revogar chaves

Só um admin logado no app pode fazer isso. Uma chave de serviço não gerencia outras chaves (responde 403). A chave em texto aparece **uma única vez**, na criação; o banco guarda só o hash.

Pelo terminal, dentro do container do backend:

```bash
python scripts/api_keys.py criar "Agente Velhos Parceiros"            # age como o usuario admin
python scripts/api_keys.py criar "Agente" --usuario tesoureiro
python scripts/api_keys.py listar
python scripts/api_keys.py revogar 1
```

Pela API, com o JWT de um admin:

```bash
curl -X POST $BASE/api/admin/api-keys -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" -d '{"nome": "Agente Velhos Parceiros"}'
# -> {"id": 1, "prefixo": "1a2b3c4d", "chave": "vp_1a2b3c4d_...", "ativa": true, ...}

curl $BASE/api/admin/api-keys -H "Authorization: Bearer $JWT"            # lista, sem a chave
curl -X DELETE $BASE/api/admin/api-keys/1 -H "Authorization: Bearer $JWT" # revoga na hora
```

Chave inválida ou revogada: 401. Sem credencial nenhuma: 403 `Not authenticated`, igual a antes.

## Origem dos lançamentos

Toda transação nova grava `origem`:
- `app`: lançada por quem está logado no app;
- `agente`: lançada com chave de serviço, em qualquer rota (inclusive `PUT /api/mensalidades/{id}`);
- `importacao`: lançada pela importação de extrato, junto com `importacao_lote_id`.

Transações anteriores a esta mudança ficam com `origem` vazia (foram lançadas pelo app). `GET /api/transacoes` passa a mostrar `origem` e `importacao_lote_id`. A origem não pode ser mandada no corpo da requisição.

## Importação de extrato bancário

O agente extrai as linhas do extrato (PDF ou print) e manda já estruturadas. São três passos:
1. **Prévia:** não grava nada.
2. **Confirmar:** grava um lote.
3. **Desfazer:** se precisar, desfaz o lote.

### Linha de extrato

| campo | obrigatório | |
|---|---|---|
| `data` | sim | `AAAA-MM-DD` |
| `valor` | sim | positivo; o sinal vem do `tipo` |
| `tipo` | sim | `entrada` ou `saida` |
| `descricao` | não | nome ou descrição como aparece no extrato |
| `conta_id` | não | se faltar, usa o `conta_id` do pedido (`GET /api/contas` lista as contas) |

### Trava contra duplicado

Cada linha vira uma impressão digital formada por conta, data, tipo, valor, descrição normalizada (sem acento, caixa e pontuação) e ocorrência. A ocorrência é a posição da linha entre as linhas idênticas do mesmo envio: dois Pix iguais no mesmo dia continuam sendo dois.

A impressão digital é única no banco. Reimportar o mesmo extrato, ou um período que se sobrepõe, não lança nada duas vezes, desde que se mande o extrato do dia inteiro: as linhas idênticas de um mesmo dia precisam vir juntas.

### 1. Prévia: `POST /api/importacao-extrato/previa`

```json
{
  "conta_id": 2,
  "linhas": [
    {"data": "2026-02-10", "valor": 60.00, "tipo": "entrada", "descricao": "Julio Cezar Soares"},
    {"data": "2026-06-01", "valor": 420.00, "tipo": "entrada", "descricao": "Leonir De Bortoli"},
    {"data": "2026-02-10", "valor": 318.69, "tipo": "saida", "descricao": "Mercado Dornelles E Brizolla Ltda"}
  ]
}
```

Resposta (resumida):

```json
{
  "resumo": {"total": 3, "novas": 3, "duplicadas": 0, "erros": 0, "com_sugestao": 2},
  "linhas": [
    {
      "indice": 0, "status": "nova", "impressao_digital": "9f2c...",
      "conta_id": 2, "data": "2026-02-10", "tipo": "entrada", "valor": 60.0,
      "descricao": "Julio Cezar Soares", "lote_existente_id": null,
      "sugestao": {
        "jogador_id": 7, "jogador_nome": "Julio Cezar Soares", "confianca": "alta",
        "mensalidades_em_aberto": [
          {"id": 31, "mes_referencia": "2026-01", "valor": 60.0, "status": "atrasado"},
          {"id": 44, "mes_referencia": "2026-02", "valor": 60.0, "status": "pendente"}
        ],
        "mensalidade_ids_sugeridas": [31],
        "acao_sugerida": "mensalidade"
      }
    }
  ]
}
```

- `status`: `nova`, `duplicada` (já importada; mostra `lote_existente_id`) ou `erro` (com `erro` explicando o motivo).
- Sugestão: só para entradas.
  - Confiança `alta`: o nome completo ou o apelido é igual ao do cadastro. O sistema ignora acento, caixa e números antes do nome, como o CNPJ de MEI.
  - Confiança `media`: primeiro e último nome iguais, e um único jogador nessa condição.
  - Sem casamento ou com empate, a sugestão vem vazia: o agente pergunta.
- `mensalidade_ids_sugeridas` traz as mensalidades em aberto mais antigas que fecham o valor:
  - uma mensalidade com exatamente esse valor;
  - ou as k mais antigas cuja soma dá o valor, como 420 = 7 × 60.

  Se nada fechar, a lista vem vazia e `acao_sugerida` vem como `transacao`.

A sugestão é só sugestão: quem decide é o agente (ou a pessoa) no passo de confirmar.

### 2. Confirmar: `POST /api/importacao-extrato/confirmar`

Mande as linhas do envio com a ação de cada uma. O ideal é mandar o extrato inteiro, igual ao da prévia, e marcar como `ignorar` o que não for lançar.

```json
{
  "conta_id": 2,
  "observacao": "Extrato Pan fev-jun/2026",
  "linhas": [
    {"data": "2026-02-10", "valor": 60.00, "tipo": "entrada", "descricao": "Julio Cezar Soares",
     "acao": "mensalidade", "mensalidade_ids": [31]},
    {"data": "2026-06-01", "valor": 420.00, "tipo": "entrada", "descricao": "Leonir De Bortoli",
     "acao": "mensalidade", "mensalidade_ids": [50, 51, 52, 53, 54, 55, 56]},
    {"data": "2026-02-10", "valor": 318.69, "tipo": "saida", "descricao": "Mercado Dornelles E Brizolla Ltda",
     "acao": "transacao", "categoria": "despesa", "descricao_lancamento": "Compra mercado galeto"}
  ]
}
```

| ação | campos | o que faz |
|---|---|---|
| `mensalidade` | `mensalidade_ids` (obrigatório), `forma_pagto` (padrão `pix`) | Quita a mensalidade pela mesma regra do app (`PUT /api/mensalidades/{id}`): status `pago`, `valor_pago`, data, forma, conta e uma transação de entrada `mensalidade` por mensalidade. Com uma mensalidade, ela recebe o valor da linha (ex.: 65 com multa). Com várias, a soma dos valores tem que bater com a linha. Recusa mensalidade já paga ou isenta, ou de jogadores diferentes. |
| `transacao` | `categoria` (obrigatório), `jogador_id`, `evento_id`, `descricao_lancamento` | Lança uma transação de entrada ou saída na conta. |
| `ignorar` | nada | Não lança nada. |

Resposta:

```json
{
  "lote_id": 5,
  "resumo": {"total": 3, "gravadas": 3, "duplicadas": 0, "ignoradas": 0, "erros": 0},
  "linhas": [
    {"indice": 0, "status": "gravada", "impressao_digital": "9f2c...", "transacao_ids": [812]}
  ]
}
```

Status por linha: `gravada`, `duplicada` (já importada, nada lançado), `ignorada` ou `erro` (nada lançado nessa linha). Um erro numa linha não desfaz as outras.

### Auditoria e desfazer

```bash
curl $BASE/api/importacao-extrato/lotes -H "X-API-Key: $CHAVE"            # ultimos 100 lotes
curl $BASE/api/importacao-extrato/lotes/5 -H "X-API-Key: $CHAVE"          # linhas e transacoes do lote
curl -X POST $BASE/api/importacao-extrato/lotes/5/desfazer -H "X-API-Key: $CHAVE"
```

Desfazer:
- apaga as transações do lote;
- devolve cada mensalidade quitada ao estado de antes (status, valor pago, data, forma, conta);
- libera as impressões digitais, para o extrato poder ser importado de novo.

Lote já desfeito: 409.
