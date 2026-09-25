"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button, Card, Input } from "@/components/ui";
import type { EventoOut } from "@/types";

type Patrocinio = {
  id: number;
  nome_jogador: string | null;
  nome_patrocinador: string;
  valor: number;
  logo_enviado: string;
  pago: string;
  data_pagamento: string | null;
  contato: string | null;
  observacoes: string | null;
  valor_vinculado: number;
};

type Visao = {
  evento_id: number;
  titulo: string;
  patrocinios: Patrocinio[];
  resumo: {
    patrocinios: number;
    patrocinios_marcados_pagos: number;
    patrocinios_valor_marcado: number;
    caixa_patrocinio: number;
  };
};

const META = 50;
const LOGOS = [
  { value: "sim", label: "Logo enviado" },
  { value: "pendente", label: "Pendente" },
  { value: "nao", label: "Sem logo" },
];
const PAGOS = [
  { value: "sim", label: "Pago" },
  { value: "nao", label: "Em aberto" },
  { value: "a_confirmar", label: "A confirmar" },
];

export default function PatrociniosPage() {
  const [visao, setVisao] = useState<Visao | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "pagos" | "abertos" | "sem_logo">("todos");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ jogador: "", patrocinador: "", contato: "" });

  const carregar = useCallback(async () => {
    const eventos = await api.get<EventoOut[]>("/eventos?tipo=baile");
    const baile = eventos.find((e) => e.status === "em_andamento") || eventos[0];
    if (!baile) {
      setVisao(null);
      return;
    }
    const data = await api.get<Visao>(`/eventos/${baile.id}/baile`);
    setVisao(data);
  }, []);

  useEffect(() => {
    carregar().catch(() => toast.error("Não consegui abrir os patrocínios"));
  }, [carregar]);

  const salvar = async (pat: Patrocinio, campo: "logo_enviado" | "pago", valor: string) => {
    if (!visao) return;
    try {
      const data = await api.put<Visao>(`/eventos/${visao.evento_id}/baile/patrocinios/${pat.id}`, {
        [campo]: valor,
      });
      setVisao(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const criar = async () => {
    if (!visao) return;
    if (!form.patrocinador.trim()) {
      toast.error("Informe o nome do patrocinador");
      return;
    }
    try {
      const data = await api.post<Visao>(`/eventos/${visao.evento_id}/baile/patrocinios`, {
        nome_jogador: form.jogador.trim() || null,
        nome_patrocinador: form.patrocinador.trim(),
        contato: form.contato.trim() || null,
        valor: 60,
        logo_enviado: "nao",
        pago: "nao",
      });
      setVisao(data);
      setForm({ jogador: "", patrocinador: "", contato: "" });
      toast.success("Patrocínio adicionado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    }
  };

  const lista = useMemo(() => {
    if (!visao) return [];
    const q = busca.trim().toLowerCase();
    return visao.patrocinios.filter((p) => {
      if (filtro === "pagos" && p.pago !== "sim") return false;
      if (filtro === "abertos" && p.pago === "sim") return false;
      if (filtro === "sem_logo" && p.logo_enviado === "sim") return false;
      if (!q) return true;
      return `${p.nome_jogador || ""} ${p.nome_patrocinador} ${p.contato || ""}`.toLowerCase().includes(q);
    });
  }, [visao, filtro, busca]);

  if (!visao) {
    return <p className="p-6 text-txt-tertiary">Carregando patrocínios...</p>;
  }

  const r = visao.resumo;
  const logosOk = visao.patrocinios.filter((p) => p.logo_enviado === "sim").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-txt-primary uppercase">Patrocínios</h1>
        <p className="text-sm text-txt-tertiary">{visao.titulo}. Cada cota é R$ 60. O caixa só muda quando um lançamento é vinculado na planilha do baile.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">Cotas</p>
          <p className="text-2xl font-bold text-txt-primary">{r.patrocinios} <span className="text-base text-txt-tertiary">/ {META}</span></p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">Pagos</p>
          <p className="text-2xl font-bold text-txt-primary">{r.patrocinios_marcados_pagos}</p>
          <p className="text-xs text-txt-tertiary">{formatCurrency(r.patrocinios_valor_marcado)} na planilha</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">No caixa</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(r.caixa_patrocinio)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">Logos enviados</p>
          <p className="text-2xl font-bold text-txt-primary">{logosOk}</p>
          <p className="text-xs text-txt-tertiary">{visao.patrocinios.length - logosOk} faltando</p>
        </Card>
      </div>

      <Card padding="md" className="flex flex-wrap gap-2 items-end">
        <Input label="Quem trouxe" value={form.jogador} onChange={(e) => setForm((f) => ({ ...f, jogador: e.target.value }))} containerClassName="w-44" />
        <Input label="Patrocinador" value={form.patrocinador} onChange={(e) => setForm((f) => ({ ...f, patrocinador: e.target.value }))} containerClassName="w-56" />
        <Input label="Contato" value={form.contato} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} containerClassName="w-44" />
        <Button size="sm" onClick={criar}>Adicionar</Button>
      </Card>

      <div className="flex flex-wrap gap-2 items-center">
        {(["todos", "pagos", "abertos", "sem_logo"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`h-8 px-3 rounded-lg text-xs ${filtro === f ? "bg-brand-red text-white" : "bg-surface-card text-txt-secondary border border-border-subtle"}`}
          >
            {f === "todos" ? "Todos" : f === "pagos" ? "Pagos" : f === "abertos" ? "Em aberto" : "Sem logo"}
          </button>
        ))}
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar jogador ou patrocinador"
          className="h-8 px-3 rounded-lg bg-surface-tertiary text-sm text-txt-primary ml-auto"
        />
      </div>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-txt-tertiary border-b border-border-subtle">
              {["Quem trouxe", "Patrocinador", "Valor", "Logo", "Pago", "No caixa", "Contato"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-border-subtle">
                <td className="px-3 py-2 text-txt-secondary">{p.nome_jogador || "sem jogador"}</td>
                <td className="px-3 py-2 text-txt-primary">{p.nome_patrocinador}</td>
                <td className="px-3 py-2 font-mono">{formatCurrency(p.valor)}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.logo_enviado}
                    className="h-8 rounded bg-surface-tertiary text-txt-primary text-xs"
                    onChange={(e) => salvar(p, "logo_enviado", e.target.value)}
                  >
                    {LOGOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={p.pago === "negociacao" ? "a_confirmar" : p.pago}
                    className="h-8 rounded bg-surface-tertiary text-txt-primary text-xs"
                    onChange={(e) => salvar(p, "pago", e.target.value)}
                  >
                    {PAGOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 font-mono text-emerald-400">
                  {p.valor_vinculado > 0 ? formatCurrency(p.valor_vinculado) : "sem lançamento"}
                </td>
                <td className="px-3 py-2 text-xs text-txt-tertiary">{p.contato}</td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-txt-tertiary">Nenhum patrocínio nesse filtro.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
