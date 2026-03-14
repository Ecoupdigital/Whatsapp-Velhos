"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Check,
  DollarSign,
  Send,
  Search,
  Plus,
  CircleDollarSign,
  Clock,
  AlertTriangle,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import type {
  MensalidadeOut,
  MensalidadeResumo,
  MensalidadeUpdate,
  GerarMensalidadesRequest,
} from "@/types";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pago: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Pago" },
  pendente: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Pendente" },
  atrasado: { bg: "bg-red-500/15", text: "text-red-400", label: "Atrasado" },
  isento: { bg: "bg-sky-500/15", text: "text-sky-400", label: "Isento" },
};

const TIPO_STYLES: Record<string, { bg: string; text: string }> = {
  mensalista: { bg: "bg-brand-red/15", text: "text-brand-red" },
  avulso: { bg: "bg-purple-500/15", text: "text-purple-400" },
  convidado: { bg: "bg-amber-500/15", text: "text-amber-400" },
};

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-lg p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-border-subtle" />
      <div className="space-y-3">
        <div className="h-3 w-20 bg-surface-elevated rounded animate-shimmer bg-gradient-to-r from-surface-elevated via-surface-tertiary to-surface-elevated bg-[length:200%_100%]" />
        <div className="h-8 w-16 bg-surface-elevated rounded animate-shimmer bg-gradient-to-r from-surface-elevated via-surface-tertiary to-surface-elevated bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border-subtle">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 bg-surface-elevated rounded animate-shimmer bg-gradient-to-r from-surface-elevated via-surface-tertiary to-surface-elevated bg-[length:200%_100%]"
            style={{ width: `${50 + Math.random() * 50}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Quick Pay Popover
// ---------------------------------------------------------------------------

interface QuickPayProps {
  mensalidade: MensalidadeOut;
  onConfirm: (id: number, data: MensalidadeUpdate) => Promise<void>;
  onClose: () => void;
}

function QuickPayPopover({ mensalidade, onConfirm, onClose }: QuickPayProps) {
  const [forma, setForma] = useState("pix");
  const [valor, setValor] = useState(String(mensalidade.valor));
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(mensalidade.id, {
        status: "pago",
        valor_pago: parseFloat(valor),
        data_pagamento: todayISO(),
        forma_pagto: forma,
      });
    } finally {
      setLoading(false);
    }
  }

  const formas = [
    { value: "pix", label: "PIX" },
    { value: "dinheiro", label: "Dinheiro" },
    { value: "transferencia", label: "Transferencia" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-full mt-2 z-[110] w-72 bg-surface-elevated border border-border rounded-lg shadow-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm uppercase tracking-wider text-txt-primary">
          Registrar Pagamento
        </h4>
        <button onClick={onClose} className="text-txt-tertiary hover:text-txt-primary transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Forma de pagamento */}
      <div className="space-y-2">
        <label className="text-xs text-txt-secondary font-body">Forma de pagamento</label>
        <div className="flex gap-2">
          {formas.map((f) => (
            <button
              key={f.value}
              onClick={() => setForma(f.value)}
              className={cn(
                "flex-1 text-xs py-2 px-2 rounded-md border transition-all font-body",
                forma === f.value
                  ? "border-brand-red bg-brand-red/10 text-brand-red"
                  : "border-border-subtle bg-surface-card text-txt-secondary hover:border-border"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Valor */}
      <div className="space-y-2">
        <label className="text-xs text-txt-secondary font-body">Valor pago (R$)</label>
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full bg-surface-card border border-border-subtle rounded-md px-3 py-2 text-sm font-mono text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
        />
      </div>

      {/* Confirmar */}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-display uppercase tracking-wider transition-all",
          loading
            ? "bg-surface-tertiary text-txt-tertiary cursor-not-allowed"
            : "bg-brand-red text-white hover:bg-brand-red-hover shadow-brand"
        )}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Check size={16} />
            Confirmar
          </>
        )}
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MensalidadesPage() {
  const [mes, setMes] = useState(getCurrentMonth);
  const [mensalidades, setMensalidades] = useState<MensalidadeOut[]>([]);
  const [resumo, setResumo] = useState<MensalidadeResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [search, setSearch] = useState("");
  const [gerando, setGerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [quickPayId, setQuickPayId] = useState<number | null>(null);
  const [flashRowId, setFlashRowId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingMens, setEditingMens] = useState<MensalidadeOut | null>(null);
  const [editForm, setEditForm] = useState({ valor: "", valor_pago: "", status: "", forma_pagto: "", data_pagamento: "", observacoes: "" });
  const [editSaving, setEditSaving] = useState(false);

  // ---- Fetch data ----

  const fetchMensalidades = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MensalidadeOut[]>(`/mensalidades?mes=${mes}`);
      setMensalidades(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar mensalidades";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [mes]);

  const fetchResumo = useCallback(async () => {
    setLoadingResumo(true);
    try {
      const data = await api.get<MensalidadeResumo>(`/mensalidades/resumo/${mes}`);
      setResumo(data);
    } catch {
      setResumo(null);
    } finally {
      setLoadingResumo(false);
    }
  }, [mes]);

  useEffect(() => {
    fetchMensalidades();
    fetchResumo();
  }, [fetchMensalidades, fetchResumo]);

  // ---- Actions ----

  async function handleGerar() {
    setGerando(true);
    try {
      await api.post<unknown>("/mensalidades/gerar", {
        mes_referencia: mes,
      } satisfies GerarMensalidadesRequest);
      toast.success("Mensalidades geradas com sucesso!");
      fetchMensalidades();
      fetchResumo();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao gerar mensalidades";
      toast.error(message);
    } finally {
      setGerando(false);
    }
  }

  async function handleEnviarCobrancas() {
    setEnviando(true);
    try {
      await api.post<unknown>("/mensalidades/cobrar", { mes_referencia: mes });
      toast.success("Cobrancas enviadas via WhatsApp!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao enviar cobrancas";
      toast.error(message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleQuickPay(id: number, data: MensalidadeUpdate) {
    try {
      await api.put<MensalidadeOut>(`/mensalidades/${id}`, data);
      toast.success("Pagamento registrado!");
      setQuickPayId(null);
      setFlashRowId(id);
      setTimeout(() => setFlashRowId(null), 1500);
      fetchMensalidades();
      fetchResumo();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao registrar pagamento";
      toast.error(message);
      throw err;
    }
  }

  // ---- Delete ----
  async function handleDeleteMens(id: number) {
    if (deletingId === id) {
      try {
        await api.delete(`/mensalidades/${id}`);
        toast.success("Mensalidade excluida");
        setDeletingId(null);
        fetchMensalidades();
        fetchResumo();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir");
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  }

  // ---- Edit modal ----
  function openEditMens(m: MensalidadeOut) {
    setEditingMens(m);
    setEditForm({
      valor: String(m.valor),
      valor_pago: String(m.valor_pago || 0),
      status: m.status,
      forma_pagto: m.forma_pagto || "",
      data_pagamento: m.data_pagamento || "",
      observacoes: m.observacoes || "",
    });
  }

  async function handleEditSave() {
    if (!editingMens) return;
    setEditSaving(true);
    try {
      const update: MensalidadeUpdate = {
        status: editForm.status,
        valor_pago: parseFloat(editForm.valor_pago) || 0,
        forma_pagto: editForm.forma_pagto || null,
        data_pagamento: editForm.data_pagamento || null,
        observacoes: editForm.observacoes || null,
      };
      await api.put(`/mensalidades/${editingMens.id}`, update);
      toast.success("Mensalidade atualizada");
      setEditingMens(null);
      fetchMensalidades();
      fetchResumo();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setEditSaving(false);
    }
  }

  // ---- Filtering ----

  const filtered = mensalidades.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const nome = m.jogador?.nome?.toLowerCase() ?? "";
    const apelido = m.jogador?.apelido?.toLowerCase() ?? "";
    return nome.includes(q) || apelido.includes(q);
  });

  // ---- Stats cards config ----

  const stats = resumo
    ? [
        {
          label: "Pagos",
          value: resumo.pagos,
          icon: Check,
          borderColor: "border-t-emerald-500",
          iconColor: "text-emerald-400",
          progress: resumo.total_jogadores > 0 ? resumo.pagos / resumo.total_jogadores : 0,
          progressColor: "bg-emerald-500",
          sub: null,
        },
        {
          label: "Pendentes",
          value: resumo.pendentes,
          icon: Clock,
          borderColor: "border-t-yellow-500",
          iconColor: "text-yellow-400",
          progress: null,
          progressColor: null,
          sub: null,
        },
        {
          label: "Atrasados",
          value: resumo.atrasados,
          icon: AlertTriangle,
          borderColor: "border-t-red-500",
          iconColor: "text-red-400",
          progress: null,
          progressColor: null,
          sub: null,
        },
        {
          label: "Arrecadado",
          value: formatCurrency(resumo.valor_arrecadado),
          icon: CircleDollarSign,
          borderColor: "border-t-brand-red",
          iconColor: "text-brand-red",
          progress: null,
          progressColor: null,
          sub: `de ${formatCurrency(resumo.valor_esperado)}`,
          mono: true,
        },
      ]
    : [];

  // ---- Render ----

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ===== Header ===== */}
      <div>
        <h1 className="font-display text-3xl lg:text-4xl uppercase tracking-wider text-txt-primary">
          Mensalidades
        </h1>
        <p className="text-txt-secondary font-body mt-1">
          Controle mensal de pagamentos
        </p>
      </div>

      {/* ===== Month Selector ===== */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setMes((prev) => shiftMonth(prev, -1))}
          className="p-2 rounded-lg bg-surface-card border border-border-subtle text-txt-secondary hover:text-txt-primary hover:border-border transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-[200px] text-center">
          <span className="font-display text-xl uppercase tracking-wider text-txt-primary">
            {formatMonth(mes)}
          </span>
        </div>
        <button
          onClick={() => setMes((prev) => shiftMonth(prev, 1))}
          className="p-2 rounded-lg bg-surface-card border border-border-subtle text-txt-secondary hover:text-txt-primary hover:border-border transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ===== Stats Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingResumo
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={cn(
                    "bg-surface-card border border-border-subtle rounded-lg p-5 relative overflow-hidden animate-slide-up",
                    s.borderColor,
                    "border-t-2"
                  )}
                  style={{
                    animationDelay: `${i * 80}ms`,
                    animationFillMode: "backwards",
                    clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-txt-secondary font-body uppercase tracking-wider mb-2">
                        {s.label}
                      </p>
                      <p
                        className={cn(
                          "text-2xl font-bold text-txt-primary",
                          s.mono ? "font-mono" : "font-display"
                        )}
                      >
                        {s.value}
                      </p>
                      {s.sub && (
                        <p className="text-xs text-txt-tertiary font-body mt-1">{s.sub}</p>
                      )}
                    </div>
                    <div className={cn("p-2 rounded-lg bg-surface-tertiary", s.iconColor)}>
                      <Icon size={20} />
                    </div>
                  </div>
                  {s.progress !== null && s.progressColor && (
                    <div className="mt-4 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", s.progressColor)}
                        style={{ width: `${Math.round(s.progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* ===== Action Bar ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          onClick={handleGerar}
          disabled={gerando}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg font-display text-sm uppercase tracking-wider transition-all",
            gerando
              ? "bg-surface-tertiary text-txt-tertiary cursor-not-allowed"
              : "bg-brand-red text-white hover:bg-brand-red-hover shadow-brand"
          )}
        >
          {gerando ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Gerar Mensalidades
        </button>

        <button
          onClick={handleEnviarCobrancas}
          disabled={enviando}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg font-display text-sm uppercase tracking-wider transition-all border",
            enviando
              ? "border-border-subtle bg-surface-tertiary text-txt-tertiary cursor-not-allowed"
              : "border-border bg-surface-card text-txt-primary hover:border-brand-red hover:text-brand-red"
          )}
        >
          {enviando ? (
            <div className="w-4 h-4 border-2 border-txt-tertiary/30 border-t-txt-tertiary rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Enviar Cobrancas
        </button>

        <div className="flex-1" />

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-card border border-border-subtle rounded-lg pl-9 pr-4 py-2.5 text-sm font-body text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-brand-red transition-colors"
          />
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="bg-surface-card border border-border-subtle rounded-lg overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-txt-secondary">
                  Jogador
                </th>
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-txt-secondary">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-txt-secondary">
                  Valor
                </th>
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-txt-secondary">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-display uppercase tracking-wider text-txt-secondary">
                  Data Pgto
                </th>
                <th className="text-right px-4 py-3 text-xs font-display uppercase tracking-wider text-txt-secondary">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-full bg-surface-tertiary">
                        <CreditCard size={32} className="text-txt-tertiary" />
                      </div>
                      <div>
                        <p className="text-txt-secondary font-body">
                          {mensalidades.length === 0
                            ? "Nenhuma mensalidade para este mes"
                            : "Nenhum resultado encontrado"}
                        </p>
                        {mensalidades.length === 0 && (
                          <button
                            onClick={handleGerar}
                            disabled={gerando}
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-red text-white font-display text-sm uppercase tracking-wider hover:bg-brand-red-hover shadow-brand transition-all"
                          >
                            <Plus size={16} />
                            Gerar Mensalidades
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const statusStyle = STATUS_STYLES[m.status] ?? STATUS_STYLES.pendente;
                  const tipo = m.jogador?.tipo ?? "mensalista";
                  const tipoStyle = TIPO_STYLES[tipo] ?? TIPO_STYLES.mensalista;
                  const isFlash = flashRowId === m.id;
                  const isPaid = m.status === "pago" || m.status === "isento";

                  return (
                    <tr
                      key={m.id}
                      className={cn(
                        "border-b border-border-subtle hover:bg-surface-card-hover transition-colors",
                        isFlash && "animate-flash-green"
                      )}
                      style={
                        isFlash
                          ? {
                              animation: "flashGreen 1.5s ease-out forwards",
                            }
                          : undefined
                      }
                    >
                      {/* Jogador */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center">
                            <Users size={14} className="text-txt-tertiary" />
                          </div>
                          <div>
                            <p className="text-txt-primary font-medium">
                              {m.jogador?.apelido || m.jogador?.nome || `Jogador #${m.jogador_id}`}
                            </p>
                            {m.jogador?.apelido && m.jogador?.nome && (
                              <p className="text-xs text-txt-tertiary">{m.jogador.nome}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded text-xs capitalize font-medium",
                            tipoStyle.bg,
                            tipoStyle.text
                          )}
                        >
                          {tipo}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 font-mono text-txt-primary">
                        {formatCurrency(m.valor)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            statusStyle.bg,
                            statusStyle.text
                          )}
                        >
                          {m.status === "pago" && <Check size={12} />}
                          {m.status === "atrasado" && <AlertTriangle size={12} />}
                          {m.status === "pendente" && <Clock size={12} />}
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* Data Pagamento */}
                      <td className="px-4 py-3 text-txt-secondary">
                        {m.data_pagamento ? formatDate(m.data_pagamento) : "-"}
                      </td>

                      {/* Acoes */}
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-flex items-center gap-1">
                          {!isPaid && (
                            <button
                              onClick={() =>
                                setQuickPayId(quickPayId === m.id ? null : m.id)
                              }
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wider transition-all",
                                quickPayId === m.id
                                  ? "bg-brand-red text-white"
                                  : "bg-surface-tertiary text-txt-secondary hover:text-emerald-400 hover:bg-emerald-500/10"
                              )}
                            >
                              <DollarSign size={14} />
                              Pagar
                            </button>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400/60 px-2">
                              <Check size={14} />
                            </span>
                          )}
                          {/* Edit */}
                          <button
                            onClick={() => openEditMens(m)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-txt-tertiary hover:text-txt-primary hover:bg-surface-tertiary transition-colors"
                            title="Editar"
                          >
                            <CreditCard size={14} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteMens(m.id)}
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                              deletingId === m.id
                                ? "bg-red-500/20 text-red-400"
                                : "text-txt-tertiary hover:text-red-400 hover:bg-red-500/10"
                            )}
                            title={deletingId === m.id ? "Confirmar exclusao" : "Excluir"}
                          >
                            <X size={14} />
                          </button>
                          <AnimatePresence>
                            {quickPayId === m.id && (
                              <QuickPayPopover
                                mensalidade={m}
                                onConfirm={handleQuickPay}
                                onClose={() => setQuickPayId(null)}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Edit Mensalidade Modal ===== */}
      <Modal open={!!editingMens} onClose={() => setEditingMens(null)} size="md">
        <ModalHeader>
          Editar Mensalidade - {editingMens?.jogador?.apelido || editingMens?.jogador?.nome || ""}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
              className="h-10 rounded-lg px-3 text-sm font-body bg-surface-tertiary border border-border text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand-red/50"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
              <option value="isento">Isento</option>
            </select>
          </div>

          {/* Valor pago */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">Valor Pago (R$)</label>
            <input
              type="number"
              step="0.01"
              value={editForm.valor_pago}
              onChange={(e) => setEditForm((p) => ({ ...p, valor_pago: e.target.value }))}
              className="h-10 rounded-lg px-3 text-sm font-mono bg-surface-tertiary border border-border text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand-red/50"
            />
          </div>

          {/* Forma de pagamento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">Forma de Pagamento</label>
            <select
              value={editForm.forma_pagto}
              onChange={(e) => setEditForm((p) => ({ ...p, forma_pagto: e.target.value }))}
              className="h-10 rounded-lg px-3 text-sm font-body bg-surface-tertiary border border-border text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand-red/50"
            >
              <option value="">Selecionar...</option>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferencia</option>
              <option value="pix+dinheiro">PIX + Dinheiro</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          {/* Data pagamento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">Data do Pagamento</label>
            <input
              type="date"
              value={editForm.data_pagamento}
              onChange={(e) => setEditForm((p) => ({ ...p, data_pagamento: e.target.value }))}
              className="h-10 rounded-lg px-3 text-sm font-body bg-surface-tertiary border border-border text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand-red/50"
            />
          </div>

          {/* Observacoes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">Observacoes</label>
            <textarea
              value={editForm.observacoes}
              onChange={(e) => setEditForm((p) => ({ ...p, observacoes: e.target.value }))}
              rows={2}
              placeholder="Ex: Pagou R$30 no PIX e R$30 em dinheiro"
              className="rounded-lg px-3 py-2 text-sm font-body bg-surface-tertiary border border-border text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:ring-2 focus:ring-brand-red/50 resize-none"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditingMens(null)}>Cancelar</Button>
          <Button loading={editSaving} onClick={handleEditSave}>Salvar</Button>
        </ModalFooter>
      </Modal>

      {/* Flash green row animation */}
      <style jsx global>{`
        @keyframes flashGreen {
          0% {
            background-color: rgba(16, 185, 129, 0.25);
          }
          100% {
            background-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
