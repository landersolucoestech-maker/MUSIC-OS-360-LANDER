/**
 * platform-profiles/metric-growth.util.ts
 *
 * Fase 2 — camada determinística mínima para calcular variação a partir de
 * pontos históricos reais. NÃO é Momentum/Career Stage (sem classificação
 * STRONG/VERY_STRONG) — só currentValue/previousValue/absoluteChange/
 * percentageChange/period, ou INSUFFICIENT_HISTORY quando não há ponto
 * anterior confiável dentro da tolerância do período.
 */

export interface GrowthPoint {
  value: number;
  observedAt: Date;
}

export type GrowthResult =
  | { status: 'INSUFFICIENT_HISTORY'; periodDays: number }
  | {
      status: 'OK';
      periodDays: number;
      currentValue: number;
      currentObservedAt: Date;
      previousValue: number;
      previousObservedAt: Date;
      absoluteChange: number;
      /** null quando previousValue === 0 — variação percentual é indefinida, nunca Infinity/NaN. */
      percentageChange: number | null;
    };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Seleciona, entre os pontos anteriores ao mais recente, o mais próximo de
 * `asOf - periodDays` — nunca `array[0]`/`array[last]` sem garantir ordenação
 * e proximidade real do período pedido. Fora da tolerância → sem ponto
 * anterior confiável (INSUFFICIENT_HISTORY), não um valor aproximado demais.
 */
export function computeGrowth(
  points: GrowthPoint[],
  periodDays: number,
  asOf: Date = new Date(),
  toleranceDays = Math.max(1, Math.round(periodDays * 0.2)),
): GrowthResult {
  if (points.length === 0) return { status: 'INSUFFICIENT_HISTORY', periodDays };

  const sorted = [...points].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  const current = sorted[sorted.length - 1];
  const targetTime = asOf.getTime() - periodDays * MS_PER_DAY;
  const toleranceMs = toleranceDays * MS_PER_DAY;

  let previous: GrowthPoint | null = null;
  let bestDiff = Infinity;
  for (const p of sorted) {
    if (p.observedAt.getTime() >= current.observedAt.getTime()) continue;
    const diff = Math.abs(p.observedAt.getTime() - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      previous = p;
    }
  }

  if (!previous || bestDiff > toleranceMs) return { status: 'INSUFFICIENT_HISTORY', periodDays };

  const absoluteChange = current.value - previous.value;
  const percentageChange = previous.value === 0 ? null : (absoluteChange / previous.value) * 100;

  return {
    status: 'OK',
    periodDays,
    currentValue: current.value,
    currentObservedAt: current.observedAt,
    previousValue: previous.value,
    previousObservedAt: previous.observedAt,
    absoluteChange,
    percentageChange,
  };
}

export const STANDARD_GROWTH_PERIODS_DAYS = [7, 30, 90, 180, 365] as const;
