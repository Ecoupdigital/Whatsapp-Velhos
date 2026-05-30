"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  RotateCcw,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { CampanhaOut, CampanhaDestinatarioOut } from "@/types";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  campanha: CampanhaOut | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; icon: React.ElementType }> = {
    enviado: {
      cls: "bg-emerald-500/15 text-emerald-400",
      label: "Enviado",
      icon: CheckCircle2,
    },
    erro: { cls: "bg-red-500/15 text-red-400", label: "Erro", icon: XCircle },
    pendente: {
      cls: "bg-yellow-500/15 text-yellow-400",
      label: "Pendente",
      icon: Clock,
    },
  };
  const s = map[status] ?? map.pendente;
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        s.cls
      )}
    >
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

export function CampanhaReportModal({ campanha, open, onClose, onChanged }: Props) {
  const [dests, setDests] = useState<CampanhaDestinatarioOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const enviando = campanha?.status === "enviando";

  const fetchDests = useCallback(async () => {
    if (!campanha) return;
    setLoading(true);
    try {
      const data = await api.get<CampanhaDestinatarioOut[]>(
        `/campanhas/${campanha.id}/destinatarios`
      );
      setDests(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [campanha]);

  useEffect(() => {
    if (open) fetchDests();
  }, [open, fetchDests]);

  /* auto-refresh enquanto envia */
  useEffect(() => {
    if (!open || !enviando) return;
    const t = setInterval(() => {
      fetchDests();
      onChanged();
    }, 4000);
    return () => clearInterval(t);
  }, [open, enviando, fetchDests, onChanged]);

  async function reenviarFalhas() {
    if (!campanha) return;
    setReenviando(true);
    try {
      const res = await api.post<{ reenviando: number }>(
        `/campanhas/${campanha.id}/reenviar-falhas`,
        {}
      );
      if (res.reenviando > 0) {
        toast.success(`Reenviando ${res.reenviando} que falharam`);
        onChanged();
        fetchDests();
      } else {
        toast("Nenhuma falha pra reenviar", { icon: "✅" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao reenviar");
    } finally {
      setReenviando(false);
    }
  }

  const enviados = dests.filter((d) => d.status === "enviado").length;
  const erros = dests.filter((d) => d.status === "erro").length;
  const pendentes = dests.filter((d) => d.status === "pendente").length;

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <ModalHeader>
        <div className="pr-8">
          <span className="text-lg font-semibold text-txt-primary font-display block truncate">
            {campanha?.nome ?? "Campanha"}
          </span>
          <span className="text-xs text-txt-tertiary font-body">
            Relatorio de envio
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* counters */}
        <div className="grid grid-cols-3 gap-2">
          <Counter label="Enviados" value={enviados} cls="text-emerald-400" />
          <Counter label="Erros" value={erros} cls="text-red-400" />
          <Counter label="Pendentes" value={pendentes} cls="text-yellow-400" />
        </div>

        {enviando && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 font-body">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Enviando... atualiza sozinho.
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border-subtle divide-y divide-border-subtle">
          {loading && dests.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-txt-tertiary font-body">
              Carregando...
            </div>
          ) : dests.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-txt-tertiary font-body flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              Sem destinatarios ainda.
            </div>
          ) : (
            dests.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 px-3 py-2 bg-surface-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-txt-primary font-body truncate">
                    {d.nome || "-"}
                  </p>
                  <p className="text-xs text-txt-tertiary font-mono truncate">
                    {d.telefone || "-"}
                  </p>
                  {d.status === "erro" && d.erro_detalhe && (
                    <p className="text-xs text-red-400/80 font-body truncate mt-0.5">
                      {d.erro_detalhe}
                    </p>
                  )}
                </div>
                <StatusPill status={d.status} />
              </div>
            ))
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          icon={<RefreshCw className={loading ? "animate-spin" : ""} />}
          onClick={fetchDests}
          type="button"
        >
          Atualizar
        </Button>
        {erros > 0 && !enviando && (
          <Button
            icon={<RotateCcw />}
            onClick={reenviarFalhas}
            loading={reenviando}
            type="button"
          >
            Reenviar falhas ({erros})
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} type="button">
          Fechar
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Counter({
  label,
  value,
  cls,
}: {
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className="rounded-lg bg-surface-tertiary border border-border-subtle px-3 py-2 text-center">
      <p className={cn("text-xl font-bold font-display", cls)}>{value}</p>
      <p className="text-xs text-txt-tertiary font-body uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
