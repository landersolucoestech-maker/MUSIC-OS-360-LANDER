// ─── Number / Currency formatting (locale pt-BR) ─────────────────────────────

export function formatCurrency(
  value: number,
  currency = "BRL",
  locale = "pt-BR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale = "pt-BR",
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(value: number, decimals = 1, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatCompactNumber(value: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { notation: "compact" }).format(value);
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
  locale = "pt-BR",
): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatDateTime(value: string | Date, locale = "pt-BR"): string {
  return formatDate(
    value,
    { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
    locale,
  );
}

export function formatRelativeTime(value: string | Date, locale = "pt-BR"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "seconds");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minutes");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hours");
  return rtf.format(Math.round(diff / 86400), "days");
}
