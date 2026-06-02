from pydantic import BaseModel, Field, field_validator
from typing import Optional
import json


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
    evento_participante_id: Optional[int] = None
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
    valor_jogador: float = 0
    valor_socio: float = 0
    meta_arrecadacao: float = 0
    valor_cartao: float = 0
    custo_cartao: float = 0
    qtd_cartoes_padrao_jogador: int = 0
    qtd_cartoes_padrao_socio: int = 0
    tipos_item: Optional[list[str]] = None

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
    valor_jogador: Optional[float] = None
    valor_socio: Optional[float] = None
    meta_arrecadacao: Optional[float] = None
    valor_cartao: Optional[float] = None
    custo_cartao: Optional[float] = None
    qtd_cartoes_padrao_jogador: Optional[int] = None
    qtd_cartoes_padrao_socio: Optional[int] = None
    tipos_item: Optional[list[str]] = None

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
    valor_jogador: float = 0
    valor_socio: float = 0
    meta_arrecadacao: float = 0
    valor_cartao: float = 0
    custo_cartao: float = 0
    qtd_cartoes_padrao_jogador: int = 0
    qtd_cartoes_padrao_socio: int = 0
    created_at: Optional[str]
    tipos_item: Optional[list[str]] = None

    @field_validator("tipos_item", mode="before")
    @classmethod
    def _parse_tipos_item(cls, v):
        # banco guarda Text JSON ('["cru","assado"]') ou None/""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (ValueError, TypeError):
                return None
        return v  # ja e list (vindo de payload, nao do banco)

    class Config:
        from_attributes = True

class FaixaCreate(BaseModel):
    sem_numero: bool = False
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    quantidade: Optional[int] = None  # usado so quando sem_numero=True


class FaixaUpdate(BaseModel):
    sem_numero: Optional[bool] = None
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    quantidade: Optional[int] = None


class FaixaOut(BaseModel):
    id: int
    evento_participante_id: int
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    quantidade: int
    sem_numero: bool
    created_at: Optional[str] = None

    @field_validator("sem_numero", mode="before")
    @classmethod
    def _coerce_sem_numero(cls, v):
        # banco guarda Integer 0/1; expor como bool
        if isinstance(v, int):
            return bool(v)
        return v

    class Config:
        from_attributes = True


class ItemTipo(BaseModel):
    tipo: str
    qtd_vendido: int = Field(default=0, ge=0)
    qtd_pedido: int = Field(default=0, ge=0)


class ItensUpdate(BaseModel):
    itens: list[ItemTipo] = []


class ItemOut(BaseModel):
    id: int
    tipo: str
    qtd_vendido: int
    qtd_pedido: int

    class Config:
        from_attributes = True


class ResumoItemTipo(BaseModel):
    tipo: str
    total_vendido: int


class ParticipanteUpdate(BaseModel):
    jogador_id: Optional[int] = None
    nome_avulso: Optional[str] = None
    status: str = "pendente"
    pago: int = 0
    valor: float = 0
    observacoes: Optional[str] = None

class ParticipanteAvulsoCreate(BaseModel):
    nome: str
    valor: float = 0

class PagamentoCreate(BaseModel):
    valor: float
    data: Optional[str] = None
    forma_pagto: Optional[str] = None
    conta_id: Optional[int] = None

class PagamentoOut(BaseModel):
    id: int
    valor: float
    data: str
    forma_pagto: Optional[str] = None
    conta_id: Optional[int] = None
    evento_participante_id: Optional[int] = None
    descricao: Optional[str] = None

    class Config:
        from_attributes = True

class EventoResumo(BaseModel):
    total_participantes: int
    pagos: int
    parciais: int
    pendentes: int
    valor_arrecadado: float
    valor_esperado: float
    percentual_meta: float
    meta_arrecadacao: float
    cartoes_emitidos: int = 0
    cartoes_vendidos: int = 0
    cartoes_devolvidos: int = 0
    cartoes_pagou_custo: int = 0
    proximo_numero: int = 1
    itens_por_tipo: list["ResumoItemTipo"] = []

class CartoesUpdate(BaseModel):
    qtd_cartoes_recebidos: Optional[int] = None
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    qtd_vendidos: Optional[int] = None
    qtd_devolvidos: Optional[int] = None
    qtd_pagou_custo: Optional[int] = None

class ParticipanteOut(BaseModel):
    id: int
    evento_id: int
    jogador_id: Optional[int]
    nome_avulso: Optional[str] = None
    status: str
    pago: int
    valor: float
    valor_pago: float = 0
    data_pagamento: Optional[str] = None
    forma_pagto: Optional[str] = None
    conta_id: Optional[int] = None
    qtd_cartoes_recebidos: int = 0
    numero_inicio: Optional[int] = None
    numero_fim: Optional[int] = None
    qtd_vendidos: int = 0
    qtd_devolvidos: int = 0
    qtd_pagou_custo: int = 0
    observacoes: Optional[str]
    jogador: Optional[JogadorOut] = None
    faixas: list["FaixaOut"] = []
    itens: list["ItemOut"] = []

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


# === Campanhas ===

class PublicoFiltros(BaseModel):
    ativo: Optional[bool] = True
    tipo: Optional[str] = None  # jogador | socio
    posicao: Optional[str] = None
    mensalidade_status: Optional[str] = None  # pendente | pago | atrasado | isento
    mes_referencia: Optional[str] = None  # "2026-05" (default: mes atual)
    evento_id: Optional[int] = None
    evento_status: Optional[str] = None  # confirmado | recusado | pendente | talvez
    incluir_sem_telefone: bool = False


class PreviewPublicoRequest(BaseModel):
    filtros: PublicoFiltros = PublicoFiltros()


class PublicoJogador(BaseModel):
    jogador_id: int
    nome: str
    apelido: Optional[str] = None
    telefone: Optional[str] = None
    tipo: str
    posicao: Optional[str] = None
    enviavel: bool
    motivo: Optional[str] = None


class SegmentoCreate(BaseModel):
    nome: str
    filtros: PublicoFiltros = PublicoFiltros()


class SegmentoOut(BaseModel):
    id: int
    nome: str
    filtros: Optional[dict] = None
    created_at: Optional[str] = None


class CampanhaCreate(BaseModel):
    nome: str
    tipo_conteudo: str = "texto"  # texto | imagem | video | audio | documento
    texto: Optional[str] = None
    midia_url: Optional[str] = None
    midia_nome: Optional[str] = None
    modo: str = "agora"  # agora | agendar | recorrente
    agendada_para: Optional[str] = None  # ISO datetime BRT
    recorrencia: Optional[str] = None  # diaria | semanal | mensal
    recorrencia_dia: Optional[int] = None
    recorrencia_hora: Optional[str] = None  # "HH:MM"
    jogador_ids: list[int] = []  # publico materializado (agora/agendar)
    filtros: Optional[PublicoFiltros] = None  # definicao de publico (recorrente)
    segmento_id: Optional[int] = None
    enviar_agora: bool = True  # se modo=agora, dispara na hora


class CampanhaUpdate(BaseModel):
    nome: Optional[str] = None
    tipo_conteudo: Optional[str] = None
    texto: Optional[str] = None
    midia_url: Optional[str] = None
    midia_nome: Optional[str] = None
    modo: Optional[str] = None
    agendada_para: Optional[str] = None
    recorrencia: Optional[str] = None
    recorrencia_dia: Optional[int] = None
    recorrencia_hora: Optional[str] = None


class CampanhaOut(BaseModel):
    id: int
    nome: str
    tipo_conteudo: str
    texto: Optional[str]
    midia_url: Optional[str]
    midia_nome: Optional[str]
    modo: str
    status: str
    agendada_para: Optional[str]
    recorrencia: Optional[str]
    recorrencia_dia: Optional[int]
    recorrencia_hora: Optional[str]
    segmento_id: Optional[int] = None
    total: int
    enviados: int
    erros: int
    ultima_execucao: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True


class CampanhaDestinatarioOut(BaseModel):
    id: int
    jogador_id: Optional[int]
    nome: Optional[str]
    telefone: Optional[str]
    status: str
    message_id: Optional[str]
    erro_detalhe: Optional[str]
    enviado_em: Optional[str]

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    url: str
    nome: str
    tipo: str  # imagem | video | audio | documento


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
