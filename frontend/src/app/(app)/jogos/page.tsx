"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { JogoOut, JogoCreate, JogoEstatisticas, JogoUpdate } from "@/types";
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

function isFutureGame(jogo: JogoOut) {
  return jogo.gols_favor === 0 && jogo.gols_contra === 0;
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
  };
}

/* ─── Page Component ─────────────────────────────────────────── */

export default function JogosPage() {
  const [jogos, setJogos] = useState<JogoOut[]>([]);
  const [stats, setStats] = useState<JogoEstatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<JogoForm>(emptyForm);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jogosData, statsData] = await Promise.all([
        api.get<JogoOut[]>("/jogos"),
        api.get<JogoEstatisticas>("/jogos/estatisticas"),
      ]);
      setJogos(jogosData);
      setStats(statsData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const updateField = <K extends keyof JogoForm>(key: K, value: JogoForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary uppercase tracking-wider">
          Jogos
        </h1>
        <Button icon={<Plus />} onClick={openCreate}>
          Novo Jogo
        </Button>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative">
              <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Vitorias</p>
              <p className="text-3xl font-display font-bold text-emerald-400">{stats.vitorias}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
            <div className="relative">
              <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Empates</p>
              <p className="text-3xl font-display font-bold text-yellow-400">{stats.empates}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
            <div className="relative">
              <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Derrotas</p>
              <p className="text-3xl font-display font-bold text-red-400">{stats.derrotas}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
            <div className="relative">
              <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Gols Pro</p>
              <p className="text-3xl font-display font-bold text-blue-400">{stats.gols_marcados}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4 col-span-2 sm:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
            <div className="relative">
              <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Gols Contra</p>
              <p className="text-3xl font-display font-bold text-orange-400">{stats.gols_sofridos}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Game List ────────────────────────────────────────── */}
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
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {jogos.map((jogo, idx) => {
              const future = isFutureGame(jogo);
              const result = getResultInfo(jogo.gols_favor, jogo.gols_contra);
              const tipoStyle = tipoBadgeStyles[jogo.tipo] || tipoBadgeStyles.amistoso;

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
                      future ? "border-l-txt-tertiary/30" : result.border,
                      "border border-border-subtle",
                      "bg-surface-card",
                      "shadow-card",
                      !future && result.glow,
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
                          {/* Edit button */}
                          <button
                            onClick={() => openEdit(jogo)}
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center",
                              "text-txt-tertiary hover:text-txt-primary hover:bg-surface-tertiary",
                              "opacity-0 group-hover:opacity-100 transition-all duration-200"
                            )}
                            title="Editar jogo"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Scoreboard */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <p className="text-xs text-txt-tertiary font-body uppercase tracking-widest mb-1">Casa</p>
                          <p className="text-base sm:text-lg font-display font-bold text-txt-primary uppercase tracking-wide">
                            Velhos Parceiros
                          </p>
                        </div>

                        <div className="flex-shrink-0 mx-4 sm:mx-8">
                          {future ? (
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl sm:text-4xl font-display font-bold text-txt-tertiary/40">-</span>
                                <span className="text-lg text-txt-tertiary/30 font-display">x</span>
                                <span className="text-3xl sm:text-4xl font-display font-bold text-txt-tertiary/40">-</span>
                              </div>
                              <span className="mt-2 px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-surface-tertiary text-txt-tertiary">
                                A jogar
                              </span>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 sm:gap-4">
                                <span
                                  className={cn(
                                    "text-4xl sm:text-5xl lg:text-6xl font-display font-bold tabular-nums",
                                    jogo.gols_favor > jogo.gols_contra ? "text-emerald-400" :
                                    jogo.gols_favor < jogo.gols_contra ? "text-red-400" : "text-yellow-400"
                                  )}
                                >
                                  {jogo.gols_favor}
                                </span>
                                <span className="text-lg sm:text-xl text-txt-tertiary font-display font-light">x</span>
                                <span
                                  className={cn(
                                    "text-4xl sm:text-5xl lg:text-6xl font-display font-bold tabular-nums",
                                    jogo.gols_contra > jogo.gols_favor ? "text-emerald-400" :
                                    jogo.gols_contra < jogo.gols_favor ? "text-red-400" : "text-yellow-400"
                                  )}
                                >
                                  {jogo.gols_contra}
                                </span>
                              </div>
                              <div className="flex justify-center mt-2">
                                <span
                                  className={cn(
                                    "px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                                    jogo.gols_favor > jogo.gols_contra && "bg-emerald-500/20 text-emerald-400",
                                    jogo.gols_favor < jogo.gols_contra && "bg-red-500/20 text-red-400",
                                    jogo.gols_favor === jogo.gols_contra && "bg-yellow-500/20 text-yellow-400"
                                  )}
                                >
                                  {jogo.gols_favor > jogo.gols_contra ? "Vitoria" :
                                   jogo.gols_favor < jogo.gols_contra ? "Derrota" : "Empate"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 text-right">
                          <p className="text-xs text-txt-tertiary font-body uppercase tracking-widest mb-1">Visitante</p>
                          <p className="text-base sm:text-lg font-display font-bold text-txt-primary uppercase tracking-wide">
                            {jogo.adversario}
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

                      {/* Observations */}
                      {jogo.observacoes && (
                        <p className="mt-3 pt-3 border-t border-border-subtle/50 text-xs text-txt-tertiary font-body italic">
                          {jogo.observacoes}
                        </p>
                      )}
                    </div>

                    {/* Bottom accent line */}
                    {!future && (
                      <div
                        className={cn(
                          "absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r",
                          jogo.gols_favor > jogo.gols_contra && "from-transparent via-emerald-500/40 to-transparent",
                          jogo.gols_favor < jogo.gols_contra && "from-transparent via-red-500/40 to-transparent",
                          jogo.gols_favor === jogo.gols_contra && "from-transparent via-yellow-500/40 to-transparent"
                        )}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
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

          {/* Placar - destaque visual */}
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
          <Input
            label="Observacoes"
            placeholder="Observacoes (opcional)"
            value={form.observacoes}
            onChange={(e) => updateField("observacoes", e.target.value)}
          />
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
