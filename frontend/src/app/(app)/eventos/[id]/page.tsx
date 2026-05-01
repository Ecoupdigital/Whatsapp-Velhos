"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  Check,
  X,
  Clock,
  HelpCircle,
  DollarSign,
  Plane,
  Music,
  PartyPopper,
  Trophy,
  Pencil,
  Trash2,
  TrendingUp,
  CircleDollarSign,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  EventoOut,
  EventoUpdate,
  ParticipanteOut,
  JogadorOut,
  ContaOut,
  PagamentoOut,
  EventoResumo,
} from "@/types";
import {
  Button,
  Card,
  Input,
  Select,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  EmptyState,
} from "@/components/ui";

/* ─── Constants ──────────────────────────────────────────────── */

const TIPO_OPTIONS = [
  { value: "viagem", label: "Viagem" },
  { value: "baile", label: "Baile" },
  { value: "confraternizacao", label: "Confraternizacao" },
  { value: "torneio", label: "Torneio" },
];

const STATUS_OPTIONS = [
  { value: "planejado", label: "Planejado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluido" },
  { value: "cancelado", label: "Cancelado" },
];

const tipoBadgeStyles: Record<string, { bg: string; text: string; icon: typeof Plane }> = {
  viagem: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: Plane },
  baile: { bg: "bg-purple-500/15", text: "text-purple-400", icon: Music },
  confraternizacao: { bg: "bg-blue-500/15", text: "text-blue-400", icon: PartyPopper },
  torneio: { bg: "bg-red-500/15", text: "text-red-400", icon: Trophy },
};

const statusBadgeStyles: Record<string, { bg: string; text: string; dot: string }> = {
  planejado: { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400" },
  em_andamento: { bg: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400" },
  concluido: { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  cancelado: { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
};

const statusLabels: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

type FiltroPart = "todos" | "pagos" | "parciais" | "pendentes" | "avulsos";

interface EditForm {
  tipo: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  custo_estimado: number;
  custo_real: number;
  status: string;
  valor_jogador: number;
  valor_socio: number;
  meta_arrecadacao: number;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pStatusDerivado(p: ParticipanteOut): "pago" | "parcial" | "pendente" {
  if (p.valor && p.valor_pago >= p.valor) return "pago";
  if (p.valor_pago > 0) return "parcial";
  return "pendente";
}

function nomeParticipante(p: ParticipanteOut): string {
  if (p.jogador) return p.jogador.apelido || p.jogador.nome;
  return p.nome_avulso || `Participante #${p.id}`;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventoId = params.id as string;

  const [evento, setEvento] = useState<EventoOut | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteOut[]>([]);
  const [jogadores, setJogadores] = useState<JogadorOut[]>([]);
  const [contas, setContas] = useState<ContaOut[]>([]);
  const [resumo, setResumo] = useState<EventoResumo | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Add participante (do elenco)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedJogadorId, setSelectedJogadorId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Avulso modal
  const [avulsoModalOpen, setAvulsoModalOpen] = useState(false);
  const [avulsoForm, setAvulsoForm] = useState({ nome: "", valor: "" });
  const [avulsoSaving, setAvulsoSaving] = useState(false);

  // Edit event
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    tipo: "",
    titulo: "",
    descricao: "",
    data_inicio: "",
    data_fim: "",
    local: "",
    custo_estimado: 0,
    custo_real: 0,
    status: "planejado",
    valor_jogador: 0,
    valor_socio: 0,
    meta_arrecadacao: 0,
  });

  // Delete event
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Popular elenco
  const [popularLoading, setPopularLoading] = useState(false);

  // Pagamento modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payParticipante, setPayParticipante] = useState<ParticipanteOut | null>(null);
  const [payForm, setPayForm] = useState({
    valor: "",
    data: todayISO(),
    forma_pagto: "pix",
    conta_id: "",
  });
  const [paySaving, setPaySaving] = useState(false);

  // Historico expand
  const [expandedParticipanteId, setExpandedParticipanteId] = useState<number | null>(null);

  // Filtro
  const [filtro, setFiltro] = useState<FiltroPart>("todos");

  /* ─ fetch ─ */

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ev, parts, res, pgs] = await Promise.all([
        api.get<EventoOut>(`/eventos/${eventoId}`),
        api.get<ParticipanteOut[]>(`/eventos/${eventoId}/participantes`),
        api.get<EventoResumo>(`/eventos/${eventoId}/resumo`),
        api.get<PagamentoOut[]>(`/eventos/${eventoId}/pagamentos`),
      ]);
      setEvento(ev);
      setParticipantes(parts);
      setResumo(res);
      setPagamentos(pgs);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar evento");
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  const fetchAux = useCallback(async () => {
    try {
      const [js, cs] = await Promise.all([
        api.get<JogadorOut[]>("/jogadores?ativo=1"),
        api.get<ContaOut[]>("/contas"),
      ]);
      setJogadores(js);
      setContas(cs);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchAux();
  }, [fetchAll, fetchAux]);

  /* ─ actions ─ */

  const handleAddParticipant = async () => {
    if (!selectedJogadorId) {
      toast.error("Selecione um jogador");
      return;
    }
    try {
      setSubmitting(true);
      const jog = jogadores.find((j) => j.id === parseInt(selectedJogadorId));
      const valorDefault = jog?.tipo === "socio"
        ? evento?.valor_socio ?? 0
        : evento?.valor_jogador ?? 0;
      await api.post(`/eventos/${eventoId}/participantes`, {
        jogador_id: parseInt(selectedJogadorId),
        status: "confirmado",
        valor: valorDefault,
      });
      toast.success("Participante adicionado");
      setAddModalOpen(false);
      setSelectedJogadorId("");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePopularElenco = async () => {
    if (!evento) return;
    if (!evento.valor_jogador && !evento.valor_socio) {
      toast.error("Configure os valores (jogador/socio) antes de popular");
      return;
    }
    try {
      setPopularLoading(true);
      await api.post(`/eventos/${eventoId}/popular`, {});
      toast.success("Elenco populado");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao popular");
    } finally {
      setPopularLoading(false);
    }
  };

  const handleAddAvulso = async () => {
    if (!avulsoForm.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    try {
      setAvulsoSaving(true);
      await api.post(`/eventos/${eventoId}/participantes/avulso`, {
        nome: avulsoForm.nome,
        valor: parseFloat(avulsoForm.valor) || 0,
      });
      toast.success("Convidado adicionado");
      setAvulsoModalOpen(false);
      setAvulsoForm({ nome: "", valor: "" });
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAvulsoSaving(false);
    }
  };

  const handleRemoverParticipante = async (part: ParticipanteOut) => {
    if (!confirm(`Remover ${nomeParticipante(part)} do evento?`)) return;
    try {
      await api.delete(`/eventos/${eventoId}/participantes/${part.id}`);
      toast.success("Removido");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  };

  const openPayModal = (part: ParticipanteOut) => {
    setPayParticipante(part);
    const falta = Math.max(0, (part.valor || 0) - (part.valor_pago || 0));
    const defaultConta = contas.find((c) => c.ativo === 1);
    setPayForm({
      valor: falta > 0 ? String(falta) : "",
      data: todayISO(),
      forma_pagto: part.forma_pagto || "pix",
      conta_id: part.conta_id ? String(part.conta_id) : (defaultConta?.id ? String(defaultConta.id) : ""),
    });
    setPayModalOpen(true);
  };

  const handleRegistrarPagamento = async () => {
    if (!payParticipante) return;
    const valor = parseFloat(payForm.valor);
    if (!valor || valor <= 0) {
      toast.error("Valor invalido");
      return;
    }
    try {
      setPaySaving(true);
      await api.post(
        `/eventos/${eventoId}/participantes/${payParticipante.id}/pagamento`,
        {
          valor,
          data: payForm.data || null,
          forma_pagto: payForm.forma_pagto || null,
          conta_id: payForm.conta_id ? parseInt(payForm.conta_id) : null,
        }
      );
      toast.success("Pagamento registrado");
      setPayModalOpen(false);
      setPayParticipante(null);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar pagamento");
    } finally {
      setPaySaving(false);
    }
  };

  const handleEstornar = async (txId: number) => {
    if (!confirm("Estornar este pagamento?")) return;
    try {
      await api.delete(`/eventos/${eventoId}/pagamentos/${txId}`);
      toast.success("Pagamento estornado");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao estornar");
    }
  };

  const openEditModal = () => {
    if (!evento) return;
    setEditForm({
      tipo: evento.tipo,
      titulo: evento.titulo,
      descricao: evento.descricao || "",
      data_inicio: evento.data_inicio || "",
      data_fim: evento.data_fim || "",
      local: evento.local || "",
      custo_estimado: evento.custo_estimado,
      custo_real: evento.custo_real,
      status: evento.status,
      valor_jogador: evento.valor_jogador || 0,
      valor_socio: evento.valor_socio || 0,
      meta_arrecadacao: evento.meta_arrecadacao || 0,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm.titulo.trim()) {
      toast.error("Titulo e obrigatorio");
      return;
    }
    try {
      setEditSubmitting(true);
      const payload: EventoUpdate = {
        tipo: editForm.tipo,
        titulo: editForm.titulo,
        descricao: editForm.descricao || null,
        data_inicio: editForm.data_inicio || null,
        data_fim: editForm.data_fim || null,
        local: editForm.local || null,
        custo_estimado: editForm.custo_estimado,
        custo_real: editForm.custo_real,
        status: editForm.status,
        valor_jogador: editForm.valor_jogador,
        valor_socio: editForm.valor_socio,
        meta_arrecadacao: editForm.meta_arrecadacao,
      };
      await api.put<EventoOut>(`/eventos/${eventoId}`, payload);
      toast.success("Evento atualizado");
      setEditModalOpen(false);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteEvento = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    try {
      await api.delete(`/eventos/${eventoId}`);
      toast.success("Evento excluido");
      router.push("/eventos");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  const updateEditField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ─ derived ─ */

  const participantJogadorIds = new Set(
    participantes.map((p) => p.jogador_id).filter((x): x is number => x != null)
  );
  const availableJogadores = jogadores.filter(
    (j) => j.ativo === 1 && !participantJogadorIds.has(j.id)
  );

  const filtered = participantes.filter((p) => {
    if (filtro === "todos") return true;
    if (filtro === "avulsos") return p.jogador_id == null;
    const s = pStatusDerivado(p);
    return s === filtro.replace("s", ""); // pagos->pago, parciais->parcial, pendentes->pendente
  });

  const contaNome = (id: number | null): string => {
    if (!id) return "";
    return contas.find((c) => c.id === id)?.nome || "";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-surface-card rounded-lg animate-pulse" />
        <div className="h-64 bg-surface-card rounded-xl border border-border-subtle animate-pulse" />
        <div className="h-96 bg-surface-card rounded-xl border border-border-subtle animate-pulse" />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="animate-fade-in">
        <Card>
          <EmptyState title="Evento nao encontrado" description="O evento solicitado nao existe." />
        </Card>
      </div>
    );
  }

  const tipoStyle = tipoBadgeStyles[evento.tipo] || tipoBadgeStyles.viagem;
  const statusStyle = statusBadgeStyles[evento.status] || statusBadgeStyles.planejado;
  const TipoIcon = tipoStyle.icon;

  const pctMeta = resumo?.percentual_meta ?? 0;
  const pctMetaCapped = Math.min(100, pctMeta);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Back Link ────────────────────────────────────────── */}
      <Link
        href="/eventos"
        className="inline-flex items-center gap-2 text-sm text-txt-tertiary hover:text-txt-primary transition-colors font-body"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Eventos
      </Link>

      {/* ── Event Info Card ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium", tipoStyle.bg, tipoStyle.text)}>
                  <TipoIcon className="h-3.5 w-3.5" />
                  {evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}
                </span>
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", statusStyle.bg, statusStyle.text)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)} aria-hidden="true" />
                  {statusLabels[evento.status] || evento.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary">
                {evento.titulo}
              </h1>
              {evento.descricao && (
                <p className="mt-2 text-sm text-txt-secondary font-body max-w-2xl">
                  {evento.descricao}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="secondary" icon={<Pencil />} onClick={openEditModal}>
                Editar
              </Button>
              <Button
                size="sm"
                variant={deleteConfirm ? "danger" : "secondary"}
                icon={<Trash2 />}
                onClick={handleDeleteEvento}
              >
                {deleteConfirm ? "Confirmar" : "Excluir"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <Calendar className="h-5 w-5 text-txt-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Data</p>
                <p className="text-sm text-txt-primary font-body">
                  {evento.data_inicio ? formatDate(evento.data_inicio) : "Nao definida"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <MapPin className="h-5 w-5 text-txt-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Local</p>
                <p className="text-sm text-txt-primary font-body truncate">
                  {evento.local || "Nao definido"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <DollarSign className="h-5 w-5 text-txt-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Valor jogador</p>
                <p className="text-sm font-mono text-txt-primary">
                  {formatCurrency(evento.valor_jogador || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <DollarSign className="h-5 w-5 text-txt-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Valor socio</p>
                <p className="text-sm font-mono text-txt-primary">
                  {formatCurrency(evento.valor_socio || 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Stats Arrecadação ─────────────────────────────────── */}
      {resumo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="bg-surface-card border border-border-subtle border-t-2 border-t-emerald-500 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-txt-secondary font-body uppercase tracking-wider mb-2">Arrecadado</p>
                <p className="text-2xl font-bold font-mono text-txt-primary">
                  {formatCurrency(resumo.valor_arrecadado)}
                </p>
                <p className="text-xs text-txt-tertiary font-body mt-1">
                  de {formatCurrency(resumo.valor_esperado)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-surface-tertiary text-emerald-400">
                <CircleDollarSign size={20} />
              </div>
            </div>
            {resumo.valor_esperado > 0 && (
              <div className="mt-3 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (resumo.valor_arrecadado / resumo.valor_esperado) * 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="bg-surface-card border border-border-subtle border-t-2 border-t-blue-500 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-txt-secondary font-body uppercase tracking-wider mb-2">% da meta</p>
                <p className="text-2xl font-bold font-display text-txt-primary">
                  {pctMeta.toFixed(1)}%
                </p>
                <p className="text-xs text-txt-tertiary font-body mt-1">
                  meta {formatCurrency(resumo.meta_arrecadacao)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-surface-tertiary text-blue-400">
                <TrendingUp size={20} />
              </div>
            </div>
            {resumo.meta_arrecadacao > 0 && (
              <div className="mt-3 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${pctMetaCapped}%` }}
                />
              </div>
            )}
          </div>

          <div className="bg-surface-card border border-border-subtle border-t-2 border-t-emerald-400 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-txt-secondary font-body uppercase tracking-wider mb-2">Pagos</p>
                <p className="text-2xl font-bold font-display text-txt-primary">{resumo.pagos}</p>
                <p className="text-xs text-txt-tertiary font-body mt-1">
                  + {resumo.parciais} parciais
                </p>
              </div>
              <div className="p-2 rounded-lg bg-surface-tertiary text-emerald-400">
                <Check size={20} />
              </div>
            </div>
          </div>

          <div className="bg-surface-card border border-border-subtle border-t-2 border-t-yellow-500 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-txt-secondary font-body uppercase tracking-wider mb-2">Pendentes</p>
                <p className="text-2xl font-bold font-display text-txt-primary">{resumo.pendentes}</p>
                <p className="text-xs text-txt-tertiary font-body mt-1">
                  total {resumo.total_participantes}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-surface-tertiary text-yellow-400">
                <AlertTriangle size={20} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Toolbar + Filtros ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button size="sm" icon={<Plus />} onClick={() => setAddModalOpen(true)}>
            Adicionar do elenco
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Users />}
            onClick={handlePopularElenco}
            loading={popularLoading}
          >
            Popular elenco
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<UserPlus />}
            onClick={() => setAvulsoModalOpen(true)}
          >
            Convidado avulso
          </Button>

          <div className="flex-1" />

          <div className="flex gap-1 bg-surface-card border border-border-subtle rounded-lg p-1">
            {(["todos", "pagos", "parciais", "pendentes", "avulsos"] as FiltroPart[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-display uppercase tracking-wider transition-colors",
                  filtro === f
                    ? "bg-brand-red text-white"
                    : "text-txt-secondary hover:text-txt-primary"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Participants Section ─────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card padding="lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-txt-tertiary" />
              <h2 className="text-lg font-display font-semibold text-txt-primary">
                Participantes
              </h2>
              <span className="ml-1 text-sm text-txt-tertiary font-mono">
                ({filtered.length}/{participantes.length})
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title={
                participantes.length === 0
                  ? "Nenhum participante"
                  : "Nenhum participante com esse filtro"
              }
              description={
                participantes.length === 0
                  ? "Use Popular elenco para adicionar todos jogadores ativos."
                  : ""
              }
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map((part, idx) => {
                  const status = pStatusDerivado(part);
                  const statusColor =
                    status === "pago"
                      ? "text-emerald-400 bg-emerald-500/15"
                      : status === "parcial"
                      ? "text-blue-400 bg-blue-500/15"
                      : "text-yellow-400 bg-yellow-500/15";
                  const isExpanded = expandedParticipanteId === part.id;
                  const histPagamentos = pagamentos.filter(
                    (pg) => pg.evento_participante_id === part.id
                  );
                  const tipo = part.jogador?.tipo || (part.jogador_id ? "jogador" : "convidado");

                  return (
                    <motion.div
                      key={part.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border border-border-subtle rounded-lg bg-surface-card overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="h-9 w-9 rounded-full bg-surface-tertiary border border-border-subtle flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-txt-secondary font-display">
                            {nomeParticipante(part).charAt(0).toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-txt-primary font-body truncate">
                              {nomeParticipante(part)}
                            </p>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                              tipo === "socio" ? "bg-purple-500/15 text-purple-400" :
                              tipo === "convidado" ? "bg-amber-500/15 text-amber-400" :
                              "bg-brand-red/15 text-brand-red"
                            )}>
                              {tipo}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-txt-tertiary font-mono">
                            <span>
                              {formatCurrency(part.valor_pago || 0)} / {formatCurrency(part.valor || 0)}
                            </span>
                            {contaNome(part.conta_id) && (
                              <span className="text-txt-secondary">{contaNome(part.conta_id)}</span>
                            )}
                          </div>
                        </div>

                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium uppercase",
                          statusColor
                        )}>
                          {status}
                        </span>

                        <Button
                          size="sm"
                          icon={<DollarSign size={14} />}
                          onClick={() => openPayModal(part)}
                          disabled={status === "pago"}
                        >
                          Pagar
                        </Button>

                        <button
                          onClick={() => setExpandedParticipanteId(isExpanded ? null : part.id)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-txt-tertiary hover:text-txt-primary hover:bg-surface-tertiary transition-colors"
                          title="Historico"
                        >
                          <ChevronDown size={16} className={cn("transition-transform", isExpanded && "rotate-180")} />
                        </button>

                        <button
                          onClick={() => handleRemoverParticipante(part)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-txt-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remover do evento"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border-subtle bg-surface-secondary/40 px-3 py-2">
                          {histPagamentos.length === 0 ? (
                            <p className="text-xs text-txt-tertiary font-body py-2">
                              Sem pagamentos registrados
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-txt-tertiary uppercase tracking-wider font-body mb-2">
                                Historico
                              </p>
                              {histPagamentos.map((pg) => (
                                <div
                                  key={pg.id}
                                  className="flex items-center gap-3 text-xs py-1.5 px-2 rounded hover:bg-surface-card"
                                >
                                  <span className="font-mono text-txt-secondary">{pg.data}</span>
                                  <span className="font-mono text-emerald-400">
                                    {formatCurrency(pg.valor)}
                                  </span>
                                  {pg.forma_pagto && (
                                    <span className="text-txt-tertiary uppercase">{pg.forma_pagto}</span>
                                  )}
                                  {contaNome(pg.conta_id) && (
                                    <span className="text-txt-secondary">{contaNome(pg.conta_id)}</span>
                                  )}
                                  <div className="flex-1" />
                                  <button
                                    onClick={() => handleEstornar(pg.id)}
                                    className="text-txt-tertiary hover:text-red-400 transition-colors"
                                    title="Estornar"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Add Participant Modal ────────────────────────────── */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} size="sm">
        <ModalHeader>Adicionar Participante</ModalHeader>
        <ModalBody>
          <Select
            label="Jogador"
            placeholder="Selecione um jogador"
            options={availableJogadores.map((j) => ({
              value: String(j.id),
              label: `${j.apelido || j.nome} (${j.tipo})`,
            }))}
            value={selectedJogadorId}
            onChange={(e) => setSelectedJogadorId(e.target.value)}
          />
          <p className="text-xs text-txt-tertiary mt-2">
            Valor padrao sera aplicado conforme tipo (jogador/socio).
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
            Cancelar
          </Button>
          <Button loading={submitting} onClick={handleAddParticipant}>
            Adicionar
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Avulso Modal ─────────────────────────────────────── */}
      <Modal open={avulsoModalOpen} onClose={() => setAvulsoModalOpen(false)} size="sm">
        <ModalHeader>Adicionar Convidado Avulso</ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            label="Nome"
            placeholder="Nome do convidado"
            value={avulsoForm.nome}
            onChange={(e) => setAvulsoForm((p) => ({ ...p, nome: e.target.value }))}
          />
          <Input
            label="Valor (R$)"
            type="number"
            min={0}
            step={0.01}
            value={avulsoForm.valor}
            onChange={(e) => setAvulsoForm((p) => ({ ...p, valor: e.target.value }))}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setAvulsoModalOpen(false)}>
            Cancelar
          </Button>
          <Button loading={avulsoSaving} onClick={handleAddAvulso}>
            Adicionar
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Pagamento Modal ──────────────────────────────────── */}
      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)} size="sm">
        <ModalHeader>
          Registrar Pagamento - {payParticipante ? nomeParticipante(payParticipante) : ""}
        </ModalHeader>
        <ModalBody className="space-y-3">
          {payParticipante && (
            <div className="text-xs text-txt-tertiary font-body">
              Pago: {formatCurrency(payParticipante.valor_pago || 0)} de{" "}
              {formatCurrency(payParticipante.valor || 0)} - falta{" "}
              {formatCurrency(Math.max(0, (payParticipante.valor || 0) - (payParticipante.valor_pago || 0)))}
            </div>
          )}
          <Input
            label="Valor (R$)"
            type="number"
            min={0}
            step={0.01}
            value={payForm.valor}
            onChange={(e) => setPayForm((p) => ({ ...p, valor: e.target.value }))}
          />
          <Input
            label="Data"
            type="date"
            value={payForm.data}
            onChange={(e) => setPayForm((p) => ({ ...p, data: e.target.value }))}
          />
          <Select
            label="Forma de pagamento"
            options={[
              { value: "pix", label: "PIX" },
              { value: "dinheiro", label: "Dinheiro" },
              { value: "transferencia", label: "Transferencia" },
            ]}
            value={payForm.forma_pagto}
            onChange={(e) => setPayForm((p) => ({ ...p, forma_pagto: e.target.value }))}
          />
          <Select
            label="Conta"
            placeholder="Sem conta"
            options={contas.filter((c) => c.ativo === 1).map((c) => ({
              value: String(c.id),
              label: `${c.nome} (${c.tipo})`,
            }))}
            value={payForm.conta_id}
            onChange={(e) => setPayForm((p) => ({ ...p, conta_id: e.target.value }))}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setPayModalOpen(false)}>
            Cancelar
          </Button>
          <Button loading={paySaving} onClick={handleRegistrarPagamento}>
            Registrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Edit Event Modal ─────────────────────────────────── */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} size="lg">
        <ModalHeader>Editar Evento</ModalHeader>
        <ModalBody className="space-y-4">
          <Select
            label="Tipo"
            options={TIPO_OPTIONS}
            value={editForm.tipo}
            onChange={(e) => updateEditField("tipo", e.target.value)}
          />
          <Input
            label="Titulo"
            value={editForm.titulo}
            onChange={(e) => updateEditField("titulo", e.target.value)}
          />
          <Input
            label="Descricao"
            value={editForm.descricao}
            onChange={(e) => updateEditField("descricao", e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data Inicio"
              type="date"
              value={editForm.data_inicio}
              onChange={(e) => updateEditField("data_inicio", e.target.value)}
            />
            <Input
              label="Data Fim"
              type="date"
              value={editForm.data_fim}
              onChange={(e) => updateEditField("data_fim", e.target.value)}
            />
          </div>
          <Input
            label="Local"
            value={editForm.local}
            onChange={(e) => updateEditField("local", e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border-subtle">
            <Input
              label="Valor jogador (R$)"
              type="number"
              min={0}
              step={0.01}
              value={editForm.valor_jogador || ""}
              onChange={(e) => updateEditField("valor_jogador", parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Valor socio (R$)"
              type="number"
              min={0}
              step={0.01}
              value={editForm.valor_socio || ""}
              onChange={(e) => updateEditField("valor_socio", parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Meta arrecadacao (R$)"
              type="number"
              min={0}
              step={0.01}
              value={editForm.meta_arrecadacao || ""}
              onChange={(e) => updateEditField("meta_arrecadacao", parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Custo Estimado (R$)"
              type="number"
              min={0}
              step={0.01}
              value={editForm.custo_estimado || ""}
              onChange={(e) => updateEditField("custo_estimado", parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Custo Real (R$)"
              type="number"
              min={0}
              step={0.01}
              value={editForm.custo_real || ""}
              onChange={(e) => updateEditField("custo_real", parseFloat(e.target.value) || 0)}
            />
          </div>
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={editForm.status}
            onChange={(e) => updateEditField("status", e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
            Cancelar
          </Button>
          <Button loading={editSubmitting} onClick={handleEditSubmit}>
            Salvar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
