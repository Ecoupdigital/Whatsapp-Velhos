"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Phone,
  Edit,
  Eye,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { JogadorOut, JogadorCreate, JogadorUpdate } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { SkeletonTableRow } from "@/components/ui/Skeleton";

/* ─── Tipos locais ──────────────────────────────────────────── */

type TipoFilter = "todos" | "jogador" | "socio";
type StatusFilter = "todos" | "ativos" | "inativos";

interface JogadorForm {
  nome: string;
  apelido: string;
  telefone: string;
  tipo: string;
  posicao: string;
  numero_camisa: string;
  data_nascimento: string;
  data_entrada: string;
  observacoes: string;
  ativo: boolean;
  excluido_envio: boolean;
}

const emptyForm: JogadorForm = {
  nome: "",
  apelido: "",
  telefone: "",
  tipo: "jogador",
  posicao: "",
  numero_camisa: "",
  data_nascimento: "",
  data_entrada: "",
  observacoes: "",
  ativo: true,
  excluido_envio: false,
};

/* ─── Helpers ───────────────────────────────────────────────── */

function formToCreate(f: JogadorForm): JogadorCreate {
  return {
    nome: f.nome,
    apelido: f.apelido || null,
    telefone: f.telefone || null,
    tipo: f.tipo,
    posicao: f.posicao || null,
    numero_camisa: f.numero_camisa ? parseInt(f.numero_camisa, 10) : null,
    data_nascimento: f.data_nascimento || null,
    data_entrada: f.data_entrada || null,
    observacoes: f.observacoes || null,
    ativo: f.ativo ? 1 : 0,
    excluido_envio: f.excluido_envio ? 1 : 0,
  };
}

function formToUpdate(f: JogadorForm): JogadorUpdate {
  return formToCreate(f) as JogadorUpdate;
}

function jogadorToForm(j: JogadorOut): JogadorForm {
  return {
    nome: j.nome,
    apelido: j.apelido ?? "",
    telefone: j.telefone ?? "",
    tipo: j.tipo,
    posicao: j.posicao ?? "",
    numero_camisa: j.numero_camisa != null ? String(j.numero_camisa) : "",
    data_nascimento: j.data_nascimento ?? "",
    data_entrada: j.data_entrada ?? "",
    observacoes: j.observacoes ?? "",
    ativo: j.ativo === 1,
    excluido_envio: j.excluido_envio === 1,
  };
}

/* ─── Toggle component ──────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary",
          checked ? "bg-brand-red" : "bg-surface-tertiary"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
            "transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      <span className="text-sm text-txt-secondary font-body">{label}</span>
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function JogadoresPage() {
  /* ─ state ─ */
  const [jogadores, setJogadores] = useState<JogadorOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<JogadorForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  /* ─ fetch ─ */
  const fetchJogadores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter === "ativos") params.set("ativo", "1");
      if (statusFilter === "inativos") params.set("ativo", "0");
      if (tipoFilter !== "todos") params.set("tipo", tipoFilter);
      if (search.trim()) params.set("busca", search.trim());

      const qs = params.toString();
      const data = await api.get<JogadorOut[]>(
        `/jogadores${qs ? `?${qs}` : ""}`
      );
      setJogadores(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar jogadores";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tipoFilter, search]);

  useEffect(() => {
    fetchJogadores();
  }, [fetchJogadores]);

  /* ─ modal handlers ─ */
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(j: JogadorOut) {
    setEditingId(j.id);
    setForm(jogadorToForm(j));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateField<K extends keyof JogadorForm>(
    key: K,
    value: JogadorForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put<JogadorOut>(
          `/jogadores/${editingId}`,
          formToUpdate(form)
        );
        toast.success("Jogador atualizado");
      } else {
        await api.post<JogadorOut>("/jogadores", formToCreate(form));
        toast.success("Jogador criado");
      }
      closeModal();
      fetchJogadores();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  /* ─── filter bar options ─ */
  const tipoOptions: { value: TipoFilter; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "jogador", label: "Jogador" },
    { value: "socio", label: "Socio" },
  ];

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "ativos", label: "Ativos" },
    { value: "inativos", label: "Inativos" },
  ];

  /* ═══ RENDER ═══ */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-wide text-txt-primary">
            Jogadores
          </h1>
          <p className="text-sm text-txt-secondary font-body mt-1">
            Gerencie o elenco do Velhos Parceiros
          </p>
        </div>
        <Button icon={<Plus />} onClick={openCreate}>
          Novo Jogador
        </Button>
      </div>

      {/* ─── Filter bar ─────────────────────────────────────── */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou apelido..."
              icon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
            className={cn(
              "h-10 rounded-lg px-3 text-sm font-body",
              "bg-surface-tertiary border border-border text-txt-primary",
              "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
              "hover:border-border-strong transition-colors"
            )}
          >
            {tipoOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
            className={cn(
              "h-10 rounded-lg px-3 text-sm font-body",
              "bg-surface-tertiary border border-border text-txt-primary",
              "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
              "hover:border-border-strong transition-colors"
            )}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* ─── Table ──────────────────────────────────────────── */}
      <Card padding="none">
        {/* header */}
        <div
          className={cn(
            "hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4",
            "px-4 py-3 text-xs font-semibold uppercase tracking-wider",
            "text-txt-tertiary font-body",
            "border-b border-border-subtle"
          )}
        >
          <span>Nome</span>
          <span>Apelido</span>
          <span>Telefone</span>
          <span>Tipo</span>
          <span>Status</span>
          <span className="w-20 text-center">Acoes</span>
        </div>

        {/* loading */}
        {loading && (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTableRow key={i} columns={6} />
            ))}
          </div>
        )}

        {/* empty */}
        {!loading && jogadores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-12 w-12 text-txt-tertiary" />
            <p className="text-txt-secondary font-body text-sm">
              Nenhum jogador encontrado
            </p>
            <Button size="sm" onClick={openCreate} icon={<Plus />}>
              Adicionar Jogador
            </Button>
          </div>
        )}

        {/* rows */}
        {!loading && jogadores.length > 0 && (
          <div>
            <AnimatePresence>
              {jogadores.map((j, idx) => (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-2 md:gap-4",
                    "items-center px-4 py-3",
                    "border-b border-border-subtle",
                    "bg-surface-card hover:bg-surface-card-hover",
                    "transition-colors duration-150"
                  )}
                >
                  {/* Nome */}
                  <div className="flex items-center gap-2">
                    <div className="hidden md:flex h-8 w-8 rounded-full bg-surface-tertiary items-center justify-center text-txt-tertiary">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-txt-primary font-body truncate">
                      {j.nome}
                    </span>
                  </div>

                  {/* Apelido */}
                  <span className="text-sm text-txt-secondary font-body truncate">
                    {j.apelido || "-"}
                  </span>

                  {/* Telefone */}
                  <span className="text-sm text-txt-secondary font-mono truncate">
                    {j.telefone || "-"}
                  </span>

                  {/* Tipo */}
                  <div>
                    <Badge type={j.tipo as "jogador" | "socio"}>
                      {j.tipo === "jogador" ? "Jogador" : "Socio"}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        j.ativo === 1 ? "bg-emerald-400" : "bg-gray-500"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-body",
                        j.ativo === 1
                          ? "text-emerald-400"
                          : "text-txt-tertiary"
                      )}
                    >
                      {j.ativo === 1 ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {/* Acoes */}
                  <div className="flex items-center gap-1 w-20 justify-center">
                    <Button
                      variant="icon"
                      size="sm"
                      icon={<Edit />}
                      onClick={() => openEdit(j)}
                      aria-label={`Editar ${j.nome}`}
                    />
                    <Link href={`/jogadores/${j.id}`}>
                      <Button
                        variant="icon"
                        size="sm"
                        icon={<Eye />}
                        aria-label={`Ver ${j.nome}`}
                      />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* count */}
        {!loading && jogadores.length > 0 && (
          <div className="px-4 py-2 text-xs text-txt-tertiary font-body border-t border-border-subtle">
            {jogadores.length} jogador{jogadores.length !== 1 ? "es" : ""}
          </div>
        )}
      </Card>

      {/* ═══ MODAL ═══════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        size="lg"
        closeOnOverlay={!saving}
      >
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            {editingId ? "Editar Jogador" : "Novo Jogador"}
          </ModalHeader>

          <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome *"
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => updateField("nome", e.target.value)}
                icon={<Users />}
              />
              <Input
                label="Apelido"
                placeholder="Apelido"
                value={form.apelido}
                onChange={(e) => updateField("apelido", e.target.value)}
              />
            </div>

            {/* row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Telefone"
                placeholder="5511999999999"
                value={form.telefone}
                onChange={(e) => updateField("telefone", e.target.value)}
                icon={<Phone />}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-txt-secondary font-body">
                  Tipo
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => updateField("tipo", e.target.value)}
                  className={cn(
                    "h-10 rounded-lg px-3 text-sm font-body",
                    "bg-surface-tertiary border border-border text-txt-primary",
                    "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red"
                  )}
                >
                  <option value="jogador">Jogador</option>
                  <option value="socio">Socio</option>
                </select>
              </div>
            </div>

            {/* row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Posicao"
                placeholder="Ex: Goleiro, Zagueiro..."
                value={form.posicao}
                onChange={(e) => updateField("posicao", e.target.value)}
              />
              <Input
                label="Numero da Camisa"
                placeholder="Ex: 10"
                type="number"
                value={form.numero_camisa}
                onChange={(e) =>
                  updateField("numero_camisa", e.target.value)
                }
              />
            </div>

            {/* row 4 - dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data de Nascimento"
                type="date"
                value={form.data_nascimento}
                onChange={(e) =>
                  updateField("data_nascimento", e.target.value)
                }
              />
              <Input
                label="Data de Entrada"
                type="date"
                value={form.data_entrada}
                onChange={(e) =>
                  updateField("data_entrada", e.target.value)
                }
              />
            </div>

            {/* observacoes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-txt-secondary font-body">
                Observacoes
              </label>
              <textarea
                value={form.observacoes}
                onChange={(e) => updateField("observacoes", e.target.value)}
                rows={3}
                placeholder="Observacoes..."
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm font-body",
                  "bg-surface-tertiary border border-border text-txt-primary",
                  "placeholder:text-txt-tertiary",
                  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
                  "hover:border-border-strong transition-colors",
                  "resize-none"
                )}
              />
            </div>

            {/* toggles */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Toggle
                checked={form.ativo}
                onChange={(v) => updateField("ativo", v)}
                label="Ativo"
              />
              <Toggle
                checked={form.excluido_envio}
                onChange={(v) => updateField("excluido_envio", v)}
                label="Excluido do envio de mensagens"
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={closeModal}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? "Salvar" : "Criar Jogador"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
