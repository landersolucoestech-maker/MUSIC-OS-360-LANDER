/**
 * analytics/market-benchmark.engine.ts
 *
 * Fase 3.1 — Market Benchmark Engine (relativo/cohort-based — ver
 * career-stage.config.ts para a distinção formal com o Career Stage, que é
 * absoluto/model-based). Função pura e determinística — o chamador
 * (market-benchmark.service.ts) monta a coorte a partir de CANDIDATOS
 * EXTERNOS REAIS (Soundcharts /related + suas próprias métricas, nunca
 * "outros artistas do tenant" — esse era o defeito conceitual corrigido
 * nesta missão). Este arquivo só calcula mediana/percentil, nunca consulta
 * rede.
 */
import type { MetricKey } from '../metric-keys';
import { median, percentileRank } from './metric-normalization.util';
import {
  MARKET_BENCHMARK_ENGINE_VERSION,
  MINIMUM_COHORT_SIZE,
  HIGH_QUALITY_SAMPLE_SIZE,
  BENCHMARK_METRICS,
  BENCHMARK_LABELS,
  type CohortFallbackLevel,
} from './market-benchmark.config';

export interface BenchmarkMetricInput {
  metricKey: MetricKey;
  /** null quando o próprio artista não tem valor real para esta métrica. */
  artistValue: number | null;
  /** Valores reais de candidatos externos (nunca inclui o próprio artista, nunca artistas do tenant). */
  cohortValues: number[];
}

export interface CohortDefinition {
  /** UUID Soundcharts do artista-alvo — origem da descoberta /related. */
  sourceArtistUuid: string | null;
  /** country_code aplicado como filtro, ou null quando não filtrado (L2/L3). */
  countryFilter: string | null;
  /** Nº de candidatos externos considerados (antes de filtrar por métrica disponível). */
  candidateCount: number;
}

export interface MarketBenchmarkEngineInput {
  artistId: string;
  asOf: Date;
  cohortDefinition: CohortDefinition;
  fallbackLevel: CohortFallbackLevel;
  /** Nº de candidatos externos distintos considerados (independente de cobertura por métrica). */
  cohortSize: number;
  metrics: BenchmarkMetricInput[];
}

export type BenchmarkMetricStatus = 'AVAILABLE' | 'ARTIST_VALUE_UNAVAILABLE' | 'INSUFFICIENT_COHORT';

/**
 * Indicador de qualidade da amostra POR MÉTRICA (item 16) — deliberadamente
 * baseado só em sampleSize (o driver mais direto e defensável da
 * confiabilidade de um percentil: o erro padrão de uma proporção escala com
 * 1/√n), em vez de uma fórmula composta com pesos inventados.
 * HIGH: n >= HIGH_QUALITY_SAMPLE_SIZE (30 — limiar clássico da aproximação
 * normal). MEDIUM: MINIMUM_COHORT_SIZE <= n < 30. INSUFFICIENT: n < mínimo
 * (o metric.status já é INSUFFICIENT_COHORT nesse caso).
 */
export type SampleQuality = 'HIGH' | 'MEDIUM' | 'INSUFFICIENT';

function sampleQualityFor(sampleSize: number): SampleQuality {
  if (sampleSize >= HIGH_QUALITY_SAMPLE_SIZE) return 'HIGH';
  if (sampleSize >= MINIMUM_COHORT_SIZE) return 'MEDIUM';
  return 'INSUFFICIENT';
}

export interface BenchmarkMetricResult {
  metricKey: MetricKey;
  status: BenchmarkMetricStatus;
  artistValue: number | null;
  cohortMedian: number | null;
  percentile: number | null;
  /** Amostra específica DESTA métrica — nem todo candidato tem toda métrica (item 20). */
  sampleSize: number;
  sampleQuality: SampleQuality;
  source: 'soundcharts';
}

export type MarketBenchmarkStatus = 'OK' | 'INSUFFICIENT_MARKET_DATA';

export interface MarketBenchmarkResult {
  status: MarketBenchmarkStatus;
  /** 0-100, média dos percentis disponíveis. null quando status=INSUFFICIENT_MARKET_DATA. */
  score: number | null;
  label: string | null;
  cohortDefinition: CohortDefinition;
  sampleSize: number;
  fallbackLevel: CohortFallbackLevel;
  metrics: BenchmarkMetricResult[];
  engineVersion: string;
  calculatedAt: Date;
}

function labelFor(score: number): string {
  const band = BENCHMARK_LABELS.find((b) => score >= b.min && score <= b.max);
  return band?.label ?? BENCHMARK_LABELS[BENCHMARK_LABELS.length - 1].label;
}

function computeMetric(input: BenchmarkMetricInput): BenchmarkMetricResult {
  const sampleSize = input.cohortValues.length;
  const sampleQuality = sampleQualityFor(sampleSize);
  if (sampleSize < MINIMUM_COHORT_SIZE) {
    return {
      metricKey: input.metricKey,
      status: 'INSUFFICIENT_COHORT',
      artistValue: input.artistValue,
      cohortMedian: median(input.cohortValues),
      percentile: null,
      sampleSize,
      sampleQuality,
      source: 'soundcharts',
    };
  }
  if (input.artistValue == null) {
    return {
      metricKey: input.metricKey,
      status: 'ARTIST_VALUE_UNAVAILABLE',
      artistValue: null,
      cohortMedian: median(input.cohortValues),
      percentile: null,
      sampleSize,
      sampleQuality,
      source: 'soundcharts',
    };
  }
  return {
    metricKey: input.metricKey,
    status: 'AVAILABLE',
    artistValue: input.artistValue,
    cohortMedian: median(input.cohortValues),
    // item 19: percentil SEMPRE sobre o valor bruto da métrica — nunca sobre
    // um score já normalizado pelo Career Stage.
    percentile: percentileRank(input.cohortValues, input.artistValue),
    sampleSize,
    sampleQuality,
    source: 'soundcharts',
  };
}

export function computeMarketBenchmark(input: MarketBenchmarkEngineInput): MarketBenchmarkResult {
  const metrics = BENCHMARK_METRICS.map((metricKey) => {
    const found = input.metrics.find((m) => m.metricKey === metricKey);
    return computeMetric(found ?? { metricKey, artistValue: null, cohortValues: [] });
  });

  const availablePercentiles = metrics
    .filter((m): m is BenchmarkMetricResult & { percentile: number } => m.status === 'AVAILABLE' && m.percentile != null)
    .map((m) => m.percentile);

  const status: MarketBenchmarkStatus = availablePercentiles.length > 0 ? 'OK' : 'INSUFFICIENT_MARKET_DATA';
  const score = status === 'OK' ? availablePercentiles.reduce((a, b) => a + b, 0) / availablePercentiles.length : null;

  return {
    status,
    score,
    label: score != null ? labelFor(score) : null,
    cohortDefinition: input.cohortDefinition,
    sampleSize: input.cohortSize,
    fallbackLevel: input.fallbackLevel,
    metrics,
    engineVersion: MARKET_BENCHMARK_ENGINE_VERSION,
    calculatedAt: input.asOf,
  };
}
