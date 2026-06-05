// === Portal de Transparencia (contrato publico GET /api/portal) ===
// Espelho de .plano/SYSTEM-DESIGN.md secao 3. Nao misturar com types/index.ts.

export interface PortalMeta {
  time_nome: string;
  atualizado_em: string; // ISO 8601 UTC; formatar pra BRT no front
}

export interface PortalFluxoMes {
  mes: string;       // "2026-06"
  entradas: number;
  saidas: number;
}

export interface PortalCaixaAtrasos {
  mensalidades: number; // COUNT
  jogadores: number;    // COUNT DISTINCT
}

export interface PortalMensalidadesGeral {
  pagas: number;
  em_atraso: number;
  a_vencer: number;
  isentas: number;
  jogadores_total: number;
  jogadores_em_dia: number;
  jogadores_em_atraso: number;
}

export interface PortalCaixa {
  saldo_atual: number;
  total_entrou: number;
  total_saiu: number;
  entrou_mes: number;
  saiu_mes: number;
  fluxo_12m: PortalFluxoMes[]; // ate 12 itens, ordem cronologica asc
  atrasos: PortalCaixaAtrasos;
  mensalidades: PortalMensalidadesGeral;
}

export type PortalCustoOrigem = "real" | "estimado" | "sem_custo";

export interface PortalRankingEntry {
  nome: string;
  quantidade: number;
}

export interface PortalEventoGaleto {
  emitidos: number;
  vendidos: number;
  devolvidos: number;
  por_tipo: PortalRankingEntry[]; // [{nome:"cru",quantidade:210}, ...]
}

export interface PortalEvento {
  titulo: string;
  tipo: string;
  data: string | null;        // YYYY-MM-DD ou null
  arrecadado: number;
  custo: number;
  custo_origem: PortalCustoOrigem;
  liquido: number;
  status: string;             // concluido | em_andamento | planejado
  galeto?: PortalEventoGaleto | null;
}

export interface PortalJogosResumo {
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
}

export interface PortalResultado {
  data: string;
  adversario: string;
  placar: string; // "2x1"
}

export interface PortalProximoJogo {
  data: string;
  horario: string | null;
  local: string | null;
  adversario: string;
}

export interface PortalJogos {
  resumo: PortalJogosResumo;
  artilharia: PortalRankingEntry[];
  assistencias: PortalRankingEntry[];
  destaques: PortalRankingEntry[];
  ultimos_resultados: PortalResultado[];
  proximos_jogos: PortalProximoJogo[];
}

export interface PortalResponse {
  meta: PortalMeta;
  caixa: PortalCaixa;
  eventos: PortalEvento[];
  jogos: PortalJogos;
}
