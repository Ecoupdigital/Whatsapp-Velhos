"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: number;
  /** Salva o novo valor. Resolve = sucesso; rejeita = erro -> a celula reverte. */
  onCommit: (next: number) => Promise<void>;
  min?: number;
  disabled?: boolean;
  className?: string;
  align?: "left" | "right" | "center";
}

export function EditableCell({
  value, onCommit, min = 0, disabled = false, className, align = "center",
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = async () => {
    const parsed = parseInt(draft, 10);
    const next = isNaN(parsed) ? value : Math.max(min, parsed);
    setEditing(false);
    if (next === value) { setDraft(String(value)); return; }
    setSaving(true);
    try {
      await onCommit(next);
    } catch {
      setDraft(String(value)); // reverte; o pai mostra o toast
    } finally { setSaving(false); }
  };

  const alignClass = align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center";

  if (editing) {
    return (
      <input
        ref={inputRef} type="number" min={min} value={draft} disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        className={cn(
          "w-16 h-8 rounded bg-surface-tertiary border border-brand-red px-1.5",
          "text-txt-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand-red",
          alignClass, className
        )}
      />
    );
  }

  return (
    <button
      type="button" disabled={disabled || saving}
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        "w-16 h-8 rounded px-1.5 text-sm font-mono tabular-nums",
        "hover:bg-surface-tertiary hover:ring-1 hover:ring-border transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        saving && "opacity-50 animate-pulse",
        alignClass, className
      )}
      title={disabled ? "Somente leitura" : "Clique para editar"}
    >
      {value}
    </button>
  );
}
