"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  DollarSign,
  Clock,
  User,
  CreditCard,
  Lock,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatCurrency } from "@/lib/utils";
import type { UsuarioOut } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/* ─── Section wrapper ────────────────────────────────────── */

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="lg" className="animate-slide-up">
      <div className="flex items-start gap-3 mb-5">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
            "bg-brand-red/10 text-brand-red"
          )}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-display font-semibold text-txt-primary">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-txt-tertiary font-body mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}

/* ─── Info row ───────────────────────────────────────────── */

function InfoRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-txt-tertiary [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
        <span className="text-sm text-txt-secondary font-body">{label}</span>
      </div>
      <span
        className={cn(
          "text-sm font-medium text-txt-primary",
          mono ? "font-mono" : "font-body"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Schedule row ───────────────────────────────────────── */

function ScheduleRow({
  dia,
  tipo,
  descricao,
  color,
}: {
  dia: string;
  tipo: string;
  descricao: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border-subtle last:border-b-0">
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 font-display font-bold text-sm",
          color
        )}
      >
        {dia}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-txt-primary font-body block">
          {tipo}
        </span>
        <span className="text-xs text-txt-tertiary font-body">{descricao}</span>
      </div>
      <span className="text-xs text-txt-tertiary font-mono">10:00 BRT</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ═══════════════════════════════════════════════════════════ */

export default function ConfiguracoesPage() {
  const [user, setUser] = useState<UsuarioOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
          const userData = localStorage.getItem("user");
          if (userData) {
            setUser(JSON.parse(userData));
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.div
      className="space-y-6 animate-fade-in"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary uppercase tracking-tight">
          Configuracoes
        </h1>
        <p className="text-sm text-txt-tertiary font-body mt-1">
          Configuracoes do sistema e do clube
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 1. Dados do Time ─────────────────────────────── */}
        <Section
          icon={<Shield className="h-5 w-5" />}
          title="Dados do Time"
          description="Informacoes basicas do Velhos Parceiros F.C."
        >
          <div className="space-y-0">
            <InfoRow
              label="Nome do Time"
              value="Velhos Parceiros F.C."
              icon={<Users />}
            />
            <InfoRow
              label="Chave PIX"
              value="velhos@pix.com"
              mono
              icon={<CreditCard />}
            />
            <InfoRow
              label="Grupo WhatsApp"
              value="VELHOS PARCEIROS F.C"
              icon={<Users />}
            />
          </div>
        </Section>

        {/* ── 2. Valores de Mensalidade ────────────────────── */}
        <Section
          icon={<DollarSign className="h-5 w-5" />}
          title="Valores de Mensalidade"
          description="Valores configurados para cada tipo de membro"
        >
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-red" />
                <span className="text-sm text-txt-secondary font-body">
                  Jogador
                </span>
              </div>
              <span className="text-sm font-bold text-txt-primary font-mono">
                {formatCurrency(60)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-sm text-txt-secondary font-body">
                  Socio
                </span>
              </div>
              <span className="text-sm font-bold text-txt-primary font-mono">
                {formatCurrency(20)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-sm text-txt-secondary font-body">
                  Multa por Atraso
                </span>
              </div>
              <span className="text-sm font-bold text-txt-primary font-mono">
                {formatCurrency(65)}
              </span>
            </div>
          </div>
        </Section>

        {/* ── 3. Horarios de Envio ─────────────────────────── */}
        <Section
          icon={<Clock className="h-5 w-5" />}
          title="Horarios de Envio Automatico"
          description="Dias e horarios de envio automatico de mensagens"
        >
          <div className="space-y-0">
            <ScheduleRow
              dia="06"
              tipo="Lembrete"
              descricao="Mensagem de lembrete de pagamento"
              color="bg-blue-500/15 text-blue-400"
            />
            <ScheduleRow
              dia="14"
              tipo="Aviso"
              descricao="Segundo aviso sobre mensalidade pendente"
              color="bg-yellow-500/15 text-yellow-400"
            />
            <ScheduleRow
              dia="20"
              tipo="Cobranca"
              descricao="Notificacao de cobranca com multa"
              color="bg-red-500/15 text-red-400"
            />
          </div>
        </Section>

        {/* ── 4. Conta ─────────────────────────────────────── */}
        <Section
          icon={<User className="h-5 w-5" />}
          title="Conta"
          description="Informacoes da sua conta de acesso"
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-0">
              <InfoRow
                label="Usuario"
                value={user?.username ?? "-"}
                icon={<User />}
              />
              <InfoRow
                label="Nome"
                value={user?.nome ?? "-"}
                icon={<User />}
              />
              <InfoRow
                label="Funcao"
                value={
                  user?.role === "admin"
                    ? "Administrador"
                    : user?.role ?? "-"
                }
                icon={<Shield />}
              />

              {/* Change password placeholder */}
              <div className="pt-4 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Lock />}
                  onClick={() =>
                    toast("Funcionalidade em desenvolvimento", {
                      icon: "🔒",
                    })
                  }
                >
                  Alterar Senha
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </motion.div>
  );
}
