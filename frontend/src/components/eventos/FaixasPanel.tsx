"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import type { ParticipanteOut, FaixaOut } from "@/types";

interface FaixasPanelProps {
  eventoId: string;
  participante: ParticipanteOut;
  /** Chamado apos qualquer mutacao para o pai sincronizar o participante. */
  onMutated: (atualizado?: ParticipanteOut) => void;
}

export function FaixasPanel({ eventoId, participante, onMutated }: FaixasPanelProps) {
  const base = `/eventos/${eventoId}/participantes/${participante.id}/faixas`;
  const [addNum, setAddNum] = useState({ inicio: "", fim: "" });
  const [addLote, setAddLote] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ inicio: "", fim: "", quantidade: "" });
  const [busy, setBusy] = useState(false);

  const after = (resp: ParticipanteOut | unknown) => {
    onMutated(resp && typeof resp === "object" && "id" in (resp as object) ? (resp as ParticipanteOut) : undefined);
  };

  const handleAddNumerada = async () => {
    const ini = parseInt(addNum.inicio, 10);
    const fim = parseInt(addNum.fim, 10);
    if (isNaN(ini) || isNaN(fim) || fim < ini) {
      toast.error("Informe inicio e fim validos (fim >= inicio)");
      return;
    }
    try {
      setBusy(true);
      const resp = await api.post<ParticipanteOut>(base, { sem_numero: false, numero_inicio: ini, numero_fim: fim });
      toast.success("Faixa adicionada");
      setAddNum({ inicio: "", fim: "" });
      after(resp);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar faixa");
    } finally { setBusy(false); }
  };

  const handleAddLote = async () => {
    const qtd = parseInt(addLote, 10);
    if (isNaN(qtd) || qtd < 1) {
      toast.error("Informe a quantidade (>= 1)");
      return;
    }
    try {
      setBusy(true);
      const resp = await api.post<ParticipanteOut>(base, { sem_numero: true, quantidade: qtd });
      toast.success("Lote adicionado");
      setAddLote("");
      after(resp);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar lote");
    } finally { setBusy(false); }
  };

  const startEdit = (f: FaixaOut) => {
    setEditId(f.id);
    setEditForm({
      inicio: f.numero_inicio != null ? String(f.numero_inicio) : "",
      fim: f.numero_fim != null ? String(f.numero_fim) : "",
      quantidade: String(f.quantidade),
    });
  };

  const saveEdit = async (f: FaixaOut) => {
    try {
      setBusy(true);
      const body = f.sem_numero
        ? { sem_numero: true, quantidade: parseInt(editForm.quantidade, 10) || 0 }
        : { sem_numero: false, numero_inicio: parseInt(editForm.inicio, 10), numero_fim: parseInt(editForm.fim, 10) };
      const resp = await api.put<ParticipanteOut>(`${base}/${f.id}`, body);
      toast.success("Faixa atualizada");
      setEditId(null);
      after(resp);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao editar faixa");
    } finally { setBusy(false); }
  };

  const remove = async (f: FaixaOut) => {
    if (!confirm("Remover esta faixa?")) return;
    try {
      setBusy(true);
      const resp = await api.delete<ParticipanteOut>(`${base}/${f.id}`);
      toast.success("Faixa removida");
      after(resp);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover faixa");
    } finally { setBusy(false); }
  };

  const label = (f: FaixaOut) =>
    f.sem_numero
      ? `Sem numero (${f.quantidade} cartoes)`
      : `${f.numero_inicio} - ${f.numero_fim} (${f.quantidade} cartoes)`;

  return (
    <div className="space-y-2">
      <p className="text-xs text-txt-tertiary uppercase tracking-wider font-body">Faixas de cartao</p>

      {participante.faixas.length === 0 ? (
        <p className="text-xs text-txt-tertiary font-body">Nenhuma faixa cadastrada.</p>
      ) : (
        <ul className="space-y-1">
          {participante.faixas.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs">
              {editId === f.id ? (
                <>
                  {f.sem_numero ? (
                    <Input label="" type="number" min={1} value={editForm.quantidade}
                      onChange={(e) => setEditForm((p) => ({ ...p, quantidade: e.target.value }))}
                      containerClassName="w-24" />
                  ) : (
                    <>
                      <Input label="" type="number" value={editForm.inicio}
                        onChange={(e) => setEditForm((p) => ({ ...p, inicio: e.target.value }))}
                        containerClassName="w-20" placeholder="ini" />
                      <Input label="" type="number" value={editForm.fim}
                        onChange={(e) => setEditForm((p) => ({ ...p, fim: e.target.value }))}
                        containerClassName="w-20" placeholder="fim" />
                    </>
                  )}
                  <Button size="sm" icon={<Check size={13} />} loading={busy} onClick={() => saveEdit(f)}>Salvar</Button>
                  <button onClick={() => setEditId(null)} className="text-txt-tertiary hover:text-txt-primary"><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="font-mono text-txt-secondary">{label(f)}</span>
                  <div className="flex-1" />
                  <button onClick={() => startEdit(f)} className="text-txt-tertiary hover:text-brand-red" title="Editar"><Pencil size={13} /></button>
                  <button onClick={() => remove(f)} className="text-txt-tertiary hover:text-red-400" title="Remover"><Trash2 size={13} /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 pt-1">
        <Input label="Inicio" type="number" containerClassName="w-24" value={addNum.inicio}
          onChange={(e) => setAddNum((p) => ({ ...p, inicio: e.target.value }))} />
        <Input label="Fim" type="number" containerClassName="w-24" value={addNum.fim}
          onChange={(e) => setAddNum((p) => ({ ...p, fim: e.target.value }))} />
        <Button size="sm" icon={<Plus size={13} />} loading={busy} onClick={handleAddNumerada}>Faixa numerada</Button>
        <div className="w-px h-8 bg-border-subtle mx-1" />
        <Input label="Qtd (sem numero)" type="number" containerClassName="w-32" value={addLote}
          onChange={(e) => setAddLote(e.target.value)} />
        <Button size="sm" variant="secondary" icon={<Plus size={13} />} loading={busy} onClick={handleAddLote}>Lote sem numero</Button>
      </div>
    </div>
  );
}
