"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Megaphone,
  BarChart3,
  Trash2,
  Ban,
  CalendarClock,
  Repeat,
  Zap,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Type,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { CampanhaOut, CampanhaStatus, CampanhaTipoConteudo } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { CampanhaComposer } from "./CampanhaComposer";
import { CampanhaReportModal } from "./CampanhaReportModal";

const STATUS_STYLES: Record<CampanhaStatus, { cls: string; label: string }> = {
  rascunho: { cls: "bg-surface-tertiary text-txt-secondary", label: "Rascunho" },
  agendada: { cls: "bg-blue-500/15 text-blue-400", label: "Agendada" },
  enviando: { cls: "bg-amber-500/15 text-amber-400", label: "Enviando" },
  concluida: { cls: "bg-emerald-500/15 text-emerald-400", label: "Concluida" },
  cancelada: { cls: "bg-surface-tertiary text-txt-tertiary", label: "Cancelada" },
  falha: { cls: "bg-red-500/15 text-red-400", label: "Falha" },
};

const TIPO_ICON: Record<CampanhaTipoConteudo, React.ElementType> = {
  texto: Type,
  imagem: ImageIcon,
  video: Video,
  audio: Mic,
  documento: FileText,
};

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

function formatDateTime(s: string | null): string {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function agendamentoTexto(c: CampanhaOut): string {
  if (c.modo === "recorrente") {
    const hora = c.recorrencia_hora || "";
    if (c.recorrencia === "diaria") return `Todo dia ${hora}`;
    if (c.recorrencia === "semanal")
      return `Toda ${DIAS[c.recorrencia_dia ?? 0]} ${hora}`;
    if (c.recorrencia === "mensal")
      return `Dia ${c.recorrencia_dia ?? 1} de cada mes ${hora}`;
    return "Recorrente";
  }
  if (c.modo === "agendar") return `Agendada: ${formatDateTime(c.agendada_para)}`;
  return "Envio imediato";
}

export function CampanhasPanel() {
  const [campanhas, setCampanhas] = useState<CampanhaOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [report, setReport] = useState<CampanhaOut | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCampanhas = useCallback(async () => {
    try {
      const data = await api.get<CampanhaOut[]>("/campanhas");
      setCampanhas(data);
      // mantem o modal de relatorio sincronizado
      setReport((prev) =>
        prev ? data.find((c) => c.id === prev.id) ?? prev : prev
      );
    } catch {
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampanhas();
  }, [fetchCampanhas]);

  /* auto-refresh enquanto houver campanha enviando */
  useEffect(() => {
    const algumEnviando = campanhas.some((c) => c.status === "enviando");
    if (!algumEnviando) return;
    const t = setInterval(fetchCampanhas, 5000);
    return () => clearInterval(t);
  }, [campanhas, fetchCampanhas]);

  async function cancelar(c: CampanhaOut) {
    try {
      await api.post(`/campanhas/${c.id}/cancelar`, {});
      toast.success("Campanha cancelada");
      fetchCampanhas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar");
    }
  }

  async function excluir(c: CampanhaOut) {
    if (deletingId !== c.id) {
      setDeletingId(c.id);
      setTimeout(() => setDeletingId((id) => (id === c.id ? null : id)), 3000);
      return;
    }
    try {
      await api.delete(`/campanhas/${c.id}`);
      toast.success("Campanha excluida");
      setDeletingId(null);
      fetchCampanhas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-txt-tertiary font-body">
          Envie mensagens em massa: filtre o publico, escolha o conteudo e
          dispare na hora, agende ou deixe recorrente.
        </p>
        <Button
          icon={<Plus />}
          onClick={() => setComposerOpen(true)}
          className="shrink-0"
        >
          Nova Campanha
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : campanhas.length === 0 ? (
        <Card padding="md">
          <EmptyState
            icon={<Megaphone />}
            title="Nenhuma campanha ainda"
            description="Crie sua primeira campanha pra falar com os jogadores em massa."
            action={
              <Button icon={<Plus />} onClick={() => setComposerOpen(true)}>
                Nova Campanha
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {campanhas.map((c, idx) => {
              const st = STATUS_STYLES[c.status];
              const TipoIcon = TIPO_ICON[c.tipo_conteudo] ?? Type;
              const ModoIcon =
                c.modo === "recorrente"
                  ? Repeat
                  : c.modo === "agendar"
                  ? CalendarClock
                  : Zap;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card padding="md" className="space-y-3">
                    {/* top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-brand-red/10 flex items-center justify-center shrink-0">
                          <TipoIcon className="h-4 w-4 text-brand-red" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-txt-primary font-body truncate">
                            {c.nome}
                          </p>
                          <p className="text-xs text-txt-tertiary font-body flex items-center gap-1 mt-0.5">
                            <ModoIcon className="h-3 w-3" />
                            {agendamentoTexto(c)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0",
                          st.cls
                        )}
                      >
                        {c.status === "enviando" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        {st.label}
                      </span>
                    </div>

                    {/* counters */}
                    <div className="flex items-center gap-4 text-xs font-body pl-12">
                      <span className="text-emerald-400">
                        {c.enviados} enviados
                      </span>
                      {c.erros > 0 && (
                        <span className="text-red-400">{c.erros} erros</span>
                      )}
                      <span className="text-txt-tertiary">
                        {c.total} no total
                      </span>
                    </div>

                    {/* actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-border-subtle">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<BarChart3 />}
                        onClick={() => setReport(c)}
                      >
                        Relatorio
                      </Button>
                      {(c.status === "agendada" || c.modo === "recorrente") &&
                        c.status !== "cancelada" &&
                        c.status !== "enviando" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Ban />}
                            onClick={() => cancelar(c)}
                          >
                            Cancelar
                          </Button>
                        )}
                      {c.status !== "enviando" && (
                        <Button
                          variant={deletingId === c.id ? "danger" : "icon"}
                          size="sm"
                          icon={<Trash2 />}
                          onClick={() => excluir(c)}
                          title={
                            deletingId === c.id
                              ? "Clique de novo pra confirmar"
                              : "Excluir"
                          }
                        >
                          {deletingId === c.id ? "Confirmar" : undefined}
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <CampanhaComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={fetchCampanhas}
      />
      <CampanhaReportModal
        campanha={report}
        open={!!report}
        onClose={() => setReport(null)}
        onChanged={fetchCampanhas}
      />
    </div>
  );
}
