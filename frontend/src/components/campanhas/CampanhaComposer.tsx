"use client";

import { useRef, useState } from "react";
import {
  Type,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Upload,
  Send,
  CalendarClock,
  Repeat,
  Zap,
  Check,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  CampanhaCreate,
  CampanhaTipoConteudo,
  CampanhaModo,
  PublicoFiltros,
  UploadResponse,
} from "@/types";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PublicoSelector } from "./PublicoSelector";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TIPOS: {
  value: CampanhaTipoConteudo;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "texto", label: "Texto", icon: Type },
  { value: "imagem", label: "Imagem", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: Mic },
  { value: "documento", label: "PDF / Doc", icon: FileText },
];

const PLACEHOLDERS = ["{nome}", "{nome_completo}", "{time}", "{pix}", "{posicao}"];
const PREVIEW: Record<string, string> = {
  "{nome}": "Joao",
  "{nome_completo}": "Joao da Silva",
  "{time}": "Velhos Parceiros F.C.",
  "{pix}": "pix@velhosparceiros.com.br",
  "{posicao}": "Goleiro",
};

const ACCEPT: Record<string, string> = {
  imagem: "image/*",
  video: "video/*",
  audio: "audio/*",
  documento: ".pdf,.doc,.docx,.xls,.xlsx,.txt",
};

const DIAS_SEMANA = [
  { value: 0, label: "Segunda" },
  { value: 1, label: "Terca" },
  { value: 2, label: "Quarta" },
  { value: 3, label: "Quinta" },
  { value: 4, label: "Sexta" },
  { value: 5, label: "Sabado" },
  { value: 6, label: "Domingo" },
];

const selectClass = cn(
  "h-10 rounded-lg px-3 text-sm font-body w-full",
  "bg-surface-tertiary border border-border text-txt-primary",
  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red"
);

const emptyFiltros: PublicoFiltros = {
  ativo: true,
  tipo: null,
  posicao: null,
  mensalidade_status: null,
  mes_referencia: null,
  evento_id: null,
  evento_status: null,
  incluir_sem_telefone: false,
};

export function CampanhaComposer({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  /* conteudo */
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<CampanhaTipoConteudo>("texto");
  const [texto, setTexto] = useState("");
  const [midia, setMidia] = useState<UploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* publico */
  const [filtros, setFiltros] = useState<PublicoFiltros>(emptyFiltros);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* agendamento */
  const [modo, setModo] = useState<CampanhaModo>("agora");
  const [agendadaPara, setAgendadaPara] = useState("");
  const [recorrencia, setRecorrencia] = useState("mensal");
  const [recorrenciaDia, setRecorrenciaDia] = useState(1);
  const [recorrenciaHora, setRecorrenciaHora] = useState("10:00");

  function reset() {
    setStep(1);
    setNome("");
    setTipo("texto");
    setTexto("");
    setMidia(null);
    setFiltros(emptyFiltros);
    setSelectedIds(new Set());
    setModo("agora");
    setAgendadaPara("");
    setRecorrencia("mensal");
    setRecorrenciaDia(1);
    setRecorrenciaHora("10:00");
    setShowPreview(false);
  }

  function handleClose() {
    if (saving || uploading) return;
    reset();
    onClose();
  }

  function insertPlaceholder(ph: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setTexto((t) => t + ph);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = texto.substring(0, start) + ph + texto.substring(end);
    setTexto(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + ph.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<UploadResponse>("/campanhas/upload", fd);
      setMidia(res);
      toast.success("Arquivo enviado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /* validacao por passo */
  function canNext(): boolean {
    if (step === 1) {
      if (!nome.trim()) {
        toast.error("Da um nome pra campanha");
        return false;
      }
      if (tipo === "texto" && !texto.trim()) {
        toast.error("Escreve a mensagem");
        return false;
      }
      if (tipo !== "texto" && !midia) {
        toast.error("Envia o arquivo de midia");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (modo !== "recorrente" && selectedIds.size === 0) {
        toast.error("Selecione ao menos um destinatario");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (modo === "agendar" && !agendadaPara) {
        toast.error("Escolhe data e hora do agendamento");
        return false;
      }
      return true;
    }
    return true;
  }

  function next() {
    if (canNext()) setStep((s) => Math.min(4, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    setSaving(true);
    try {
      const payload: CampanhaCreate = {
        nome: nome.trim(),
        tipo_conteudo: tipo,
        texto: texto || null,
        midia_url: midia?.url ?? null,
        midia_nome: midia?.nome ?? null,
        modo,
        enviar_agora: modo === "agora",
      };

      if (modo === "agendar") {
        payload.agendada_para = agendadaPara; // datetime-local (BRT)
        payload.jogador_ids = Array.from(selectedIds);
      } else if (modo === "recorrente") {
        payload.recorrencia = recorrencia;
        payload.recorrencia_hora = recorrenciaHora;
        payload.recorrencia_dia =
          recorrencia === "diaria" ? null : recorrenciaDia;
        payload.filtros = filtros;
      } else {
        payload.jogador_ids = Array.from(selectedIds);
      }

      await api.post("/campanhas", payload);
      toast.success(
        modo === "agora"
          ? "Campanha disparada!"
          : modo === "agendar"
          ? "Campanha agendada!"
          : "Campanha recorrente ativada!"
      );
      reset();
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar campanha");
    } finally {
      setSaving(false);
    }
  }

  const previewText = texto.replace(/\{[^}]+\}/g, (m) => PREVIEW[m] || m);
  const totalDestinatarios =
    modo === "recorrente" ? "(definido no disparo)" : String(selectedIds.size);

  return (
    <Modal open={open} onClose={handleClose} size="xl" closeOnOverlay={false}>
      <ModalHeader>
        <div className="flex items-center justify-between pr-8">
          <span className="text-lg font-semibold text-txt-primary font-display">
            Nova Campanha
          </span>
          <span className="text-xs text-txt-tertiary font-body">
            Passo {step} de 4
          </span>
        </div>
        {/* step bar */}
        <div className="flex gap-1.5 mt-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-brand-red" : "bg-surface-tertiary"
              )}
            />
          ))}
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4 min-h-[320px]">
        {/* ── PASSO 1: CONTEUDO ── */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Nome da campanha"
              placeholder="Ex: Convite Galeto Junho"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <div>
              <span className="text-sm font-medium text-txt-secondary font-body block mb-2">
                Tipo de conteudo
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {TIPOS.map((t) => {
                  const Icon = t.icon;
                  const active = tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setTipo(t.value);
                        if (t.value === "texto") setMidia(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-body transition-colors",
                        active
                          ? "border-brand-red bg-brand-red/10 text-txt-primary"
                          : "border-border-subtle bg-surface-tertiary text-txt-secondary hover:border-border"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          active ? "text-brand-red" : "text-txt-tertiary"
                        )}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* upload de midia */}
            {tipo !== "texto" && (
              <div>
                <span className="text-sm font-medium text-txt-secondary font-body block mb-2">
                  Arquivo
                </span>
                {midia ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-tertiary border border-border">
                    <FileText className="h-5 w-5 text-brand-red shrink-0" />
                    <span className="text-sm text-txt-primary font-body truncate flex-1">
                      {midia.nome}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMidia(null)}
                      className="text-txt-tertiary hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPT[tipo]}
                      onChange={handleUpload}
                      className="hidden"
                    />
                    <Button
                      variant="secondary"
                      icon={<Upload />}
                      onClick={() => fileRef.current?.click()}
                      loading={uploading}
                      type="button"
                      className="w-full justify-center"
                    >
                      {uploading ? "Enviando..." : "Escolher arquivo"}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* texto / legenda */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-txt-secondary font-body">
                  {tipo === "texto" ? "Mensagem" : "Legenda (opcional)"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className={cn(
                    "text-xs font-body flex items-center gap-1 transition-colors",
                    showPreview
                      ? "text-brand-red"
                      : "text-txt-tertiary hover:text-txt-primary"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showPreview ? "Ocultar" : "Preview"}
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={5}
                placeholder="Escreva a mensagem..."
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm font-body resize-none",
                  "bg-surface-tertiary border border-border text-txt-primary",
                  "placeholder:text-txt-tertiary",
                  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red"
                )}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => insertPlaceholder(p)}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono text-brand-red bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red/20 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
              {showPreview && (
                <div className="mt-3 rounded-lg p-3 border bg-green-950/20 border-green-500/20">
                  <p className="text-sm font-body text-txt-primary whitespace-pre-wrap">
                    {previewText || (
                      <span className="text-txt-tertiary italic">
                        Mensagem vazia
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PASSO 2: PUBLICO ── */}
        {step === 2 && (
          <PublicoSelector
            filtros={filtros}
            onFiltrosChange={setFiltros}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            recorrente={modo === "recorrente"}
          />
        )}

        {/* ── PASSO 3: AGENDAMENTO ── */}
        {step === 3 && (
          <div className="space-y-4">
            <span className="text-sm font-medium text-txt-secondary font-body block">
              Quando enviar?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: "agora", label: "Agora", icon: Zap },
                { value: "agendar", label: "Agendar", icon: CalendarClock },
                { value: "recorrente", label: "Recorrente", icon: Repeat },
              ].map((m) => {
                const Icon = m.icon;
                const active = modo === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setModo(m.value as CampanhaModo)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-body transition-colors",
                      active
                        ? "border-brand-red bg-brand-red/10 text-txt-primary"
                        : "border-border-subtle bg-surface-tertiary text-txt-secondary hover:border-border"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        active ? "text-brand-red" : "text-txt-tertiary"
                      )}
                    />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {modo === "agora" && (
              <p className="text-sm text-txt-tertiary font-body">
                Dispara assim que voce confirmar. Intervalo aleatorio entre cada
                envio pra evitar bloqueio.
              </p>
            )}

            {modo === "agendar" && (
              <div>
                <label className="text-sm font-medium text-txt-secondary font-body block mb-1.5">
                  Data e hora (horario de Brasilia)
                </label>
                <Input
                  type="datetime-local"
                  value={agendadaPara}
                  onChange={(e) => setAgendadaPara(e.target.value)}
                />
              </div>
            )}

            {modo === "recorrente" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-txt-secondary font-body block mb-1.5">
                      Frequencia
                    </label>
                    <select
                      value={recorrencia}
                      onChange={(e) => setRecorrencia(e.target.value)}
                      className={selectClass}
                    >
                      <option value="diaria">Todo dia</option>
                      <option value="semanal">Toda semana</option>
                      <option value="mensal">Todo mes</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-txt-secondary font-body block mb-1.5">
                      Horario
                    </label>
                    <Input
                      type="time"
                      value={recorrenciaHora}
                      onChange={(e) => setRecorrenciaHora(e.target.value)}
                    />
                  </div>
                </div>

                {recorrencia === "semanal" && (
                  <div>
                    <label className="text-sm font-medium text-txt-secondary font-body block mb-1.5">
                      Dia da semana
                    </label>
                    <select
                      value={recorrenciaDia}
                      onChange={(e) => setRecorrenciaDia(Number(e.target.value))}
                      className={selectClass}
                    >
                      {DIAS_SEMANA.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {recorrencia === "mensal" && (
                  <div>
                    <label className="text-sm font-medium text-txt-secondary font-body block mb-1.5">
                      Dia do mes (1-31)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={String(recorrenciaDia)}
                      onChange={(e) =>
                        setRecorrenciaDia(
                          Math.min(31, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                    />
                  </div>
                )}
                <p className="text-xs text-txt-tertiary font-body">
                  A cada disparo o publico e recalculado pelos filtros do passo
                  anterior.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── PASSO 4: REVISAR ── */}
        {step === 4 && (
          <div className="space-y-3">
            <span className="text-sm font-medium text-txt-secondary font-body block">
              Revise antes de confirmar
            </span>
            <div className="rounded-lg border border-border-subtle bg-surface-tertiary divide-y divide-border-subtle text-sm font-body">
              <Row label="Campanha" value={nome} />
              <Row
                label="Tipo"
                value={TIPOS.find((t) => t.value === tipo)?.label ?? tipo}
              />
              {midia && <Row label="Arquivo" value={midia.nome} />}
              <Row label="Destinatarios" value={totalDestinatarios} />
              <Row
                label="Disparo"
                value={
                  modo === "agora"
                    ? "Imediato"
                    : modo === "agendar"
                    ? `Agendado: ${agendadaPara.replace("T", " ")}`
                    : `Recorrente: ${recorrencia} as ${recorrenciaHora}`
                }
              />
            </div>
            {texto && (
              <div className="rounded-lg p-3 border bg-surface-tertiary border-border-subtle">
                <span className="text-xs text-txt-tertiary font-body block mb-1">
                  Mensagem (exemplo)
                </span>
                <p className="text-sm font-body text-txt-primary whitespace-pre-wrap">
                  {previewText}
                </p>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step > 1 ? (
          <Button variant="secondary" type="button" onClick={back} disabled={saving}>
            Voltar
          </Button>
        ) : (
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancelar
          </Button>
        )}
        {step < 4 ? (
          <Button type="button" onClick={next}>
            Continuar
          </Button>
        ) : (
          <Button
            type="button"
            icon={modo === "agora" ? <Send /> : <Check />}
            onClick={submit}
            loading={saving}
          >
            {modo === "agora"
              ? "Disparar"
              : modo === "agendar"
              ? "Agendar"
              : "Ativar"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <span className="text-txt-tertiary">{label}</span>
      <span className="text-txt-primary font-medium text-right truncate">
        {value}
      </span>
    </div>
  );
}
