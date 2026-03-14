"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  DollarSign,
  Clock,
  User,
  CreditCard,
  Lock,
  Users,
  Save,
  Pencil,
  MessageSquareText,
  ChevronDown,
  Eye,
  Send,
  CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type { UsuarioOut } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/* ─── Types ─────────────────────────────────────────────── */

type ConfigMap = Record<string, string>;

interface TemplateConfig {
  key: string;
  label: string;
  description: string;
  color: string;
  defaultValue: string;
}

interface EnvioConfig {
  label: string;
  keyAtivo: string;
  keyHora: string;
  templateLabel: string;
  color: string;
  defaultDia: string;
  defaultHora: string;
}

/* ─── Constants ─────────────────────────────────────────── */

const PLACEHOLDERS = [
  { label: "{nome}", description: "Apelido do jogador" },
  { label: "{nome_completo}", description: "Nome completo" },
  { label: "{valor}", description: "Valor da mensalidade" },
  { label: "{valor_multa}", description: "Valor com multa" },
  { label: "{mes}", description: "Mes de referencia" },
  { label: "{vencimento}", description: "Dia do vencimento" },
  { label: "{pix}", description: "Chave PIX" },
  { label: "{time}", description: "Nome do time" },
];

const PREVIEW_VALUES: Record<string, string> = {
  "{nome}": "Joao",
  "{nome_completo}": "Joao da Silva",
  "{valor}": "R$ 60,00",
  "{valor_multa}": "R$ 65,00",
  "{mes}": "Marco 2026",
  "{vencimento}": "15",
  "{pix}": "pix@velhosparceiros.com.br",
  "{time}": "Velhos Parceiros F.C.",
};

const TEMPLATES: TemplateConfig[] = [
  {
    key: "template_lembrete_dia6",
    label: "Lembrete (Dia 6)",
    description: "Enviado no inicio do mes como lembrete amigavel",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    defaultValue:
      "Ola {nome}! Lembrete: a mensalidade de {mes} do {time} vence dia {vencimento}. Valor: {valor}. PIX: {pix}",
  },
  {
    key: "template_aviso_dia14",
    label: "Aviso (Dia 14)",
    description: "Segundo aviso antes do vencimento",
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    defaultValue:
      "Ola {nome}! Sua mensalidade de {mes} do {time} vence amanha (dia {vencimento}). Valor: {valor}. PIX: {pix}. Evite a multa!",
  },
  {
    key: "template_cobranca_dia20",
    label: "Cobranca (Dia 20)",
    description: "Cobranca apos vencimento com multa",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    defaultValue:
      "Ola {nome}! Sua mensalidade de {mes} do {time} esta em atraso. Valor com multa: {valor_multa}. PIX: {pix}. Regularize o quanto antes!",
  },
  {
    key: "template_cobranca_manual",
    label: "Cobranca Manual",
    description: "Template para envio manual de cobranca",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    defaultValue:
      "{nome_completo}, sua mensalidade de {mes} ({valor}) esta pendente. Faca o pagamento via PIX: {pix}. Obrigado! - {time}",
  },
];

const ENVIOS: EnvioConfig[] = [
  {
    label: "Lembrete",
    keyAtivo: "envio_dia6_ativo",
    keyHora: "envio_dia6_hora",
    templateLabel: "Lembrete (Dia 6)",
    color: "bg-blue-500/15 text-blue-400",
    defaultDia: "6",
    defaultHora: "10:00",
  },
  {
    label: "Aviso",
    keyAtivo: "envio_dia14_ativo",
    keyHora: "envio_dia14_hora",
    templateLabel: "Aviso (Dia 14)",
    color: "bg-yellow-500/15 text-yellow-400",
    defaultDia: "14",
    defaultHora: "10:00",
  },
  {
    label: "Cobranca",
    keyAtivo: "envio_dia20_ativo",
    keyHora: "envio_dia20_hora",
    templateLabel: "Cobranca (Dia 20)",
    color: "bg-red-500/15 text-red-400",
    defaultDia: "20",
    defaultHora: "10:00",
  },
];

/* ─── Section wrapper ────────────────────────────────────── */

function Section({
  icon,
  title,
  description,
  children,
  onEdit,
  editing,
  fullWidth,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  onEdit?: () => void;
  editing?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Card
      padding="lg"
      className={cn("animate-slide-up", fullWidth && "lg:col-span-2")}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
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
        {onEdit && (
          <Button
            variant="icon"
            size="sm"
            icon={editing ? <Save /> : <Pencil />}
            onClick={onEdit}
            aria-label={editing ? "Salvar" : "Editar"}
          />
        )}
      </div>
      {children}
    </Card>
  );
}

/* ─── Editable Info row ─────────────────────────────────── */

function EditableRow({
  label,
  value,
  mono,
  icon,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
  editing?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-b-0 gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        {icon && (
          <span className="text-txt-tertiary [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
        <span className="text-sm text-txt-secondary font-body">{label}</span>
      </div>
      {editing && onChange ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "text-sm font-medium text-txt-primary text-right",
            "bg-surface-tertiary border border-border rounded-lg px-3 py-1.5",
            "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
            mono ? "font-mono" : "font-body"
          )}
        />
      ) : (
        <span
          className={cn(
            "text-sm font-medium text-txt-primary",
            mono ? "font-mono" : "font-body"
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

/* ─── Toggle switch ─────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary",
        checked ? "bg-brand-red" : "bg-surface-tertiary"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

/* ─── Template Editor ───────────────────────────────────── */

function TemplateEditor({
  config,
  value,
  onChange,
  onSave,
  saving,
}: {
  config: TemplateConfig;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = before + placeholder + after;
      onChange(newValue);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + placeholder.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [value, onChange]
  );

  const previewText = value.replace(
    /\{[^}]+\}/g,
    (match) => PREVIEW_VALUES[match] || match
  );

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors duration-200",
        expanded
          ? "border-border bg-surface-card"
          : "border-border-subtle bg-surface-card hover:border-border"
      )}
    >
      {/* Header - clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-display font-bold border",
            config.color
          )}
        >
          <MessageSquareText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-txt-primary font-body block">
            {config.label}
          </span>
          <span className="text-xs text-txt-tertiary font-body">
            {config.description}
          </span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-txt-tertiary" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  rows={6}
                  className={cn(
                    "w-full text-sm font-body text-txt-primary",
                    "bg-surface-tertiary/60 border border-border-subtle rounded-lg",
                    "px-3 py-2.5 resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/60",
                    "placeholder:text-txt-tertiary"
                  )}
                  placeholder="Digite o template da mensagem..."
                />
              </div>

              {/* Placeholders */}
              <div>
                <span className="text-xs text-txt-tertiary font-body block mb-2">
                  Variaveis disponiveis (clique para inserir):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => insertPlaceholder(p.label)}
                      title={p.description}
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded-md text-xs",
                        "font-mono text-brand-red bg-brand-red/10 border border-brand-red/20",
                        "hover:bg-brand-red/20 hover:border-brand-red/40",
                        "transition-colors duration-150 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-body",
                    "text-txt-secondary hover:text-txt-primary transition-colors",
                    showPreview && "text-brand-red"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showPreview ? "Ocultar preview" : "Ver preview"}
                </button>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Save />}
                  onClick={onSave}
                  loading={saving}
                >
                  Salvar
                </Button>
              </div>

              {/* Preview */}
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className={cn(
                        "rounded-lg p-3 border",
                        "bg-green-950/20 border-green-500/20"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Send className="h-3 w-3 text-green-400" />
                        <span className="text-xs font-body font-medium text-green-400">
                          Preview da mensagem
                        </span>
                      </div>
                      <p className="text-sm font-body text-txt-primary whitespace-pre-wrap leading-relaxed">
                        {previewText || (
                          <span className="text-txt-tertiary italic">
                            Template vazio
                          </span>
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                      */
/* ═══════════════════════════════════════════════════════════ */

export default function ConfiguracoesPage() {
  const [user, setUser] = useState<UsuarioOut | null>(null);
  const [loading, setLoading] = useState(true);
  // Editable state for team data
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamData, setTeamData] = useState({
    nome: "Velhos Parceiros F.C.",
    pix: "pix@velhosparceiros.com.br",
    grupo: "VELHOS PARCEIROS F.C",
  });

  // Editable state for values
  const [editingValues, setEditingValues] = useState(false);
  const [values, setValues] = useState({
    jogador: "60",
    socio: "20",
    multa: "65",
    vencimento: "15",
  });

  // Template state
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);

  // Envios automaticos state
  const [envios, setEnvios] = useState<
    Record<string, { ativo: boolean; hora: string }>
  >({
    envio_dia6: { ativo: true, hora: "10:00" },
    envio_dia14: { ativo: true, hora: "10:00" },
    envio_dia20: { ativo: true, hora: "10:00" },
  });
  const [savingEnvios, setSavingEnvios] = useState(false);

  /* ─── Load configs ────────────────────────────────────── */

  useEffect(() => {
    async function loadData() {
      try {
        // Load user from localStorage
        const userData = localStorage.getItem("user");
        if (userData) {
          setUser(JSON.parse(userData));
        }

        // Load configs from API
        const data = await api.get<ConfigMap>("/configuracoes");
        // Populate team data
        setTeamData({
          nome: data.time_nome || "Velhos Parceiros F.C.",
          pix: data.pix_chave || "pix@velhosparceiros.com.br",
          grupo: data.grupo_whatsapp || "VELHOS PARCEIROS F.C",
        });

        // Populate values
        setValues({
          jogador: data.valor_jogador || "60",
          socio: data.valor_socio || "20",
          multa: data.valor_multa || "65",
          vencimento: data.dia_vencimento || "15",
        });

        // Populate templates
        const tpl: Record<string, string> = {};
        for (const t of TEMPLATES) {
          tpl[t.key] = data[t.key] || t.defaultValue;
        }
        setTemplates(tpl);

        // Populate envios
        setEnvios({
          envio_dia6: {
            ativo: data.envio_dia6_ativo !== "false",
            hora: data.envio_dia6_hora || "10:00",
          },
          envio_dia14: {
            ativo: data.envio_dia14_ativo !== "false",
            hora: data.envio_dia14_hora || "10:00",
          },
          envio_dia20: {
            ativo: data.envio_dia20_ativo !== "false",
            hora: data.envio_dia20_hora || "10:00",
          },
        });
      } catch {
        // If API fails, keep defaults
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ─── Save handlers ───────────────────────────────────── */

  async function handleSaveTeam() {
    if (editingTeam) {
      try {
        await api.put("/configuracoes", {
          time_nome: teamData.nome,
          pix_chave: teamData.pix,
        });
        toast.success("Dados do time salvos");
      } catch {
        toast.error("Erro ao salvar dados do time");
      }
    }
    setEditingTeam(!editingTeam);
  }

  async function handleSaveValues() {
    if (editingValues) {
      try {
        await api.put("/configuracoes", {
          valor_jogador: values.jogador,
          valor_socio: values.socio,
          valor_multa: values.multa,
          dia_vencimento: values.vencimento,
        });
        toast.success("Valores de mensalidade salvos");
      } catch {
        toast.error("Erro ao salvar valores");
      }
    }
    setEditingValues(!editingValues);
  }

  async function handleSaveTemplate(key: string) {
    setSavingTemplate(key);
    try {
      await api.put("/configuracoes", {
        [key]: templates[key],
      });
      toast.success("Template salvo com sucesso");
    } catch {
      toast.error("Erro ao salvar template");
    } finally {
      setSavingTemplate(null);
    }
  }

  async function handleSaveEnvios() {
    setSavingEnvios(true);
    try {
      await api.put("/configuracoes", {
        envio_dia6_ativo: String(envios.envio_dia6.ativo),
        envio_dia6_hora: envios.envio_dia6.hora,
        envio_dia14_ativo: String(envios.envio_dia14.ativo),
        envio_dia14_hora: envios.envio_dia14.hora,
        envio_dia20_ativo: String(envios.envio_dia20.ativo),
        envio_dia20_hora: envios.envio_dia20.hora,
      });
      toast.success("Configuracoes de envio salvas");
    } catch {
      toast.error("Erro ao salvar configuracoes de envio");
    } finally {
      setSavingEnvios(false);
    }
  }

  /* ─── Render ──────────────────────────────────────────── */

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
          onEdit={handleSaveTeam}
          editing={editingTeam}
        >
          <div className="space-y-0">
            <EditableRow
              label="Nome do Time"
              value={teamData.nome}
              icon={<Users />}
              editing={editingTeam}
              onChange={(v) => setTeamData((p) => ({ ...p, nome: v }))}
            />
            <EditableRow
              label="Chave PIX"
              value={teamData.pix}
              mono
              icon={<CreditCard />}
              editing={editingTeam}
              onChange={(v) => setTeamData((p) => ({ ...p, pix: v }))}
            />
            <EditableRow
              label="Grupo WhatsApp"
              value={teamData.grupo}
              icon={<Users />}
              editing={editingTeam}
              onChange={(v) => setTeamData((p) => ({ ...p, grupo: v }))}
            />
          </div>
        </Section>

        {/* ── 2. Valores de Mensalidade ────────────────────── */}
        <Section
          icon={<DollarSign className="h-5 w-5" />}
          title="Valores de Mensalidade"
          description="Valores configurados para cada tipo de membro"
          onEdit={handleSaveValues}
          editing={editingValues}
        >
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-red" />
                <span className="text-sm text-txt-secondary font-body">
                  Jogador
                </span>
              </div>
              {editingValues ? (
                <input
                  value={values.jogador}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, jogador: e.target.value }))
                  }
                  className="w-24 text-sm font-bold text-txt-primary font-mono text-right bg-surface-tertiary border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                />
              ) : (
                <span className="text-sm font-bold text-txt-primary font-mono">
                  {formatCurrency(parseFloat(values.jogador))}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-sm text-txt-secondary font-body">
                  Socio
                </span>
              </div>
              {editingValues ? (
                <input
                  value={values.socio}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, socio: e.target.value }))
                  }
                  className="w-24 text-sm font-bold text-txt-primary font-mono text-right bg-surface-tertiary border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                />
              ) : (
                <span className="text-sm font-bold text-txt-primary font-mono">
                  {formatCurrency(parseFloat(values.socio))}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-sm text-txt-secondary font-body">
                  Multa por Atraso
                </span>
              </div>
              {editingValues ? (
                <input
                  value={values.multa}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, multa: e.target.value }))
                  }
                  className="w-24 text-sm font-bold text-txt-primary font-mono text-right bg-surface-tertiary border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                />
              ) : (
                <span className="text-sm font-bold text-txt-primary font-mono">
                  {formatCurrency(parseFloat(values.multa))}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-sm text-txt-secondary font-body">
                  Dia Vencimento
                </span>
              </div>
              {editingValues ? (
                <input
                  value={values.vencimento}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, vencimento: e.target.value }))
                  }
                  className="w-24 text-sm font-bold text-txt-primary font-mono text-right bg-surface-tertiary border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                />
              ) : (
                <span className="text-sm font-bold text-txt-primary font-mono">
                  Dia {values.vencimento}
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* ── 3. Templates de Mensagem ─────────────────────── */}
        <Section
          icon={<MessageSquareText className="h-5 w-5" />}
          title="Templates de Mensagem"
          description="Modelos de mensagem para envio automatico e manual"
          fullWidth
        >
          <div className="space-y-3">
            {TEMPLATES.map((tpl) => (
              <TemplateEditor
                key={tpl.key}
                config={tpl}
                value={templates[tpl.key] || tpl.defaultValue}
                onChange={(v) =>
                  setTemplates((prev) => ({ ...prev, [tpl.key]: v }))
                }
                onSave={() => handleSaveTemplate(tpl.key)}
                saving={savingTemplate === tpl.key}
              />
            ))}
          </div>
        </Section>

        {/* ── 4. Envios Automaticos ────────────────────────── */}
        <Section
          icon={<Clock className="h-5 w-5" />}
          title="Envios Automaticos"
          description="Configure dias e horarios de envio automatico"
          fullWidth
        >
          <div className="space-y-0">
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px_100px_1fr] gap-4 px-3 pb-2 border-b border-border-subtle">
              <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider">
                Envio
              </span>
              <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider text-center">
                Ativo
              </span>
              <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider text-center">
                Dia
              </span>
              <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider text-center">
                Horario
              </span>
              <span className="text-xs text-txt-tertiary font-body uppercase tracking-wider">
                Template
              </span>
            </div>

            {ENVIOS.map((envio) => {
              const envioKey = envio.keyAtivo.replace("_ativo", "");
              const envioState = envios[envioKey] || {
                ativo: true,
                hora: envio.defaultHora,
              };

              return (
                <div
                  key={envio.keyAtivo}
                  className={cn(
                    "grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_100px_1fr] gap-3 sm:gap-4",
                    "items-center px-3 py-4",
                    "border-b border-border-subtle last:border-b-0"
                  )}
                >
                  {/* Label */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 font-display font-bold text-xs",
                        envio.color
                      )}
                    >
                      {envio.defaultDia}
                    </div>
                    <span className="text-sm font-medium text-txt-primary font-body">
                      {envio.label}
                    </span>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center justify-center">
                    <Toggle
                      checked={envioState.ativo}
                      onChange={(v) =>
                        setEnvios((prev) => ({
                          ...prev,
                          [envioKey]: { ...prev[envioKey], ativo: v },
                        }))
                      }
                    />
                  </div>

                  {/* Dia (read-only display) */}
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-mono text-txt-primary font-medium">
                      {envio.defaultDia}
                    </span>
                  </div>

                  {/* Horario */}
                  <div className="flex items-center justify-center">
                    <input
                      type="time"
                      value={envioState.hora}
                      onChange={(e) =>
                        setEnvios((prev) => ({
                          ...prev,
                          [envioKey]: {
                            ...prev[envioKey],
                            hora: e.target.value,
                          },
                        }))
                      }
                      disabled={!envioState.ativo}
                      className={cn(
                        "text-sm font-mono text-txt-primary",
                        "bg-surface-tertiary border border-border-subtle rounded-lg px-2 py-1.5",
                        "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "w-full max-w-[100px]"
                      )}
                    />
                  </div>

                  {/* Template reference */}
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-txt-tertiary flex-shrink-0" />
                    <span
                      className={cn(
                        "text-xs font-body",
                        envioState.ativo
                          ? "text-txt-secondary"
                          : "text-txt-tertiary"
                      )}
                    >
                      {envio.templateLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save button for envios */}
          <div className="flex justify-end pt-4 mt-2 border-t border-border-subtle">
            <Button
              variant="primary"
              size="md"
              icon={<Save />}
              onClick={handleSaveEnvios}
              loading={savingEnvios}
            >
              Salvar Configuracoes
            </Button>
          </div>
        </Section>

        {/* ── 5. Conta ─────────────────────────────────────── */}
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
              <EditableRow
                label="Usuario"
                value={user?.username ?? "-"}
                icon={<User />}
              />
              <EditableRow
                label="Nome"
                value={user?.nome ?? "-"}
                icon={<User />}
              />
              <EditableRow
                label="Funcao"
                value={
                  user?.role === "admin"
                    ? "Administrador"
                    : user?.role ?? "-"
                }
                icon={<Shield />}
              />

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
