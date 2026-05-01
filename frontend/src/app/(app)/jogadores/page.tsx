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
  Trash2,
  CheckSquare,
  Square,
  X,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { JogadorOut, JogadorCreate, JogadorUpdate, SugestoesGrupo } from "@/types";
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
  excluido_mensalidade: boolean;
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
  excluido_mensalidade: false,
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
    excluido_mensalidade: f.excluido_mensalidade ? 1 : 0,
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
    excluido_mensalidade: j.excluido_mensalidade === 1,
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

  // Selection & bulk
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkField, setBulkField] = useState<string>("tipo");
  const [bulkValue, setBulkValue] = useState<string>("jogador");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Sugestoes do grupo WhatsApp (telefones do grupo sem cadastro)
  const [sugestoes, setSugestoes] = useState<SugestoesGrupo | null>(null);
  const [sugestoesOpen, setSugestoesOpen] = useState(false);
  const [sugestoesLoading, setSugestoesLoading] = useState(false);

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

  /* ─ fetch sugestoes do grupo ─ */
  const fetchSugestoes = useCallback(async () => {
    setSugestoesLoading(true);
    try {
      const data = await api.get<SugestoesGrupo>("/jogadores/grupo/sugestoes");
      setSugestoes(data);
    } catch {
      // Silencioso - WhatsApp pode estar offline
      setSugestoes(null);
    } finally {
      setSugestoesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSugestoes();
  }, [fetchSugestoes]);

  /* ─ modal handlers ─ */
  function openCreate(prefilledPhone?: string) {
    setEditingId(null);
    setForm({ ...emptyForm, telefone: prefilledPhone || "" });
    setSugestoesOpen(false);
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
      fetchSugestoes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  /* ─── delete handler (exclui de verdade) ─ */
  async function handleDelete(id: number) {
    if (deletingId === id) {
      try {
        await api.delete(`/jogadores/${id}?force=true`);
        toast.success("Jogador excluido permanentemente");
        setDeletingId(null);
        setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
        fetchJogadores();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir");
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  }

  /* ─── deactivate handler ─ */
  async function handleDeactivate(id: number) {
    try {
      await api.delete(`/jogadores/${id}`);
      toast.success("Jogador desativado");
      fetchJogadores();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar");
    }
  }

  /* ─── selection handlers ─ */
  function toggleSelect(id: number) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (selected.size === jogadores.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(jogadores.map((j) => j.id)));
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  /* ─── bulk edit handler ─ */
  async function handleBulkEdit() {
    if (selected.size === 0) return;
    setBulkSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (bulkField === "tipo") updates.tipo = bulkValue;
      if (bulkField === "ativo") updates.ativo = bulkValue === "1" ? 1 : 0;
      if (bulkField === "excluido_envio") updates.excluido_envio = bulkValue === "1" ? 1 : 0;

      let ok = 0;
      const ids = Array.from(selected);
      for (let i = 0; i < ids.length; i++) {
        try {
          await api.put(`/jogadores/${ids[i]}`, updates);
          ok++;
        } catch { /* skip */ }
      }
      toast.success(`${ok} jogador(es) atualizado(s)`);
      setBulkModalOpen(false);
      setSelected(new Set());
      fetchJogadores();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na edicao em massa");
    } finally {
      setBulkSaving(false);
    }
  }

  /* ─── bulk delete handler ─ */
  async function handleBulkDelete() {
    if (selected.size === 0) return;
    const count = selected.size;
    try {
      const ids = Array.from(selected);
      for (let i = 0; i < ids.length; i++) {
        await api.delete(`/jogadores/${ids[i]}?force=true`);
      }
      toast.success(`${count} jogador(es) excluido(s)`);
      setSelected(new Set());
      fetchJogadores();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold uppercase tracking-wide text-txt-primary">
            Jogadores
          </h1>
          <p className="text-sm text-txt-secondary font-body mt-1">
            Gerencie o elenco do Velhos Parceiros
          </p>
        </div>
        <Button icon={<Plus />} onClick={() => openCreate()}>
          Novo Jogador
        </Button>
      </div>

      {/* ─── Sugestoes do grupo WhatsApp ────────────────────── */}
      {sugestoes && sugestoes.sem_cadastro.length > 0 && (
        <button
          type="button"
          onClick={() => setSugestoesOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 transition-colors text-left"
        >
          <AlertCircle size={18} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-display uppercase tracking-wider text-amber-400">
              {sugestoes.sem_cadastro.length} {sugestoes.sem_cadastro.length === 1 ? "numero" : "numeros"} no grupo sem cadastro
            </p>
            <p className="text-xs text-txt-secondary font-body mt-0.5">
              Clique para ver e decidir quem cadastrar como jogador
            </p>
          </div>
          <span className="text-xs text-amber-400/70 font-body">Ver</span>
        </button>
      )}

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

      {/* ─── Bulk action bar ─────────────────────────────────── */}
      {selected.size > 0 && (
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-body text-txt-primary">
                <strong>{selected.size}</strong> selecionado{selected.size !== 1 ? "s" : ""}
              </span>
              <button onClick={clearSelection} className="text-xs text-txt-tertiary hover:text-txt-primary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setBulkField("tipo"); setBulkValue("jogador"); setBulkModalOpen(true); }}>
                Editar em Massa
              </Button>
              <Button size="sm" variant="secondary" onClick={async () => {
                const ids = Array.from(selected);
                for (let i = 0; i < ids.length; i++) { await handleDeactivate(ids[i]); }
                setSelected(new Set());
              }}>
                Desativar ({selected.size})
              </Button>
              <Button size="sm" variant="danger" onClick={handleBulkDelete} icon={<Trash2 />}>
                Excluir ({selected.size})
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Desktop Table ────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card padding="none">
          {/* header */}
          <div
            className={cn(
              "grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4",
              "px-4 py-3 text-xs font-semibold uppercase tracking-wider",
              "text-txt-tertiary font-body",
              "border-b border-border-subtle"
            )}
          >
            <button onClick={toggleSelectAll} className="w-6 flex items-center justify-center text-txt-tertiary hover:text-txt-primary">
              {selected.size === jogadores.length && jogadores.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
            <span>Nome</span>
            <span>Apelido</span>
            <span>Telefone</span>
            <span>Tipo</span>
            <span>Status</span>
            <span className="w-24 text-center">Acoes</span>
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
              <Button size="sm" onClick={() => openCreate()} icon={<Plus />}>
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
                      "grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4",
                      "items-center px-4 py-3",
                      "border-b border-border-subtle",
                      selected.has(j.id) ? "bg-brand-red/5" : "bg-surface-card hover:bg-surface-card-hover",
                      "transition-colors duration-150"
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(j.id)}
                      className="w-6 flex items-center justify-center text-txt-tertiary hover:text-txt-primary"
                    >
                      {selected.has(j.id) ? <CheckSquare className="h-4 w-4 text-brand-red" /> : <Square className="h-4 w-4" />}
                    </button>

                    {/* Nome */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 rounded-full bg-surface-tertiary items-center justify-center text-txt-tertiary">
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
                    <div className="flex items-center gap-1 w-24 justify-center">
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
                      <button
                        onClick={() => handleDelete(j.id)}
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                          deletingId === j.id
                            ? "bg-red-500/20 text-red-400"
                            : "text-txt-tertiary hover:text-red-400 hover:bg-red-500/10"
                        )}
                        title={deletingId === j.id ? "Clique de novo para confirmar" : "Excluir"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
      </div>

      {/* ─── Mobile Cards ────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {/* loading */}
        {loading && (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-card border border-border-subtle rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-surface-tertiary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-surface-tertiary rounded" />
                  <div className="h-3 w-1/2 bg-surface-tertiary rounded" />
                </div>
              </div>
            </div>
          ))
        )}

        {/* empty */}
        {!loading && jogadores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-12 w-12 text-txt-tertiary" />
            <p className="text-txt-secondary font-body text-sm">
              Nenhum jogador encontrado
            </p>
            <Button size="sm" onClick={() => openCreate()} icon={<Plus />}>
              Adicionar Jogador
            </Button>
          </div>
        )}

        {/* cards */}
        {!loading && jogadores.length > 0 && (
          <>
            {/* Select all + count */}
            <div className="flex items-center justify-between px-1">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-txt-tertiary hover:text-txt-primary text-sm font-body">
                {selected.size === jogadores.length && jogadores.length > 0 ? <CheckSquare className="h-4 w-4 text-brand-red" /> : <Square className="h-4 w-4" />}
                <span>Selecionar todos</span>
              </button>
              <span className="text-xs text-txt-tertiary font-body">{jogadores.length} jogador{jogadores.length !== 1 ? "es" : ""}</span>
            </div>

            <AnimatePresence>
              {jogadores.map((j, idx) => (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "bg-surface-card border border-border-subtle rounded-lg p-4",
                    selected.has(j.id) ? "border-brand-red/40 bg-brand-red/5" : "hover:bg-surface-card-hover",
                    "transition-colors duration-150"
                  )}
                >
                  {/* Top: checkbox + name + type badge */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSelect(j.id)}
                      className="mt-0.5 shrink-0 text-txt-tertiary hover:text-txt-primary"
                    >
                      {selected.has(j.id) ? <CheckSquare className="h-4 w-4 text-brand-red" /> : <Square className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-txt-primary font-body truncate">
                            {j.nome}
                          </p>
                          {j.apelido && (
                            <p className="text-xs text-txt-secondary font-body truncate">{j.apelido}</p>
                          )}
                        </div>
                        <Badge type={j.tipo as "jogador" | "socio"}>
                          {j.tipo === "jogador" ? "Jogador" : "Socio"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Middle: status + phone */}
                  <div className="flex items-center justify-between mt-2 ml-7">
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
                          j.ativo === 1 ? "text-emerald-400" : "text-txt-tertiary"
                        )}
                      >
                        {j.ativo === 1 ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {j.telefone && (
                      <span className="text-xs text-txt-secondary font-mono">{j.telefone}</span>
                    )}
                  </div>

                  {/* Bottom: actions */}
                  <div className="flex items-center justify-end gap-2 mt-3 ml-7 pt-3 border-t border-border-subtle">
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
                    <button
                      onClick={() => handleDelete(j.id)}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        deletingId === j.id
                          ? "bg-red-500/20 text-red-400"
                          : "text-txt-tertiary hover:text-red-400 hover:bg-red-500/10"
                      )}
                      title={deletingId === j.id ? "Clique de novo para confirmar" : "Excluir"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>

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
            <div className="flex flex-col gap-3 pt-2">
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
              <Toggle
                checked={form.excluido_mensalidade}
                onChange={(v) => updateField("excluido_mensalidade", v)}
                label="Nao gerar mensalidade pra esse jogador"
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

      {/* ═══ BULK EDIT MODAL ═══════════════════════════════════ */}
      <Modal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} size="md">
        <ModalHeader>Editar em Massa ({selected.size} jogadores)</ModalHeader>
        <ModalBody className="space-y-4">
          <p className="text-sm text-txt-secondary font-body">
            Selecione o campo e o novo valor para aplicar a todos os jogadores selecionados.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">Campo</label>
            <select
              value={bulkField}
              onChange={(e) => {
                setBulkField(e.target.value);
                if (e.target.value === "tipo") setBulkValue("jogador");
                if (e.target.value === "ativo") setBulkValue("1");
                if (e.target.value === "excluido_envio") setBulkValue("0");
              }}
              className={cn(
                "h-10 rounded-lg px-3 text-sm font-body",
                "bg-surface-tertiary border border-border text-txt-primary",
                "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red"
              )}
            >
              <option value="tipo">Tipo (Jogador / Socio)</option>
              <option value="ativo">Status (Ativo / Inativo)</option>
              <option value="excluido_envio">Envio WhatsApp (Recebe / Nao Recebe)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-txt-secondary font-body">Novo valor</label>
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className={cn(
                "h-10 rounded-lg px-3 text-sm font-body",
                "bg-surface-tertiary border border-border text-txt-primary",
                "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red"
              )}
            >
              {bulkField === "tipo" && (
                <>
                  <option value="jogador">Jogador</option>
                  <option value="socio">Socio</option>
                </>
              )}
              {bulkField === "ativo" && (
                <>
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </>
              )}
              {bulkField === "excluido_envio" && (
                <>
                  <option value="0">Recebe mensagens</option>
                  <option value="1">Nao recebe mensagens</option>
                </>
              )}
            </select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setBulkModalOpen(false)}>
            Cancelar
          </Button>
          <Button loading={bulkSaving} onClick={handleBulkEdit}>
            Aplicar a {selected.size} jogador{selected.size !== 1 ? "es" : ""}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ─── Sugestoes do grupo Modal ──────────────────────── */}
      <Modal open={sugestoesOpen} onClose={() => setSugestoesOpen(false)} size="md">
        <ModalHeader>
          Numeros no grupo sem cadastro
        </ModalHeader>
        <ModalBody className="space-y-3 max-h-[70vh] overflow-y-auto">
          {sugestoesLoading ? (
            <p className="text-sm text-txt-secondary font-body">Carregando...</p>
          ) : !sugestoes || sugestoes.sem_cadastro.length === 0 ? (
            <p className="text-sm text-txt-secondary font-body">
              Todos os membros do grupo estao cadastrados.
            </p>
          ) : (
            <>
              <p className="text-xs text-txt-tertiary font-body">
                {sugestoes.total_no_grupo} no grupo - {sugestoes.total_cadastrados} cadastrados.
                Cadastre apenas quem voce quiser que receba mensagens.
              </p>
              {sugestoes.sem_cadastro.map((s) => (
                <div
                  key={s.telefone}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-surface-card"
                >
                  <Phone size={14} className="text-txt-tertiary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-txt-primary truncate">{s.telefone}</p>
                    {s.nome && (
                      <p className="text-xs text-txt-secondary font-body truncate">{s.nome}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<UserPlus size={14} />}
                    onClick={() => openCreate(s.telefone)}
                  >
                    Cadastrar
                  </Button>
                </div>
              ))}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setSugestoesOpen(false)}>
            Fechar
          </Button>
          <Button onClick={fetchSugestoes} loading={sugestoesLoading}>
            Atualizar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
