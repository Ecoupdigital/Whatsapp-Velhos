"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import type {
  TransacaoOut,
  TransacaoCreate,
  BalancoOut,
  FluxoMensal,
} from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIAS = [
  { value: "mensalidade", label: "Mensalidade" },
  { value: "evento", label: "Evento" },
  { value: "cartao_baile", label: "Cartao de Baile" },
  { value: "patrocinio", label: "Patrocinio" },
  { value: "aluguel_campo", label: "Aluguel de Campo" },
  { value: "material", label: "Material" },
  { value: "arbitragem", label: "Arbitragem" },
  { value: "viagem", label: "Viagem" },
  { value: "outros", label: "Outros" },
] as const;

const CATEGORIA_COLORS: Record<string, string> = {
  mensalidade: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  evento: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  aluguel_campo: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  material: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  arbitragem: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  viagem: "bg-green-500/15 text-green-400 border-green-500/25",
  cartao_baile: "bg-pink-500/15 text-pink-400 border-pink-500/25",
  patrocinio: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  outros: "bg-gray-500/15 text-gray-400 border-gray-500/25",
};

type FilterTipo = "todas" | "entrada" | "saida";

const DIAGONAL_CLIP = "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)";

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface ChartPayloadEntry {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: ChartPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-3 shadow-card">
      <p className="text-txt-secondary text-xs font-body mb-1">{label}</p>
      {payload.map((entry: ChartPayloadEntry) => (
        <p key={entry.dataKey} className="text-sm font-mono" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinanceiroPage() {
  // Data state
  const [balanco, setBalanco] = useState<BalancoOut | null>(null);
  const [fluxo, setFluxo] = useState<FluxoMensal[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filtroTipo, setFiltroTipo] = useState<FilterTipo>("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransacaoOut | null>(null);
  const [formData, setFormData] = useState<TransacaoCreate>({
    tipo: "entrada",
    categoria: "mensalidade",
    descricao: "",
    valor: 0,
    data: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // ---------------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------------

  const fetchBalanco = useCallback(async () => {
    try {
      const data = await api.get<BalancoOut>("/financeiro/balanco");
      setBalanco(data);
    } catch {
      // silent
    }
  }, []);

  const fetchFluxo = useCallback(async () => {
    try {
      const data = await api.get<FluxoMensal[]>("/financeiro/fluxo");
      setFluxo(data);
    } catch {
      // silent
    }
  }, []);

  const fetchTransacoes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtroTipo !== "todas") params.set("tipo", filtroTipo);
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      if (filtroDataInicio) params.set("data_inicio", filtroDataInicio);
      if (filtroDataFim) params.set("data_fim", filtroDataFim);
      const qs = params.toString();
      const data = await api.get<TransacaoOut[]>(`/transacoes${qs ? `?${qs}` : ""}`);
      setTransacoes(data);
    } catch {
      // silent
    }
  }, [filtroTipo, filtroCategoria, filtroDataInicio, filtroDataFim]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchBalanco(), fetchFluxo(), fetchTransacoes()]);
      setLoading(false);
    }
    init();
  }, [fetchBalanco, fetchFluxo, fetchTransacoes]);

  // ---------------------------------------------------------------------------
  // Chart data
  // ---------------------------------------------------------------------------

  const chartData = useMemo(() => {
    return fluxo.map((f) => {
      const [year, month] = f.mes.split("-");
      const months = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez",
      ];
      return {
        name: `${months[parseInt(month) - 1]}/${year.slice(2)}`,
        entradas: f.entradas,
        saidas: f.saidas,
      };
    });
  }, [fluxo]);

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  function openNewModal() {
    setEditingTransaction(null);
    setFormData({
      tipo: "entrada",
      categoria: "mensalidade",
      descricao: "",
      valor: 0,
      data: new Date().toISOString().slice(0, 10),
    });
    setDeleteConfirm(null);
    setModalOpen(true);
  }

  function openEditModal(t: TransacaoOut) {
    setEditingTransaction(t);
    setFormData({
      tipo: t.tipo,
      categoria: t.categoria,
      descricao: t.descricao || "",
      valor: t.valor,
      data: t.data,
    });
    setDeleteConfirm(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (formData.valor <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    setSaving(true);
    try {
      if (editingTransaction) {
        await api.put(`/transacoes/${editingTransaction.id}`, formData);
        toast.success("Transacao atualizada");
      } else {
        await api.post("/transacoes", formData);
        toast.success("Transacao criada");
      }
      setModalOpen(false);
      await Promise.all([fetchBalanco(), fetchFluxo(), fetchTransacoes()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/transacoes/${id}`);
      toast.success("Transacao excluida");
      setModalOpen(false);
      await Promise.all([fetchBalanco(), fetchFluxo(), fetchTransacoes()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao excluir";
      toast.error(message);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function categoriaLabel(cat: string) {
    return CATEGORIAS.find((c) => c.value === cat)?.label || cat;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl uppercase tracking-wide text-txt-primary">
            Financeiro
          </h1>
          <p className="text-txt-secondary font-body mt-1">
            Controle financeiro do Velhos Parceiros F.C.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white font-body font-semibold px-5 py-2.5 rounded-lg shadow-brand transition-colors"
        >
          <Plus size={18} />
          Nova Transacao
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stats Cards                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            label: "Saldo Total",
            value: balanco?.saldo_total ?? 0,
            icon: DollarSign,
            color: (balanco?.saldo_total ?? 0) >= 0 ? "text-green-400" : "text-red-400",
            variacao: balanco?.variacao_percentual,
          },
          {
            label: "Entradas do Mes",
            value: balanco?.entradas_mes ?? 0,
            icon: TrendingUp,
            color: "text-green-400",
          },
          {
            label: "Saidas do Mes",
            value: balanco?.saidas_mes ?? 0,
            icon: TrendingDown,
            color: "text-red-400",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-surface-card border border-border-subtle p-6 shadow-card relative overflow-hidden"
            style={{ clipPath: DIAGONAL_CLIP }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-txt-secondary text-sm font-body uppercase tracking-wider">
                  {card.label}
                </p>
                <p className={cn("font-mono text-2xl lg:text-3xl mt-2 font-bold", card.color)}>
                  {formatCurrency(card.value)}
                </p>
                {card.variacao !== undefined && card.variacao !== null && (
                  <p
                    className={cn(
                      "text-xs font-mono mt-1",
                      card.variacao >= 0 ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {card.variacao >= 0 ? "+" : ""}
                    {card.variacao.toFixed(1)}% vs mes anterior
                  </p>
                )}
              </div>
              <card.icon className="text-txt-tertiary" size={28} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Fluxo Mensal Chart                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-surface-card border border-border-subtle rounded-lg p-6 shadow-card"
      >
        <h2 className="font-display text-xl uppercase tracking-wide text-txt-primary mb-6">
          Fluxo Mensal
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F27" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#8E8E9A", fontSize: 12, fontFamily: "var(--font-dm-sans)" }}
                axisLine={{ stroke: "#2A2A35" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8E8E9A", fontSize: 12, fontFamily: "var(--font-jetbrains)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="entradas" name="Entradas" fill="#E31E24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saidas" fill="#3A3A48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-txt-tertiary text-center py-12 font-body">
            Sem dados de fluxo mensal
          </p>
        )}
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter Bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type toggles */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(["todas", "entrada", "saida"] as FilterTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={cn(
                "px-4 py-2 text-sm font-body transition-colors capitalize",
                filtroTipo === t
                  ? "bg-brand-red text-white"
                  : "bg-surface-tertiary text-txt-secondary hover:text-txt-primary"
              )}
            >
              {t === "todas" ? "Todas" : t === "entrada" ? "Entradas" : "Saidas"}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="appearance-none bg-surface-tertiary border border-border rounded-lg px-4 py-2 pr-8 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
          >
            <option value="">Todas categorias</option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none"
          />
        </div>

        {/* Date range */}
        <input
          type="date"
          value={filtroDataInicio}
          onChange={(e) => setFiltroDataInicio(e.target.value)}
          className="bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
          placeholder="Data inicio"
        />
        <input
          type="date"
          value={filtroDataFim}
          onChange={(e) => setFiltroDataFim(e.target.value)}
          className="bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
          placeholder="Data fim"
        />

        {(filtroTipo !== "todas" || filtroCategoria || filtroDataInicio || filtroDataFim) && (
          <button
            onClick={() => {
              setFiltroTipo("todas");
              setFiltroCategoria("");
              setFiltroDataInicio("");
              setFiltroDataFim("");
            }}
            className="text-txt-tertiary hover:text-txt-primary text-sm font-body underline transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Transactions Table                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="bg-surface-card border border-border-subtle rounded-lg shadow-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-body uppercase tracking-wider text-txt-tertiary">
                  Data
                </th>
                <th className="text-left px-5 py-3 text-xs font-body uppercase tracking-wider text-txt-tertiary">
                  Descricao
                </th>
                <th className="text-left px-5 py-3 text-xs font-body uppercase tracking-wider text-txt-tertiary">
                  Categoria
                </th>
                <th className="text-right px-5 py-3 text-xs font-body uppercase tracking-wider text-txt-tertiary">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {transacoes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-txt-tertiary font-body"
                  >
                    Nenhuma transacao encontrada
                  </td>
                </tr>
              ) : (
                transacoes.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openEditModal(t)}
                    className="border-b border-border-subtle last:border-0 hover:bg-surface-card-hover cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 text-sm font-body text-txt-secondary whitespace-nowrap">
                      {formatDate(t.data)}
                    </td>
                    <td className="px-5 py-4 text-sm font-body text-txt-primary">
                      {t.descricao || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-body border",
                          CATEGORIA_COLORS[t.categoria] || CATEGORIA_COLORS.outros
                        )}
                      >
                        {categoriaLabel(t.categoria)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-5 py-4 text-sm font-mono font-semibold text-right whitespace-nowrap",
                        t.tipo === "entrada" ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {t.tipo === "entrada" ? "+" : "-"}
                      {formatCurrency(t.valor)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* New / Edit Transaction Modal                                        */}
      {/* ------------------------------------------------------------------ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <ModalHeader>
          {editingTransaction ? "Editar Transacao" : "Nova Transacao"}
        </ModalHeader>

        <ModalBody className="space-y-5">
          {/* Tipo toggle */}
          <div>
            <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">
              Tipo
            </label>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["entrada", "saida"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFormData((f) => ({ ...f, tipo }))}
                  className={cn(
                    "flex-1 px-4 py-2.5 text-sm font-body font-semibold capitalize transition-colors",
                    formData.tipo === tipo
                      ? tipo === "entrada"
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                      : "bg-surface-tertiary text-txt-secondary hover:text-txt-primary"
                  )}
                >
                  {tipo === "entrada" ? "Entrada" : "Saida"}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">
              Categoria
            </label>
            <div className="relative">
              <select
                value={formData.categoria}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, categoria: e.target.value }))
                }
                className="w-full appearance-none bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 pr-8 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none"
              />
            </div>
          </div>

          {/* Descricao */}
          <div>
            <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">
              Descricao
            </label>
            <input
              type="text"
              value={formData.descricao || ""}
              onChange={(e) =>
                setFormData((f) => ({ ...f, descricao: e.target.value }))
              }
              placeholder="Descricao da transacao"
              className="w-full bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 text-sm font-body text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-brand-red transition-colors"
            />
          </div>

          {/* Valor + Data row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">
                Valor (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.valor || ""}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    valor: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0,00"
                className="w-full bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">
                Data
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, data: e.target.value }))
                }
                className="w-full bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-between">
          <div>
            {editingTransaction && (
              <>
                {deleteConfirm === editingTransaction.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 font-body">Confirmar exclusao?</span>
                    <button
                      onClick={() => handleDelete(editingTransaction.id)}
                      className="text-xs font-body font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Sim, excluir
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs font-body text-txt-tertiary hover:text-txt-secondary transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(editingTransaction.id)}
                    className="flex items-center gap-1.5 text-sm font-body text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-body text-txt-secondary hover:text-txt-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-hover disabled:opacity-50 text-white font-body font-semibold px-5 py-2 rounded-lg shadow-brand transition-colors"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingTransaction ? "Salvar" : "Criar"}
            </button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
}
