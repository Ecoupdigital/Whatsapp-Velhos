"use client";

import { motion } from "framer-motion";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { PortalCaixa } from "@/types/portal";
import { FluxoChart } from "./FluxoChart";

interface CaixaBlocoProps {
  caixa: PortalCaixa;
}

export function CaixaBloco({ caixa }: CaixaBlocoProps) {
  const semAtrasos =
    caixa.atrasos.mensalidades === 0 && caixa.atrasos.jogadores === 0;

  return (
    <motion.section
      data-block="caixa"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-txt-primary">
        <Wallet className="h-5 w-5 text-brand-red" /> Caixa
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="font-body text-xs uppercase tracking-wide text-txt-secondary">
            Entrou
          </p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-emerald-400">
            {formatCurrency(caixa.total_entrou)}
          </p>
        </Card>
        <Card padding="md">
          <p className="font-body text-xs uppercase tracking-wide text-txt-secondary">
            Saiu
          </p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-brand-red">
            {formatCurrency(caixa.total_saiu)}
          </p>
        </Card>
      </div>

      <div data-slot="fluxo">
        <FluxoChart fluxo={caixa.fluxo_12m} />
      </div>

      <div className="flex flex-wrap gap-2">
        {semAtrasos ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-body text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sem atrasos no mes
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red-muted px-3 py-1 font-body text-xs font-medium text-brand-red">
              <AlertTriangle className="h-3.5 w-3.5" />
              {caixa.atrasos.mensalidades} mensalidades em atraso
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red-muted px-3 py-1 font-body text-xs font-medium text-brand-red">
              <AlertTriangle className="h-3.5 w-3.5" />
              {caixa.atrasos.jogadores} jogadores em atraso
            </span>
          </>
        )}
      </div>
    </motion.section>
  );
}
