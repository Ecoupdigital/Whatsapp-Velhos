"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  CreditCard,
  Users,
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import type { DashboardData } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function greetingDate(): string {
  const days = [
    "Domingo",
    "Segunda",
    "Terca",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sabado",
  ];
  const months = [
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`;
}

const CARD_CLIP =
  "polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 0 100%)";

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function StatCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-pulse rounded-xl bg-surface-card p-6"
      style={{
        clipPath: CARD_CLIP,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="mb-4 h-4 w-24 rounded bg-surface-tertiary" />
      <div className="mb-2 h-8 w-32 rounded bg-surface-tertiary" />
      <div className="h-3 w-20 rounded bg-surface-tertiary" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-surface-card p-6">
      <div className="mb-6 h-5 w-40 rounded bg-surface-tertiary" />
      <div className="flex h-64 items-end gap-3 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-surface-tertiary"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-xl bg-surface-card p-6">
      <div className="mb-6 h-5 w-36 rounded bg-surface-tertiary" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-surface-tertiary" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-surface-tertiary" />
              <div className="h-3 w-1/2 rounded bg-surface-tertiary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3 shadow-card">
      <p className="mb-2 text-xs font-medium text-txt-secondary">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm font-semibold"
          style={{ color: entry.color }}
        >
          {entry.name}: {formatCurrency(entry.value as number)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pago: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    pendente: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    atrasado: "bg-red-500/15 text-red-400 border-red-500/30",
    isento: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  const label: Record<string, string> = {
    pago: "Pago",
    pendente: "Pendente",
    atrasado: "Atrasado",
    isento: "Isento",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        map[status] ?? "bg-surface-tertiary text-txt-secondary border-border-subtle"
      )}
    >
      {label[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Variation percentage (mock fallback: 0)
  const variacao = data
    ? data.fluxo_mensal.length >= 2
      ? (() => {
          const curr =
            data.fluxo_mensal[data.fluxo_mensal.length - 1].entradas -
            data.fluxo_mensal[data.fluxo_mensal.length - 1].saidas;
          const prev =
            data.fluxo_mensal[data.fluxo_mensal.length - 2].entradas -
            data.fluxo_mensal[data.fluxo_mensal.length - 2].saidas;
          return prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
        })()
      : 0
    : 0;

  // Chart data with short month labels
  const chartData = (data?.fluxo_mensal ?? []).map((f) => ({
    mes: formatMonth(f.mes).split(" ")[0]?.slice(0, 3) ?? f.mes,
    Entradas: f.entradas,
    Saidas: f.saidas,
  }));

  // ---- Error state ----
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-red-500/30 bg-surface-card px-8 py-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="text-lg font-semibold text-txt-primary">
            Erro ao carregar dashboard
          </p>
          <p className="mt-1 text-sm text-txt-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-8 px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
      {/* ------------------------------------------------------------------ */}
      {/* Greeting                                                           */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="animate-fade-in"
        style={{ animationDelay: "0ms" }}
      >
        <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-txt-primary">
          Fala, Jonathan!
        </h1>
        <p className="mt-1 text-sm text-txt-secondary">{greetingDate()}</p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Stats Cards                                                        */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 80, 160, 240].map((d) => (
            <StatCardSkeleton key={d} delay={d} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {/* Saldo do Time */}
          <div
            className="animate-fade-in group relative overflow-hidden rounded-xl border-t-[3px] border-t-emerald-500 bg-surface-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand"
            style={{ clipPath: CARD_CLIP, animationDelay: "0ms" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-tertiary">
                Saldo do Time
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p
              className={cn(
                "font-mono text-2xl font-bold tracking-tight",
                data.saldo_total >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {formatCurrency(data.saldo_total)}
            </p>
            {variacao !== 0 && (
              <div
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs font-medium",
                  variacao >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {variacao >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {variacao >= 0 ? "+" : ""}
                {variacao.toFixed(1)}% vs mes anterior
              </div>
            )}
          </div>

          {/* Mensalidades Pendentes */}
          <div
            className="animate-fade-in group relative overflow-hidden rounded-xl border-t-[3px] border-t-yellow-500 bg-surface-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand"
            style={{ clipPath: CARD_CLIP, animationDelay: "80ms" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-tertiary">
                Mensalidades Pendentes
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/15">
                <CreditCard className="h-4 w-4 text-yellow-400" />
              </div>
            </div>
            <p className="font-mono text-2xl font-bold tracking-tight text-yellow-400">
              {data.mensalidades_pendentes}{" "}
              <span className="text-base font-normal text-txt-tertiary">
                de {data.mensalidades_total}
              </span>
            </p>
            <p className="mt-2 text-xs text-txt-tertiary">
              {data.mensalidades_total - data.mensalidades_pendentes} ja pagaram
            </p>
          </div>

          {/* Jogadores Ativos */}
          <div
            className="animate-fade-in group relative overflow-hidden rounded-xl border-t-[3px] border-t-blue-500 bg-surface-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand"
            style={{ clipPath: CARD_CLIP, animationDelay: "160ms" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-tertiary">
                Jogadores Ativos
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <p className="font-mono text-2xl font-bold tracking-tight text-blue-400">
              {data.jogadores_ativos}
            </p>
            <p className="mt-2 text-xs text-txt-tertiary">
              {data.jogadores_inativos} inativos
            </p>
          </div>

          {/* Proximo Evento */}
          <div
            className="animate-fade-in group relative overflow-hidden rounded-xl border-t-[3px] border-t-emerald-500 bg-surface-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand"
            style={{ clipPath: CARD_CLIP, animationDelay: "240ms" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-tertiary">
                Proximo Evento
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
                <Calendar className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            {data.proximo_evento ? (
              <>
                <p className="truncate text-lg font-bold text-txt-primary">
                  {data.proximo_evento.titulo}
                </p>
                <p className="mt-2 text-xs text-txt-tertiary">
                  {data.proximo_evento.data_inicio
                    ? formatDate(data.proximo_evento.data_inicio)
                    : "Data a definir"}
                </p>
              </>
            ) : (
              <p className="text-sm text-txt-tertiary">
                Nenhum evento agendado
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Chart + Upcoming Games                                             */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-4">
            <ListSkeleton rows={4} />
          </div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Cash Flow Chart */}
          <div
            className="animate-slide-up rounded-xl bg-surface-card p-6 lg:col-span-8"
            style={{ animationDelay: "300ms" }}
          >
            <h2 className="mb-6 font-display text-lg font-semibold text-txt-primary">
              Fluxo de Caixa Mensal
            </h2>
            {chartData.length > 0 ? (
              <div className="h-[200px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-subtle, #2A2A36)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "#8A8A9A", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#8A8A9A", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar
                    dataKey="Entradas"
                    name="Entradas"
                    fill="#E31E24"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="Saidas"
                    name="Saidas"
                    fill="#3A3A48"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-txt-tertiary">
                  Sem dados de fluxo mensal
                </p>
              </div>
            )}
          </div>

          {/* Upcoming Games */}
          <div
            className="animate-slide-up rounded-xl bg-surface-card p-6 lg:col-span-4"
            style={{ animationDelay: "380ms" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-txt-primary">
                Proximos Jogos
              </h2>
              <Link
                href="/jogos"
                className="flex items-center gap-1 text-xs font-medium text-brand-red transition-colors hover:text-brand-red/80"
              >
                Ver todos
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {data.proximos_jogos.length > 0 ? (
              <div className="space-y-4">
                {data.proximos_jogos.map((jogo, idx) => (
                  <div
                    key={jogo.id}
                    className="animate-fade-in rounded-lg border border-border-subtle bg-surface-secondary p-4 transition-colors hover:border-border"
                    style={{ animationDelay: `${400 + idx * 60}ms` }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-txt-tertiary" />
                      <span className="text-xs text-txt-tertiary">
                        {formatDate(jogo.data)}
                        {jogo.horario ? ` - ${jogo.horario}` : ""}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-txt-primary">
                      vs {jogo.adversario}
                    </p>
                    {jogo.local && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-txt-tertiary" />
                        <span className="truncate text-xs text-txt-tertiary">
                          {jogo.local}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-txt-tertiary">
                  Nenhum jogo agendado
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Recent Payments + Alerts                                           */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <ListSkeleton rows={5} />
          </div>
          <div className="lg:col-span-6">
            <ListSkeleton rows={3} />
          </div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Recent Payments */}
          <div
            className="animate-slide-up rounded-xl bg-surface-card p-6 lg:col-span-6"
            style={{ animationDelay: "460ms" }}
          >
            <h2 className="mb-5 font-display text-lg font-semibold text-txt-primary">
              Ultimos Pagamentos
            </h2>
            {data.ultimos_pagamentos.length > 0 ? (
              <div className="space-y-3">
                {data.ultimos_pagamentos.slice(0, 5).map((pag, idx) => (
                  <div
                    key={pag.id}
                    className="animate-fade-in flex items-center gap-3 sm:gap-4 rounded-lg border border-border-subtle bg-surface-secondary px-3 sm:px-4 py-3 transition-colors hover:border-border"
                    style={{ animationDelay: `${480 + idx * 50}ms` }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary">
                      <CreditCard className="h-4 w-4 text-txt-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-txt-primary">
                        {pag.jogador?.apelido || pag.jogador?.nome || `Jogador #${pag.jogador_id}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-txt-tertiary">
                        <span>{formatMonth(pag.mes_referencia)}</span>
                        {pag.data_pagamento && (
                          <>
                            <span className="text-border">|</span>
                            <Clock className="inline h-3 w-3" />
                            <span>{formatDate(pag.data_pagamento)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-sm font-semibold text-txt-primary">
                        {formatCurrency(pag.valor_pago || pag.valor)}
                      </span>
                      {statusBadge(pag.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-txt-tertiary">
                  Nenhum pagamento recente
                </p>
              </div>
            )}
          </div>

          {/* Alerts Panel */}
          <div
            className="animate-slide-up rounded-xl bg-surface-card p-6 lg:col-span-6"
            style={{ animationDelay: "540ms" }}
          >
            <h2 className="mb-5 font-display text-lg font-semibold text-txt-primary">
              Alertas
            </h2>
            {data.alertas.length > 0 ? (
              <div className="space-y-3">
                {data.alertas.map((alerta, idx) => {
                  const isUrgent =
                    alerta.toLowerCase().includes("atrasad") ||
                    alerta.toLowerCase().includes("urgent") ||
                    alerta.toLowerCase().includes("venc");
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "animate-fade-in flex items-start gap-3 rounded-lg border p-4",
                        isUrgent
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-yellow-500/30 bg-yellow-500/5"
                      )}
                      style={{ animationDelay: `${560 + idx * 50}ms` }}
                    >
                      <AlertTriangle
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          isUrgent ? "text-red-400" : "text-yellow-400"
                        )}
                      />
                      <p
                        className={cn(
                          "text-sm",
                          isUrgent ? "text-red-300" : "text-yellow-300"
                        )}
                      >
                        {alerta}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-border-subtle bg-surface-secondary">
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-txt-secondary">
                    Tudo certo por aqui!
                  </p>
                  <p className="mt-0.5 text-xs text-txt-tertiary">
                    Nenhum alerta no momento
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
