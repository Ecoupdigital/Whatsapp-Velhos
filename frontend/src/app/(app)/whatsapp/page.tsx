"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  Eye,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  MensagemLogOut,
  WhatsAppStatus,
  JogadorOut,
  EnviarMensagemRequest,
} from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Skeleton, SkeletonTableRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/* ─── Type badge ─────────────────────────────────────────── */

const TIPO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  lembrete_dia6: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Lembrete (Dia 6)" },
  aviso_dia14: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Aviso (Dia 14)" },
  cobranca_dia20: { bg: "bg-red-500/15", text: "text-red-400", label: "Cobranca (Dia 20)" },
  manual: { bg: "bg-surface-tertiary", text: "text-txt-secondary", label: "Manual" },
  promocao: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Promocao" },
};

function TipoMsgBadge({ tipo }: { tipo: string | null }) {
  const key = tipo ?? "manual";
  const s = TIPO_COLORS[key] ?? TIPO_COLORS.manual;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        s.bg,
        s.text
      )}
    >
      {s.label}
    </span>
  );
}

function StatusMsgBadge({ status }: { status: string }) {
  const isEnviado = status === "enviado";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        isEnviado ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
      )}
    >
      {isEnviado ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {isEnviado ? "Enviado" : "Erro"}
    </span>
  );
}

/* ─── Helper: format datetime ────────────────────────────── */

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* ─── Stat card ──────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card padding="md" className="flex items-center gap-3">
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
          color
        )}
      >
        {icon}
      </div>
      <div>
        <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider block">
          {label}
        </span>
        <span className="text-xl font-bold text-txt-primary font-display">
          {value}
        </span>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ═══════════════════════════════════════════════════════════ */

const TIPO_FILTER_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "lembrete_dia6", label: "Lembrete (Dia 6)" },
  { value: "aviso_dia14", label: "Aviso (Dia 14)" },
  { value: "cobranca_dia20", label: "Cobranca (Dia 20)" },
  { value: "manual", label: "Manual" },
  { value: "promocao", label: "Promocao" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "enviado", label: "Enviado" },
  { value: "erro", label: "Erro" },
];

export default function WhatsAppPage() {
  const [whatsStatus, setWhatsStatus] = useState<WhatsAppStatus | null>(null);
  const [logs, setLogs] = useState<MensagemLogOut[]>([]);
  const [jogadores, setJogadores] = useState<JogadorOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* filters */
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  /* send modal */
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedJogadores, setSelectedJogadores] = useState<number[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  /* view content modal */
  const [viewMsg, setViewMsg] = useState<MensagemLogOut | null>(null);

  /* ── fetch ───────────────────────────────────────────────── */
  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [status, mensagens, jogs] = await Promise.all([
        api.get<WhatsAppStatus>("/whatsapp/status"),
        api.get<MensagemLogOut[]>("/mensagens/log"),
        api.get<JogadorOut[]>("/jogadores?ativo=1"),
      ]);
      setWhatsStatus(status);
      setLogs(mensagens);
      setJogadores(jogs);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── filtered logs ───────────────────────────────────────── */
  const filteredLogs = logs.filter((l) => {
    if (filterTipo && l.tipo_mensagem !== filterTipo) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterDateStart && l.enviado_em) {
      if (new Date(l.enviado_em) < new Date(filterDateStart)) return false;
    }
    if (filterDateEnd && l.enviado_em) {
      if (new Date(l.enviado_em) > new Date(filterDateEnd + "T23:59:59")) return false;
    }
    return true;
  });

  /* ── stats ───────────────────────────────────────────────── */
  const now = new Date();
  const twentyFourAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const totalEnviados = logs.filter((l) => l.status === "enviado").length;
  const totalErros = logs.filter((l) => l.status === "erro").length;
  const last24h = logs.filter(
    (l) => l.enviado_em && new Date(l.enviado_em) >= twentyFourAgo
  ).length;

  /* ── send message ────────────────────────────────────────── */
  const handleSend = async () => {
    if (selectedJogadores.length === 0) {
      toast.error("Selecione ao menos um jogador");
      return;
    }
    if (!msgText.trim()) {
      toast.error("Digite a mensagem");
      return;
    }
    setSending(true);
    try {
      const body: EnviarMensagemRequest = {
        jogador_ids: selectedJogadores,
        texto: msgText,
      };
      await api.post("/whatsapp/enviar", body);
      toast.success("Mensagem enviada com sucesso");
      setSendModalOpen(false);
      setSelectedJogadores([]);
      setMsgText("");
      fetchData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  /* ── toggle jogador selection ────────────────────────────── */
  const toggleJogador = (id: number) => {
    setSelectedJogadores((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedJogadores.length === jogadores.length) {
      setSelectedJogadores([]);
    } else {
      setSelectedJogadores(jogadores.map((j) => j.id));
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
            WhatsApp
          </h1>
          <p className="text-sm text-txt-tertiary font-body mt-1">
            Status de conexao e historico de mensagens
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<RefreshCw className={refreshing ? "animate-spin" : ""} />}
            onClick={() => fetchData(true)}
            loading={refreshing}
            size="sm"
          >
            Atualizar
          </Button>
          <Button icon={<Send />} onClick={() => setSendModalOpen(true)}>
            Enviar Mensagem Manual
          </Button>
        </div>
      </div>

      {/* Connection status + stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection card */}
        <Card padding="md" className="flex items-center gap-3">
          {loading ? (
            <>
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  whatsStatus?.connected
                    ? "bg-emerald-500/15"
                    : "bg-red-500/15"
                )}
              >
                {whatsStatus?.connected ? (
                  <Wifi className="h-5 w-5 text-emerald-400" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div>
                <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider block">
                  Status
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      whatsStatus?.connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      whatsStatus?.connected ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {whatsStatus?.connected ? "Conectado" : "Desconectado"}
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>

        <StatCard
          label="Total Enviados"
          value={totalEnviados}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          color="bg-emerald-500/15"
        />
        <StatCard
          label="Erros"
          value={totalErros}
          icon={<XCircle className="h-5 w-5 text-red-400" />}
          color="bg-red-500/15"
        />
        <StatCard
          label="Ultimas 24h"
          value={last24h}
          icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
          color="bg-blue-500/15"
        />
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-txt-tertiary mr-1">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-body uppercase tracking-wider">
              Filtros
            </span>
          </div>
          <Select
            options={TIPO_FILTER_OPTIONS}
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            containerClassName="min-w-[160px]"
          />
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            containerClassName="min-w-[140px]"
          />
          <Input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            containerClassName="min-w-[140px]"
            placeholder="Data inicio"
          />
          <Input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            containerClassName="min-w-[140px]"
            placeholder="Data fim"
          />
          {(filterTipo || filterStatus || filterDateStart || filterDateEnd) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilterTipo("");
                setFilterStatus("");
                setFilterDateStart("");
                setFilterDateEnd("");
              }}
            >
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {/* Log table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-secondary/50">
                {["Data/Hora", "Destinatario", "Tipo", "Status", "Acoes"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-txt-tertiary uppercase tracking-wider font-body"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-0">
                      <SkeletonTableRow columns={5} />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<MessageSquare />}
                      title="Nenhuma mensagem encontrada"
                      description="Ajuste os filtros ou envie uma nova mensagem"
                    />
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-surface-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-txt-secondary text-xs">
                      {formatDateTime(l.enviado_em)}
                    </td>
                    <td className="px-4 py-3 font-mono text-txt-primary text-xs">
                      {l.telefone ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <TipoMsgBadge tipo={l.tipo_mensagem} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusMsgBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="icon"
                        size="sm"
                        icon={<Eye />}
                        onClick={() => setViewMsg(l)}
                        aria-label="Ver conteudo"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── View content modal ─────────────────────────────── */}
      <Modal open={!!viewMsg} onClose={() => setViewMsg(null)} size="md">
        <ModalHeader>Conteudo da Mensagem</ModalHeader>
        <ModalBody className="space-y-3">
          {viewMsg && (
            <>
              <div className="flex flex-wrap gap-2">
                <TipoMsgBadge tipo={viewMsg.tipo_mensagem} />
                <StatusMsgBadge status={viewMsg.status} />
              </div>
              <div className="text-xs text-txt-tertiary font-body space-y-1">
                <p>
                  <span className="text-txt-secondary">Destinatario:</span>{" "}
                  <span className="font-mono">{viewMsg.telefone ?? "-"}</span>
                </p>
                <p>
                  <span className="text-txt-secondary">Enviado em:</span>{" "}
                  {formatDateTime(viewMsg.enviado_em)}
                </p>
                {viewMsg.message_id && (
                  <p>
                    <span className="text-txt-secondary">Message ID:</span>{" "}
                    <span className="font-mono text-[11px]">
                      {viewMsg.message_id}
                    </span>
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "mt-2 p-3 rounded-lg text-sm font-body",
                  "bg-surface-tertiary border border-border-subtle",
                  "text-txt-primary whitespace-pre-wrap"
                )}
              >
                {viewMsg.conteudo || "(sem conteudo)"}
              </div>
              {viewMsg.erro_detalhe && (
                <div
                  className={cn(
                    "p-3 rounded-lg text-xs font-body",
                    "bg-red-500/10 border border-red-500/30",
                    "text-red-400"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Erro
                  </div>
                  {viewMsg.erro_detalhe}
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setViewMsg(null)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Send manual message modal ──────────────────────── */}
      <Modal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        size="lg"
      >
        <ModalHeader>Enviar Mensagem Manual</ModalHeader>
        <ModalBody className="space-y-4">
          {/* jogador multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-txt-secondary font-body">
                Jogadores ({selectedJogadores.length} selecionados)
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-brand-red hover:text-brand-red-hover transition-colors font-body"
              >
                {selectedJogadores.length === jogadores.length
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </button>
            </div>
            <div
              className={cn(
                "max-h-48 overflow-y-auto rounded-lg",
                "bg-surface-tertiary border border-border",
                "divide-y divide-border-subtle"
              )}
            >
              {jogadores.map((j) => {
                const checked = selectedJogadores.includes(j.id);
                return (
                  <label
                    key={j.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer",
                      "hover:bg-surface-secondary/50 transition-colors",
                      checked && "bg-brand-red/5"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleJogador(j.id)}
                      className="h-4 w-4 rounded border-border bg-surface-tertiary text-brand-red focus:ring-brand-red/50"
                    />
                    <span className="text-sm text-txt-primary font-body">
                      {j.apelido || j.nome}
                    </span>
                    {j.telefone && (
                      <span className="text-xs text-txt-tertiary font-mono ml-auto">
                        {j.telefone}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* message textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">
              Mensagem
            </label>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Digite a mensagem..."
              rows={5}
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
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setSendModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            icon={<Send />}
            onClick={handleSend}
            loading={sending}
          >
            Enviar
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
