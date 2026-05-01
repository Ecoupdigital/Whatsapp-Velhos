// === Auth ===

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UsuarioOut;
}

export interface UsuarioOut {
  id: number;
  username: string;
  nome: string;
  role: string;
}

// === Jogadores ===

export interface JogadorCreate {
  nome: string;
  apelido?: string | null;
  telefone?: string | null;
  tipo?: string;
  posicao?: string | null;
  numero_camisa?: number | null;
  data_nascimento?: string | null;
  data_entrada?: string | null;
  ativo?: number;
  excluido_envio?: number;
  excluido_mensalidade?: number;
  observacoes?: string | null;
}

export interface JogadorUpdate {
  nome?: string | null;
  apelido?: string | null;
  telefone?: string | null;
  tipo?: string | null;
  posicao?: string | null;
  numero_camisa?: number | null;
  data_nascimento?: string | null;
  data_entrada?: string | null;
  ativo?: number | null;
  excluido_envio?: number | null;
  excluido_mensalidade?: number | null;
  observacoes?: string | null;
}

export interface JogadorOut {
  id: number;
  nome: string;
  apelido: string | null;
  telefone: string | null;
  tipo: string;
  posicao: string | null;
  numero_camisa: number | null;
  data_nascimento: string | null;
  data_entrada: string | null;
  ativo: number;
  excluido_envio: number;
  excluido_mensalidade: number;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SugestoesGrupo {
  total_no_grupo: number;
  total_cadastrados: number;
  sem_cadastro: {
    telefone: string;
    nome: string;
    foto?: string;
    telefone_formatado?: string;
  }[];
}

// === Mensalidades ===

export interface MensalidadeCreate {
  jogador_id: number;
  mes_referencia: string;
  valor: number;
  status?: string;
}

export interface MensalidadeUpdate {
  valor?: number | null;
  valor_pago?: number | null;
  status?: string | null;
  data_pagamento?: string | null;
  forma_pagto?: string | null;
  observacoes?: string | null;
  conta_id?: number | null;
}

export interface MensalidadeOut {
  id: number;
  jogador_id: number;
  mes_referencia: string;
  valor: number;
  valor_pago: number;
  status: string;
  data_pagamento: string | null;
  forma_pagto: string | null;
  observacoes: string | null;
  conta_id: number | null;
  created_at: string | null;
  jogador: JogadorOut | null;
}

export interface GerarMensalidadesRequest {
  mes_referencia: string;
}

export interface MensalidadeResumo {
  mes: string;
  total_jogadores: number;
  pagos: number;
  pendentes: number;
  atrasados: number;
  isentos: number;
  valor_esperado: number;
  valor_arrecadado: number;
}

// === Transacoes ===

export interface TransacaoCreate {
  tipo: string;
  categoria: string;
  descricao?: string | null;
  valor: number;
  data: string;
  jogador_id?: number | null;
  evento_id?: number | null;
  conta_id?: number | null;
}

export interface TransacaoUpdate {
  tipo?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  valor?: number | null;
  data?: string | null;
  jogador_id?: number | null;
  evento_id?: number | null;
  conta_id?: number | null;
}

export interface TransacaoOut {
  id: number;
  tipo: string;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  jogador_id: number | null;
  evento_id: number | null;
  conta_id: number | null;
  comprovante: string | null;
  created_at: string | null;
}

export interface BalancoOut {
  saldo_total: number;
  entradas_mes: number;
  saidas_mes: number;
  variacao_percentual: number | null;
  saldos_por_conta?: ContaSaldo[];
}

export interface FluxoMensal {
  mes: string;
  entradas: number;
  saidas: number;
}

// === Eventos ===

export interface EventoCreate {
  tipo: string;
  titulo: string;
  descricao?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  local?: string | null;
  custo_estimado?: number;
  status?: string;
  valor_jogador?: number;
  valor_socio?: number;
  meta_arrecadacao?: number;
}

export interface EventoUpdate {
  tipo?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  local?: string | null;
  custo_estimado?: number | null;
  custo_real?: number | null;
  status?: string | null;
  valor_jogador?: number | null;
  valor_socio?: number | null;
  meta_arrecadacao?: number | null;
}

export interface EventoOut {
  id: number;
  tipo: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  local: string | null;
  custo_estimado: number;
  custo_real: number;
  status: string;
  valor_jogador: number;
  valor_socio: number;
  meta_arrecadacao: number;
  created_at: string | null;
}

export interface ParticipanteUpdate {
  jogador_id?: number | null;
  nome_avulso?: string | null;
  status?: string;
  pago?: number;
  valor?: number;
  observacoes?: string | null;
}

export interface ParticipanteOut {
  id: number;
  evento_id: number;
  jogador_id: number | null;
  nome_avulso: string | null;
  status: string;
  pago: number;
  valor: number;
  valor_pago: number;
  data_pagamento: string | null;
  forma_pagto: string | null;
  conta_id: number | null;
  observacoes: string | null;
  jogador: JogadorOut | null;
}

export interface PagamentoCreate {
  valor: number;
  data?: string | null;
  forma_pagto?: string | null;
  conta_id?: number | null;
}

export interface PagamentoOut {
  id: number;
  valor: number;
  data: string;
  forma_pagto: string | null;
  conta_id: number | null;
  evento_participante_id: number | null;
  descricao: string | null;
}

export interface EventoResumo {
  total_participantes: number;
  pagos: number;
  parciais: number;
  pendentes: number;
  valor_arrecadado: number;
  valor_esperado: number;
  percentual_meta: number;
  meta_arrecadacao: number;
}

// === Jogos ===

export interface JogoCreate {
  data: string;
  horario?: string | null;
  local?: string | null;
  adversario: string;
  gols_favor?: number;
  gols_contra?: number;
  tipo?: string;
  observacoes?: string | null;
  realizado?: number;
  gols_descricao?: string | null;
  assistencias?: string | null;
  destaque?: string | null;
}

export interface JogoUpdate {
  data?: string | null;
  horario?: string | null;
  local?: string | null;
  adversario?: string | null;
  gols_favor?: number | null;
  gols_contra?: number | null;
  tipo?: string | null;
  observacoes?: string | null;
  realizado?: number;
  gols_descricao?: string | null;
  assistencias?: string | null;
  destaque?: string | null;
}

export interface JogoOut {
  id: number;
  data: string;
  horario: string | null;
  local: string | null;
  adversario: string;
  gols_favor: number;
  gols_contra: number;
  tipo: string;
  observacoes: string | null;
  realizado?: number;
  gols_descricao?: string | null;
  assistencias?: string | null;
  destaque?: string | null;
  created_at: string | null;
}

export interface RankingEntry {
  nome: string;
  quantidade: number;
}

export interface RankingsOut {
  artilharia: RankingEntry[];
  assistencias: RankingEntry[];
  destaques: RankingEntry[];
}

export interface JogoEstatisticas {
  total: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_marcados: number;
  gols_sofridos: number;
}

// === Cartoes de Baile ===

export interface CartaoCreate {
  evento_id: number;
  jogador_id: number;
  numero_inicio: number;
  numero_fim: number;
  valor_unitario: number;
}

export interface CartaoUpdate {
  vendidos?: number | null;
  valor_acertado?: number | null;
  status?: string | null;
}

export interface CartaoOut {
  id: number;
  evento_id: number;
  jogador_id: number;
  numero_inicio: number;
  numero_fim: number;
  quantidade: number;
  vendidos: number;
  valor_unitario: number;
  valor_acertado: number;
  status: string;
  created_at: string | null;
  jogador: JogadorOut | null;
}

export interface CartaoResumo {
  evento_id: number;
  total_cartoes: number;
  total_vendidos: number;
  total_arrecadado: number;
  total_acertado: number;
}

// === Promocoes ===

export interface PromocaoCreate {
  titulo: string;
  descricao?: string | null;
  tipo: string;
  valor_desconto?: number;
  data_inicio?: string | null;
  data_fim?: string | null;
  ativa?: number;
}

export interface PromocaoUpdate {
  titulo?: string | null;
  descricao?: string | null;
  tipo?: string | null;
  valor_desconto?: number | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  ativa?: number | null;
}

export interface PromocaoOut {
  id: number;
  titulo: string;
  descricao: string | null;
  tipo: string;
  valor_desconto: number;
  data_inicio: string | null;
  data_fim: string | null;
  ativa: number;
  created_at: string | null;
}

// === WhatsApp ===

export interface EnviarMensagemRequest {
  jogador_ids: number[];
  texto: string;
}

export interface MensagemLogOut {
  id: number;
  jogador_id: number | null;
  telefone: string | null;
  tipo_mensagem: string | null;
  conteudo: string | null;
  status: string;
  message_id: string | null;
  erro_detalhe: string | null;
  enviado_em: string | null;
}

export interface WhatsAppStatus {
  connected: boolean;
  phone_number: string | null;
}

// === Dashboard ===

export interface DashboardData {
  saldo_total: number;
  mensalidades_pendentes: number;
  mensalidades_total: number;
  jogadores_ativos: number;
  jogadores_inativos: number;
  proximo_evento: EventoOut | null;
  ultimos_pagamentos: MensalidadeOut[];
  proximos_jogos: JogoOut[];
  alertas: string[];
  fluxo_mensal: FluxoMensal[];
}

// === Contas Financeiras ===

export interface ContaOut {
  id: number;
  nome: string;
  tipo: string;
  saldo_inicial: number;
  ativo: number;
  saldo_atual: number;
  created_at: string | null;
}

export interface ContaCreate {
  nome: string;
  tipo?: string;
  saldo_inicial?: number;
}

export interface ContaUpdate {
  nome?: string;
  tipo?: string;
  saldo_inicial?: number;
  ativo?: number;
}

export interface ContaSaldo {
  nome: string;
  tipo: string;
  saldo: number;
}
