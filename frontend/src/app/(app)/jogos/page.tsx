"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  Star,
  Users,
  Goal,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { JogoOut, JogoCreate, JogoUpdate } from "@/types";
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
  { value: "amistoso", label: "Amistoso" },
  { value: "campeonato", label: "Campeonato" },
  { value: "torneio", label: "Torneio" },
];

const tipoBadgeStyles: Record<string, { bg: string; text: string }> = {
  amistoso: { bg: "bg-blue-500/15", text: "text-blue-400" },
  campeonato: { bg: "bg-purple-500/15", text: "text-purple-400" },
  torneio: { bg: "bg-amber-500/15", text: "text-amber-400" },
};

/* ─── Helpers ────────────────────────────────────────────────── */

function getResultInfo(gf: number, gc: number) {
  if (gf > gc) return { label: "V", border: "border-l-emerald-500", glow: "shadow-emerald-500/10" };
  if (gf < gc) return { label: "D", border: "border-l-red-500", glow: "shadow-red-500/10" };
  return { label: "E", border: "border-l-yellow-500", glow: "shadow-yellow-500/10" };
}

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isFutureGame(jogo: JogoOut) {
  if (jogo.realizado === 1) return false;
  return jogo.data >= getTodayStr();
}

function isHomeGame(jogo: JogoOut) {
  const local = (jogo.local || "").toLowerCase();
  return local.includes("11") || local.includes("gaucho") || local.includes("gaúcho");
}

function isWithin7Days(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gameDate = new Date(dateStr + "T00:00:00");
  const diff = gameDate.getTime() - today.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

/* ─── Form type ──────────────────────────────────────────────── */

interface JogoForm {
  data: string;
  horario: string;
  local: string;
  adversario: string;
  gols_favor: number;
  gols_contra: number;
  tipo: string;
  observacoes: string;
  realizado: number;
  gols_descricao: string;
  assistencias: string;
  destaque: string;
}

const emptyForm: JogoForm = {
  data: "",
  horario: "",
  local: "",
  adversario: "",
  gols_favor: 0,
  gols_contra: 0,
  tipo: "campeonato",
  observacoes: "",
  realizado: 0,
  gols_descricao: "",
  assistencias: "",
  destaque: "",
};

function jogoToForm(j: JogoOut): JogoForm {
  return {
    data: j.data,
    horario: j.horario || "",
    local: j.local || "",
    adversario: j.adversario,
    gols_favor: j.gols_favor,
    gols_contra: j.gols_contra,
    tipo: j.tipo,
    observacoes: j.observacoes || "",
    realizado: j.realizado ?? 0,
    gols_descricao: j.gols_descricao || "",
    assistencias: j.assistencias || "",
    destaque: j.destaque || "",
  };
}

/* ─── Page Component ─────────────────────────────────────────── */

export default function JogosPage() {
  const [jogos, setJogos] = useState<JogoOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<JogoForm>(emptyForm);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const jogosData = await api.get<JogoOut[]>("/jogos");
      setJogos(jogosData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Split jogos into future and results */
  const { proximosJogos, resultados } = useMemo(() => {
    const prox: JogoOut[] = [];
    const res: JogoOut[] = [];
    for (const j of jogos) {
      if (isFutureGame(j)) {
        prox.push(j);
      } else {
        res.push(j);
      }
    }
    // Sort proximos by date ascending
    prox.sort((a, b) => a.data.localeCompare(b.data));
    // Sort resultados by date descending
    res.sort((a, b) => b.data.localeCompare(a.data));
    return { proximosJogos: prox, resultados: res };
  }, [jogos]);

  // Find the highlighted next game (within 7 days)
  const highlightedGame = proximosJogos.length > 0 && isWithin7Days(proximosJogos[0].data)
    ? proximosJogos[0]
    : null;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(jogo: JogoOut) {
    setEditingId(jogo.id);
    setForm(jogoToForm(jogo));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  const handleSubmit = async () => {
    if (!form.adversario.trim()) {
      toast.error("Adversario e obrigatorio");
      return;
    }
    if (!form.data) {
      toast.error("Data e obrigatoria");
      return;
    }
    try {
      setSubmitting(true);
      if (editingId) {
        await api.put<JogoOut>(`/jogos/${editingId}`, form as JogoUpdate);
        toast.success("Jogo atualizado!");
      } else {
        await api.post<JogoOut>("/jogos", form as JogoCreate);
        toast.success("Jogo registrado!");
      }
      closeModal();
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar jogo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) {
      try {
        await api.delete(`/jogos/${id}`);
        toast.success("Jogo excluido");
        setDeletingId(null);
        fetchData();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir");
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const updateField = <K extends keyof JogoForm>(key: K, value: JogoForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ─── Render helpers ─────────────────────────────────────────── */

  function renderEditDeleteButtons(jogo: JogoOut) {
    return (
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
        <button
          onClick={() => openEdit(jogo)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-txt-tertiary hover:text-txt-primary hover:bg-surface-tertiary transition-colors"
          title="Editar jogo"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleDelete(jogo.id)}
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
            deletingId === jogo.id
              ? "bg-red-500/20 text-red-400"
              : "text-txt-tertiary hover:text-red-400 hover:bg-red-500/10"
          )}
          title={deletingId === jogo.id ? "Clique de novo para confirmar" : "Excluir jogo"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  function renderFutureRow(jogo: JogoOut, highlighted: boolean) {
    const tipoStyle = tipoBadgeStyles[jogo.tipo] || tipoBadgeStyles.amistoso;

    if (highlighted) {
      return (
        <motion.div
          key={jogo.id}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-xl",
              "border-2 border-brand-red/40",
              "bg-surface-card",
              "shadow-card shadow-brand-red/5",
              "transition-all duration-300",
              "hover:-translate-y-[2px] hover:shadow-lg hover:shadow-black/30",
              "group"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-red/5 to-transparent pointer-events-none" />
            <div className="relative px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-brand-red/20 text-brand-red">
                  Proximo Jogo
                </span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                    tipoStyle.bg,
                    tipoStyle.text
                  )}
                >
                  {jogo.tipo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg sm:text-xl font-display font-bold text-txt-primary uppercase tracking-wide">
                    Velhos Parceiros <span className="text-txt-tertiary font-light mx-2">vs</span> {jogo.adversario}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-txt-secondary font-body">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(jogo.data)}
                    </span>
                    {jogo.horario && jogo.horario !== "00:00" && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {jogo.horario}
                      </span>
                    )}
                    {jogo.local && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {jogo.local}
                      </span>
                    )}
                  </div>
                </div>
                {renderEditDeleteButtons(jogo)}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={jogo.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-lg",
            "border border-border-subtle",
            "bg-surface-card",
            "shadow-card",
            "transition-all duration-300",
            "hover:-translate-y-[1px] hover:shadow-md hover:shadow-black/20",
            "group"
          )}
        >
          <div className="relative px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-txt-tertiary font-body shrink-0">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(jogo.data)}</span>
              </div>
              {jogo.horario && jogo.horario !== "00:00" && (
                <div className="flex items-center gap-1 text-xs text-txt-tertiary font-body shrink-0">
                  <Clock className="h-3 w-3" />
                  <span>{jogo.horario}</span>
                </div>
              )}
              <p className="font-display font-bold text-sm text-txt-primary uppercase tracking-wide truncate">
                {jogo.adversario}
              </p>
              {jogo.local && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-txt-tertiary font-body shrink-0">
                  <MapPin className="h-3 w-3" />
                  {jogo.local}
                </span>
              )}
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0",
                  tipoStyle.bg,
                  tipoStyle.text
                )}
              >
                {jogo.tipo}
              </span>
            </div>
            {renderEditDeleteButtons(jogo)}
          </div>
        </div>
      </motion.div>
    );
  }

  function renderResultCard(jogo: JogoOut, idx: number) {
    const result = getResultInfo(jogo.gols_favor, jogo.gols_contra);
    const tipoStyle = tipoBadgeStyles[jogo.tipo] || tipoBadgeStyles.amistoso;
    const home = isHomeGame(jogo);
    const leftTeam = home ? "Velhos Parceiros" : jogo.adversario;
    const rightTeam = home ? jogo.adversario : "Velhos Parceiros";
    const leftLabel = "Mandante";
    const rightLabel = "Visitante";
    const leftGols = home ? jogo.gols_favor : jogo.gols_contra;
    const rightGols = home ? jogo.gols_contra : jogo.gols_favor;

    return (
      <motion.div
        key={jogo.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: idx * 0.04, type: "spring", stiffness: 300, damping: 30 }}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl",
            "border-l-4",
            result.border,
            "border border-border-subtle",
            "bg-surface-card",
            "shadow-card",
            result.glow,
            "transition-all duration-300",
            "hover:-translate-y-[2px] hover:shadow-lg hover:shadow-black/30",
            "group"
          )}
        >
          {/* Diagonal lines background */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-white/[0.02] pointer-events-none" />

          <div className="relative px-4 sm:px-6 py-5">
            {/* Top row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-xs text-txt-tertiary font-body">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(jogo.data)}
                </span>
                {jogo.horario && jogo.horario !== "00:00" && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {jogo.horario}
                  </span>
                )}
                {jogo.local && (
                  <span className="hidden sm:flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {jogo.local}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                    tipoStyle.bg,
                    tipoStyle.text
                  )}
                >
                  {jogo.tipo}
                </span>
                {renderEditDeleteButtons(jogo)}
              </div>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between">
              <div className="flex-1 text-left">
                <p className="text-xs text-txt-tertiary font-body uppercase tracking-widest mb-1">{leftLabel}</p>
                <p className={cn(
                  "text-base sm:text-lg font-display font-bold uppercase tracking-wide",
                  leftTeam === "Velhos Parceiros" ? "text-brand-red" : "text-txt-primary"
                )}>
                  {leftTeam}
                </p>
              </div>

              <div className="flex-shrink-0 mx-4 sm:mx-8">
                <div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className={cn(
                      "text-4xl sm:text-5xl lg:text-6xl font-display font-bold tabular-nums",
                      leftGols > rightGols ? "text-emerald-400" :
                      leftGols < rightGols ? "text-red-400" : "text-yellow-400"
                    )}>
                      {leftGols}
                    </span>
                    <span className="text-lg sm:text-xl text-txt-tertiary font-display font-light">x</span>
                    <span className={cn(
                      "text-4xl sm:text-5xl lg:text-6xl font-display font-bold tabular-nums",
                      rightGols > leftGols ? "text-emerald-400" :
                      rightGols < leftGols ? "text-red-400" : "text-yellow-400"
                    )}>
                      {rightGols}
                    </span>
                  </div>
                  <div className="flex justify-center mt-2">
                    <span className={cn(
                      "px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                      jogo.gols_favor > jogo.gols_contra && "bg-emerald-500/20 text-emerald-400",
                      jogo.gols_favor < jogo.gols_contra && "bg-red-500/20 text-red-400",
                      jogo.gols_favor === jogo.gols_contra && "bg-yellow-500/20 text-yellow-400"
                    )}>
                      {jogo.gols_favor > jogo.gols_contra ? "Vitoria" :
                       jogo.gols_favor < jogo.gols_contra ? "Derrota" : "Empate"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 text-right">
                <p className="text-xs text-txt-tertiary font-body uppercase tracking-widest mb-1">{rightLabel}</p>
                <p className={cn(
                  "text-base sm:text-lg font-display font-bold uppercase tracking-wide",
                  rightTeam === "Velhos Parceiros" ? "text-brand-red" : "text-txt-primary"
                )}>
                  {rightTeam}
                </p>
              </div>
            </div>

            {/* Mobile location */}
            {jogo.local && (
              <div className="sm:hidden mt-3 flex items-center gap-1 text-xs text-txt-tertiary font-body">
                <MapPin className="h-3 w-3" />
                {jogo.local}
              </div>
            )}

            {/* Extra info: gols_descricao, assistencias, destaque */}
            {(jogo.gols_descricao || jogo.assistencias || jogo.destaque) && (
              <div className="mt-4 pt-3 border-t border-border-subtle/50 space-y-1.5">
                {jogo.gols_descricao && (
                  <div className="flex items-start gap-2 text-xs text-txt-secondary font-body">
                    <Goal className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><span className="text-txt-tertiary font-semibold uppercase tracking-wider">Gols:</span> {jogo.gols_descricao}</span>
                  </div>
                )}
                {jogo.assistencias && (
                  <div className="flex items-start gap-2 text-xs text-txt-secondary font-body">
                    <Users className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                    <span><span className="text-txt-tertiary font-semibold uppercase tracking-wider">Assist:</span> {jogo.assistencias}</span>
                  </div>
                )}
                {jogo.destaque && (
                  <div className="flex items-start gap-2 text-xs text-txt-secondary font-body">
                    <Star className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span><span className="text-txt-tertiary font-semibold uppercase tracking-wider">Destaque:</span> {jogo.destaque}</span>
                  </div>
                )}
              </div>
            )}

            {/* Observations */}
            {jogo.observacoes && (
              <p className="mt-3 pt-3 border-t border-border-subtle/50 text-xs text-txt-tertiary font-body italic">
                {jogo.observacoes}
              </p>
            )}
          </div>

          {/* Bottom accent line */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r",
              jogo.gols_favor > jogo.gols_contra && "from-transparent via-emerald-500/40 to-transparent",
              jogo.gols_favor < jogo.gols_contra && "from-transparent via-red-500/40 to-transparent",
              jogo.gols_favor === jogo.gols_contra && "from-transparent via-yellow-500/40 to-transparent"
            )}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary uppercase tracking-wider">
          Jogos
        </h1>
        <Button icon={<Plus />} onClick={openCreate}>
          Novo Jogo
        </Button>
      </div>

      {/* ── Loading State ──────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-surface-card border border-border-subtle animate-pulse" />
          ))}
        </div>
      ) : jogos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy />}
            title="Nenhum jogo registrado"
            description="Registre o primeiro jogo do Velhos Parceiros."
            action={<Button size="sm" onClick={openCreate} icon={<Plus />}>Registrar Jogo</Button>}
          />
        </Card>
      ) : (
        <>
          {/* ── Proximos Jogos ──────────────────────────────── */}
          {proximosJogos.length > 0 && (
            <section>
              <h2 className="text-lg font-display font-bold text-txt-primary uppercase tracking-wider mb-4">
                Proximos Jogos
              </h2>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {proximosJogos.map((jogo) =>
                    renderFutureRow(jogo, highlightedGame?.id === jogo.id)
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ── Resultados ─────────────────────────────────── */}
          {resultados.length > 0 && (
            <section>
              <h2 className="text-lg font-display font-bold text-txt-primary uppercase tracking-wider mb-4">
                Resultados
              </h2>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {resultados.map((jogo, idx) => renderResultCard(jogo, idx))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Create/Edit Modal ────────────────────────────────── */}
      <Modal open={modalOpen} onClose={closeModal} size="lg">
        <ModalHeader>{editingId ? "Editar Jogo" : "Novo Jogo"}</ModalHeader>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data"
              type="date"
              value={form.data}
              onChange={(e) => updateField("data", e.target.value)}
            />
            <Input
              label="Horario"
              type="time"
              value={form.horario}
              onChange={(e) => updateField("horario", e.target.value)}
            />
          </div>
          <Input
            label="Local / Campo"
            placeholder="Ex: 11 Gaucho, Vila Nova..."
            value={form.local}
            onChange={(e) => updateField("local", e.target.value)}
          />
          <Input
            label="Adversario"
            placeholder="Nome do adversario"
            value={form.adversario}
            onChange={(e) => updateField("adversario", e.target.value)}
          />

          {/* Placar */}
          <div className="bg-surface-tertiary/50 rounded-xl p-4 border border-border-subtle">
            <p className="text-xs font-display uppercase tracking-wider text-txt-secondary mb-3">Placar</p>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <div>
                <label className="text-xs text-txt-tertiary font-body block mb-1.5">Velhos Parceiros</label>
                <input
                  type="number"
                  min={0}
                  value={form.gols_favor}
                  onChange={(e) => updateField("gols_favor", parseInt(e.target.value) || 0)}
                  className={cn(
                    "w-full h-14 rounded-xl text-center text-3xl font-display font-bold",
                    "bg-surface-card border border-border text-txt-primary",
                    "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                    "transition-colors"
                  )}
                />
              </div>
              <span className="text-xl text-txt-tertiary font-display pb-3">x</span>
              <div>
                <label className="text-xs text-txt-tertiary font-body block mb-1.5">Adversario</label>
                <input
                  type="number"
                  min={0}
                  value={form.gols_contra}
                  onChange={(e) => updateField("gols_contra", parseInt(e.target.value) || 0)}
                  className={cn(
                    "w-full h-14 rounded-xl text-center text-3xl font-display font-bold",
                    "bg-surface-card border border-border text-txt-primary",
                    "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                    "transition-colors"
                  )}
                />
              </div>
            </div>
          </div>

          <Select
            label="Tipo"
            options={TIPO_OPTIONS}
            value={form.tipo}
            onChange={(e) => updateField("tipo", e.target.value)}
          />

          {/* New fields: Gols, Assistencias, Destaque */}
          <div className="bg-surface-tertiary/50 rounded-xl p-4 border border-border-subtle space-y-3">
            <p className="text-xs font-display uppercase tracking-wider text-txt-secondary mb-1">Detalhes do Jogo</p>
            <div>
              <label className="text-xs text-txt-tertiary font-body block mb-1.5">Gols</label>
              <textarea
                rows={2}
                placeholder="Ex: Carlao (2), Pedrinho"
                value={form.gols_descricao}
                onChange={(e) => updateField("gols_descricao", e.target.value)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm font-body",
                  "bg-surface-card border border-border text-txt-primary",
                  "placeholder:text-txt-tertiary/50",
                  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                  "transition-colors resize-none"
                )}
              />
            </div>
            <div>
              <label className="text-xs text-txt-tertiary font-body block mb-1.5">Assistencias</label>
              <textarea
                rows={2}
                placeholder="Ex: Michel, Silver"
                value={form.assistencias}
                onChange={(e) => updateField("assistencias", e.target.value)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm font-body",
                  "bg-surface-card border border-border text-txt-primary",
                  "placeholder:text-txt-tertiary/50",
                  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                  "transition-colors resize-none"
                )}
              />
            </div>
            <Input
              label="Destaque"
              placeholder="Ex: Carlao"
              value={form.destaque}
              onChange={(e) => updateField("destaque", e.target.value)}
            />
          </div>

          <Input
            label="Observacoes"
            placeholder="Observacoes (opcional)"
            value={form.observacoes}
            onChange={(e) => updateField("observacoes", e.target.value)}
          />

          {/* Realizado toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={form.realizado === 1}
              onClick={() => updateField("realizado", form.realizado === 1 ? 0 : 1)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
                form.realizado === 1 ? "bg-emerald-500" : "bg-surface-elevated"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform",
                  form.realizado === 1 ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
            <span className="text-sm text-txt-secondary font-body">Jogo realizado</span>
          </label>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>
            Cancelar
          </Button>
          <Button loading={submitting} onClick={handleSubmit}>
            {editingId ? "Salvar Alteracoes" : "Registrar Jogo"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
