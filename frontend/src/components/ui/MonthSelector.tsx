"use client";

import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonth } from "@/lib/utils";

interface MonthSelectorProps {
  /** Format: "YYYY-MM" e.g. "2026-03" */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Minimum allowed month "YYYY-MM" */
  min?: string;
  /** Maximum allowed month "YYYY-MM" */
  max?: string;
}

function shiftMonth(value: string, delta: number): string {
  const [y, m] = value.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${newYear}-${newMonth}`;
}

function MonthSelector({
  value,
  onChange,
  className,
  min,
  max,
}: MonthSelectorProps) {
  const prev = shiftMonth(value, -1);
  const next = shiftMonth(value, 1);
  const canGoPrev = !min || prev >= min;
  const canGoNext = !max || next <= max;

  const handlePrev = useCallback(() => {
    if (canGoPrev) onChange(prev);
  }, [canGoPrev, prev, onChange]);

  const handleNext = useCallback(() => {
    if (canGoNext) onChange(next);
  }, [canGoNext, next, onChange]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1",
        className
      )}
    >
      <button
        type="button"
        onClick={handlePrev}
        disabled={!canGoPrev}
        className={cn(
          "h-9 w-9 rounded-lg",
          "flex items-center justify-center",
          "bg-surface-tertiary border border-border-subtle",
          "text-txt-secondary",
          "hover:bg-surface-card-hover hover:text-txt-primary hover:border-border",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-tertiary",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        )}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span
        className={cn(
          "min-w-[140px] text-center",
          "text-sm font-semibold text-txt-primary font-display",
          "select-none px-2"
        )}
      >
        {formatMonth(value)}
      </span>

      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoNext}
        className={cn(
          "h-9 w-9 rounded-lg",
          "flex items-center justify-center",
          "bg-surface-tertiary border border-border-subtle",
          "text-txt-secondary",
          "hover:bg-surface-card-hover hover:text-txt-primary hover:border-border",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-tertiary",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        )}
        aria-label="Proximo mes"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export { MonthSelector, type MonthSelectorProps };
