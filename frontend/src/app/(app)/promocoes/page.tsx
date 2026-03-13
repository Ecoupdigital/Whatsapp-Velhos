"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Send,
  Percent,
  DollarSign,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { PromocaoOut, PromocaoCreate, PromocaoUpdate } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/* ─── Type badge ─────────────────────────────────────────── */

function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    desconto: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
    combo: { bg: "bg-blue-500/15", text: "text-blue-400" },
    fidelidade: { bg: "bg-purple-500/15", text: "text-purple-400" },
    especial: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  };
  const s = map[tipo] ?? { bg: "bg-surface-tertiary", text: "text-txt-secondary" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        s.bg,
        s.text
      )}
    >
      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
    </span>
  );
}

function AtivaBadge({ ativa }: { ativa: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        ativa
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-red-500/15 text-red-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          ativa ? "bg-emerald-400" : "bg-red-400"
        )}
      />
      {ativa ? "Ativa" : "Inativa"}
    </span>
  );
}

/* ─── Confirm delete modal ───────────────────────────────── */

function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  loading,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>Confirmar Exclusao</ModalHeader>
      <ModalBody>
        <p className="text-sm text-txt-secondary font-body">
          Tem certeza que deseja excluir a promocao{" "}
          <strong className="text-txt-primary">&quot;{title}&quot;</strong>?
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          Excluir
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ═══════════════════════════════════════════════════════════ */

const TIPO_OPTIONS = [
  { value: "desconto", label: "Desconto" },
  { value: "combo", label: "Combo" },
  { value: "fidelidade", label: "Fidelidade" },
  { value: "especial", label: "Especial" },
];

const emptyForm = {
  titulo: "",
  descricao: "",
  tipo: "desconto",
  valor_desconto: "",
  data_inicio: "",
  data_fim: "",
  ativa: 1,
};

export default function PromocoesPage() {
  const [promocoes, setPromocoes] = useState<PromocaoOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<PromocaoOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── fetch ───────────────────────────────────────────────── */
  const fetchPromocoes = useCallback(async () => {
    try {
      const data = await api.get<PromocaoOut[]>("/promocoes");
      setPromocoes(data);
    } catch {
      toast.error("Erro ao carregar promocoes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromocoes();
  }, [fetchPromocoes]);

  /* ── open edit ───────────────────────────────────────────── */
  const openEdit = (p: PromocaoOut) => {
    setEditingId(p.id);
    setForm({
      titulo: p.titulo,
      descricao: p.descricao ?? "",
      tipo: p.tipo,
      valor_desconto: String(p.valor_desconto),
      data_inicio: p.data_inicio ?? "",
      data_fim: p.data_fim ?? "",
      ativa: p.ativa,
    });
    setModalOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  /* ── submit ──────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast.error("Titulo obrigatorio");
      return;
    }
    setSubmitting(true);
    try {
      const body: PromocaoCreate | PromocaoUpdate = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo,
        valor_desconto: form.valor_desconto ? parseFloat(form.valor_desconto) : 0,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        ativa: form.ativa,
      };

      if (editingId) {
        await api.put(`/promocoes/${editingId}`, body);
        toast.success("Promocao atualizada");
      } else {
        await api.post("/promocoes", body);
        toast.success("Promocao criada");
      }

      setModalOpen(false);
      fetchPromocoes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── delete ──────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/promocoes/${deleteTarget.id}`);
      toast.success("Promocao excluida");
      setDeleteTarget(null);
      fetchPromocoes();
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  /* ── send via WhatsApp ───────────────────────────────────── */
  const handleSendWhatsApp = async (promo: PromocaoOut) => {
    try {
      await api.post("/promocoes/enviar", { promocao_id: promo.id });
      toast.success("Promocao enviada via WhatsApp");
    } catch {
      toast.error("Erro ao enviar via WhatsApp");
    }
  };

  /* ── render ──────────────────────────────────────────────── */
  return (
    <motion.div
      className="space-y-6 animate-fade-in"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary uppercase tracking-tight">
            Promocoes
          </h1>
          <p className="text-sm text-txt-tertiary font-body mt-1">
            Gerencie promocoes e descontos do clube
          </p>
        </div>
        <Button icon={<Plus />} onClick={openNew}>
          Nova Promocao
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : promocoes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tag />}
            title="Nenhuma promocao"
            description="Crie uma nova promocao para comecar"
            action={
              <Button icon={<Plus />} size="sm" onClick={openNew}>
                Nova Promocao
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {promocoes.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card hoverable padding="md" className="flex flex-col h-full">
                  {/* top badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <TipoBadge tipo={p.tipo} />
                    <AtivaBadge ativa={p.ativa} />
                  </div>

                  {/* title + desc */}
                  <h3 className="text-lg font-display font-semibold text-txt-primary mb-1">
                    {p.titulo}
                  </h3>
                  {p.descricao && (
                    <p className="text-sm text-txt-tertiary font-body mb-3 line-clamp-2">
                      {p.descricao}
                    </p>
                  )}

                  {/* info row */}
                  <div className="flex flex-wrap items-center gap-3 mt-auto pt-3 border-t border-border-subtle text-xs text-txt-secondary font-body">
                    <span className="inline-flex items-center gap-1">
                      {p.tipo === "desconto" ? (
                        <Percent className="h-3.5 w-3.5 text-txt-tertiary" />
                      ) : (
                        <DollarSign className="h-3.5 w-3.5 text-txt-tertiary" />
                      )}
                      <span className="font-mono">
                        {formatCurrency(p.valor_desconto)}
                      </span>
                    </span>
                    {(p.data_inicio || p.data_fim) && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-txt-tertiary" />
                        {p.data_inicio ? formatDate(p.data_inicio) : "..."}
                        {" - "}
                        {p.data_fim ? formatDate(p.data_fim) : "..."}
                      </span>
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-subtle">
                    <Button
                      variant="icon"
                      size="sm"
                      icon={<Pencil />}
                      onClick={() => openEdit(p)}
                      aria-label="Editar"
                    />
                    <Button
                      variant="icon"
                      size="sm"
                      icon={<Trash2 />}
                      onClick={() => setDeleteTarget(p)}
                      aria-label="Excluir"
                    />
                    <Button
                      variant="icon"
                      size="sm"
                      icon={<Send />}
                      onClick={() => handleSendWhatsApp(p)}
                      aria-label="Enviar via WhatsApp"
                    />
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Create / Edit modal ────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <ModalHeader>
          {editingId ? "Editar Promocao" : "Nova Promocao"}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="Titulo"
            placeholder="Ex: Desconto Aniversariante"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">
              Descricao
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes da promocao..."
              rows={3}
              className={cn(
                "w-full rounded-lg px-3 py-2",
                "bg-surface-tertiary border border-border",
                "text-txt-primary text-sm font-body",
                "placeholder:text-txt-tertiary",
                "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                "hover:border-border-strong transition-all duration-200",
                "resize-none"
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo"
              options={TIPO_OPTIONS}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            />
            <Input
              label="Valor Desconto (R$)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.valor_desconto}
              onChange={(e) =>
                setForm({ ...form, valor_desconto: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data Inicio"
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
            />
            <Input
              label="Data Fim"
              type="date"
              value={form.data_fim}
              onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
            />
          </div>

          {/* ativa toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-txt-secondary font-body">
              Ativa
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={form.ativa === 1}
              onClick={() =>
                setForm({ ...form, ativa: form.ativa === 1 ? 0 : 1 })
              }
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
                form.ativa === 1 ? "bg-brand-red" : "bg-surface-tertiary border border-border"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200",
                  form.ativa === 1 ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {editingId ? "Salvar" : "Criar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Delete confirm modal ───────────────────────────── */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={deleteTarget?.titulo ?? ""}
      />
    </motion.div>
  );
}
