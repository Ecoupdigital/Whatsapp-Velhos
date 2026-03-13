# PLANO - Velhos Parceiros FC: Sistema de Gestao Completo

## Visao Geral

Sistema web para gestao do time Velhos Parceiros F.C. com controle de jogadores, mensalidades, financeiro, eventos e comunicacao automatizada via WhatsApp (uazapiGO).

### Stack

| Camada     | Tecnologia                    |
| ---------- | ----------------------------- |
| Frontend   | Next.js 14 (App Router)       |
| Backend    | Python (FastAPI)              |
| Banco      | SQLite (via SQLAlchemy)       |
| WhatsApp   | uazapiGO (API REST existente) |
| Auth       | JWT (simple)                  |
| Estilo     | Tailwind CSS                  |
| Deploy     | Mesmo VPS (server-ecoup)      |

### Design System (do Instagram @velhosparceirosfc)

- **Vermelho Vibrante**: `#E31E24` (primaria)
- **Preto**: `#000000` (base/fundos)
- **Branco**: `#FFFFFF` (contraste)
- **Cinza Claro**: `#F5F5F5` (backgrounds de cards)

> **IMPORTANTE**: O design system completo esta detalhado na secao
> "Frontend Design System & UI Specification" abaixo.

---

## Estrutura de Diretorios

```
Whatsapp-Velhos/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── requirements.txt
│   ├── database.py              # SQLAlchemy engine + session
│   ├── models.py                # Modelos SQLAlchemy (todas tabelas)
│   ├── schemas.py               # Pydantic schemas (request/response)
│   ├── auth.py                  # JWT auth (login, middleware)
│   ├── routers/
│   │   ├── auth.py              # POST /login, GET /me
│   │   ├── jogadores.py         # CRUD jogadores
│   │   ├── mensalidades.py      # CRUD mensalidades + status
│   │   ├── financeiro.py        # Fluxo de caixa, balanco
│   │   ├── eventos.py           # CRUD eventos (viagens, bailes, jogos)
│   │   ├── cartoes.py           # Controle de cartoes de baile
│   │   ├── promocoes.py         # CRUD promocoes
│   │   ├── whatsapp.py          # Envio de msgs, logs, status
│   │   └── dashboard.py         # Dados agregados pro dashboard
│   ├── services/
│   │   ├── whatsapp_service.py  # Integracao com uazapiGO
│   │   ├── mensalidade_cron.py  # Logica dos envios automaticos
│   │   └── scheduler.py         # APScheduler para crons
│   └── velhos.db                # SQLite database
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout (sidebar + theme)
│   │   │   ├── page.tsx              # Redirect to /dashboard
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Tela de login
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Dashboard principal
│   │   │   ├── jogadores/
│   │   │   │   ├── page.tsx          # Listagem de jogadores
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Detalhe/edicao do jogador
│   │   │   ├── mensalidades/
│   │   │   │   └── page.tsx          # Controle de mensalidades
│   │   │   ├── financeiro/
│   │   │   │   └── page.tsx          # Fluxo de caixa + balanco
│   │   │   ├── eventos/
│   │   │   │   ├── page.tsx          # Lista de eventos
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Detalhe do evento
│   │   │   ├── jogos/
│   │   │   │   └── page.tsx          # Historico de jogos
│   │   │   ├── cartoes/
│   │   │   │   └── page.tsx          # Controle de cartoes de baile
│   │   │   ├── promocoes/
│   │   │   │   └── page.tsx          # Gerenciar promocoes
│   │   │   ├── whatsapp/
│   │   │   │   └── page.tsx          # Logs e status de envios
│   │   │   └── configuracoes/
│   │   │       └── page.tsx          # Configuracoes do sistema
│   │   ├── components/
│   │   │   ├── ui/                   # Componentes base (Button, Input, Card, Table, Modal, Badge)
│   │   │   ├── Sidebar.tsx           # Navegacao lateral
│   │   │   ├── Header.tsx            # Header com user info
│   │   │   ├── StatsCard.tsx         # Card de estatisticas
│   │   │   └── DataTable.tsx         # Tabela reutilizavel
│   │   ├── lib/
│   │   │   ├── api.ts               # Fetch wrapper com auth
│   │   │   ├── auth.ts              # Context de autenticacao
│   │   │   └── utils.ts             # Helpers (formatCurrency, formatDate)
│   │   └── types/
│   │       └── index.ts             # TypeScript types
│
├── lembrete_mensalidade.py          # Script existente (sera migrado)
├── setup_cron.sh                    # Existente
├── uazapi/                          # OpenAPI spec existente
├── CLAUDE.md
└── PLAN.md
```

---

## Banco de Dados (SQLite)

### Tabelas

#### 1. `usuarios` (autenticacao)
| Campo         | Tipo    | Descricao                  |
| ------------- | ------- | -------------------------- |
| id            | INTEGER | PK autoincrement           |
| username      | TEXT    | Login unico                |
| password_hash | TEXT    | bcrypt hash                |
| nome          | TEXT    | Nome de exibicao           |
| role          | TEXT    | "admin" ou "viewer"        |
| created_at    | TEXT    | ISO datetime               |

#### 2. `jogadores`
| Campo            | Tipo    | Descricao                           |
| ---------------- | ------- | ----------------------------------- |
| id               | INTEGER | PK                                  |
| nome             | TEXT    | Nome completo                       |
| apelido          | TEXT    | Apelido (como e conhecido no time)  |
| telefone         | TEXT    | Numero WhatsApp (formato: 5551...) |
| tipo             | TEXT    | "jogador" ou "socio"                |
| posicao          | TEXT    | Posicao em campo (opcional)         |
| numero_camisa    | INTEGER | Numero da camisa (opcional)         |
| data_nascimento  | TEXT    | Data de nascimento (opcional)       |
| data_entrada     | TEXT    | Data que entrou no time             |
| ativo            | INTEGER | 1=ativo, 0=inativo                  |
| excluido_envio   | INTEGER | 1=nao recebe msgs automaticas       |
| observacoes      | TEXT    | Notas livres                        |
| created_at       | TEXT    | ISO datetime                        |
| updated_at       | TEXT    | ISO datetime                        |

#### 3. `mensalidades`
| Campo         | Tipo    | Descricao                                    |
| ------------- | ------- | -------------------------------------------- |
| id            | INTEGER | PK                                           |
| jogador_id    | INTEGER | FK -> jogadores                              |
| mes_referencia| TEXT    | "2026-03" (ano-mes)                          |
| valor         | REAL    | Valor cobrado (60 ou 20)                     |
| valor_pago    | REAL    | Valor efetivamente pago                      |
| status        | TEXT    | "pendente", "pago", "atrasado", "isento"     |
| data_pagamento| TEXT    | Data que pagou (nullable)                    |
| forma_pagto   | TEXT    | "pix", "dinheiro", "transferencia"           |
| observacoes   | TEXT    | Notas                                        |
| created_at    | TEXT    | ISO datetime                                 |

#### 4. `transacoes` (fluxo de caixa)
| Campo         | Tipo    | Descricao                                    |
| ------------- | ------- | -------------------------------------------- |
| id            | INTEGER | PK                                           |
| tipo          | TEXT    | "entrada" ou "saida"                         |
| categoria     | TEXT    | "mensalidade", "evento", "cartao_baile", "patrocinio", "aluguel_campo", "material", "arbitragem", "viagem", "outros" |
| descricao     | TEXT    | Descricao da transacao                       |
| valor         | REAL    | Valor                                        |
| data          | TEXT    | Data da transacao                            |
| jogador_id    | INTEGER | FK -> jogadores (nullable, se relacionado)   |
| evento_id     | INTEGER | FK -> eventos (nullable)                     |
| comprovante   | TEXT    | URL/path do comprovante (opcional)           |
| created_at    | TEXT    | ISO datetime                                 |

#### 5. `eventos`
| Campo         | Tipo    | Descricao                                    |
| ------------- | ------- | -------------------------------------------- |
| id            | INTEGER | PK                                           |
| tipo          | TEXT    | "viagem", "baile", "confraternizacao", "torneio", "outro" |
| titulo        | TEXT    | Nome do evento                               |
| descricao     | TEXT    | Descricao detalhada                          |
| data_inicio   | TEXT    | Data inicio                                  |
| data_fim      | TEXT    | Data fim (nullable)                          |
| local         | TEXT    | Local do evento                              |
| custo_estimado| REAL    | Custo estimado total                         |
| custo_real    | REAL    | Custo real (preenchido depois)               |
| status        | TEXT    | "planejado", "em_andamento", "concluido", "cancelado" |
| created_at    | TEXT    | ISO datetime                                 |

#### 6. `evento_participantes` (controle de presenca em eventos/viagens)
| Campo       | Tipo    | Descricao                                      |
| ----------- | ------- | ---------------------------------------------- |
| id          | INTEGER | PK                                             |
| evento_id   | INTEGER | FK -> eventos                                  |
| jogador_id  | INTEGER | FK -> jogadores                                |
| status      | TEXT    | "confirmado", "recusado", "pendente", "talvez" |
| pago        | INTEGER | 1=pagou a parte dele, 0=nao                    |
| valor       | REAL    | Quanto deve/pagou                              |
| observacoes | TEXT    | Notas                                          |

#### 7. `jogos`
| Campo           | Tipo    | Descricao                          |
| --------------- | ------- | ---------------------------------- |
| id              | INTEGER | PK                                 |
| data            | TEXT    | Data do jogo                       |
| horario         | TEXT    | Horario                            |
| local           | TEXT    | Local/campo                        |
| adversario      | TEXT    | Nome do time adversario            |
| gols_favor      | INTEGER | Gols do Velhos Parceiros           |
| gols_contra     | INTEGER | Gols do adversario                 |
| tipo            | TEXT    | "amistoso", "campeonato", "torneio"|
| observacoes     | TEXT    | Notas                              |
| created_at      | TEXT    | ISO datetime                       |

#### 8. `cartoes_baile` (controle de cartoes para eventos de baile)
| Campo           | Tipo    | Descricao                          |
| --------------- | ------- | ---------------------------------- |
| id              | INTEGER | PK                                 |
| evento_id       | INTEGER | FK -> eventos (o baile em questao) |
| jogador_id      | INTEGER | FK -> jogadores                    |
| numero_inicio   | INTEGER | Numero inicial dos cartoes         |
| numero_fim      | INTEGER | Numero final dos cartoes           |
| quantidade      | INTEGER | Total de cartoes entregues         |
| vendidos        | INTEGER | Quantos ja vendeu                  |
| valor_unitario  | REAL    | Preco de cada cartao               |
| valor_acertado  | REAL    | Quanto ja acertou/devolveu         |
| status          | TEXT    | "em_posse", "acertado", "parcial"  |
| created_at      | TEXT    | ISO datetime                       |

#### 9. `promocoes`
| Campo         | Tipo    | Descricao                          |
| ------------- | ------- | ---------------------------------- |
| id            | INTEGER | PK                                 |
| titulo        | TEXT    | Nome da promocao                   |
| descricao     | TEXT    | Detalhes                           |
| tipo          | TEXT    | "desconto_mensalidade", "evento", "produto", "outro" |
| valor_desconto| REAL    | Valor ou percentual de desconto    |
| data_inicio   | TEXT    | Inicio da vigencia                 |
| data_fim      | TEXT    | Fim da vigencia                    |
| ativa         | INTEGER | 1=ativa, 0=inativa                 |
| created_at    | TEXT    | ISO datetime                       |

#### 10. `mensagens_log` (log de envios WhatsApp)
| Campo         | Tipo    | Descricao                              |
| ------------- | ------- | -------------------------------------- |
| id            | INTEGER | PK                                     |
| jogador_id    | INTEGER | FK -> jogadores                        |
| telefone      | TEXT    | Numero destino                         |
| tipo_mensagem | TEXT    | "lembrete_dia6", "aviso_dia14", "cobranca_dia20", "manual", "promocao" |
| conteudo      | TEXT    | Texto da mensagem                      |
| status        | TEXT    | "enviado", "erro", "pendente"          |
| message_id    | TEXT    | ID retornado pela uazapiGO             |
| erro_detalhe  | TEXT    | Detalhe do erro se houver              |
| enviado_em    | TEXT    | Timestamp do envio                     |

#### 11. `configuracoes` (chave-valor para configs do sistema)
| Campo | Tipo | Descricao       |
| ----- | ---- | --------------- |
| chave | TEXT | PK              |
| valor | TEXT | Valor da config |

---

## Fluxo de Mensalidades e Mensagens Automaticas

### Regras de Negocio

1. **Valor mensalidade**: Jogador = R$60 / Socio = R$20
2. **Vencimento**: Dia 15 de cada mes
3. **Apos dia 15**: Jogador passa a R$65

### Cronograma de Mensagens Automaticas

| Dia | Acao                               | Destinatarios                          |
| --- | ---------------------------------- | -------------------------------------- |
| 6   | Lembrete geral da mensalidade      | Todos jogadores ativos (exceto isentos)|
| 14  | Aviso de vencimento proximo        | Apenas quem NAO pagou ainda            |
| 20  | Cobranca para inadimplentes        | Apenas quem NAO pagou (valor = R$65)   |

### Mensagens Template

**Dia 6 - Lembrete Geral** (ja existe, sera mantido similar):
> Fala, {apelido}! Tudo bem? ⚽
> Passando pra lembrar da mensalidade...
> Jogador: R$ 60 / Socio: R$ 20
> Vencimento: dia 15. Apos dia 15, jogador passa pra R$ 65.
> PIX: pix@velhosparceiros.com.br

**Dia 14 - Aviso Pre-Vencimento** (apenas inadimplentes):
> Fala, {apelido}! Amanha vence a mensalidade.
> Valor: R$ {valor}. PIX: pix@velhosparceiros.com.br

**Dia 20 - Cobranca Atraso** (apenas inadimplentes):
> Fala, {apelido}! Sua mensalidade de {mes} esta em atraso.
> Valor com acrescimo: R$ 65,00. PIX: pix@velhosparceiros.com.br

---

## API Backend (FastAPI) - Endpoints

### Auth
| Metodo | Rota           | Descricao          |
| ------ | -------------- | ------------------- |
| POST   | /api/login     | Login (retorna JWT) |
| GET    | /api/me        | Dados do user logado|

### Jogadores
| Metodo | Rota                  | Descricao              |
| ------ | --------------------- | ---------------------- |
| GET    | /api/jogadores        | Listar todos           |
| POST   | /api/jogadores        | Criar jogador          |
| GET    | /api/jogadores/{id}   | Detalhe do jogador     |
| PUT    | /api/jogadores/{id}   | Atualizar jogador      |
| DELETE | /api/jogadores/{id}   | Desativar jogador      |

### Mensalidades
| Metodo | Rota                           | Descricao                   |
| ------ | ------------------------------ | --------------------------- |
| GET    | /api/mensalidades              | Listar (filtro por mes)     |
| POST   | /api/mensalidades              | Registrar mensalidade       |
| PUT    | /api/mensalidades/{id}         | Atualizar (marcar pago)     |
| POST   | /api/mensalidades/gerar        | Gerar mensalidades do mes   |
| GET    | /api/mensalidades/resumo/{mes} | Resumo do mes (pago/pendente)|

### Financeiro
| Metodo | Rota                     | Descricao              |
| ------ | ------------------------ | ---------------------- |
| GET    | /api/transacoes          | Listar transacoes      |
| POST   | /api/transacoes          | Criar transacao        |
| PUT    | /api/transacoes/{id}     | Atualizar transacao    |
| DELETE | /api/transacoes/{id}     | Remover transacao      |
| GET    | /api/financeiro/balanco  | Saldo + resumo         |
| GET    | /api/financeiro/fluxo    | Fluxo mensal agrupado  |

### Eventos
| Metodo | Rota                              | Descricao                    |
| ------ | --------------------------------- | ---------------------------- |
| GET    | /api/eventos                      | Listar eventos               |
| POST   | /api/eventos                      | Criar evento                 |
| PUT    | /api/eventos/{id}                 | Atualizar evento             |
| DELETE | /api/eventos/{id}                 | Remover evento               |
| GET    | /api/eventos/{id}/participantes   | Listar participantes         |
| POST   | /api/eventos/{id}/participantes   | Adicionar/atualizar presenca |

### Jogos
| Metodo | Rota              | Descricao        |
| ------ | ----------------- | ---------------- |
| GET    | /api/jogos        | Listar jogos     |
| POST   | /api/jogos        | Criar jogo       |
| PUT    | /api/jogos/{id}   | Atualizar jogo   |
| DELETE | /api/jogos/{id}   | Remover jogo     |

### Cartoes de Baile
| Metodo | Rota                 | Descricao               |
| ------ | -------------------- | ----------------------- |
| GET    | /api/cartoes         | Listar distribuicoes    |
| POST   | /api/cartoes         | Distribuir cartoes      |
| PUT    | /api/cartoes/{id}    | Atualizar vendas/acerto |
| GET    | /api/cartoes/resumo/{evento_id} | Resumo por evento |

### Promocoes
| Metodo | Rota                  | Descricao          |
| ------ | --------------------- | ------------------ |
| GET    | /api/promocoes        | Listar promocoes   |
| POST   | /api/promocoes        | Criar promocao     |
| PUT    | /api/promocoes/{id}   | Atualizar promocao |
| DELETE | /api/promocoes/{id}   | Remover promocao   |

### WhatsApp / Mensagens
| Metodo | Rota                        | Descricao                    |
| ------ | --------------------------- | ---------------------------- |
| GET    | /api/mensagens/log          | Log de mensagens enviadas    |
| POST   | /api/mensagens/enviar       | Envio manual de mensagem     |
| POST   | /api/mensagens/enviar-grupo | Envio para grupo/selecionados|
| GET    | /api/whatsapp/status        | Status da instancia uazapiGO |

### Dashboard
| Metodo | Rota               | Descricao                          |
| ------ | ------------------ | ---------------------------------- |
| GET    | /api/dashboard     | Dados agregados (saldo, pendencias)|

---

## Paginas do Frontend

### 1. Login (`/login`)
- Campos: usuario e senha
- Logo do Velhos Parceiros centralizado
- Fundo preto com detalhes em vermelho
- Redirect para /dashboard apos login

### 2. Dashboard (`/dashboard`)
- **Cards de resumo no topo**:
  - Saldo atual do time (verde/vermelho)
  - Mensalidades pendentes no mes
  - Jogadores ativos
  - Proximo evento
- **Grafico**: Fluxo de caixa ultimos 6 meses (entradas vs saidas)
- **Lista**: Ultimos 5 pagamentos recebidos
- **Lista**: Proximos jogos agendados
- **Alertas**: Mensalidades atrasadas

### 3. Jogadores (`/jogadores`)
- **Tabela**: Nome, apelido, telefone, tipo (jogador/socio), status mensalidade, acoes
- **Botao**: "+ Novo Jogador" -> abre modal/drawer
- **Filtros**: Ativos/inativos, tipo, busca por nome
- **Modal de cadastro/edicao**:
  - Nome, apelido, telefone, tipo, posicao, numero camisa
  - Data nascimento, data entrada, observacoes
  - Toggle: ativo / excluido de envio automatico

### 4. Detalhe do Jogador (`/jogadores/[id]`)
- Dados pessoais
- Historico de mensalidades (tabela com meses)
- Historico de pagamentos
- Eventos que participou
- Cartoes de baile distribuidos
- Botao: enviar mensagem WhatsApp manual

### 5. Mensalidades (`/mensalidades`)
- **Seletor de mes** no topo (< Marco 2026 >)
- **Resumo**: X pagos / Y pendentes / Z atrasados / Total arrecadado
- **Tabela por jogador**:
  - Nome | Tipo | Valor | Status (badge colorido) | Data pgto | Acoes
- **Acoes**: Marcar como pago (clique rapido), editar detalhes
- **Botao**: "Gerar mensalidades do mes" (cria registros para todos jogadores ativos)
- **Botao**: "Enviar cobrancas" (dispara msg para inadimplentes)

### 6. Financeiro (`/financeiro`)
- **Cards topo**: Saldo total | Entradas do mes | Saidas do mes
- **Grafico de barras**: Entradas vs Saidas por mes (ultimos 12 meses)
- **Tabela de transacoes** com filtros (tipo, categoria, periodo)
- **Botao**: "+ Nova Transacao" (modal: tipo, categoria, descricao, valor, data)
- **Categorias**: mensalidade, evento, cartao_baile, patrocinio, aluguel_campo, material, arbitragem, viagem, outros

### 7. Eventos (`/eventos`)
- **Cards** para cada evento (estilo kanban simples por status)
- **Filtro** por tipo: viagem, baile, confraternizacao, torneio
- **Botao**: "+ Novo Evento"
- Cada card mostra: titulo, data, tipo, custo estimado, qtd confirmados

### 8. Detalhe do Evento (`/eventos/[id]`)
- Dados do evento
- **Lista de participantes** com status (confirmado/recusado/pendente)
- Botao para adicionar/remover jogadores
- Se tipo=viagem: controle de quem vai, quem pagou
- Se tipo=baile: link para controle de cartoes
- Custo estimado vs real

### 9. Jogos (`/jogos`)
- **Tabela/lista** de jogos com resultados
- Cada jogo: data, adversario, placar, tipo, local
- **Estatisticas simples**: jogos ganhos/empatados/perdidos
- **Botao**: "+ Novo Jogo"

### 10. Cartoes de Baile (`/cartoes`)
- **Seletor de evento** (qual baile)
- **Tabela**: Jogador | Cartoes (ex: #101-#120) | Vendidos | Acertado | Status
- **Resumo**: Total cartoes distribuidos, vendidos, arrecadado
- **Botao**: "Distribuir Cartoes" (modal: jogador, numero inicio-fim, valor unitario)

### 11. Promocoes (`/promocoes`)
- **Lista de promocoes** ativas e inativas
- Titulo, descricao, tipo, valor desconto, vigencia, status
- **Botao**: "+ Nova Promocao"
- **Acao**: Enviar promocao via WhatsApp para o grupo

### 12. WhatsApp / Logs (`/whatsapp`)
- **Status da instancia**: conectado/desconectado (verifica uazapiGO)
- **Tabela de logs**: Data/hora | Destinatario | Tipo msg | Status | Erro
- **Filtros**: Por tipo de mensagem, por periodo, por status
- **Botao**: "Enviar mensagem manual" (selecionar jogadores + texto)
- **Proximos envios automaticos**: mostra calendario dos crons

### 13. Configuracoes (`/configuracoes`)
- Dados do time (nome, PIX, etc)
- Valores de mensalidade (jogador, socio, multa)
- Templates de mensagens WhatsApp (editaveis)
- Horarios dos envios automaticos
- Gerenciar usuarios do sistema

---

## Fases de Implementacao

### FASE 1 - Fundacao (Backend + Auth + DB)
**Objetivo**: Backend funcional com banco, autenticacao e CRUD basico.

1. Inicializar projeto FastAPI com SQLAlchemy + SQLite
2. Criar todos os modelos/tabelas do banco
3. Implementar auth (JWT login, middleware, hash de senha)
4. CRUD Jogadores (endpoints + validacoes)
5. Seed: criar usuario admin padrao
6. Testar endpoints com curl/httpie

**Entregavel**: API rodando em localhost:8000 com /docs (Swagger)

### FASE 2 - Fundacao Frontend (Next.js + Layout + Auth)
**Objetivo**: Frontend com layout, design system e autenticacao.

1. Inicializar Next.js 14 com Tailwind CSS
2. Configurar design system (cores, fontes, componentes base)
3. Criar layout principal (Sidebar + Header)
4. Tela de login funcional (conectada ao backend)
5. Middleware de auth no Next.js (proteger rotas)
6. Pagina de dashboard (estrutura com dados mock)

**Entregavel**: App navegavel com login e sidebar funcional

### FASE 3 - Jogadores + Mensalidades
**Objetivo**: CRUD completo de jogadores e controle de mensalidades.

1. Backend: endpoints de mensalidades
2. Frontend: pagina de jogadores (listagem + cadastro + edicao)
3. Frontend: pagina de detalhe do jogador
4. Frontend: pagina de mensalidades (tabela mensal, marcar pago)
5. Logica: gerar mensalidades automaticas do mes
6. Logica: calculo de atraso e multa

**Entregavel**: Gestao completa de jogadores e mensalidades

### FASE 4 - Financeiro
**Objetivo**: Fluxo de caixa e balanco do time.

1. Backend: endpoints de transacoes e relatorios
2. Frontend: pagina financeiro (tabela + graficos)
3. Integracao: pagamento de mensalidade gera transacao automatica
4. Dashboard: cards com saldo e resumo financeiro
5. Grafico de entradas vs saidas

**Entregavel**: Visao financeira completa do time

### FASE 5 - Eventos + Viagens + Jogos
**Objetivo**: Controle de eventos, viagens e historico de jogos.

1. Backend: CRUD eventos + participantes
2. Backend: CRUD jogos
3. Frontend: paginas de eventos (lista + detalhe + participantes)
4. Frontend: pagina de jogos (tabela + estatisticas)
5. Controle de presenca em viagens (quem vai, quem pagou)

**Entregavel**: Gestao de eventos e historico esportivo

### FASE 6 - Cartoes de Baile + Promocoes
**Objetivo**: Controle de cartoes e sistema de promocoes.

1. Backend: CRUD cartoes + resumo
2. Backend: CRUD promocoes
3. Frontend: pagina de cartoes (distribuicao, vendas, acerto)
4. Frontend: pagina de promocoes

**Entregavel**: Controle completo de cartoes e promocoes

### FASE 7 - WhatsApp (Integracao + Automatizacao)
**Objetivo**: Migrar e expandir automacao de WhatsApp.

1. Service: whatsapp_service.py (wrapper uazapiGO, substituir curl por httpx)
2. Service: mensalidade_cron.py (logica dos 3 dias: 6, 14, 20)
3. Scheduler: APScheduler configurado para os envios
4. Backend: endpoints de log e envio manual
5. Frontend: pagina de logs WhatsApp
6. Frontend: envio manual de mensagens
7. Migrar lembrete_mensalidade.py para o novo sistema

**Entregavel**: Sistema de mensagens automaticas integrado ao painel

### FASE 8 - Dashboard + Configuracoes + Polish
**Objetivo**: Dashboard rico e configuracoes do sistema.

1. Dashboard: implementar todos os cards com dados reais
2. Dashboard: graficos com dados do banco
3. Configuracoes: templates de mensagem editaveis
4. Configuracoes: valores de mensalidade
5. Responsividade basica (mobile)
6. Tratamento de erros e loading states
7. Seed de dados iniciais (jogadores do grupo atual)

**Entregavel**: Sistema completo e pronto para uso

---

## Decisoes Tecnicas

1. **FastAPI** em vez de Flask: async nativo, Swagger auto, tipagem Pydantic
2. **SQLite**: suficiente para o volume (~30 jogadores, ~50 transacoes/mes). Sem necessidade de Postgres
3. **APScheduler** para crons: roda dentro do proprio FastAPI, sem depender do crontab do SO
4. **httpx** para chamadas a uazapiGO: substituir subprocess+curl por chamadas HTTP nativas
5. **JWT simples**: sem OAuth/social login. Um admin, talvez um viewer. Cookie httponly
6. **Next.js App Router**: SSR onde faz sentido, mas maioria das paginas sera client-side (dados dinamicos)
7. **Sem ORM migrations complexas**: SQLAlchemy `create_all()` no startup (projeto pequeno)

---

---

## Frontend Design System & UI Specification

### Direcao Estetica: "Stadium Noir"

O conceito visual e **"Stadium Noir"** - um dashboard esportivo escuro e imersivo que
evoca a energia de um estadio a noite. Cortes diagonais inspirados em uniformes esportivos,
numeros em display grande estilo placar eletrônico, e acentos em vermelho vibrante que
pulsam como luzes de estadio. O resultado e um painel que respira futebol em cada pixel.

**Tom**: Escuro, ousado, industrial-esportivo. Premium mas acessivel.
**Memoravel**: Os cortes diagonais nos cards e o placar animado no dashboard.

---

### Paleta de Cores

#### Modo Escuro (Padrao)

```css
:root {
  /* === BASE === */
  --bg-primary: #0A0A0B;           /* Fundo principal - quase preto com tom quente */
  --bg-secondary: #111113;         /* Fundo de cards e paineis */
  --bg-tertiary: #1A1A1F;          /* Fundo de inputs, hover states */
  --bg-elevated: #222228;          /* Fundo elevado (modais, dropdowns) */

  /* === SUPERFICIES === */
  --surface-card: #14141A;         /* Cards padrao */
  --surface-card-hover: #1C1C24;   /* Card hover state */
  --surface-sidebar: #0D0D0F;      /* Sidebar background */
  --surface-header: #0A0A0B;       /* Header (blur + transparencia) */

  /* === BORDAS === */
  --border-subtle: #1F1F27;        /* Bordas sutis entre secoes */
  --border-default: #2A2A35;       /* Bordas de cards e inputs */
  --border-strong: #3A3A48;        /* Bordas com mais destaque */
  --border-accent: #E31E24;        /* Borda de destaque (foco, selecionado) */

  /* === MARCA === */
  --brand-red: #E31E24;            /* Vermelho primario do clube */
  --brand-red-hover: #FF2D35;      /* Vermelho hover (mais brilhante) */
  --brand-red-muted: #E31E2420;    /* Vermelho com 12% opacidade (backgrounds sutis) */
  --brand-red-glow: #E31E2440;     /* Vermelho glow para sombras */

  /* === TEXTO === */
  --text-primary: #F5F5F7;         /* Texto principal */
  --text-secondary: #8E8E9A;       /* Texto secundario */
  --text-tertiary: #5C5C6A;        /* Texto terciario (hints, placeholders) */
  --text-inverse: #0A0A0B;         /* Texto sobre fundo claro */
  --text-on-brand: #FFFFFF;        /* Texto sobre fundo vermelho */

  /* === SEMANTICAS === */
  --success: #22C55E;              /* Verde - pago, sucesso */
  --success-muted: #22C55E15;      /* Verde fundo sutil */
  --warning: #F59E0B;              /* Amarelo - pendente, atencao */
  --warning-muted: #F59E0B15;      /* Amarelo fundo sutil */
  --danger: #EF4444;               /* Vermelho - atrasado, erro */
  --danger-muted: #EF444415;       /* Vermelho fundo sutil */
  --info: #3B82F6;                 /* Azul - informacao */
  --info-muted: #3B82F615;         /* Azul fundo sutil */

  /* === GRADIENTES === */
  --gradient-brand: linear-gradient(135deg, #E31E24 0%, #B71518 100%);
  --gradient-card: linear-gradient(180deg, #14141A 0%, #111113 100%);
  --gradient-sidebar: linear-gradient(180deg, #0D0D0F 0%, #0A0A0B 100%);
  --gradient-scoreboard: linear-gradient(135deg, #E31E24 0%, #C41920 50%, #9E1219 100%);
  --gradient-diagonal: linear-gradient(135deg, var(--surface-card) 60%, var(--brand-red-muted) 100%);

  /* === SOMBRAS === */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-brand: 0 4px 24px var(--brand-red-glow);
  --shadow-card: 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px var(--border-subtle);

  /* === SPACING SCALE === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* === RADIUS === */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* === TRANSITIONS === */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

#### Modo Claro (Alternativo)

```css
[data-theme="light"] {
  --bg-primary: #F8F8FA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F0F0F4;
  --bg-elevated: #FFFFFF;
  --surface-card: #FFFFFF;
  --surface-card-hover: #FAFAFA;
  --surface-sidebar: #FFFFFF;
  --border-subtle: #E8E8EC;
  --border-default: #D4D4DC;
  --text-primary: #111113;
  --text-secondary: #6B6B78;
  --text-tertiary: #9E9EAC;
  /* ...marca e semanticas permanecem iguais */
}
```

---

### Tipografia

```
Fontes a instalar via Google Fonts / next/font:

1. TITULOS/DISPLAY:   "Oswald"         (condensada, bold, caixa alta - estilo placar esportivo)
2. CORPO/UI:          "DM Sans"        (geometrica, clean, otima legibilidade)
3. NUMEROS/DADOS:     "JetBrains Mono" (monoespacada, numeros tabulares para valores e placares)
```

#### Hierarquia Tipografica

| Nivel              | Fonte          | Peso | Tamanho     | Letter-Spacing | Transform   | Uso                                        |
| ------------------ | -------------- | ---- | ----------- | -------------- | ----------- | ------------------------------------------ |
| Display XXL        | Oswald         | 700  | 72px / 1.0  | -0.02em        | uppercase   | Placar de jogos, numero grande no dashboard |
| Display XL         | Oswald         | 700  | 48px / 1.1  | -0.02em        | uppercase   | Titulo de pagina hero                       |
| H1                 | Oswald         | 600  | 32px / 1.2  | -0.01em        | uppercase   | Titulos de secao                            |
| H2                 | Oswald         | 600  | 24px / 1.3  | -0.01em        | uppercase   | Subtitulos                                  |
| H3                 | DM Sans        | 600  | 20px / 1.4  | 0              | none        | Titulos de cards                            |
| H4                 | DM Sans        | 600  | 16px / 1.4  | 0              | none        | Labels de secao                             |
| Body LG            | DM Sans        | 400  | 16px / 1.6  | 0              | none        | Texto principal                             |
| Body               | DM Sans        | 400  | 14px / 1.5  | 0              | none        | Texto padrao em tabelas e forms             |
| Body SM            | DM Sans        | 400  | 13px / 1.5  | 0              | none        | Texto secundario, captions                  |
| Caption            | DM Sans        | 500  | 11px / 1.4  | 0.05em         | uppercase   | Labels pequenos, badges, overlines          |
| Mono LG            | JetBrains Mono | 700  | 32px / 1.0  | -0.02em        | none        | Valores financeiros grandes (saldo)         |
| Mono               | JetBrains Mono | 500  | 14px / 1.4  | 0              | none        | Valores em tabela, IDs, telefones           |
| Mono SM            | JetBrains Mono | 400  | 12px / 1.4  | 0              | none        | Timestamps, log entries                     |

---

### Componentes UI

#### 1. Sidebar (`280px` fixa, colapsavel para `72px`)

```
Estetica: Painel lateral escuro com borda sutil a direita.
Logo do clube no topo com glow vermelho sutil.
Itens de navegacao com icone + label.
Item ativo: fundo vermelho muted + borda esquerda vermelha 3px + texto branco.
Item hover: fundo bg-tertiary.
Separadores visuais entre grupos de links.
Icone de colapsar no rodape.

Estrutura:
┌─────────────────────────┐
│  [LOGO] VELHOS PARCEIROS│  <- Oswald 600, 14px, uppercase, tracking wide
│         F.C.            │
├─────────────────────────┤
│                         │
│  ◉ Dashboard            │  <- Item ativo (fundo vermelho muted)
│  ○ Jogadores            │
│  ○ Mensalidades         │
│  ○ Financeiro           │
│                         │
│  ── EVENTOS ──          │  <- Overline separator (Caption style)
│  ○ Eventos              │
│  ○ Jogos                │
│  ○ Cartoes de Baile     │
│                         │
│  ── COMUNICACAO ──      │
│  ○ Promocoes            │
│  ○ WhatsApp             │
│                         │
│  ── SISTEMA ──          │
│  ○ Configuracoes        │
│                         │
├─────────────────────────┤
│  [<<] Recolher          │  <- Colapsa para so icones (72px)
│  [Avatar] Jonathan      │  <- Mini perfil + logout
└─────────────────────────┘

Icones: Lucide React (consistente, clean, 20px stroke-width 1.5)
```

#### 2. Header (por pagina, nao fixo global)

```
Cada pagina tem seu proprio header contextual:

┌──────────────────────────────────────────────────────────┐
│  JOGADORES                          [Buscar...]  [+ Novo]│
│  Gerencie o elenco do Velhos Parceiros            ↓      │
│                                                   Filtros │
└──────────────────────────────────────────────────────────┘

- Titulo: Oswald 600, 32px, uppercase
- Subtitulo: DM Sans 400, 14px, text-secondary
- Acoes alinhadas a direita
- Breadcrumb sutil acima do titulo quando em paginas internas
```

#### 3. Stats Card (Dashboard)

```
Elemento assinatura: corte diagonal no canto superior direito.
Fundo com gradiente sutil diagonal.
Numero grande em fonte mono.

┌────────────────────────╱╱─┐
│  SALDO DO TIME          ╱ │  <- Corte diagonal (clip-path ou pseudo-element)
│                        ╱  │
│  R$ 4.280,00              │  <- JetBrains Mono 700, 32px, text-primary
│  ▲ +R$ 1.200 este mes     │  <- DM Sans 400, 13px, cor success
│                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━  │  <- Barra de progresso sutil (opcional)
└────────────────────────────┘

Variantes por tipo:
- Saldo:        borda-top vermelho (#E31E24), icone Wallet
- Mensalidades: borda-top amarelo (#F59E0B), icone Calendar
- Jogadores:    borda-top azul (#3B82F6), icone Users
- Eventos:      borda-top verde (#22C55E), icone Trophy

CSS do corte diagonal:
  clip-path: polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%);
  OU
  pseudo-element com skew no canto

Hover: shadow-brand + translateY(-2px) + borda-top brilha mais
Transicao: transition-spring
```

#### 4. Data Table

```
Estetica: Limpa, sem bordas externas, linhas separadoras sutis.
Header da tabela com fundo bg-tertiary e texto Caption style.
Linhas com hover state sutil.
Acoes por linha com icones discretos.

┌──────────────────────────────────────────────────────────────┐
│  NOME          APELIDO     TIPO      STATUS     ACOES       │  <- Caption, uppercase
├──────────────────────────────────────────────────────────────┤
│  Carlos Silva  Carlão      Jogador   ● Pago     [✎] [👁]   │  <- Body, badge colorido
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  <- border-subtle dashed
│  João Santos   Joãozinho   Jogador   ● Pendente [✎] [👁]   │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  Pedro Lima    Pedrinho    Sócio     ● Atrasado [✎] [👁]   │
└──────────────────────────────────────────────────────────────┘
│  Mostrando 1-10 de 28                     < 1 2 3 >         │

Status badges:
  ● Pago     -> bg: success-muted, text: success, dot verde
  ● Pendente -> bg: warning-muted, text: warning, dot amarelo
  ● Atrasado -> bg: danger-muted,  text: danger,  dot vermelho
  ● Isento   -> bg: info-muted,    text: info,    dot azul

Row hover: bg-surface-card-hover
Row selecionada: bg-brand-red-muted + border-left 3px brand-red
```

#### 5. Scoreboard Card (Jogos)

```
Inspirado no template do Instagram do clube.
Fundo com gradiente escuro + textura noise.
Placar central em Display XXL.

┌──────────────────────────────────────────┐
│           RESULTADO  FINAL               │  <- Oswald 600, 14px, tracking widest
│                                          │
│    VELHOS         3 × 1        ADVERSÁRIO│  <- Display XXL para numeros
│   PARCEIROS                              │
│    [logo]                       [logo]   │
│                                          │
│  ⚽ Carlão (2), Pedrinho (1)             │  <- DM Sans 400, 13px
│  📅 15/03/2026  📍 Campo Municipal       │
└──────────────────────────────────────────┘

Background: gradient-scoreboard com overlay de pattern sutil (diagonal lines)
Numeros do placar: Oswald 700, 72px, branco com text-shadow vermelho
O "x" entre os numeros: DM Sans 300, 24px, text-secondary
Borda inferior vermelha 3px
```

#### 6. Botoes

```
Primary (vermelho):
  bg: gradient-brand
  text: branco, DM Sans 500, 14px
  padding: 10px 20px
  radius: radius-md
  hover: shadow-brand + brightness 1.1
  active: scale(0.98)
  transition: transition-fast

Secondary (ghost):
  bg: transparente
  border: 1px border-default
  text: text-primary, DM Sans 500, 14px
  hover: bg-tertiary
  active: scale(0.98)

Danger:
  bg: danger
  text: branco
  hover: brightness 1.1

Icon Button:
  bg: transparente
  padding: 8px
  radius: radius-sm
  hover: bg-tertiary
  icone: 18px, text-secondary -> text-primary no hover

Tamanhos: sm (32px h), md (40px h), lg (48px h)
```

#### 7. Inputs & Forms

```
Input padrao:
  bg: bg-tertiary
  border: 1px border-default
  radius: radius-md
  padding: 10px 14px
  text: DM Sans 400, 14px
  placeholder: text-tertiary
  focus: border-accent + ring 2px brand-red-muted
  transition: transition-fast

Select:
  Mesmo estilo do input + seta customizada
  Dropdown: bg-elevated, shadow-lg, radius-md, border border-default

Label:
  DM Sans 500, 13px, text-secondary, margin-bottom 6px

Error state:
  border: danger
  Helper text: DM Sans 400, 12px, danger
```

#### 8. Modal / Drawer

```
Modal:
  Overlay: bg preto 60% com backdrop-blur(8px)
  Container: bg-elevated, radius-lg, shadow-lg, border border-subtle
  Header: titulo H2 + botao fechar (X)
  Body: padding space-lg
  Footer: acoes alinhadas a direita, gap space-sm
  Animacao entrada: fade in + scale de 0.95 para 1.0 (transition-base)
  Animacao saida: fade out + scale para 0.95

Drawer (para mobile / formularios longos):
  Desliza da direita, largura 480px max
  Mesmo estilo do modal
  Animacao: translateX(100%) -> translateX(0)
```

#### 9. Badge / Tag

```
Status badge (inline):
  padding: 4px 10px
  radius: radius-full
  font: Caption style (11px, uppercase, 500)
  dot colorido 6px antes do texto

Tipo badge:
  "JOGADOR" -> bg: brand-red-muted, text: brand-red
  "SOCIO"   -> bg: info-muted, text: info

Numero badge (contadores):
  bg: brand-red
  text: branco
  min-width: 20px, height: 20px
  radius: full
  font: DM Sans 600, 11px
  Usado na sidebar para notificacoes (ex: 5 mensalidades pendentes)
```

#### 10. Toast / Notificacao

```
Posicao: bottom-right, empilhaveis
bg: bg-elevated
border: 1px border-default + borda esquerda 3px (cor semantica)
radius: radius-md
shadow: shadow-lg
Icone + mensagem + botao fechar
Animacao: slide in da direita + fade
Auto-dismiss: 5s com progress bar sutil no bottom
```

---

### Animacoes e Micro-interacoes

#### Page Load (Staggered Reveal)

```
Ao entrar em qualquer pagina:
1. Header fade-in + translateY(-10px) -> 0  (delay: 0ms)
2. Stats cards: fade-in + translateY(20px) -> 0 (delay: 100ms, 150ms, 200ms, 250ms - staggered)
3. Tabela/conteudo: fade-in + translateY(20px) -> 0 (delay: 300ms)
4. Sidebar item ativo: borda esquerda expande de 0 para 3px (transition-fast)

Duracao base: 400ms
Easing: cubic-bezier(0.16, 1, 0.3, 1) - ease-out forte
```

#### Numero Animado (Count Up)

```
Nos stats cards do dashboard, os numeros fazem "count up":
- Saldo: 0 -> R$ 4.280,00 em 800ms
- Jogadores: 0 -> 28 em 600ms
- Pendentes: 0 -> 12 em 600ms

Usar: framer-motion useMotionValue + useTransform
OU: react-countup com easing
```

#### Hover States

```
Cards: translateY(-2px) + shadow-md -> shadow-lg (transition-base)
Botoes: brightness + shadow (transition-fast)
Linhas da tabela: bg sutil (transition-fast)
Links da sidebar: bg + border-left (transition-fast)
Badges: scale(1.05) sutil (transition-fast)
```

#### Transicoes de Pagina

```
Usar framer-motion AnimatePresence no layout:
- Saida: opacity 0 + translateY(-10px), duracao 200ms
- Entrada: opacity 1 + translateY(0), duracao 300ms, delay 100ms
```

#### Loading States

```
Skeleton screens (nao spinners):
- Cards: retangulos com gradiente animado (shimmer effect)
- Tabelas: linhas skeleton com alturas variaveis
- Shimmer: background linear-gradient animando translateX

Cor do skeleton: bg-tertiary com highlight de bg-secondary
Animacao: 1.5s infinite ease-in-out
```

---

### Layout das Paginas (Detalhado)

#### Login

```
Tela inteira, dividida:

Fundo: bg-primary com pattern sutil de linhas diagonais (45deg, 1px, border-subtle, gap 40px)
Centralizado: card de login

┌─────────────────────────────────────┐
│                                     │
│         [LOGO DO CLUBE]             │  <- 120px, com glow vermelho sutil
│                                     │
│      VELHOS PARCEIROS F.C.          │  <- Oswald 700, 24px, uppercase
│        AREA ADMINISTRATIVA          │  <- Caption style, text-secondary
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Usuario                      │  │  <- Input com icone User
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Senha                        │  │  <- Input com icone Lock + toggle visibility
│  └───────────────────────────────┘  │
│                                     │
│  [████████ ENTRAR ████████████████] │  <- Botao primary full-width
│                                     │
│   Esqueci minha senha (link)        │  <- text-tertiary, sm
│                                     │
└─────────────────────────────────────┘

Animacao de entrada: logo pulsa glow vermelho 1x, card fade-in scale
Efeito: linhas diagonais do fundo animam lentamente (translateX)
```

#### Dashboard

```
Layout grid 12 colunas:

Row 1: Saudacao + data
┌──────────────────────────────────────────────────────────────┐
│  Fala, Jonathan!                     Sexta, 13 de Marco 2026│
│  Aqui esta o resumo do Velhos Parceiros.                     │
└──────────────────────────────────────────────────────────────┘

Row 2: 4 Stats Cards (3 colunas cada)
┌──────────────╱─┐ ┌──────────────╱─┐ ┌──────────────╱─┐ ┌──────────────╱─┐
│ SALDO        ╱ │ │ MENSALIDADES ╱ │ │ JOGADORES    ╱ │ │ PROX. EVENTO ╱ │
│ R$ 4.280    ╱  │ │ 8 pendentes ╱  │ │ 28 ativos   ╱  │ │ Viagem SC   ╱  │
│ ▲ +12%         │ │ de 28 total    │ │ 2 inativos     │ │ em 15 dias     │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘

Row 3: Grafico (8 col) + Proximos Jogos (4 col)
┌────────────────────────────────────────┐ ┌────────────────────────┐
│  FLUXO DE CAIXA                        │ │  PROXIMOS JOGOS        │
│                                        │ │                        │
│  ████  ████  ████  ████  ████  ████    │ │  15/03 vs Amigos FC    │
│  ████  ████  ████  ████  ████  ████    │ │  22/03 vs Veteranos    │
│  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓ │ │  29/03 vs Unidos FC    │
│  Out   Nov   Dez   Jan   Fev   Mar    │ │                        │
│                                        │ │  [Ver todos ->]        │
│  ████ Entradas  ▓▓▓▓ Saidas            │ │                        │
└────────────────────────────────────────┘ └────────────────────────┘

Row 4: Pagamentos Recentes (6 col) + Alertas (6 col)
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  ULTIMOS PAGAMENTOS          │ │  ⚠ ATENCAO                   │
│                              │ │                              │
│  Carlão   R$60  Pago  hoje   │ │  5 mensalidades atrasadas    │
│  Pedrinho R$60  Pago  ontem  │ │  Envio dia 20 em 7 dias      │
│  Marcos   R$20  Pago  12/03  │ │  Baile: 40 cartoes pendentes │
│  ...                         │ │                              │
└──────────────────────────────┘ └──────────────────────────────┘

Graficos: usar Recharts (integra bem com React)
- BarChart para fluxo de caixa (vermelho = entradas, cinza = saidas)
- Barra com radius-sm no topo
- Grid lines sutis (border-subtle)
- Tooltip estilizado com bg-elevated
```

#### Mensalidades

```
Layout com seletor de mes e tabela principal:

┌──────────────────────────────────────────────────────────────┐
│  MENSALIDADES                          [< Fev] Marco 2026 [Abr >]
│  Controle mensal de pagamentos
└──────────────────────────────────────────────────────────────┘

┌──────────────╱─┐ ┌──────────────╱─┐ ┌──────────────╱─┐ ┌──────────────╱─┐
│ PAGOS        ╱ │ │ PENDENTES    ╱ │ │ ATRASADOS    ╱ │ │ ARRECADADO   ╱ │
│ 16           ╱  │ │ 8            ╱  │ │ 4            ╱  │ │ R$ 1.180    ╱  │
│ de 28           │ │ de 28           │ │ de 28           │ │ de R$ 1.760    │
│ ━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━ │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
     (verde)            (amarelo)          (vermelho)         (vermelho)

┌──────────────────────────────────────────────────────────────┐
│ [Gerar Mensalidades]  [Enviar Cobrancas]     Buscar: [____] │
├──────────────────────────────────────────────────────────────┤
│  JOGADOR      TIPO      VALOR    STATUS       DATA    ACAO  │
├──────────────────────────────────────────────────────────────┤
│  Carlão       Jogador   R$60     ● Pago       10/03   [✎]  │
│  Pedrinho     Jogador   R$65     ● Atrasado    -      [$✓] │  <- Botao "marcar pago" rapido
│  Marcos       Sócio     R$20     ● Pendente    -      [$✓] │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘

Marcar como pago:
- Clique no botao [$✓] abre mini-popover:
  - Forma: PIX / Dinheiro / Transferencia
  - Valor pago (pre-preenchido)
  - [Confirmar]
- Ao confirmar: linha muda status com animacao (slide cor)
```

#### Financeiro

```
┌──────────────────────────────────────────────────────────────┐
│  FINANCEIRO                               [+ Nova Transacao] │
│  Fluxo de caixa e balanco do time                            │
└──────────────────────────────────────────────────────────────┘

┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│  SALDO TOTAL       │ │  ENTRADAS (Marco)  │ │  SAIDAS (Marco)    │
│  R$ 4.280,00       │ │  R$ 1.680,00       │ │  R$ 480,00         │
│  ▲ Positivo        │ │  ▲ +15% vs fev     │ │  ▼ -8% vs fev      │
└────────────────────┘ └────────────────────┘ └────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  FLUXO MENSAL (ultimos 12 meses)                             │
│  [Grafico de barras duplas - Entradas vs Saidas]             │
│  ████  ████  ████  ████  ████  ████  ████  ████             │
│  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  [Todas] [Entradas] [Saidas]    Categoria: [Todas ▼]        │
│  Periodo: [01/03 - 31/03]                                    │
├──────────────────────────────────────────────────────────────┤
│  DATA     DESCRICAO                 CATEGORIA    VALOR       │
├──────────────────────────────────────────────────────────────┤
│  13/03    Mensalidade - Carlão      Mensalidade  +R$ 60,00  │  <- verde
│  12/03    Aluguel campo semanal     Aluguel      -R$ 150,00 │  <- vermelho
│  10/03    Mensalidade - Marcos      Mensalidade  +R$ 20,00  │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘

Valores positivos: text-success
Valores negativos: text-danger
```

---

### Bibliotecas Frontend (adicionar ao package.json)

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "tailwindcss": "^3.4",
    "framer-motion": "^11",          // Animacoes de pagina, modais, listas
    "recharts": "^2.12",             // Graficos (BarChart, LineChart, PieChart)
    "lucide-react": "^0.400",        // Icones consistentes
    "@tanstack/react-table": "^8",   // Tabelas com sort, filter, pagination
    "date-fns": "^3",                // Formatacao de datas em pt-BR
    "react-hot-toast": "^2.4",       // Toast notifications
    "next-themes": "^0.3",           // Dark/light mode toggle
    "clsx": "^2",                    // Class merging
    "tailwind-merge": "^2"           // Tailwind class dedup
  }
}
```

---

### Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E31E24",
          "red-hover": "#FF2D35",
          "red-muted": "rgba(227, 30, 36, 0.12)",
          "red-glow": "rgba(227, 30, 36, 0.25)",
        },
        surface: {
          primary: "#0A0A0B",
          secondary: "#111113",
          tertiary: "#1A1A1F",
          elevated: "#222228",
          card: "#14141A",
          "card-hover": "#1C1C24",
          sidebar: "#0D0D0F",
        },
        border: {
          subtle: "#1F1F27",
          default: "#2A2A35",
          strong: "#3A3A48",
        },
        text: {
          primary: "#F5F5F7",
          secondary: "#8E8E9A",
          tertiary: "#5C5C6A",
        },
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(31,31,39,1)",
        brand: "0 4px 24px rgba(227,30,36,0.25)",
      },
      animation: {
        "fade-in": "fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right": "slideRight 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.5s infinite ease-in-out",
        "count-up": "countUp 800ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### Icones por Secao (Lucide React)

| Pagina         | Icone Sidebar       | Uso                       |
| -------------- | ------------------- | ------------------------- |
| Dashboard      | `LayoutDashboard`   | Visao geral               |
| Jogadores      | `Users`             | Gestao de elenco          |
| Mensalidades   | `CreditCard`        | Controle de pagamentos    |
| Financeiro     | `Wallet`            | Fluxo de caixa            |
| Eventos        | `Calendar`          | Gestao de eventos         |
| Jogos          | `Trophy`            | Historico de partidas     |
| Cartoes Baile  | `Ticket`            | Controle de cartoes       |
| Promocoes      | `Megaphone`         | Divulgacao                |
| WhatsApp       | `MessageCircle`     | Logs de mensagens         |
| Configuracoes  | `Settings`          | Ajustes do sistema        |

---

### Efeitos Especiais

#### 1. Diagonal Cut Pattern (Assinatura Visual)

Corte diagonal no canto superior direito dos cards usando `clip-path`:

```css
.card-diagonal {
  clip-path: polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 0 100%);
}
```

Aplicar em: Stats Cards, Scoreboard Cards, Header de pagina.
O angulo de 45 graus remete a faixas diagonais de uniformes esportivos.

#### 2. Red Glow Pulse (Logo na Sidebar)

```css
.logo-glow {
  filter: drop-shadow(0 0 20px rgba(227, 30, 36, 0.4));
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 15px rgba(227, 30, 36, 0.3)); }
  50%      { filter: drop-shadow(0 0 25px rgba(227, 30, 36, 0.5)); }
}
```

#### 3. Diagonal Lines Background (Login + Header areas)

```css
.bg-diagonal-lines {
  background-image: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 39px,
    rgba(227, 30, 36, 0.03) 39px,
    rgba(227, 30, 36, 0.03) 40px
  );
}
```

#### 4. Noise Texture Overlay

```css
.noise-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,..."); /* inline noise SVG */
  pointer-events: none;
}
```

#### 5. Status Transition (Mensalidades)

Quando um jogador e marcado como "pago", a linha da tabela faz:
1. Flash verde sutil (bg success-muted por 500ms)
2. Badge transiciona de "Pendente" amarelo para "Pago" verde com scale bounce
3. Valor atualiza com count-up se mudou

---

### Responsividade

| Breakpoint | Largura    | Layout                                     |
| ---------- | ---------- | ------------------------------------------ |
| Mobile     | < 768px    | Sidebar vira bottom nav. Cards empilham.   |
| Tablet     | 768-1024px | Sidebar colapsada (72px). Grid 2 colunas.  |
| Desktop    | > 1024px   | Sidebar expandida (280px). Grid completo.  |

Mobile bottom nav: 5 icones principais (Dashboard, Jogadores, Mensalidades, Financeiro, Menu).
"Menu" abre drawer com demais opcoes.

---

### Estrutura de Componentes (Adicional)

```
frontend/src/components/
├── ui/
│   ├── Button.tsx              # Primary, Secondary, Danger, Ghost, Icon
│   ├── Input.tsx               # Text, Password, Search (com icone)
│   ├── Select.tsx              # Custom select dropdown
│   ├── Badge.tsx               # Status, Type, Counter
│   ├── Card.tsx                # Base card + DiagonalCard variant
│   ├── Modal.tsx               # Overlay + Container animado
│   ├── Drawer.tsx              # Slide-in lateral
│   ├── Table.tsx               # Wrapper TanStack Table estilizado
│   ├── Skeleton.tsx            # Loading skeleton components
│   ├── Toast.tsx               # Notificacao wrapper
│   ├── Popover.tsx             # Mini menus contextuais
│   ├── DatePicker.tsx          # Seletor de data simples
│   ├── MonthSelector.tsx       # Navegador < Mes Ano >
│   ├── ProgressBar.tsx         # Barra de progresso (mensalidades)
│   └── EmptyState.tsx          # Ilustracao quando nao ha dados
├── layout/
│   ├── Sidebar.tsx             # Navegacao lateral completa
│   ├── SidebarItem.tsx         # Item individual da sidebar
│   ├── Header.tsx              # Header contextual por pagina
│   ├── MobileNav.tsx           # Bottom navigation mobile
│   └── PageTransition.tsx      # AnimatePresence wrapper
├── dashboard/
│   ├── StatsCard.tsx           # Card com corte diagonal
│   ├── CashFlowChart.tsx       # Grafico Recharts entradas/saidas
│   ├── RecentPayments.tsx      # Lista ultimos pagamentos
│   ├── UpcomingGames.tsx       # Lista proximos jogos
│   └── AlertsPanel.tsx         # Painel de alertas/atencao
├── jogadores/
│   ├── PlayerForm.tsx          # Formulario cadastro/edicao
│   ├── PlayerCard.tsx          # Card resumo do jogador
│   └── PlayerHistory.tsx       # Historico no detalhe
├── mensalidades/
│   ├── MensalidadeTable.tsx    # Tabela mensal
│   ├── QuickPayPopover.tsx     # Popover "marcar pago"
│   └── MensalidadeStats.tsx    # Cards resumo do mes
├── financeiro/
│   ├── TransactionForm.tsx     # Modal nova transacao
│   ├── TransactionTable.tsx    # Tabela com filtros
│   └── BalanceChart.tsx        # Grafico mensal
├── jogos/
│   └── ScoreboardCard.tsx      # Card resultado estilo Instagram
└── whatsapp/
    ├── StatusIndicator.tsx     # Bolinha verde/vermelha conexao
    ├── MessageLog.tsx          # Tabela de logs
    └── ManualSendForm.tsx      # Form envio manual
```

---

## Pronto para Iniciar?

Confirme se o plano esta alinhado com sua visao. Posso ajustar qualquer parte antes de comecar a implementacao. Sugestoes incluidas no plano:

- **Estatisticas de jogos** (W/D/L record)
- **Controle de presenca em viagens** (quem vai, quem pagou)
- **Envio manual de mensagens** pelo painel
- **Templates editaveis** de mensagens
- **Categorias financeiras** bem definidas para relatorios
- **Badge de status** visual nas mensalidades (pago=verde, pendente=amarelo, atrasado=vermelho)
- **Design "Stadium Noir"** - tema escuro esportivo com cortes diagonais e glow vermelho
