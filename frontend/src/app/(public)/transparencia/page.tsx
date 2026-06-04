"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPortal } from "@/lib/portal";
import type { PortalResponse } from "@/types/portal";
import { SkeletonCard } from "@/components/ui";
import { HeroCaixa, CaixaBloco, EventosBloco, JogosBloco } from "@/components/portal";

export default function TransparenciaPage() {
  const [data, setData] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const portal = await fetchPortal();
      setData(portal);
    } catch (e) {
      setErro(
        e instanceof Error
          ? "Nao foi possivel carregar a prestacao de contas agora. Tente de novo em instantes."
          : "Erro inesperado."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) {
    return (
      <div className="space-y-6" data-state="loading">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-56" />
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-16 text-center"
        data-state="error"
      >
        <p className="font-body text-sm text-txt-secondary">{erro ?? "Sem dados."}</p>
        <button
          onClick={carregar}
          className="rounded-lg bg-brand-red px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-brand-red-hover"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-state="ready">
      <HeroCaixa meta={data.meta} caixa={data.caixa} />
      <CaixaBloco caixa={data.caixa} />
      <EventosBloco eventos={data.eventos} />
      <JogosBloco jogos={data.jogos} />

      <footer className="pt-6 text-center font-body text-xs text-txt-tertiary">
        Velhos Parceiros F.C. - prestacao de contas em tempo real
      </footer>
    </div>
  );
}
