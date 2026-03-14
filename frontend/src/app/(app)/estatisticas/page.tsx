"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Star } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { JogoEstatisticas, RankingsOut, RankingEntry } from "@/types";
import { Card } from "@/components/ui";

/* ─── Position badge colors ─────────────────────────────────── */

const positionColors: Record<number, string> = {
  1: "bg-amber-400/20 text-amber-300 border-amber-400/30",
  2: "bg-gray-300/15 text-gray-300 border-gray-400/30",
  3: "bg-orange-400/15 text-orange-400 border-orange-400/30",
};

/* ─── Page Component ─────────────────────────────────────────── */

export default function EstatisticasPage() {
  const [stats, setStats] = useState<JogoEstatisticas | null>(null);
  const [rankings, setRankings] = useState<RankingsOut | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, rankingsData] = await Promise.all([
        api.get<JogoEstatisticas>("/jogos/estatisticas"),
        api.get<RankingsOut>("/jogos/rankings"),
      ]);
      setStats(statsData);
      setRankings(rankingsData);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar estatisticas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function renderRankingList(
    title: string,
    icon: React.ReactNode,
    accentColor: string,
    gradientFrom: string,
    entries: RankingEntry[]
  ) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle shadow-card h-full">
          <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", gradientFrom)} />
          <div className="relative p-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accentColor)}>
                {icon}
              </div>
              <h3 className="text-sm font-display font-bold text-txt-primary uppercase tracking-wider">
                {title}
              </h3>
            </div>

            {/* List */}
            {entries.length === 0 ? (
              <p className="text-xs text-txt-tertiary font-body text-center py-6">
                Sem dados ainda
              </p>
            ) : (
              <ul className="space-y-1.5">
                {entries.map((entry, idx) => {
                  const pos = idx + 1;
                  const isTop3 = pos <= 3;
                  return (
                    <li
                      key={`${entry.nome}-${idx}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isTop3 ? "bg-surface-tertiary/60" : "hover:bg-surface-tertiary/30"
                      )}
                    >
                      {/* Position */}
                      <span
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 border",
                          positionColors[pos] || "bg-surface-elevated/50 text-txt-tertiary border-border-subtle"
                        )}
                      >
                        {pos}
                      </span>

                      {/* Name */}
                      <span
                        className={cn(
                          "flex-1 font-body truncate",
                          isTop3 ? "text-sm font-semibold text-txt-primary" : "text-sm text-txt-secondary"
                        )}
                      >
                        {entry.nome}
                      </span>

                      {/* Count badge */}
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-display font-bold tabular-nums",
                          isTop3
                            ? "bg-surface-elevated text-txt-primary"
                            : "bg-surface-tertiary text-txt-secondary"
                        )}
                      >
                        {entry.quantidade}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────── */}
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-txt-primary uppercase tracking-wider">
        Estatisticas
      </h1>

      {/* ── Stats Cards ────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-card border border-border-subtle animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                <div className="relative">
                  <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Vitorias</p>
                  <p className="text-3xl font-display font-bold text-emerald-400">{stats.vitorias}</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
                <div className="relative">
                  <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Empates</p>
                  <p className="text-3xl font-display font-bold text-yellow-400">{stats.empates}</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
                <div className="relative">
                  <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Derrotas</p>
                  <p className="text-3xl font-display font-bold text-red-400">{stats.derrotas}</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                <div className="relative">
                  <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Gols Pro</p>
                  <p className="text-3xl font-display font-bold text-blue-400">{stats.gols_marcados}</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-subtle p-4 col-span-2 sm:col-span-1">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
                <div className="relative">
                  <p className="text-xs text-txt-tertiary font-body mb-1 uppercase tracking-wider">Gols Contra</p>
                  <p className="text-3xl font-display font-bold text-orange-400">{stats.gols_sofridos}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Rankings ─────────────────────────────────────── */}
          {rankings && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderRankingList(
                "Artilharia",
                <Trophy className="h-4.5 w-4.5 text-amber-400" />,
                "bg-amber-500/10",
                "from-amber-500/5",
                rankings.artilharia
              )}
              {renderRankingList(
                "Assistencias",
                <Users className="h-4.5 w-4.5 text-blue-400" />,
                "bg-blue-500/10",
                "from-blue-500/5",
                rankings.assistencias
              )}
              {renderRankingList(
                "Destaques",
                <Star className="h-4.5 w-4.5 text-purple-400" />,
                "bg-purple-500/10",
                "from-purple-500/5",
                rankings.destaques
              )}
            </div>
          )}

          {/* Empty state if no stats and no rankings */}
          {!stats && !rankings && (
            <Card>
              <div className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-txt-tertiary/30 mb-4" />
                <p className="text-txt-tertiary font-body text-sm">
                  Nenhuma estatistica disponivel ainda.
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
