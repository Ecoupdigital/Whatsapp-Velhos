"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Filter,
  Users,
  Bookmark,
  BookmarkPlus,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  PublicoFiltros,
  PublicoJogador,
  SegmentoOut,
  EventoOut,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  filtros: PublicoFiltros;
  onFiltrosChange: (f: PublicoFiltros) => void;
  selectedIds: Set<number>;
  onSelectedChange: (s: Set<number>) => void;
  /** Modo recorrente: publico e resolvido pelos filtros no disparo (sem selecao individual). */
  recorrente?: boolean;
}

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MENSALIDADE_OPTS = [
  { value: "", label: "Mensalidade: qualquer" },
  { value: "pendente", label: "Mensalidade: pendente" },
  { value: "atrasado", label: "Mensalidade: atrasado" },
  { value: "pago", label: "Mensalidade: pago" },
  { value: "isento", label: "Mensalidade: isento" },
];

const EVENTO_STATUS_OPTS = [
  { value: "", label: "Participacao: qualquer" },
  { value: "confirmado", label: "Participacao: confirmado" },
  { value: "pendente", label: "Participacao: pendente" },
  { value: "recusado", label: "Participacao: recusado" },
  { value: "talvez", label: "Participacao: talvez" },
];

const selectClass = cn(
  "h-10 rounded-lg px-3 text-sm font-body w-full",
  "bg-surface-tertiary border border-border text-txt-primary",
  "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
  "hover:border-border-strong transition-colors"
);

export function PublicoSelector({
  filtros,
  onFiltrosChange,
  selectedIds,
  onSelectedChange,
  recorrente = false,
}: Props) {
  const [publico, setPublico] = useState<PublicoJogador[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState<EventoOut[]>([]);
  const [segmentos, setSegmentos] = useState<SegmentoOut[]>([]);
  const [salvandoSeg, setSalvandoSeg] = useState(false);
  const [novoSegNome, setNovoSegNome] = useState("");
  const [showSalvarSeg, setShowSalvarSeg] = useState(false);

  const filtrosKey = JSON.stringify(filtros);

  /* preview do publico */
  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.post<PublicoJogador[]>(
        "/campanhas/preview-publico",
        { filtros }
      );
      setPublico(data);
      // auto-seleciona enviaveis que ainda nao foram desmarcados manualmente
      if (!recorrente) {
        onSelectedChange(
          new Set(data.filter((p) => p.enviavel).map((p) => p.jogador_id))
        );
      }
    } catch {
      toast.error("Erro ao carregar publico");
      setPublico([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey, recorrente]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  /* eventos + segmentos (uma vez) */
  useEffect(() => {
    api.get<EventoOut[]>("/eventos").then(setEventos).catch(() => {});
    loadSegmentos();
  }, []);

  function loadSegmentos() {
    api
      .get<SegmentoOut[]>("/campanhas/segmentos")
      .then(setSegmentos)
      .catch(() => {});
  }

  function patch(p: Partial<PublicoFiltros>) {
    onFiltrosChange({ ...filtros, ...p });
  }

  const enviaveis = useMemo(
    () => publico.filter((p) => p.enviavel),
    [publico]
  );
  const selecionadosCount = recorrente
    ? enviaveis.length
    : enviaveis.filter((p) => selectedIds.has(p.jogador_id)).length;

  function toggle(id: number) {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    onSelectedChange(s);
  }

  function toggleAll() {
    if (selectedIds.size >= enviaveis.length) {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(new Set(enviaveis.map((p) => p.jogador_id)));
    }
  }

  function aplicarSegmento(s: SegmentoOut) {
    if (s.filtros) {
      onFiltrosChange({
        ativo: true,
        tipo: null,
        posicao: null,
        mensalidade_status: null,
        mes_referencia: null,
        evento_id: null,
        evento_status: null,
        incluir_sem_telefone: false,
        ...s.filtros,
      });
      toast.success(`Segmento "${s.nome}" aplicado`);
    }
  }

  async function salvarSegmento() {
    if (!novoSegNome.trim()) {
      toast.error("Da um nome pro segmento");
      return;
    }
    setSalvandoSeg(true);
    try {
      await api.post("/campanhas/segmentos", {
        nome: novoSegNome.trim(),
        filtros,
      });
      toast.success("Segmento salvo");
      setNovoSegNome("");
      setShowSalvarSeg(false);
      loadSegmentos();
    } catch {
      toast.error("Erro ao salvar segmento");
    } finally {
      setSalvandoSeg(false);
    }
  }

  async function excluirSegmento(id: number) {
    try {
      await api.delete(`/campanhas/segmentos/${id}`);
      loadSegmentos();
    } catch {
      toast.error("Erro ao excluir segmento");
    }
  }

  return (
    <div className="space-y-4">
      {/* Segmentos salvos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-txt-tertiary font-body uppercase tracking-wider">
            <Bookmark className="h-3.5 w-3.5" /> Segmentos salvos
          </span>
          <button
            type="button"
            onClick={() => setShowSalvarSeg((v) => !v)}
            className="text-xs text-brand-red hover:text-brand-red-hover font-body flex items-center gap-1"
          >
            <BookmarkPlus className="h-3.5 w-3.5" /> Salvar atual
          </button>
        </div>
        {segmentos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {segmentos.map((s) => (
              <span
                key={s.id}
                className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-body bg-surface-tertiary border border-border-subtle text-txt-secondary"
              >
                <button
                  type="button"
                  onClick={() => aplicarSegmento(s)}
                  className="hover:text-txt-primary transition-colors"
                >
                  {s.nome}
                </button>
                <button
                  type="button"
                  onClick={() => excluirSegmento(s.id)}
                  className="text-txt-tertiary hover:text-red-400 transition-colors"
                  title="Excluir segmento"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-txt-tertiary font-body">
            Nenhum segmento salvo ainda.
          </p>
        )}
        {showSalvarSeg && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              placeholder="Nome do segmento (ex: Devedores do mes)"
              value={novoSegNome}
              onChange={(e) => setNovoSegNome(e.target.value)}
              containerClassName="flex-1"
            />
            <Button size="sm" onClick={salvarSegmento} loading={salvandoSeg}>
              Salvar
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <span className="flex items-center gap-1.5 text-xs text-txt-tertiary font-body uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5" /> Filtrar publico
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={filtros.ativo === false ? "0" : "1"}
            onChange={(e) => patch({ ativo: e.target.value === "1" })}
            className={selectClass}
          >
            <option value="1">Somente ativos</option>
            <option value="0">Somente inativos</option>
          </select>

          <select
            value={filtros.tipo ?? ""}
            onChange={(e) => patch({ tipo: e.target.value || null })}
            className={selectClass}
          >
            <option value="">Jogadores e socios</option>
            <option value="jogador">Somente jogadores</option>
            <option value="socio">Somente socios</option>
          </select>

          <Input
            placeholder="Posicao (ex: Goleiro)"
            value={filtros.posicao ?? ""}
            onChange={(e) => patch({ posicao: e.target.value || null })}
          />

          <select
            value={filtros.mensalidade_status ?? ""}
            onChange={(e) =>
              patch({
                mensalidade_status: e.target.value || null,
                mes_referencia: e.target.value ? filtros.mes_referencia || mesAtual() : null,
              })
            }
            className={selectClass}
          >
            {MENSALIDADE_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {filtros.mensalidade_status && (
            <Input
              type="month"
              value={filtros.mes_referencia ?? mesAtual()}
              onChange={(e) => patch({ mes_referencia: e.target.value })}
            />
          )}

          <select
            value={filtros.evento_id != null ? String(filtros.evento_id) : ""}
            onChange={(e) =>
              patch({
                evento_id: e.target.value ? Number(e.target.value) : null,
                evento_status: e.target.value ? filtros.evento_status : null,
              })
            }
            className={selectClass}
          >
            <option value="">Qualquer evento</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                Evento: {ev.titulo}
              </option>
            ))}
          </select>

          {filtros.evento_id != null && (
            <select
              value={filtros.evento_status ?? ""}
              onChange={(e) => patch({ evento_status: e.target.value || null })}
              className={selectClass}
            >
              {EVENTO_STATUS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lista de publico */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-txt-secondary font-body">
            {recorrente ? (
              <>{enviaveis.length} no publico atual</>
            ) : (
              <>
                {selecionadosCount} de {enviaveis.length} selecionados
              </>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchPreview}
              className="text-xs text-txt-tertiary hover:text-txt-primary font-body flex items-center gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Atualizar
            </button>
            {!recorrente && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-brand-red hover:text-brand-red-hover font-body"
              >
                {selectedIds.size >= enviaveis.length
                  ? "Desmarcar todos"
                  : "Marcar todos"}
              </button>
            )}
          </div>
        </div>

        {recorrente && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 font-body">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Campanha recorrente envia, a cada disparo, pra quem bater nos filtros
            naquele momento. A selecao individual nao se aplica.
          </div>
        )}

        <div className="max-h-64 overflow-y-auto rounded-lg bg-surface-tertiary border border-border divide-y divide-border-subtle">
          {loading && (
            <div className="px-3 py-6 text-center text-sm text-txt-tertiary font-body">
              Carregando...
            </div>
          )}
          {!loading && publico.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-txt-tertiary font-body flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              Nenhum jogador bate nesses filtros.
            </div>
          )}
          {!loading &&
            publico.map((p) => {
              const checked = recorrente
                ? p.enviavel
                : selectedIds.has(p.jogador_id);
              const disabled = !p.enviavel || recorrente;
              return (
                <label
                  key={p.jogador_id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 transition-colors",
                    disabled
                      ? "opacity-60 cursor-default"
                      : "cursor-pointer hover:bg-surface-secondary/50",
                    checked && !recorrente && "bg-brand-red/5"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => !disabled && toggle(p.jogador_id)}
                    className="h-4 w-4 rounded border-border bg-surface-tertiary text-brand-red focus:ring-brand-red/50 disabled:opacity-50"
                  />
                  <span className="text-sm text-txt-primary font-body truncate">
                    {p.apelido || p.nome}
                  </span>
                  {p.enviavel ? (
                    <span className="text-xs text-txt-tertiary font-mono ml-auto truncate">
                      {p.telefone}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-body ml-auto shrink-0">
                      {p.motivo}
                    </span>
                  )}
                </label>
              );
            })}
        </div>
      </div>
    </div>
  );
}
