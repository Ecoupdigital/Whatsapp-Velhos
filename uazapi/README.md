# Documentação UazAPI (v2.0)

Este diretório contém a documentação completa da API **uazapiGO** (WhatsApp API v2.0), extraída de `https://docs.uazapi.com/`.

## Arquivos Disponíveis

- `uazapi-openapi-spec.yaml`: Especificação completa em formato YAML. Contém todos os endpoints, parâmetros, schemas e descrições.
- `uazapi-openapi-spec.json`: Mesma especificação em formato JSON para uso em ferramentas como Postman, Insomnia ou geradores de código.

## Resumo da API

### ⚠️ Recomendação Importante: WhatsApp Business
**É ALTAMENTE RECOMENDADO usar contas do WhatsApp Business** em vez do WhatsApp normal para integração. O WhatsApp normal pode apresentar inconsistências, desconexões, limitações e instabilidades.

### Autenticação
- **Endpoints Regulares**: Requerem o header `token` (token da instância).
- **Endpoints Administrativos**: Requerem o header `admintoken`.

### Estados da Instância
As instâncias podem estar nos seguintes estados:
- `disconnected`: Desconectado do WhatsApp.
- `connecting`: Em processo de conexão.
- `connected`: Conectado e autenticado com sucesso.

### Servidores
- URL Base: `https://{subdomain}.uazapi.com`
- Subdomínios comuns: `free` (testes), `api` (produção).

## Como Visualizar
Você pode importar o arquivo `uazapi-openapi-spec.json` ou `.yaml` em:
1. **Swagger Editor**: [https://editor.swagger.io/](https://editor.swagger.io/)
2. **Postman**: Importar como "API Definition".
3. **Redocly**: Para gerar uma página HTML estática.

---
*Documentação capturada em: 26 de fevereiro de 2026*
