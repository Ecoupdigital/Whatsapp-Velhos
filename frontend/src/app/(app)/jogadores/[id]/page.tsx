"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Phone,
  Shield,
  Hash,
  Calendar,
  Edit,
  MessageCircle,
  MapPin,
  FileText,
  MailX,
  Send,
  Clock,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency, formatMonth } from "@/lib/utils";
import type {
  JogadorOut,
  MensalidadeOut,
  EnviarMensagemRequest,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Skeleton, SkeletonTableRow } from "@/components/ui/Skeleton";

/* ─── Info row ──────────────────────────────────────────────── */

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-txt-tertiary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-txt-tertiary font-body uppercase tracking-wide">
          {label}
        </span>
        <span
          className={cn(
            "text-sm text-txt-primary truncate",
            mono ? "font-mono" : "font-body"
          )}
        >
          {value ?? "-"}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function JogadorDetailPage() {
  const params = useParams();
  const jogadorId = Number(params.id);

  /* ─ state ─ */
  const [jogador, setJogador] = useState<JogadorOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensalidades, setMensalidades] = useState<MensalidadeOut[]>([]);
  const [loadingMensalidades, setLoadingMensalidades] = useState(true);

  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  /* ─ fetch jogador ─ */
  const fetchJogador = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<JogadorOut>(`/jogadores/${jogadorId}`);
      setJogador(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar jogador";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [jogadorId]);

  /* ─ fetch mensalidades ─ */
  const fetchMensalidades = useCallback(async () => {
    setLoadingMensalidades(true);
    try {
      const data = await api.get<MensalidadeOut[]>(
        `/mensalidades?jogador_id=${jogadorId}`
      );
      setMensalidades(data);
    } catch {
      // endpoint may not support jogador_id filter yet - fail silently
      setMensalidades([]);
    } finally {
      setLoadingMensalidades(false);
    }
  }, [jogadorId]);

  useEffect(() => {
    if (jogadorId) {
      fetchJogador();
      fetchMensalidades();
    }
  }, [jogadorId, fetchJogador, fetchMensalidades]);

  /* ─ send message ─ */
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!msgText.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }
    setSending(true);
    try {
      const payload: EnviarMensagemRequest = {
        jogador_ids: [jogadorId],
        texto: msgText.trim(),
      };
      await api.post("/mensagens/enviar", payload);
      toast.success("Mensagem enviada");
      setMsgModalOpen(false);
      setMsgText("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao enviar mensagem";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  /* ─── Loading state ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!jogador) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <Users className="h-16 w-16 text-txt-tertiary" />
        <p className="text-txt-secondary font-body">Jogador nao encontrado</p>
        <Link href="/jogadores">
          <Button variant="secondary" icon={<ArrowLeft />}>
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  /* ═══ RENDER ═══ */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/jogadores">
            <Button variant="icon" size="sm" icon={<ArrowLeft />} aria-label="Voltar" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wide text-txt-primary">
              {jogador.nome}
            </h1>
            {jogador.apelido && (
              <p className="text-sm text-txt-secondary font-body">
                &ldquo;{jogador.apelido}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            icon={<MessageCircle />}
            onClick={() => setMsgModalOpen(true)}
            className="flex-1 sm:flex-initial"
          >
            <span className="hidden sm:inline">Enviar Mensagem</span>
            <span className="sm:hidden">Mensagem</span>
          </Button>
          <Link href="/jogadores" className="flex-1 sm:flex-initial">
            <Button variant="secondary" icon={<Edit />} className="w-full">
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Main content ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Info card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-red" />
                <h2 className="text-base font-display font-semibold text-txt-primary">
                  Informacoes
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge type={jogador.tipo as "jogador" | "socio"}>
                  {jogador.tipo === "jogador" ? "Jogador" : "Socio"}
                </Badge>
                <Badge
                  status={jogador.ativo === 1 ? "pago" : "atrasado"}
                >
                  {jogador.ativo === 1 ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-1">
              <InfoRow
                icon={Phone}
                label="Telefone"
                value={jogador.telefone}
                mono
              />
              <InfoRow
                icon={Shield}
                label="Posicao"
                value={jogador.posicao}
              />
              <InfoRow
                icon={Hash}
                label="Camisa"
                value={
                  jogador.numero_camisa != null
                    ? `#${jogador.numero_camisa}`
                    : null
                }
              />
              <InfoRow
                icon={Calendar}
                label="Nascimento"
                value={
                  jogador.data_nascimento
                    ? formatDate(jogador.data_nascimento)
                    : null
                }
              />
              <InfoRow
                icon={Calendar}
                label="Entrada"
                value={
                  jogador.data_entrada
                    ? formatDate(jogador.data_entrada)
                    : null
                }
              />
              {jogador.excluido_envio === 1 && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <MailX className="h-4 w-4 text-yellow-400 shrink-0" />
                  <span className="text-xs text-yellow-400 font-body">
                    Excluido do envio de mensagens
                  </span>
                </div>
              )}
              {jogador.observacoes && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-txt-tertiary mt-0.5 shrink-0" />
                    <p className="text-sm text-txt-secondary font-body">
                      {jogador.observacoes}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* ── Right column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Mensalidades ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card padding="none">
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand-red" />
                  <h2 className="text-base font-display font-semibold text-txt-primary">
                    Historico de Mensalidades
                  </h2>
                </div>
              </div>

              {/* table header */}
              <div
                className={cn(
                  "hidden sm:grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-4",
                  "px-4 py-2 text-xs font-semibold uppercase tracking-wider",
                  "text-txt-tertiary font-body",
                  "border-b border-border-subtle"
                )}
              >
                <span>Mes</span>
                <span>Valor</span>
                <span>Status</span>
                <span>Data Pagamento</span>
              </div>

              {/* loading */}
              {loadingMensalidades && (
                <div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonTableRow key={i} columns={4} />
                  ))}
                </div>
              )}

              {/* empty */}
              {!loadingMensalidades && mensalidades.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Clock className="h-10 w-10 text-txt-tertiary" />
                  <p className="text-sm text-txt-secondary font-body">
                    Nenhuma mensalidade registrada
                  </p>
                </div>
              )}

              {/* Desktop rows */}
              {!loadingMensalidades &&
                mensalidades.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "hidden sm:grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-4",
                      "items-center px-4 py-3",
                      "border-b border-border-subtle last:border-b-0",
                      "bg-surface-card hover:bg-surface-card-hover",
                      "transition-colors duration-150"
                    )}
                  >
                    <span className="text-sm font-body text-txt-primary">
                      {formatMonth(m.mes_referencia)}
                    </span>
                    <span className="text-sm font-mono text-txt-primary">
                      {formatCurrency(m.valor)}
                    </span>
                    <div>
                      <Badge
                        status={
                          m.status as
                            | "pago"
                            | "pendente"
                            | "atrasado"
                            | "isento"
                        }
                      >
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </Badge>
                    </div>
                    <span className="text-sm font-body text-txt-secondary">
                      {m.data_pagamento
                        ? formatDate(m.data_pagamento)
                        : "-"}
                    </span>
                  </div>
                ))}

              {/* Mobile cards */}
              {!loadingMensalidades &&
                mensalidades.map((m) => (
                  <div
                    key={`mobile-${m.id}`}
                    className={cn(
                      "sm:hidden px-4 py-3",
                      "border-b border-border-subtle last:border-b-0",
                      "bg-surface-card hover:bg-surface-card-hover",
                      "transition-colors duration-150"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-body text-txt-primary font-medium">
                        {formatMonth(m.mes_referencia)}
                      </span>
                      <Badge
                        status={
                          m.status as
                            | "pago"
                            | "pendente"
                            | "atrasado"
                            | "isento"
                        }
                      >
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-mono text-txt-primary">
                        {formatCurrency(m.valor)}
                      </span>
                      <span className="text-xs font-body text-txt-tertiary">
                        {m.data_pagamento
                          ? formatDate(m.data_pagamento)
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
            </Card>
          </motion.div>

          {/* ── Eventos ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-red" />
                  <h2 className="text-base font-display font-semibold text-txt-primary">
                    Eventos Participados
                  </h2>
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <MapPin className="h-10 w-10 text-txt-tertiary" />
                  <p className="text-sm text-txt-secondary font-body">
                    Historico de eventos sera exibido aqui
                  </p>
                  <p className="text-xs text-txt-tertiary font-body">
                    Em breve
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ═══ WhatsApp Message Modal ════════════════════════════ */}
      <Modal
        open={msgModalOpen}
        onClose={() => {
          if (!sending) {
            setMsgModalOpen(false);
            setMsgText("");
          }
        }}
        size="md"
        closeOnOverlay={!sending}
      >
        <form onSubmit={handleSendMessage}>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-txt-primary font-display">
                Enviar Mensagem WhatsApp
              </h2>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-tertiary border border-border-subtle">
              <div className="h-8 w-8 rounded-full bg-surface-card flex items-center justify-center">
                <Users className="h-4 w-4 text-txt-tertiary" />
              </div>
              <div>
                <p className="text-sm font-medium text-txt-primary font-body">
                  {jogador.nome}
                </p>
                <p className="text-xs text-txt-tertiary font-mono">
                  {jogador.telefone || "Sem telefone"}
                </p>
              </div>
            </div>

            {jogador.excluido_envio === 1 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <MailX className="h-4 w-4 text-yellow-400 shrink-0" />
                <span className="text-xs text-yellow-400 font-body">
                  Este jogador esta excluido do envio automatico. A mensagem
                  direta ainda sera enviada.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-txt-secondary font-body">
                Mensagem
              </label>
              <textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                rows={5}
                placeholder="Digite sua mensagem..."
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm font-body",
                  "bg-surface-tertiary border border-border text-txt-primary",
                  "placeholder:text-txt-tertiary",
                  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                  "hover:border-border-strong transition-colors",
                  "resize-none"
                )}
                autoFocus
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setMsgModalOpen(false);
                setMsgText("");
              }}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={sending}
              icon={<Send />}
              disabled={!jogador.telefone}
            >
              Enviar
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
