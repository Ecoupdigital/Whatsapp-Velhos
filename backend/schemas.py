from pydantic import BaseModel
from typing import Optional


# === Auth ===

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UsuarioOut"

class UsuarioOut(BaseModel):
    id: int
    username: str
    nome: str
    role: str

    class Config:
        from_attributes = True


# === Jogadores ===

class JogadorCreate(BaseModel):
    nome: str
    apelido: Optional[str] = None
    telefone: Optional[str] = None
    tipo: str = "jogador"
    posicao: Optional[str] = None
    numero_camisa: Optional[int] = None
    data_nascimento: Optional[str] = None
    data_entrada: Optional[str] = None
    ativo: int = 1
    excluido_envio: int = 0
    excluido_mensalidade: int = 0
    observacoes: Optional[str] = None

class JogadorUpdate(BaseModel):
    nome: Optional[str] = None
    apelido: Optional[str] = None
    telefone: Optional[str] = None
    tipo: Optional[str] = None
    posicao: Optional[str] = None
    numero_camisa: Optional[int] = None
    data_nascimento: Optional[str] = None
    data_entrada: Optional[str] = None
    ativo: Optional[int] = None
    excluido_envio: Optional[int] = None
    excluido_mensalidade: Optional[int] = None
    observacoes: Optional[str] = None

class JogadorOut(BaseModel):
    id: int
    nome: str
    apelido: Optional[str]
    telefone: Optional[str]
    tipo: str
    posicao: Optional[str]
    numero_camisa: Optional[int]
    data_nascimento: Optional[str]
    data_entrada: Optional[str]
    ativo: int
    excluido_envio: int
    excluido_mensalidade: int = 0
    observacoes: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


# === Mensalidades ===

class MensalidadeCreate(BaseModel):
    jogador_id: int
    mes_referencia: str
    valor: float
    status: str = "pendente"

class MensalidadeUpdate(BaseModel):
    valor: Optional[float] = None
    valor_pago: Optional[float] = None
    status: Optional[str] = None
    data_pagamento: Optional[str] = None
    forma_pagto: Optional[str] = None
    observacoes: Optional[str] = None
    conta_id: Optional[int] = None

class MensalidadeOut(BaseModel):
    id: int
    jogador_id: int
    mes_referencia: str
    valor: float
    valor_pago: float
    status: str
    data_pagamento: Optional[str]
    forma_pagto: Optional[str]
    observacoes: Optional[str]
    conta_id: Optional[int] = None
    created_at: Optional[str]
    jogador: Optional[JogadorOut] = None

    class Config:
        from_attributes = True

class GerarMensalidadesRequest(BaseModel):
    mes_referencia: str  # "2026-03"

class MensalidadeResumo(BaseModel):
    mes: str
    total_jogadores: int
    pagos: int
    pendentes: int
    atrasados: int
    isentos: int
    valor_esperado: float
    valor_arrecadado: float


# === Contas ===

class ContaCreate(BaseModel):
    nome: str
    tipo: str = "dinheiro"  # dinheiro | banco
    saldo_inicial: float = 0

class ContaUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    saldo_inicial: Optional[float] = None
    ativo: Optional[int] = None

class ContaOut(BaseModel):
    id: int
    nome: str
    tipo: str
    saldo_inicial: float
    ativo: int
    saldo_atual: float = 0
    created_at: Optional[str]

    class Config:
        from_attributes = True

class ContaSaldo(BaseModel):
    nome: str
    tipo: str
    saldo: float


# === Transacoes ===

class TransacaoCreate(BaseModel):
    tipo: str  # entrada | saida
    categoria: str
    descricao: Optional[str] = None
    valor: float
    data: str
    jogador_id: Optional[int] = None
    evento_id: Optional[int] = None
    conta_id: Optional[int] = None

class TransacaoUpdate(BaseModel):
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    data: Optional[str] = None
    jogador_id: Optional[int] = None
    evento_id: Optional[int] = None
    conta_id: Optional[int] = None

class TransacaoOut(BaseModel):
    id: int
    tipo: str
    categoria: str
    descricao: Optional[str]
    valor: float
    data: str
    jogador_id: Optional[int]
    evento_id: Optional[int]
    conta_id: Optional[int] = None
    mensalidade_id: Optional[int] = None
    comprovante: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True

class BalancoOut(BaseModel):
    saldo_total: float
    entradas_mes: float
    saidas_mes: float
    variacao_percentual: Optional[float]
    saldos_por_conta: list["ContaSaldo"] = []

class FluxoMensal(BaseModel):
    mes: str
    entradas: float
    saidas: float


# === Eventos ===

class EventoCreate(BaseModel):
    tipo: str
    titulo: str
    descricao: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    local: Optional[str] = None
    custo_estimado: float = 0
    status: str = "planejado"

class EventoUpdate(BaseModel):
    tipo: Optional[str] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    local: Optional[str] = None
    custo_estimado: Optional[float] = None
    custo_real: Optional[float] = None
    status: Optional[str] = None

class EventoOut(BaseModel):
    id: int
    tipo: str
    titulo: str
    descricao: Optional[str]
    data_inicio: Optional[str]
    data_fim: Optional[str]
    local: Optional[str]
    custo_estimado: float
    custo_real: float
    status: str
    created_at: Optional[str]

    class Config:
        from_attributes = True

class ParticipanteUpdate(BaseModel):
    jogador_id: int
    status: str = "pendente"
    pago: int = 0
    valor: float = 0
    observacoes: Optional[str] = None

class ParticipanteOut(BaseModel):
    id: int
    evento_id: int
    jogador_id: int
    status: str
    pago: int
    valor: float
    observacoes: Optional[str]
    jogador: Optional[JogadorOut] = None

    class Config:
        from_attributes = True


# === Jogos ===

class JogoCreate(BaseModel):
    data: str
    horario: Optional[str] = None
    local: Optional[str] = None
    adversario: str
    gols_favor: int = 0
    gols_contra: int = 0
    tipo: str = "amistoso"
    observacoes: Optional[str] = None
    realizado: Optional[int] = 0
    gols_descricao: Optional[str] = None
    assistencias: Optional[str] = None
    destaque: Optional[str] = None

class JogoUpdate(BaseModel):
    data: Optional[str] = None
    horario: Optional[str] = None
    local: Optional[str] = None
    adversario: Optional[str] = None
    gols_favor: Optional[int] = None
    gols_contra: Optional[int] = None
    tipo: Optional[str] = None
    observacoes: Optional[str] = None
    realizado: Optional[int] = None
    gols_descricao: Optional[str] = None
    assistencias: Optional[str] = None
    destaque: Optional[str] = None

class JogoOut(BaseModel):
    id: int
    data: str
    horario: Optional[str]
    local: Optional[str]
    adversario: str
    gols_favor: int
    gols_contra: int
    tipo: str
    observacoes: Optional[str]
    realizado: Optional[int] = 0
    gols_descricao: Optional[str] = None
    assistencias: Optional[str] = None
    destaque: Optional[str] = None
    created_at: Optional[str]

    class Config:
        from_attributes = True

class JogoEstatisticas(BaseModel):
    total: int
    vitorias: int
    empates: int
    derrotas: int
    gols_marcados: int
    gols_sofridos: int

class RankingEntry(BaseModel):
    nome: str
    quantidade: int

class RankingsOut(BaseModel):
    artilharia: list[RankingEntry]
    assistencias: list[RankingEntry]
    destaques: list[RankingEntry]


# === Cartoes de Baile ===

class CartaoCreate(BaseModel):
    evento_id: int
    jogador_id: int
    numero_inicio: int
    numero_fim: int
    valor_unitario: float

class CartaoUpdate(BaseModel):
    vendidos: Optional[int] = None
    valor_acertado: Optional[float] = None
    status: Optional[str] = None

class CartaoOut(BaseModel):
    id: int
    evento_id: int
    jogador_id: int
    numero_inicio: int
    numero_fim: int
    quantidade: int
    vendidos: int
    valor_unitario: float
    valor_acertado: float
    status: str
    created_at: Optional[str]
    jogador: Optional[JogadorOut] = None

    class Config:
        from_attributes = True

class CartaoResumo(BaseModel):
    evento_id: int
    total_cartoes: int
    total_vendidos: int
    total_arrecadado: float
    total_acertado: float


# === Promocoes ===

class PromocaoCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    tipo: str
    valor_desconto: float = 0
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    ativa: int = 1

class PromocaoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    valor_desconto: Optional[float] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    ativa: Optional[int] = None

class PromocaoOut(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str]
    tipo: str
    valor_desconto: float
    data_inicio: Optional[str]
    data_fim: Optional[str]
    ativa: int
    created_at: Optional[str]

    class Config:
        from_attributes = True


# === WhatsApp ===

class EnviarMensagemRequest(BaseModel):
    jogador_ids: list[int]
    texto: str

class MensagemLogOut(BaseModel):
    id: int
    jogador_id: Optional[int]
    telefone: Optional[str]
    tipo_mensagem: Optional[str]
    conteudo: Optional[str]
    status: str
    message_id: Optional[str]
    erro_detalhe: Optional[str]
    enviado_em: Optional[str]

    class Config:
        from_attributes = True

class WhatsAppStatus(BaseModel):
    connected: bool
    phone_number: Optional[str]


# === Dashboard ===

class DashboardData(BaseModel):
    saldo_total: float
    mensalidades_pendentes: int
    mensalidades_total: int
    jogadores_ativos: int
    jogadores_inativos: int
    proximo_evento: Optional[EventoOut]
    ultimos_pagamentos: list[MensalidadeOut]
    proximos_jogos: list[JogoOut]
    alertas: list[str]
    fluxo_mensal: list[FluxoMensal]
