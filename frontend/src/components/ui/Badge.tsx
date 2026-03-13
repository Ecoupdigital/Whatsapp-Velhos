"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusVariant = "pago" | "pendente" | "atrasado" | "isento";
type TypeVariant = "jogador" | "socio";

interface BadgeProps {
  children: ReactNode;
  status?: StatusVariant;
  type?: TypeVariant;
  className?: string;
}

const statusStyles: Record<StatusVariant, { bg: string; text: string; dot: string }> = {
  pago: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  pendente: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  atrasado: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  isento: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
};

const typeStyles: Record<TypeVariant, { bg: string; text: string; dot: string }> = {
  jogador: {
    bg: "bg-brand-red/15",
    text: "text-red-400",
    dot: "bg-brand-red",
  },
  socio: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
};

function Badge({ children, status, type, className }: BadgeProps) {
  const styles = status
    ? statusStyles[status]
    : type
      ? typeStyles[type]
      : { bg: "bg-surface-tertiary", text: "text-txt-secondary", dot: "bg-txt-tertiary" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-2.5 py-0.5 rounded-full",
        "text-xs font-medium font-body",
        "select-none",
        styles.bg,
        styles.text,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", styles.dot)}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type StatusVariant, type TypeVariant };
