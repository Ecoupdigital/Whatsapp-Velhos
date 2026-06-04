"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { formatAtualizadoEm } from "@/lib/portal";
import type { PortalMeta, PortalCaixa } from "@/types/portal";

interface HeroCaixaProps {
  meta: PortalMeta;
  caixa: PortalCaixa;
}

export function HeroCaixa({ meta, caixa }: HeroCaixaProps) {
  const saldoNegativo = caixa.saldo_atual < 0;
  return (
    <motion.section
      data-block="hero"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-3 py-8 text-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.svg"
        alt="Escudo Velhos Parceiros F.C."
        className="h-16 w-16 rounded-2xl shadow-brand"
        width={64}
        height={64}
      />
      <h1 className="font-display text-xl font-bold tracking-tight text-txt-primary">
        Velhos Parceiros F.C.
      </h1>
      <p className="font-body text-xs uppercase tracking-[0.2em] text-txt-secondary">
        Prestacao de Contas
      </p>

      <div className="mt-4 flex flex-col items-center gap-1">
        <span className="font-body text-xs uppercase tracking-wide text-txt-secondary">
          Saldo em caixa
        </span>
        <span
          className={
            "font-display text-4xl font-bold tabular-nums sm:text-5xl " +
            (saldoNegativo ? "text-brand-red" : "text-txt-primary")
          }
        >
          {formatCurrency(caixa.saldo_atual)}
        </span>
      </div>

      <p className="mt-2 font-body text-xs text-txt-tertiary">
        atualizado em {formatAtualizadoEm(meta.atualizado_em)}
      </p>
    </motion.section>
  );
}
