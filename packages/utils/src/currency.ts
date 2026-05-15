// ─── Currency math helpers (evitar float imprecision) ────────────────────────

export function toIntCents(brl: number): number {
  return Math.round(brl * 100);
}

export function fromIntCents(cents: number): number {
  return cents / 100;
}

export function addMoney(a: number, b: number): number {
  return fromIntCents(toIntCents(a) + toIntCents(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromIntCents(toIntCents(a) - toIntCents(b));
}

export function multiplyMoney(amount: number, factor: number): number {
  return fromIntCents(Math.round(toIntCents(amount) * factor));
}

export function sumMoney(values: number[]): number {
  return fromIntCents(values.reduce((acc, v) => acc + toIntCents(v), 0));
}

export function applyPercentage(amount: number, percent: number): number {
  return multiplyMoney(amount, percent / 100);
}

export function parseMoneyString(value: string): number {
  const clean = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
