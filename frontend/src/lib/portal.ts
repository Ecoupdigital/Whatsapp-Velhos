import type { PortalResponse } from "@/types/portal";

/**
 * Busca o pacote agregado do portal publico.
 * Fetch direto (sem o interceptor de 401 de apiFetch, que redireciona pro /login).
 * Sem header Authorization: /api/portal e publico.
 * cache: "no-store" -> sempre dado fresco (carimbo "atualizado em" em tempo real).
 */
export async function fetchPortal(): Promise<PortalResponse> {
  const res = await fetch("/api/portal", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Falha ao carregar o portal (HTTP ${res.status})`);
  }
  return res.json() as Promise<PortalResponse>;
}

/**
 * Formata o ISO de meta.atualizado_em em "DD/MM as HH:MM" no fuso de Brasilia.
 * Usa Intl com timeZone America/Sao_Paulo (estavel, sem depender do TZ do navegador).
 */
export function formatAtualizadoEm(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // Intl pt-BR ja entrega "04/06 14:30"; normaliza pro formato pedido.
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")} as ${get("hour")}:${get("minute")}`;
}
