/**
 * Campaigns domain — decimal-safe money.
 *
 * Monetary amounts are NEVER stored as float/double. They are kept as integer
 * minor units (cents), so addition, scaling and rateio never drift. A
 * `largest-remainder` split guarantees a budget divided across N targets sums
 * back EXACTLY to the original total.
 */

export type CurrencyCode = "BRL" | "USD" | "EUR";

export interface Money {
  /** Integer amount in minor units (e.g. cents). Never a float of major units. */
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export function money(major: number, currency: CurrencyCode = "BRL"): Money {
  return { amountMinor: Math.round(major * 100), currency };
}

export function fromMinor(amountMinor: number, currency: CurrencyCode = "BRL"): Money {
  return { amountMinor: Math.round(amountMinor), currency };
}

export function zeroMoney(currency: CurrencyCode = "BRL"): Money {
  return { amountMinor: 0, currency };
}

export function toMajor(value: Money): number {
  return value.amountMinor / 100;
}

export function addMoney(a: Money, b: Money): Money {
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function sumMoney(values: Money[], currency: CurrencyCode = "BRL"): Money {
  const amountMinor = values.reduce((acc, v) => acc + v.amountMinor, 0);
  return { amountMinor, currency: values[0]?.currency ?? currency };
}

/** Scale a money value by a ratio, rounding to the nearest minor unit. */
export function scaleMoney(value: Money, ratio: number): Money {
  return { amountMinor: Math.round(value.amountMinor * ratio), currency: value.currency };
}

/**
 * Split `totalUnits` integer units across `weights` using the largest-remainder
 * method, so the parts always sum back to exactly `totalUnits`. Non-positive or
 * all-zero weights fall back to an even split. Safe for empty input.
 */
export function largestRemainderSplit(totalUnits: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const weightSum = safeWeights.reduce((acc, w) => acc + w, 0);
  const useEven = weightSum <= 0;

  const raw = safeWeights.map((w) => (useEven ? totalUnits / n : (totalUnits * w) / weightSum));
  const floors = raw.map((r) => Math.floor(r));
  let remainder = totalUnits - floors.reduce((acc, f) => acc + f, 0);

  // Give the leftover units to the largest fractional parts first.
  const order = raw
    .map((r, index) => ({ index, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  const result = floors.slice();
  for (let k = 0; k < order.length && remainder > 0; k += 1) {
    result[order[k].index] += 1;
    remainder -= 1;
  }
  return result;
}

/** Split a budget across weights with no rounding drift (sums back to total). */
export function splitMoney(total: Money, weights: number[]): Money[] {
  return largestRemainderSplit(total.amountMinor, weights).map((minor) => fromMinor(minor, total.currency));
}

/** Generate a stable id, preferring a real UUID when available. */
export function genId(prefix: string): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return `${prefix}_${c.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

