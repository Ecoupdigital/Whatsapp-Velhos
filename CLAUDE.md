# Whatsapp-Velhos

## Projeto
Projeto de automação WhatsApp usando a API uazapiGO (v2.0).

## UAZAPI - Configuração da Instância

- **Server URL**: https://ecoup.uazapi.com
- **Instance Token**: eba67094-fa57-4e77-8b8e-8a952614a9cd
- **Admin Token**: VFaYq9pn2O4IVfan45D76nnnhIHtd1IDL24Gt5ODZsptqQZi64
- **Numero conectado**: 555195877046
- **Status**: connected

## API - Referencia Rapida

### Autenticacao
- Header `token` para endpoints regulares
- Header `admintoken` para endpoints administrativos

### Endpoints mais usados
- `GET /group/list` - listar grupos
- `POST /group/info` - info do grupo (body: `{"groupid": "...@g.us"}`)
- `POST /send/text` - enviar texto (body: `{"number": "...", "text": "..."}`)
- `POST /send/media` - enviar midia (body: `{"number": "...", "type": "image|video|document|audio|ptt", "file": "url_ou_base64"}`)
- `POST /chat/find` - buscar chats
- `POST /message/find` - buscar mensagens
- `GET /instance/status` - verificar status da instancia
- `POST /webhook` - configurar webhook

### Documentacao
A spec OpenAPI completa esta em `uazapi/uazapi-openapi-spec.yaml` (13.548 linhas, 99 endpoints).

## Automacoes

### Cobranca de Mensalidade - Velhos Parceiros F.C
Sistema unificado dentro do app FastAPI (sem cron host). Scheduler do backend
roda 3 jobs em horario BRT:
- Dia 6 10h: lembrete pra pendentes
- Dia 14 10h: aviso de vencimento
- Dia 20 10h: cobranca com multa

Filtra apenas jogadores cadastrados, ativos, com telefone, sem `excluido_envio=1`.
Templates editaveis em `/configuracoes`. Logs em `mensagens_log`.
Grupo configurado em `configuracoes.whatsapp_group_jid`.

Script standalone antigo (`lembrete_mensalidade.py`) e cron host foram
removidos - estao em `legacy/` por referencia.

## Exemplos de chamada curl

```bash
# Listar grupos
curl -s -X GET "https://ecoup.uazapi.com/group/list" \
  -H "token: eba67094-fa57-4e77-8b8e-8a952614a9cd"

# Info de um grupo
curl -s -X POST "https://ecoup.uazapi.com/group/info" \
  -H "token: eba67094-fa57-4e77-8b8e-8a952614a9cd" \
  -H "Content-Type: application/json" \
  -d '{"groupjid": "ID_DO_GRUPO@g.us"}'

# Enviar texto
curl -s -X POST "https://ecoup.uazapi.com/send/text" \
  -H "token: eba67094-fa57-4e77-8b8e-8a952614a9cd" \
  -H "Content-Type: application/json" \
  -d '{"number": "5511999999999", "text": "Ola!"}'
```
