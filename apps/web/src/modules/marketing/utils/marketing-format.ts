/**
 * Marketing Module — formatting helpers (pt-BR).
 */

const NUMBER_FORMAT = new Intl.NumberFormat("pt-BR");
const CURRENCY_FORMAT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/** Compact number, e.g. 184000 -> "184 mil". */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mi`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} mil`;
  return String(value);
}

export function formatCurrency(value: number): string {
  const amount = Number(value);
  const formatted = CURRENCY_FORMAT.format(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatRoi(value: number): string {
  return `${value.toFixed(1)}x`;
}

/** Return on ad spend, e.g. 4.2 -> "4.2x". */
export function formatRoas(value: number): string {
  return `${value.toFixed(1)}x`;
}

/** Watch-time / duration in hours, compacted, e.g. 184000 -> "184 mil h". */
export function formatHours(value: number): string {
  return `${formatCompact(value)} h`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative time, e.g. "há 2h", "há 3d". Falls back to absolute date. */
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days}d`;
  return formatDate(iso);
}
