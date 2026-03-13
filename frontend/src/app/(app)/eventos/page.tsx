"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  PartyPopper,
  Plane,
  Music,
  Trophy,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { EventoOut, EventoCreate } from "@/types";
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

const FILTER_TABS = [
  { value: "todos", label: "Todos" },
  { value: "viagem", label: "Viagem" },
  { value: "baile", label: "Baile" },
  { value: "confraternizacao", label: "Confraternizacao" },
  { value: "torneio", label: "Torneio" },
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

/* ─── Form initial state ─────────────────────────────────────── */

const emptyForm: EventoCreate = {
  tipo: "viagem",
  titulo: "",
  descricao: "",
  data_inicio: "",
  data_fim: "",
  local: "",
  custo_estimado: 0,
};

/* ─── Page Component ─────────────────────────────────────────── */

export default function EventosPage() {
  const [eventos, setEventos] = useState<EventoOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<EventoCreate>(emptyForm);

  const fetchEventos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<EventoOut[]>("/eventos");
      setEventos(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  const filteredEventos =
    filter === "todos" ? eventos : eventos.filter((e) => e.tipo === filter);

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast.error("Titulo e obrigatorio");
      return;
    }
    try {
      setSubmitting(true);
      await api.post<EventoOut>("/eventos", form);
      toast.success("Evento criado com sucesso");
      setModalOpen(false);
      setForm(emptyForm);
      fetchEventos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar evento");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = <K extends keyof EventoCreate>(key: K, value: EventoCreate[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary uppercase tracking-wider">
          Eventos
        </h1>
        <Button
          icon={<Plus />}
          onClick={() => setModalOpen(true)}
        >
          Novo Evento
        </Button>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-secondary rounded-lg overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium font-body whitespace-nowrap",
              "transition-all duration-200",
              filter === tab.value
                ? "bg-surface-card text-txt-primary shadow-card"
                : "text-txt-tertiary hover:text-txt-secondary hover:bg-surface-tertiary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-xl bg-surface-card border border-border-subtle animate-pulse"
            />
          ))}
        </div>
      ) : filteredEventos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles />}
            title="Nenhum evento encontrado"
            description={
              filter === "todos"
                ? "Crie o primeiro evento do clube."
                : `Nenhum evento do tipo "${filter}".`
            }
            action={
              <Button size="sm" onClick={() => setModalOpen(true)} icon={<Plus />}>
                Criar Evento
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEventos.map((evento, idx) => {
              const tipoStyle = tipoBadgeStyles[evento.tipo] || tipoBadgeStyles.viagem;
              const statusStyle = statusBadgeStyles[evento.status] || statusBadgeStyles.planejado;
              const TipoIcon = tipoStyle.icon;

              return (
                <motion.div
                  key={evento.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={`/eventos/${evento.id}`}>
                    <Card
                      hoverable
                      className="group cursor-pointer transition-all duration-300 hover:-translate-y-[2px] hover:shadow-lg hover:shadow-black/30"
                    >
                      <div className="flex items-start justify-between mb-3">
                        {/* Type Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            tipoStyle.bg,
                            tipoStyle.text
                          )}
                        >
                          <TipoIcon className="h-3 w-3" />
                          {evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}
                        </span>

                        {/* Status Badge */}
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

                      {/* Title */}
                      <h3 className="text-lg font-display font-semibold text-txt-primary mb-2 group-hover:text-brand-red transition-colors">
                        {evento.titulo}
                      </h3>

                      {/* Details */}
                      <div className="space-y-1.5 mb-4">
                        {(evento.data_inicio || evento.data_fim) && (
                          <div className="flex items-center gap-2 text-sm text-txt-secondary">
                            <Calendar className="h-3.5 w-3.5 text-txt-tertiary flex-shrink-0" />
                            <span>
                              {evento.data_inicio ? formatDate(evento.data_inicio) : ""}
                              {evento.data_fim ? ` - ${formatDate(evento.data_fim)}` : ""}
                            </span>
                          </div>
                        )}
                        {evento.local && (
                          <div className="flex items-center gap-2 text-sm text-txt-secondary">
                            <MapPin className="h-3.5 w-3.5 text-txt-tertiary flex-shrink-0" />
                            <span className="truncate">{evento.local}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                        <span className="text-lg font-mono font-semibold text-txt-primary">
                          {formatCurrency(evento.custo_estimado)}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-txt-tertiary">
                          <Users className="h-3.5 w-3.5" />
                          <span>Ver detalhes</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── New Event Modal ──────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <ModalHeader>Novo Evento</ModalHeader>
        <ModalBody className="space-y-4">
          <Select
            label="Tipo"
            options={TIPO_OPTIONS}
            value={form.tipo}
            onChange={(e) => updateField("tipo", e.target.value)}
          />
          <Input
            label="Titulo"
            placeholder="Nome do evento"
            value={form.titulo}
            onChange={(e) => updateField("titulo", e.target.value)}
          />
          <Input
            label="Descricao"
            placeholder="Descricao do evento (opcional)"
            value={form.descricao || ""}
            onChange={(e) => updateField("descricao", e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data Inicio"
              type="date"
              value={form.data_inicio || ""}
              onChange={(e) => updateField("data_inicio", e.target.value)}
            />
            <Input
              label="Data Fim"
              type="date"
              value={form.data_fim || ""}
              onChange={(e) => updateField("data_fim", e.target.value)}
            />
          </div>
          <Input
            label="Local"
            placeholder="Local do evento"
            value={form.local || ""}
            onChange={(e) => updateField("local", e.target.value)}
          />
          <Input
            label="Custo Estimado (R$)"
            type="number"
            min={0}
            step={0.01}
            value={form.custo_estimado || ""}
            onChange={(e) => updateField("custo_estimado", parseFloat(e.target.value) || 0)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button loading={submitting} onClick={handleSubmit}>
            Criar Evento
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
