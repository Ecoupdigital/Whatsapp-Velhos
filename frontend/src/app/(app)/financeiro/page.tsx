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
  Wallet,
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
  ContaOut,
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
  { value: "transferencia", label: "Transferencia" },
  { value: "outros", label: "Outros" },
] as const;

const CATEGORIA_COLORS: Record<string, string> = {
  mensalidade: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  evento: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  aluguel_campo: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  material: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  arbitragem: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  viagem: "bg-green-500/15 text-green-400 border-green-500/25",
  transferencia: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  cartao_baile: "bg-pink-500/15 text-pink-400 border-pink-500/25",
  patrocinio: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  outros: "bg-gray-500/15 text-gray-400 border-gray-500/25",
};

type FilterTipo = "todas" | "entrada" | "saida";
type FilterConta = "" | number;

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
  const [contas, setContas] = useState<ContaOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filtroTipo, setFiltroTipo] = useState<FilterTipo>("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroConta, setFiltroConta] = useState<FilterConta>("");
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
    conta_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferData, setTransferData] = useState({ conta_origem_id: "", conta_destino_id: "", valor: "", descricao: "" });
  const [transferring, setTransferring] = useState(false);

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
      if (filtroConta) params.set("conta_id", String(filtroConta));
      if (filtroDataInicio) params.set("data_inicio", filtroDataInicio);
      if (filtroDataFim) params.set("data_fim", filtroDataFim);
      const qs = params.toString();
      const data = await api.get<TransacaoOut[]>(`/transacoes${qs ? `?${qs}` : ""}`);
      setTransacoes(data);
    } catch {
      // silent
    }
  }, [filtroTipo, filtroCategoria, filtroConta, filtroDataInicio, filtroDataFim]);

  const fetchContas = useCallback(async () => {
    try {
      const data = await api.get<ContaOut[]>("/contas");
      setContas(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchBalanco(), fetchFluxo(), fetchTransacoes(), fetchContas()]);
      setLoading(false);
    }
    init();
  }, [fetchBalanco, fetchFluxo, fetchTransacoes, fetchContas]);

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
    const defaultConta = contas.find((c) => c.ativo === 1);
    setFormData({
      tipo: "entrada",
      categoria: "mensalidade",
      descricao: "",
      valor: 0,
      data: new Date().toISOString().slice(0, 10),
      conta_id: defaultConta?.id ?? null,
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
      conta_id: t.conta_id ?? null,
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
  // Transfer
  // ---------------------------------------------------------------------------

  async function handleTransfer() {
    if (!transferData.conta_origem_id || !transferData.conta_destino_id) {
      toast.error("Selecione as contas"); return;
    }
    if (transferData.conta_origem_id === transferData.conta_destino_id) {
      toast.error("Contas devem ser diferentes"); return;
    }
    const valor = parseFloat(transferData.valor);
    if (!valor || valor <= 0) {
      toast.error("Valor deve ser maior que zero"); return;
    }
    setTransferring(true);
    try {
      await api.post("/contas/transferencia", {
        conta_origem_id: parseInt(transferData.conta_origem_id),
        conta_destino_id: parseInt(transferData.conta_destino_id),
        valor,
        descricao: transferData.descricao,
      });
      toast.success("Transferencia realizada!");
      setTransferOpen(false);
      setTransferData({ conta_origem_id: "", conta_destino_id: "", valor: "", descricao: "" });
      fetchBalanco();
      fetchTransacoes();
      fetchContas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na transferencia");
    } finally {
      setTransferring(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function categoriaLabel(cat: string) {
    return CATEGORIAS.find((c) => c.value === cat)?.label || cat;
  }

  function contaNome(contaId: number | null): string {
    if (!contaId) return "";
    return contas.find((c) => c.id === contaId)?.nome ?? "";
  }

  const activeContas = contas.filter((c) => c.ativo === 1);

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
    <div className="space-y-4 sm:space-y-8 animate-fade-in overflow-x-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-3xl lg:text-4xl uppercase tracking-wide text-txt-primary">
            Financeiro
          </h1>
          <p className="text-txt-secondary font-body mt-1">
            Controle financeiro do Velhos Parceiros F.C.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white font-body font-semibold px-5 py-2.5 rounded-lg shadow-brand transition-colors w-full sm:w-auto"
        >
          <Plus size={18} />
          Nova Transacao
        </button>
        {activeContas.length >= 2 && (
          <button
            onClick={() => setTransferOpen(true)}
            className="flex items-center justify-center gap-2 bg-surface-card border border-border hover:border-brand-red text-txt-primary font-body font-semibold px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto"
          >
            <Wallet size={18} />
            Transferir
          </button>
        )}
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
            className="bg-surface-card border border-border-subtle p-4 sm:p-6 shadow-card relative overflow-hidden"
            style={{ clipPath: DIAGONAL_CLIP }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-txt-secondary text-sm font-body uppercase tracking-wider">
                  {card.label}
                </p>
                <p className={cn("font-mono text-xl sm:text-2xl lg:text-3xl mt-2 font-bold break-all", card.color)}>
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
      {/* Saldo por Conta                                                      */}
      {/* ------------------------------------------------------------------ */}
      {balanco?.saldos_por_conta && balanco.saldos_por_conta.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {balanco.saldos_por_conta.map((sc) => (
            <div
              key={sc.nome}
              className="flex items-center gap-2 bg-surface-tertiary border border-border-subtle rounded-lg px-3 py-2"
            >
              <Wallet size={14} className="text-txt-tertiary" />
              <span className="text-xs font-body text-txt-secondary">{sc.nome}:</span>
              <span
                className={cn(
                  "text-sm font-mono font-semibold",
                  sc.saldo >= 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {formatCurrency(sc.saldo)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Fluxo Mensal Chart                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-surface-card border border-border-subtle rounded-lg p-3 sm:p-6 shadow-card"
      >
        <h2 className="font-display text-base sm:text-xl uppercase tracking-wide text-txt-primary mb-4 sm:mb-6">
          Fluxo Mensal
        </h2>
        {chartData.length > 0 ? (
          <div className="h-[200px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
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
          </div>
        ) : (
          <p className="text-txt-tertiary text-center py-12 font-body">
            Sem dados de fluxo mensal
          </p>
        )}
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter Bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Type toggles */}
        <div className="flex rounded-lg overflow-hidden border border-border w-full sm:w-auto">
          {(["todas", "entrada", "saida"] as FilterTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2 text-sm font-body transition-colors capitalize",
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
        <div className="relative w-full sm:w-auto">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-surface-tertiary border border-border rounded-lg px-4 py-2 pr-8 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
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

        {/* Conta dropdown */}
        {contas.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <select
              value={filtroConta}
              onChange={(e) => setFiltroConta(e.target.value ? Number(e.target.value) : "")}
              className="w-full sm:w-auto appearance-none bg-surface-tertiary border border-border rounded-lg px-4 py-2 pr-8 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
            >
              <option value="">Todas contas</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none"
            />
          </div>
        )}

        {/* Date range */}
        <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            className="w-full sm:w-auto bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
            placeholder="Data inicio"
          />
          <input
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            className="w-full sm:w-auto bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
            placeholder="Data fim"
          />
        </div>

        {(filtroTipo !== "todas" || filtroCategoria || filtroConta || filtroDataInicio || filtroDataFim) && (
          <button
            onClick={() => {
              setFiltroTipo("todas");
              setFiltroCategoria("");
              setFiltroConta("");
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
      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="hidden md:block bg-surface-card border border-border-subtle rounded-lg shadow-card overflow-hidden"
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
                <th className="text-left px-5 py-3 text-xs font-body uppercase tracking-wider text-txt-tertiary">
                  Conta
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
                    colSpan={5}
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
                    <td className="px-5 py-4 text-sm font-body text-txt-secondary whitespace-nowrap">
                      {contaNome(t.conta_id) || "-"}
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

      {/* Mobile Transaction Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="md:hidden space-y-3"
      >
        {transacoes.length === 0 ? (
          <div className="bg-surface-card border border-border-subtle rounded-lg p-4 sm:p-8 text-center">
            <p className="text-txt-tertiary font-body">Nenhuma transacao encontrada</p>
          </div>
        ) : (
          transacoes.map((t) => (
            <div
              key={t.id}
              onClick={() => openEditModal(t)}
              className="bg-surface-card border border-border-subtle rounded-lg p-4 cursor-pointer hover:bg-surface-card-hover transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-body text-txt-primary truncate">
                    {t.descricao || categoriaLabel(t.categoria)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-body text-txt-tertiary">
                      {formatDate(t.data)}
                    </span>
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs font-body border",
                        CATEGORIA_COLORS[t.categoria] || CATEGORIA_COLORS.outros
                      )}
                    >
                      {categoriaLabel(t.categoria)}
                    </span>
                    {contaNome(t.conta_id) && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-body border bg-surface-tertiary text-txt-secondary border-border-subtle">
                        {contaNome(t.conta_id)}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-sm font-mono font-semibold whitespace-nowrap shrink-0",
                    t.tipo === "entrada" ? "text-green-400" : "text-red-400"
                  )}
                >
                  {t.tipo === "entrada" ? "+" : "-"}
                  {formatCurrency(t.valor)}
                </span>
              </div>
            </div>
          ))
        )}
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

          {/* Conta */}
          {activeContas.length > 0 && (
            <div>
              <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">
                Conta
              </label>
              <div className="relative">
                <select
                  value={formData.conta_id ?? ""}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      conta_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="w-full appearance-none bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 pr-8 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red transition-colors"
                >
                  <option value="">Selecionar conta...</option>
                  {activeContas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.tipo})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none"
                />
              </div>
            </div>
          )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Transfer Modal */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} size="md">
        <ModalHeader>Transferencia entre Contas</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">Conta Origem</label>
            <select
              value={transferData.conta_origem_id}
              onChange={(e) => setTransferData(p => ({ ...p, conta_origem_id: e.target.value }))}
              className="w-full bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red"
            >
              <option value="">Selecionar...</option>
              {activeContas.map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({formatCurrency(c.saldo_atual)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">Conta Destino</label>
            <select
              value={transferData.conta_destino_id}
              onChange={(e) => setTransferData(p => ({ ...p, conta_destino_id: e.target.value }))}
              className="w-full bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red"
            >
              <option value="">Selecionar...</option>
              {activeContas.filter(c => String(c.id) !== transferData.conta_origem_id).map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({formatCurrency(c.saldo_atual)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={transferData.valor}
              onChange={(e) => setTransferData(p => ({ ...p, valor: e.target.value }))}
              placeholder="0,00"
              className="w-full bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 text-lg font-mono font-bold text-txt-primary focus:outline-none focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs font-body uppercase tracking-wider text-txt-tertiary mb-2">Descricao (opcional)</label>
            <input
              type="text"
              value={transferData.descricao}
              onChange={(e) => setTransferData(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: Deposito no banco"
              className="w-full bg-surface-tertiary border border-border rounded-lg px-4 py-2.5 text-sm font-body text-txt-primary focus:outline-none focus:border-brand-red"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setTransferOpen(false)}
            className="px-4 py-2 text-sm font-body text-txt-secondary hover:text-txt-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={transferring}
            className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-hover disabled:opacity-50 text-white font-body font-semibold px-5 py-2 rounded-lg shadow-brand transition-colors"
          >
            {transferring && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Transferir
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
