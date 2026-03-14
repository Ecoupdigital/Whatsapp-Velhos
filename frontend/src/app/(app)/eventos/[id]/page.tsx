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
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  EventoOut,
  EventoUpdate,
  ParticipanteOut,
  ParticipanteUpdate,
  JogadorOut,
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

const participantStatusStyles: Record<string, { bg: string; text: string; icon: typeof Check }> = {
  confirmado: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: Check },
  recusado: { bg: "bg-red-500/15", text: "text-red-400", icon: X },
  pendente: { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: Clock },
  talvez: { bg: "bg-blue-500/15", text: "text-blue-400", icon: HelpCircle },
};

const PARTICIPANT_STATUS_OPTIONS = [
  { value: "confirmado", label: "Confirmado" },
  { value: "recusado", label: "Recusado" },
  { value: "pendente", label: "Pendente" },
  { value: "talvez", label: "Talvez" },
];

/* ─── Edit form type ─────────────────────────────────────────── */

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
}

/* ─── Page Component ─────────────────────────────────────────── */

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventoId = params.id as string;

  const [evento, setEvento] = useState<EventoOut | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteOut[]>([]);
  const [jogadores, setJogadores] = useState<JogadorOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedJogadorId, setSelectedJogadorId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit event state
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
  });

  // Delete event state
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchEvento = useCallback(async () => {
    try {
      setLoading(true);
      const [ev, parts] = await Promise.all([
        api.get<EventoOut>(`/eventos/${eventoId}`),
        api.get<ParticipanteOut[]>(`/eventos/${eventoId}/participantes`),
      ]);
      setEvento(ev);
      setParticipantes(parts);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar evento");
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  const fetchJogadores = useCallback(async () => {
    try {
      const data = await api.get<JogadorOut[]>("/jogadores");
      setJogadores(data);
    } catch {
      // silent - jogadores list is supplementary
    }
  }, []);

  useEffect(() => {
    fetchEvento();
    fetchJogadores();
  }, [fetchEvento, fetchJogadores]);

  const handleAddParticipant = async () => {
    if (!selectedJogadorId) {
      toast.error("Selecione um jogador");
      return;
    }
    try {
      setSubmitting(true);
      const payload: ParticipanteUpdate = {
        jogador_id: parseInt(selectedJogadorId),
        status: "pendente",
        pago: 0,
        valor: 0,
      };
      await api.post(`/eventos/${eventoId}/participantes`, payload);
      toast.success("Participante adicionado");
      setAddModalOpen(false);
      setSelectedJogadorId("");
      fetchEvento();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar participante");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (part: ParticipanteOut, newStatus: string) => {
    try {
      await api.post(`/eventos/${eventoId}/participantes`, {
        jogador_id: part.jogador_id,
        status: newStatus,
      });
      setParticipantes((prev) =>
        prev.map((p) => (p.id === part.id ? { ...p, status: newStatus } : p))
      );
      toast.success("Status atualizado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  };

  const handleTogglePago = async (part: ParticipanteOut) => {
    const newPago = part.pago === 1 ? 0 : 1;
    try {
      await api.post(`/eventos/${eventoId}/participantes`, {
        jogador_id: part.jogador_id,
        pago: newPago,
      });
      setParticipantes((prev) =>
        prev.map((p) => (p.id === part.id ? { ...p, pago: newPago } : p))
      );
      toast.success(newPago ? "Marcado como pago" : "Marcado como nao pago");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar pagamento");
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
      };
      await api.put<EventoOut>(`/eventos/${eventoId}`, payload);
      toast.success("Evento atualizado com sucesso");
      setEditModalOpen(false);
      fetchEvento();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar evento");
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
      toast.error(err instanceof Error ? err.message : "Erro ao excluir evento");
    }
  };

  const updateEditField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  // Filter out jogadores already participating
  const participantJogadorIds = new Set(participantes.map((p) => p.jogador_id));
  const availableJogadores = jogadores.filter(
    (j) => j.ativo === 1 && !participantJogadorIds.has(j.id)
  );

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
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                    tipoStyle.bg,
                    tipoStyle.text
                  )}
                >
                  <TipoIcon className="h-3.5 w-3.5" />
                  {evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                    statusStyle.bg,
                    statusStyle.text
                  )}
                >
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)}
                    aria-hidden="true"
                  />
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

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="secondary"
                icon={<Pencil />}
                onClick={openEditModal}
              >
                Editar Evento
              </Button>
              <Button
                size="sm"
                variant={deleteConfirm ? "danger" : "secondary"}
                icon={<Trash2 />}
                onClick={handleDeleteEvento}
              >
                {deleteConfirm ? "Confirmar Exclusao" : "Excluir Evento"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dates */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <Calendar className="h-5 w-5 text-txt-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Datas</p>
                <p className="text-sm text-txt-primary font-body">
                  {evento.data_inicio ? formatDate(evento.data_inicio) : "Nao definida"}
                  {evento.data_fim ? ` - ${formatDate(evento.data_fim)}` : ""}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <MapPin className="h-5 w-5 text-txt-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Local</p>
                <p className="text-sm text-txt-primary font-body">
                  {evento.local || "Nao definido"}
                </p>
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <DollarSign className="h-5 w-5 text-txt-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Custo Estimado</p>
                <p className="text-sm text-txt-primary font-mono font-semibold">
                  {formatCurrency(evento.custo_estimado)}
                </p>
              </div>
            </div>

            {/* Real Cost */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
              <DollarSign className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-txt-tertiary font-body mb-0.5">Custo Real</p>
                <p className="text-sm text-emerald-400 font-mono font-semibold">
                  {formatCurrency(evento.custo_real)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Participants Section ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card padding="lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-txt-tertiary" />
              <h2 className="text-lg font-display font-semibold text-txt-primary">
                Participantes
              </h2>
              <span className="ml-1 text-sm text-txt-tertiary font-mono">
                ({participantes.length})
              </span>
            </div>
            <Button
              size="sm"
              icon={<Plus />}
              onClick={() => setAddModalOpen(true)}
            >
              Adicionar
            </Button>
          </div>

          {participantes.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="Nenhum participante"
              description="Adicione jogadores a este evento."
              action={
                <Button
                  size="sm"
                  icon={<Plus />}
                  onClick={() => setAddModalOpen(true)}
                >
                  Adicionar Participante
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider font-body">
                      Jogador
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider font-body">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider font-body">
                      Pago
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider font-body">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {participantes.map((part, idx) => {
                      const pStatus =
                        participantStatusStyles[part.status] || participantStatusStyles.pendente;
                      const StatusIcon = pStatus.icon;

                      return (
                        <motion.tr
                          key={part.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-border-subtle/50 hover:bg-surface-secondary/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-surface-tertiary border border-border-subtle flex items-center justify-center">
                                <span className="text-xs font-semibold text-txt-secondary font-display">
                                  {(part.jogador?.apelido || part.jogador?.nome || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-txt-primary font-body">
                                  {part.jogador?.apelido || part.jogador?.nome || `Jogador #${part.jogador_id}`}
                                </p>
                                {part.jogador?.apelido && part.jogador?.nome && (
                                  <p className="text-xs text-txt-tertiary font-body">
                                    {part.jogador.nome}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="relative inline-block">
                              <select
                                value={part.status}
                                onChange={(e) => handleToggleStatus(part, e.target.value)}
                                className={cn(
                                  "appearance-none cursor-pointer",
                                  "pl-7 pr-3 py-1 rounded-full text-xs font-medium",
                                  "border-none outline-none",
                                  "transition-colors duration-200",
                                  pStatus.bg,
                                  pStatus.text
                                )}
                              >
                                {PARTICIPANT_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <StatusIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleTogglePago(part)}
                              className={cn(
                                "h-7 w-7 rounded-full inline-flex items-center justify-center",
                                "transition-all duration-200",
                                "border",
                                part.pago === 1
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-surface-tertiary border-border-subtle text-txt-tertiary hover:border-border-strong"
                              )}
                            >
                              {part.pago === 1 ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-mono text-txt-primary">
                              {formatCurrency(part.valor)}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
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
              label: j.apelido || j.nome,
            }))}
            value={selectedJogadorId}
            onChange={(e) => setSelectedJogadorId(e.target.value)}
          />
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
            placeholder="Nome do evento"
            value={editForm.titulo}
            onChange={(e) => updateEditField("titulo", e.target.value)}
          />
          <Input
            label="Descricao"
            placeholder="Descricao do evento (opcional)"
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
            placeholder="Local do evento"
            value={editForm.local}
            onChange={(e) => updateEditField("local", e.target.value)}
          />
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
            Salvar Alteracoes
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
