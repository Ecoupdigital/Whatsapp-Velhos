"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Goal,
  Handshake,
  Star,
  CalendarClock,
  History,
} from "lucide-react";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type {
  PortalJogos,
  PortalRankingEntry,
} from "@/types/portal";

interface JogosBlocoProps {
  jogos: PortalJogos;
}

function RankingList({
  titulo,
  icon,
  entries,
}: {
  titulo: string;
  icon: React.ReactNode;
  entries: PortalRankingEntry[];
}) {
  const top = entries.slice(0, 5);
  return (
    <Card padding="md">
      <p className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold text-txt-primary">
        <span className="text-brand-red">{icon}</span> {titulo}
      </p>
      {top.length === 0 ? (
        <p className="font-body text-xs text-txt-tertiary">sem registros</p>
      ) : (
        <ol className="space-y-1.5">
          {top.map((e, i) => (
            <li
              key={`${e.nome}-${i}`}
              className="flex items-center justify-between gap-2 font-body text-sm"
            >
              <span className="truncate text-txt-secondary">
                {i + 1}. {e.nome}
              </span>
              <span className="shrink-0 font-display font-semibold tabular-nums text-txt-primary">
                {e.quantidade}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function StatCard({
  valor,
  label,
  cor,
}: {
  valor: number;
  label: string;
  cor: string;
}) {
  return (
    <Card padding="sm" className="text-center">
      <p className={"font-display text-xl font-bold tabular-nums " + cor}>{valor}</p>
      <p className="font-body text-[10px] uppercase tracking-wide text-txt-tertiary">
        {label}
      </p>
    </Card>
  );
}

export function JogosBloco({ jogos }: JogosBlocoProps) {
  const { resumo, artilharia, assistencias, destaques, ultimos_resultados, proximos_jogos } =
    jogos;

  return (
    <motion.section
      data-block="jogos"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-txt-primary">
        <Trophy className="h-5 w-5 text-brand-red" /> Em campo
      </h2>

      <div className="grid grid-cols-5 gap-2">
        <StatCard valor={resumo.vitorias} label="V" cor="text-emerald-400" />
        <StatCard valor={resumo.empates} label="E" cor="text-txt-secondary" />
        <StatCard valor={resumo.derrotas} label="D" cor="text-brand-red" />
        <StatCard valor={resumo.gols_pro} label="Gols pro" cor="text-txt-primary" />
        <StatCard valor={resumo.gols_contra} label="Gols contra" cor="text-txt-primary" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RankingList titulo="Artilharia" icon={<Goal className="h-4 w-4" />} entries={artilharia} />
        <RankingList titulo="Assistencias" icon={<Handshake className="h-4 w-4" />} entries={assistencias} />
        <RankingList titulo="Destaques" icon={<Star className="h-4 w-4" />} entries={destaques} />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold text-txt-primary">
          <History className="h-4 w-4 text-brand-red" /> Ultimos resultados
        </p>
        {ultimos_resultados.length === 0 ? (
          <EmptyState title="Sem jogos registrados" />
        ) : (
          <div className="space-y-2">
            {ultimos_resultados.map((r, i) => (
              <Card key={`${r.adversario}-${i}`} padding="sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-body text-sm text-txt-secondary">
                      vs {r.adversario}
                    </p>
                    <p className="font-body text-xs text-txt-tertiary">{formatDate(r.data)}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-surface-tertiary px-2.5 py-1 font-display text-sm font-bold tabular-nums text-txt-primary">
                    {r.placar}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold text-txt-primary">
          <CalendarClock className="h-4 w-4 text-brand-red" /> Proximos jogos
        </p>
        {proximos_jogos.length === 0 ? (
          <EmptyState title="Sem jogos agendados" />
        ) : (
          <div className="space-y-2">
            {proximos_jogos.map((j, i) => (
              <Card key={`${j.adversario}-${i}`} padding="sm">
                <p className="font-body text-sm text-txt-primary">vs {j.adversario}</p>
                <p className="font-body text-xs text-txt-tertiary">
                  {formatDate(j.data)}
                  {j.horario ? ` as ${j.horario}` : ""}
                  {j.local ? ` - ${j.local}` : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
