export function normalizeStr(v?: string | null): string | null {
  const s = (v ?? "").trim();
  return s || null;
}

export function normalizeBool(v: unknown): boolean | null {
  if (v === true || v === "true" || v === "sim" || v === "Sim") return true;
  if (
    v === false ||
    v === "false" ||
    v === "nao" ||
    v === "não" ||
    v === "Não"
  )
    return false;
  return null;
}

export function normalizeNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
