"use client";

import { motion } from "framer-motion";
import { PartyPopper, CalendarRange } from "lucide-react";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PortalEvento, PortalCustoOrigem } from "@/types/portal";

interface EventosBlocoProps {
  eventos: PortalEvento[];
}

const ROTULO_CUSTO: Record<PortalCustoOrigem, string> = {
  real: "Custo",
  estimado: "Custo previsto",
  sem_custo: "A confirmar",
};

function corLiquido(liquido: number): string {
  if (liquido > 0) return "text-emerald-400";
  if (liquido < 0) return "text-brand-red";
  return "text-txt-secondary";
}

export function EventosBloco({ eventos }: EventosBlocoProps) {
  return (
    <motion.section
      data-block="eventos"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-txt-primary">
        <PartyPopper className="h-5 w-5 text-brand-red" /> Eventos
      </h2>

      {eventos.length === 0 ? (
        <EmptyState
          icon={<CalendarRange />}
          title="Nenhum evento ainda"
          description="Os resultados dos eventos aparecem aqui."
        />
      ) : (
        <div className="space-y-3">
          {eventos.map((ev, i) => (
            <Card key={`${ev.titulo}-${i}`} padding="md">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-txt-primary">
                    {ev.titulo}
                  </p>
                  <p className="font-body text-xs text-txt-tertiary">
                    {ev.data ? formatDate(ev.data) : "sem data"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-surface-tertiary px-2 py-0.5 font-body text-[11px] uppercase tracking-wide text-txt-secondary">
                    {ev.tipo}
                  </span>
                  {ev.status === "planejado" && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-body text-[11px] uppercase tracking-wide text-amber-400">
                      em breve
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-body text-[11px] uppercase tracking-wide text-txt-tertiary">
                    Arrecadou
                  </p>
                  <p className="font-display text-sm font-semibold tabular-nums text-txt-primary">
                    {formatCurrency(ev.arrecadado)}
                  </p>
                </div>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-wide text-txt-tertiary">
                    {ROTULO_CUSTO[ev.custo_origem]}
                  </p>
                  <p className="font-display text-sm font-semibold tabular-nums text-txt-secondary">
                    {formatCurrency(ev.custo)}
                  </p>
                </div>
                <div>
                  <p className="font-body text-[11px] uppercase tracking-wide text-txt-tertiary">
                    Sobrou
                  </p>
                  <p
                    className={
                      "font-display text-sm font-semibold tabular-nums " +
                      corLiquido(ev.liquido)
                    }
                  >
                    {formatCurrency(ev.liquido)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.section>
  );
}
