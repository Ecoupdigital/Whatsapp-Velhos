"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button, Card } from "@/components/ui";

type Participante = {
  id: number;
  nome: string;
  numero_inicio: number | null;
  numero_fim: number | null;
  qtd_venda: number;
  qtd_lucro: number;
  acerto: string;
  valor: number;
  valor_pago: number;
  receita_cartao: number;
  receita_lucro: number;
  observacoes: string | null;
};

type Patrocinio = {
  id: number;
  nome_jogador: string | null;
  nome_patrocinador: string;
  valor: number;
  pago: string;
  valor_vinculado: number;
};

type Lancamento = {
  id: number;
  data: string;
  valor: number;
  descricao: string | null;
  categoria: string;
  participante_id: number | null;
  patrocinio_id: number | null;
};

type Visao = {
  titulo: string;
  valor_cartao: number;
  valor_lucro: number;
  participantes: Participante[];
  patrocinios: Patrocinio[];
  lancamentos: Lancamento[];
  resumo: {
    vendidos: number;
    lucro_qtd: number;
    receita_cartao: number;
    receita_lucro: number;
    receita_total: number;
    caixa_cartao: number;
    caixa_patrocinio: number;
    patrocinios_marcados_pagos: number;
    patrocinios: number;
  };
};

const ACERTO = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "a_confirmar", label: "A confirmar" },
];

export default function BailePlanilhaPage() {
  const params = useParams();
  const router = useRouter();
  const eventoId = String(params.id);
  const [visao, setVisao] = useState<Visao | null>(null);
  const [destino, setDestino] = useState<Record<number, string>>({});

  const carregar = useCallback(async () => {
    const data = await api.get<Visao>(`/eventos/${eventoId}/baile`);
    setVisao(data);
  }, [eventoId]);

  useEffect(() => {
    carregar().catch(() => toast.error("Não consegui abrir a planilha do baile"));
  }, [carregar]);

  const salvar = async (p: Participante, campo: "qtd_venda" | "qtd_lucro" | "acerto", valor: number | string) => {
    try {
      const data = await api.put<Visao>(`/eventos/${eventoId}/baile/participantes/${p.id}`, {
        [campo]: valor,
      });
      setVisao(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const importar = async (arquivo?: File) => {
    try {
      if (arquivo) {
        const form = new FormData();
        form.append("file", arquivo);
        await api.upload(`/eventos/${eventoId}/baile/importar`, form);
      } else {
        await api.post(`/eventos/${eventoId}/baile/importar`, {});
      }
      toast.success("Planilha importada. Nenhum lançamento novo foi criado.");
      await carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar");
    }
  };

  const vincular = async (lancamentoId: number) => {
    const alvo = destino[lancamentoId];
    if (!alvo) {
      toast.error("Escolha o atleta ou o patrocínio");
      return;
    }
    const [tipo, id] = alvo.split(":");
    const body =
      tipo === "p"
        ? { transacao_id: lancamentoId, participante_id: Number(id) }
        : { transacao_id: lancamentoId, patrocinio_id: Number(id) };
    try {
      const data = await api.post<Visao>(`/eventos/${eventoId}/baile/vincular`, body);
      setVisao(data);
      toast.success("Lançamento vinculado. O caixa não foi alterado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular");
    }
  };

  const desvincular = async (lancamentoId: number) => {
    try {
      const data = await api.post<Visao>(`/eventos/${eventoId}/baile/desvincular`, {
        transacao_id: lancamentoId,
      });
      setVisao(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desvincular");
    }
  };

  if (!visao) {
    return <p className="text-txt-tertiary p-6">Carregando a planilha do baile...</p>;
  }

  const r = visao.resumo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" icon={<ArrowLeft />} onClick={() => router.push(`/eventos/${eventoId}`)}>
          Evento
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-txt-primary uppercase">{visao.titulo}</h1>
          <p className="text-sm text-txt-tertiary">
            Cartão {formatCurrency(visao.valor_cartao)} · Lucro {formatCurrency(visao.valor_lucro)}.
            O que já entrou no financeiro só é vinculado, não é lançado de novo.
          </p>
        </div>
        <label className="inline-flex">
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar(f);
            }}
          />
          <span className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-brand-red text-white text-sm cursor-pointer">
            <Upload size={14} /> Importar planilha
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">Vendidos</p>
          <p className="text-2xl font-bold text-txt-primary">{r.vendidos}</p>
          <p className="text-xs text-txt-tertiary">{formatCurrency(r.receita_cartao)} a R$ 180</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">Lucro</p>
          <p className="text-2xl font-bold text-txt-primary">{r.lucro_qtd}</p>
          <p className="text-xs text-txt-tertiary">{formatCurrency(r.receita_lucro)} a R$ 90</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">Devido</p>
          <p className="text-2xl font-bold text-txt-primary">{formatCurrency(r.receita_total)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-txt-tertiary uppercase">Já no caixa</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(r.caixa_cartao + r.caixa_patrocinio)}</p>
          <p className="text-xs text-txt-tertiary">só o que foi vinculado</p>
        </Card>
      </div>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-txt-tertiary border-b border-border-subtle">
              {["Atleta", "Números", "Vendidos", "Lucro", "Devido", "No caixa", "Planilha", "Obs"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visao.participantes.map((p) => (
              <tr key={p.id} className="border-b border-border-subtle">
                <td className="px-3 py-2 text-txt-primary">{p.nome}</td>
                <td className="px-3 py-2 font-mono text-txt-secondary">
                  {p.numero_inicio != null ? `${p.numero_inicio} a ${p.numero_fim}` : "sem número"}
                </td>
                <td className="px-3 py-2">
                  <input
                    key={`v-${p.id}-${p.qtd_venda}`}
                    defaultValue={p.qtd_venda}
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-16 h-8 px-2 rounded bg-surface-tertiary text-txt-primary"
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!Number.isNaN(n) && n !== p.qtd_venda) salvar(p, "qtd_venda", n);
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    key={`l-${p.id}-${p.qtd_lucro}`}
                    defaultValue={p.qtd_lucro}
                    type="number"
                    step="0.5"
                    min="0"
                    className="w-16 h-8 px-2 rounded bg-surface-tertiary text-txt-primary"
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!Number.isNaN(n) && n !== p.qtd_lucro) salvar(p, "qtd_lucro", n);
                    }}
                  />
                </td>
                <td className="px-3 py-2 font-mono">{formatCurrency(p.valor)}</td>
                <td className="px-3 py-2 font-mono text-emerald-400">{formatCurrency(p.valor_pago)}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.acerto}
                    className="h-8 rounded bg-surface-tertiary text-txt-primary text-xs"
                    onChange={(e) => salvar(p, "acerto", e.target.value)}
                  >
                    {ACERTO.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-txt-tertiary max-w-[240px] truncate">{p.observacoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card padding="md" className="overflow-x-auto">
          <h2 className="text-sm font-display uppercase text-txt-primary mb-3">
            Patrocínios ({r.patrocinios_marcados_pagos} pagos na planilha de {r.patrocinios})
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {visao.patrocinios.map((pat) => (
                <tr key={pat.id} className="border-b border-border-subtle">
                  <td className="py-1.5 text-txt-primary">{pat.nome_patrocinador}</td>
                  <td className="py-1.5 text-txt-tertiary">{pat.nome_jogador}</td>
                  <td className="py-1.5 font-mono">{formatCurrency(pat.valor)}</td>
                  <td className="py-1.5 text-xs">{pat.pago === "sim" ? "Pago na planilha" : "Em aberto"}</td>
                  <td className="py-1.5 font-mono text-emerald-400">
                    {pat.valor_vinculado > 0 ? formatCurrency(pat.valor_vinculado) : "sem lançamento"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card padding="md" className="overflow-x-auto">
          <h2 className="text-sm font-display uppercase text-txt-primary mb-3">Financeiro para vincular</h2>
          <p className="text-xs text-txt-tertiary mb-2">Vincular não cria dinheiro novo. Só aponta o lançamento que já existe.</p>
          <div className="space-y-2">
            {visao.lancamentos.map((t) => {
              const ligado = t.participante_id
                ? visao.participantes.find((p) => p.id === t.participante_id)?.nome
                : t.patrocinio_id
                  ? visao.patrocinios.find((p) => p.id === t.patrocinio_id)?.nome_patrocinador
                  : null;
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-2 text-xs border-b border-border-subtle pb-2">
                  <span className="font-mono text-txt-tertiary">{t.data}</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(t.valor)}</span>
                  <span className="text-txt-primary flex-1 min-w-[140px]">{t.descricao}</span>
                  {ligado ? (
                    <>
                      <span className="text-txt-secondary">{ligado}</span>
                      <button className="text-txt-tertiary hover:text-red-400" onClick={() => desvincular(t.id)}>soltar</button>
                    </>
                  ) : (
                    <>
                      <select
                        className="h-8 rounded bg-surface-tertiary text-txt-primary max-w-[180px]"
                        value={destino[t.id] || ""}
                        onChange={(e) => setDestino((d) => ({ ...d, [t.id]: e.target.value }))}
                      >
                        <option value="">vincular a...</option>
                        <optgroup label="Atletas">
                          {visao.participantes.map((p) => (
                            <option key={p.id} value={`p:${p.id}`}>{p.nome}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Patrocínios">
                          {visao.patrocinios.map((p) => (
                            <option key={p.id} value={`s:${p.id}`}>{p.nome_patrocinador}</option>
                          ))}
                        </optgroup>
                      </select>
                      <button className="text-brand-red" onClick={() => vincular(t.id)}>vincular</button>
                    </>
                  )}
                </div>
              );
            })}
            {visao.lancamentos.length === 0 && (
              <p className="text-xs text-txt-tertiary">Nenhum lançamento de baile no financeiro ainda.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
