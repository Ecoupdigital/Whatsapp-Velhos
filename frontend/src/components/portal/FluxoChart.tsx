"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { PortalFluxoMes } from "@/types/portal";

interface FluxoChartProps {
  fluxo: PortalFluxoMes[];
}

const MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function labelMes(mes: string): string {
  // "2026-06" -> "Jun"
  const parts = mes.split("-");
  const m = parseInt(parts[1] ?? "0", 10);
  return MESES_CURTOS[m - 1] ?? mes;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 shadow-card">
      <p className="mb-1 font-body text-xs font-medium text-txt-secondary">{label}</p>
      {payload.map((p) => (
        <p
          key={p.name}
          className="font-body text-xs tabular-nums"
          style={{ color: p.color }}
        >
          {p.name}: {formatCurrency(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export function FluxoChart({ fluxo }: FluxoChartProps) {
  if (!fluxo || fluxo.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border-subtle bg-surface-card">
        <p className="font-body text-sm text-txt-tertiary">
          Sem movimentacao nos ultimos meses
        </p>
      </div>
    );
  }

  const chartData = fluxo.map((f) => ({
    mes: labelMes(f.mes),
    Entradas: f.entradas,
    Saidas: f.saidas,
  }));

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-3 sm:p-4">
      <p className="mb-3 font-body text-xs uppercase tracking-wide text-txt-secondary">
        Fluxo dos ultimos 12 meses
      </p>
      <div className="h-[200px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F27" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#8E8E9A", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8E8E9A", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Saidas" fill="#E31E24" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
