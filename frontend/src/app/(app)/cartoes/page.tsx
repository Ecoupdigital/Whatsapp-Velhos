"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Ticket,
  ChevronDown,
  Plus,
  Check,
  X,
  Pencil,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  EventoOut,
  CartaoOut,
  CartaoCreate,
  CartaoUpdate,
  CartaoResumo,
  JogadorOut,
} from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Skeleton, SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/* ─── Summary stat card ──────────────────────────────────── */

function StatCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <Card padding="md" className="flex flex-col gap-1">
      <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold text-txt-primary",
          mono ? "font-mono" : "font-display"
        )}
      >
        {value}
      </span>
    </Card>
  );
}

/* ─── Status badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pendente: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Pendente" },
    acertado: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Acertado" },
    parcial: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Parcial" },
  };
  const s = map[status] ?? map.pendente;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        s.bg,
        s.text
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", s.text.replace("text-", "bg-"))}
      />
      {s.label}
    </span>
  );
}

/* ─── Inline editable cell ───────────────────────────────── */

function InlineEdit({
  value,
  onSave,
  type = "number",
  prefix,
}: {
  value: number;
  onSave: (val: number) => Promise<void>;
  type?: string;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = parseFloat(draft);
    if (isNaN(num) || num < 0) {
      toast.error("Valor invalido");
      return;
    }
    setSaving(true);
    try {
      await onSave(num);
      setEditing(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          className={cn(
            "w-20 h-7 px-2 rounded text-sm font-mono",
            "bg-surface-tertiary border border-brand-red/50",
            "text-txt-primary focus:outline-none focus:ring-1 focus:ring-brand-red"
          )}
          autoFocus
          disabled={saving}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-0.5 text-emerald-400 hover:text-emerald-300"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="p-0.5 text-txt-tertiary hover:text-txt-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="group inline-flex items-center gap-1 font-mono text-sm text-txt-primary hover:text-brand-red transition-colors"
    >
      {prefix}
      {value}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-txt-tertiary" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ═══════════════════════════════════════════════════════════ */

export default function CartoesPage() {
  const [eventos, setEventos] = useState<EventoOut[]>([]);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [cartoes, setCartoes] = useState<CartaoOut[]>([]);
  const [resumo, setResumo] = useState<CartaoResumo | null>(null);
  const [jogadores, setJogadores] = useState<JogadorOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCartoes, setLoadingCartoes] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* form state */
  const [formJogadorId, setFormJogadorId] = useState("");
  const [formInicio, setFormInicio] = useState("");
  const [formFim, setFormFim] = useState("");
  const [formValor, setFormValor] = useState("");

  /* ── load eventos ────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [evts, jogs] = await Promise.all([
          api.get<EventoOut[]>("/eventos?tipo=baile"),
          api.get<JogadorOut[]>("/jogadores?ativo=1"),
        ]);
        setEventos(evts);
        setJogadores(jogs);
        if (evts.length > 0) {
          setSelectedEventoId(evts[0].id);
        }
      } catch {
        toast.error("Erro ao carregar eventos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── load cartoes for selected evento ────────────────────── */
  const loadCartoes = useCallback(async (eventoId: number) => {
    setLoadingCartoes(true);
    try {
      const [cards, res] = await Promise.all([
        api.get<CartaoOut[]>(`/cartoes?evento_id=${eventoId}`),
        api.get<CartaoResumo>(`/cartoes/resumo/${eventoId}`),
      ]);
      setCartoes(cards);
      setResumo(res);
    } catch {
      toast.error("Erro ao carregar cartoes");
    } finally {
      setLoadingCartoes(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventoId) loadCartoes(selectedEventoId);
  }, [selectedEventoId, loadCartoes]);

  /* ── handlers ────────────────────────────────────────────── */
  const handleDistribuir = async () => {
    if (!selectedEventoId || !formJogadorId || !formInicio || !formFim || !formValor) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSubmitting(true);
    try {
      const body: CartaoCreate = {
        evento_id: selectedEventoId,
        jogador_id: parseInt(formJogadorId),
        numero_inicio: parseInt(formInicio),
        numero_fim: parseInt(formFim),
        valor_unitario: parseFloat(formValor),
      };
      await api.post("/cartoes", body);
      toast.success("Cartoes distribuidos com sucesso");
      setModalOpen(false);
      setFormJogadorId("");
      setFormInicio("");
      setFormFim("");
      setFormValor("");
      loadCartoes(selectedEventoId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao distribuir";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateField = async (
    id: number,
    field: keyof CartaoUpdate,
    value: number
  ) => {
    try {
      await api.put(`/cartoes/${id}`, { [field]: value });
      toast.success("Atualizado");
      if (selectedEventoId) loadCartoes(selectedEventoId);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  /* ── render ──────────────────────────────────────────────── */
  return (
    <motion.div
      className="space-y-6 animate-fade-in overflow-x-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary uppercase tracking-tight">
            Cartoes de Baile
          </h1>
          <p className="text-sm text-txt-tertiary font-body mt-1">
            Controle de distribuicao e acerto de cartoes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Event selector */}
          {!loading && eventos.length > 0 && (
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedEventoId ?? ""}
                onChange={(e) => setSelectedEventoId(Number(e.target.value))}
                className={cn(
                  "w-full sm:w-auto h-10 rounded-lg px-3 pr-9 appearance-none",
                  "bg-surface-tertiary border border-border",
                  "text-txt-primary text-sm font-body",
                  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                  "hover:border-border-strong transition-all duration-200"
                )}
              >
                {eventos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-txt-tertiary pointer-events-none" />
            </div>
          )}
          <Button
            icon={<Plus />}
            onClick={() => setModalOpen(true)}
            disabled={!selectedEventoId}
            className="w-full sm:w-auto justify-center"
          >
            Distribuir Cartoes
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {loadingCartoes ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </Card>
          ))}
        </div>
      ) : resumo ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Cartoes" value={resumo.total_cartoes} />
          <StatCard label="Vendidos" value={resumo.total_vendidos} />
          <StatCard label="Arrecadado" value={formatCurrency(resumo.total_arrecadado)} mono />
          <StatCard label="Acertado" value={formatCurrency(resumo.total_acertado)} mono />
        </div>
      ) : null}

      {/* Desktop Table */}
      <Card padding="none" className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-secondary/50">
                {[
                  "Jogador",
                  "Cartoes",
                  "Quantidade",
                  "Vendidos",
                  "Valor Unit.",
                  "Acertado",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-txt-tertiary uppercase tracking-wider font-body"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loadingCartoes ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-0">
                      <SkeletonTableRow columns={7} />
                    </td>
                  </tr>
                ))
              ) : cartoes.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Ticket />}
                      title="Nenhum cartao distribuido"
                      description="Clique em Distribuir Cartoes para comecar"
                    />
                  </td>
                </tr>
              ) : (
                cartoes.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-surface-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-txt-primary font-medium">
                      {c.jogador?.apelido || c.jogador?.nome || `#${c.jogador_id}`}
                    </td>
                    <td className="px-4 py-3 text-txt-secondary font-mono">
                      #{c.numero_inicio} - #{c.numero_fim}
                    </td>
                    <td className="px-4 py-3 text-txt-secondary">{c.quantidade}</td>
                    <td className="px-4 py-3">
                      <InlineEdit
                        value={c.vendidos}
                        onSave={(v) => handleUpdateField(c.id, "vendidos", v)}
                      />
                    </td>
                    <td className="px-4 py-3 text-txt-secondary font-mono">
                      {formatCurrency(c.valor_unitario)}
                    </td>
                    <td className="px-4 py-3">
                      <InlineEdit
                        value={c.valor_acertado}
                        onSave={(v) => handleUpdateField(c.id, "valor_acertado", v)}
                        prefix="R$ "
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loadingCartoes ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          ))
        ) : cartoes.length === 0 ? (
          <Card padding="md">
            <EmptyState
              icon={<Ticket />}
              title="Nenhum cartao distribuido"
              description="Clique em Distribuir Cartoes para comecar"
            />
          </Card>
        ) : (
          cartoes.map((c) => (
            <Card key={c.id} padding="md" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-txt-primary truncate">
                  {c.jogador?.apelido || c.jogador?.nome || `#${c.jogador_id}`}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-txt-tertiary uppercase tracking-wider font-body">Cartoes</span>
                  <p className="text-txt-secondary font-mono mt-0.5">#{c.numero_inicio} - #{c.numero_fim}</p>
                </div>
                <div>
                  <span className="text-txt-tertiary uppercase tracking-wider font-body">Qtd</span>
                  <p className="text-txt-secondary mt-0.5">{c.quantidade}</p>
                </div>
                <div>
                  <span className="text-txt-tertiary uppercase tracking-wider font-body">Vendidos</span>
                  <div className="mt-0.5">
                    <InlineEdit
                      value={c.vendidos}
                      onSave={(v) => handleUpdateField(c.id, "vendidos", v)}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-txt-tertiary uppercase tracking-wider font-body">Valor Unit.</span>
                  <p className="text-txt-secondary font-mono mt-0.5">{formatCurrency(c.valor_unitario)}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs text-txt-tertiary uppercase tracking-wider font-body">Acertado</span>
                <InlineEdit
                  value={c.valor_acertado}
                  onSave={(v) => handleUpdateField(c.id, "valor_acertado", v)}
                  prefix="R$ "
                />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Distribuir Modal ─────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <ModalHeader>Distribuir Cartoes</ModalHeader>
        <ModalBody className="space-y-4">
          <Select
            label="Jogador"
            placeholder="Selecione o jogador"
            options={jogadores.map((j) => ({
              value: String(j.id),
              label: j.apelido || j.nome,
            }))}
            value={formJogadorId}
            onChange={(e) => setFormJogadorId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Numero Inicio"
              type="number"
              placeholder="Ex: 001"
              value={formInicio}
              onChange={(e) => setFormInicio(e.target.value)}
            />
            <Input
              label="Numero Fim"
              type="number"
              placeholder="Ex: 050"
              value={formFim}
              onChange={(e) => setFormFim(e.target.value)}
            />
          </div>
          <Input
            label="Valor Unitario (R$)"
            type="number"
            step="0.01"
            placeholder="Ex: 5.00"
            value={formValor}
            onChange={(e) => setFormValor(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDistribuir} loading={submitting}>
            Distribuir
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
