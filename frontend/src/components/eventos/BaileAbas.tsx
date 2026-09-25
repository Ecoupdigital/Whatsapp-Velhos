"use client";

import { useRouter } from "next/navigation";

const ABAS = [
  { id: "evento", label: "Evento" },
  { id: "cartoes", label: "Cartões" },
  { id: "patrocinios", label: "Patrocínios" },
] as const;

export function BaileAbas({
  eventoId,
  atual,
}: {
  eventoId: string;
  atual: (typeof ABAS)[number]["id"];
}) {
  const router = useRouter();
  const href = (id: (typeof ABAS)[number]["id"]) => {
    if (id === "evento") return `/eventos/${eventoId}`;
    if (id === "cartoes") return `/eventos/${eventoId}/baile`;
    return `/eventos/${eventoId}/patrocinios`;
  };

  return (
    <div className="flex gap-1 bg-surface-card border border-border-subtle rounded-lg p-1 w-fit">
      {ABAS.map((aba) => (
        <button
          key={aba.id}
          onClick={() => router.push(href(aba.id))}
          className={`h-8 px-3 rounded-md text-sm ${
            atual === aba.id ? "bg-brand-red text-white" : "text-txt-secondary hover:text-txt-primary"
          }`}
        >
          {aba.label}
        </button>
      ))}
    </div>
  );
}
