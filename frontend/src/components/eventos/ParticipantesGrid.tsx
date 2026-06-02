"use client";

import { Fragment } from "react";
import { Ticket, DollarSign, ChevronDown, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui";
import { EditableCell } from "./EditableCell";
import type { ParticipanteOut, EventoOut } from "@/types";

interface ParticipantesGridProps {
  participantes: ParticipanteOut[];
  evento: EventoOut;
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
  onPay: (p: ParticipanteOut) => void;
  onRemove: (p: ParticipanteOut) => void;
  commitCartaoCampo: (p: ParticipanteOut, campo: "qtd_vendidos" | "qtd_devolvidos" | "qtd_pagou_custo", valor: number) => Promise<void>;
  commitItemCampo: (p: ParticipanteOut, tipo: string, valor: number) => Promise<void>;
  nomeParticipante: (p: ParticipanteOut) => string;
  statusDerivado: (p: ParticipanteOut) => "pago" | "parcial" | "pendente";
  renderExpanded?: (p: ParticipanteOut) => React.ReactNode;
}

export function ParticipantesGrid({
  participantes, evento, expandedId, onToggleExpand, onPay, onRemove,
  commitCartaoCampo, commitItemCampo, nomeParticipante, statusDerivado, renderExpanded,
}: ParticipantesGridProps) {
  const tipos = evento.tipos_item || [];
  const primary = tipos[0];                       // cru (editavel)
  const complemento = tipos.length >= 2 ? tipos[1] : undefined;  // assado (= vendidos - cru)

  const cruDe = (p: ParticipanteOut) =>
    p.itens.find((it) => it.tipo === primary)?.qtd_vendido ?? 0;
  const assadoDe = (p: ParticipanteOut) =>
    Math.max(0, (p.qtd_vendidos || 0) - cruDe(p));

  const statusColor = (s: "pago" | "parcial" | "pendente") =>
    s === "pago" ? "text-emerald-400 bg-emerald-500/15"
    : s === "parcial" ? "text-blue-400 bg-blue-500/15"
    : "text-yellow-400 bg-yellow-500/15";

  const colCount = 5 + (primary ? 1 : 0) + (complemento ? 1 : 0) + 3;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-txt-tertiary font-body text-[11px] uppercase tracking-wider border-b border-border-subtle">
            <th className="py-2 pr-3 text-left font-medium">Participante</th>
            <th className="py-2 px-2 text-center font-medium">Receb.</th>
            <th className="py-2 px-2 text-center font-medium">Vend.</th>
            <th className="py-2 px-2 text-center font-medium">Devol.</th>
            <th className="py-2 px-2 text-center font-medium">Custo</th>
            {primary && (
              <th className="py-2 px-2 text-center font-medium capitalize text-emerald-400/80">{primary}</th>
            )}
            {complemento && (
              <th className="py-2 px-2 text-center font-medium capitalize text-orange-400/80">{complemento} (auto)</th>
            )}
            <th className="py-2 px-2 text-right font-medium">Valor</th>
            <th className="py-2 px-2 text-center font-medium">Status</th>
            <th className="py-2 pl-2 text-right font-medium">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => {
            const status = statusDerivado(p);
            const isExpanded = expandedId === p.id;
            return (
              <Fragment key={p.id}>
                <tr className="border-b border-border-subtle hover:bg-surface-card-hover/40">
                  <td className="py-2 pr-3 text-left">
                    <button onClick={() => onToggleExpand(p.id)}
                      className="inline-flex items-center gap-1.5 text-txt-primary font-body hover:text-brand-red">
                      <ChevronDown size={14} className={cn("transition-transform text-txt-tertiary", isExpanded && "rotate-180")} />
                      {nomeParticipante(p)}
                    </button>
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-txt-secondary tabular-nums">
                    <span className="inline-flex items-center gap-1"><Ticket size={11} className="text-blue-400" />{p.qtd_cartoes_recebidos}</span>
                  </td>
                  <td className="py-2 px-2 text-center"><EditableCell value={p.qtd_vendidos} onCommit={(v) => commitCartaoCampo(p, "qtd_vendidos", v)} /></td>
                  <td className="py-2 px-2 text-center"><EditableCell value={p.qtd_devolvidos} onCommit={(v) => commitCartaoCampo(p, "qtd_devolvidos", v)} /></td>
                  <td className="py-2 px-2 text-center"><EditableCell value={p.qtd_pagou_custo} onCommit={(v) => commitCartaoCampo(p, "qtd_pagou_custo", v)} /></td>
                  {primary && (
                    <td className="py-2 px-2 text-center"><EditableCell value={cruDe(p)} onCommit={(v) => commitItemCampo(p, primary, v)} /></td>
                  )}
                  {complemento && (
                    <td className="py-2 px-2 text-center font-mono text-orange-400/90 tabular-nums" title="Calculado: vendidos - cru">{assadoDe(p)}</td>
                  )}
                  <td className="py-2 px-2 text-right font-mono text-txt-primary tabular-nums">{formatCurrency(p.valor_pago || 0)}/{formatCurrency(p.valor || 0)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium uppercase", statusColor(status))}>{status}</span>
                  </td>
                  <td className="py-2 pl-2 text-right whitespace-nowrap">
                    <Button size="sm" icon={<DollarSign size={13} />} onClick={() => onPay(p)} disabled={status === "pago"}>Pagar</Button>
                    <button onClick={() => onRemove(p)} className="ml-1 h-8 w-8 rounded-lg inline-flex items-center justify-center text-txt-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors align-middle" title="Remover do evento"><X size={14} /></button>
                  </td>
                </tr>
                {isExpanded && renderExpanded && (
                  <tr className="bg-surface-secondary/40">
                    <td colSpan={colCount} className="px-3 py-2 border-b border-border-subtle">{renderExpanded(p)}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
