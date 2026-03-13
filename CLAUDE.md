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

### Lembrete de Mensalidade - Velhos Parceiros F.C
- **Script**: `lembrete_mensalidade.py`
- **Cron**: Todo dia 06 as 10:00 BRT (13:00 UTC)
- **Servidor**: server-ecoup (VPS) em `/home/projects/Whatsapp-Velhos/`
- **Log**: `/home/projects/Whatsapp-Velhos/lembrete_mensalidade.log`
- **Grupo**: VELHOS PARCEIROS F.C (JID: `555499591730-1606008393@g.us`)
- **Delay**: 3-5 segundos entre cada mensagem
- **Excluidos** (12 numeros): Acassio, Otavio, Vagner Velhos, Felipe Rosa, Jonathan (proprio), e mais 7

### Verificar log do ultimo envio
```bash
ssh server-ecoup "cat /home/projects/Whatsapp-Velhos/lembrete_mensalidade.log"
```

### Editar cron no servidor
```bash
ssh server-ecoup "crontab -l"
ssh server-ecoup "crontab -e"
```

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
