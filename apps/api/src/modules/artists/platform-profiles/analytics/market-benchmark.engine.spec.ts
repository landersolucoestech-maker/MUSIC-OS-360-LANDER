import { computeMarketBenchmark, type MarketBenchmarkEngineInput, type BenchmarkMetricInput } from './market-benchmark.engine';
import { METRIC_KEYS } from '../metric-keys';
import { MINIMUM_COHORT_SIZE, HIGH_QUALITY_SAMPLE_SIZE, MARKET_BENCHMARK_ENGINE_VERSION } from './market-benchmark.config';

const ASOF = new Date('2026-08-31T00:00:00Z');

function bigCohort(n: number, base = 1000): number[] {
  return Array.from({ length: n }, (_, i) => base + i * 100);
}

function baseInput(overrides: Partial<MarketBenchmarkEngineInput> = {}): MarketBenchmarkEngineInput {
  return {
    artistId: 'artist-1',
    asOf: ASOF,
    cohortDefinition: { sourceArtistUuid: 'sc-uuid-1', countryFilter: null, candidateCount: 0 },
    fallbackLevel: 2,
    cohortSize: 0,
    metrics: [],
    ...overrides,
  };
}

describe('computeMarketBenchmark', () => {
  it('coorte válida (>= minimumCohortSize): status OK, score/percentil reais', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: bigCohort(15) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 15, metrics }));
    expect(result.status).toBe('OK');
    expect(result.score).not.toBeNull();
    expect(result.label).not.toBeNull();
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    expect(m.status).toBe('AVAILABLE');
    expect(m.percentile).not.toBeNull();
    expect(m.sampleQuality).toBe('MEDIUM'); // 15 < 30
  });

  it('coorte insuficiente (< minimumCohortSize): INSUFFICIENT_MARKET_DATA no agregado, nunca percentil fictício', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: bigCohort(3) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 3, metrics }));
    expect(result.status).toBe('INSUFFICIENT_MARKET_DATA');
    expect(result.score).toBeNull();
    expect(result.label).toBeNull();
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    expect(m.status).toBe('INSUFFICIENT_COHORT');
    expect(m.percentile).toBeNull();
    expect(m.sampleSize).toBe(3);
    expect(m.sampleQuality).toBe('INSUFFICIENT');
  });

  it(`exatamente no limite (${MINIMUM_COHORT_SIZE}): considerado suficiente, qualidade MEDIUM`, () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.DEEZER_FANS, artistValue: 2000, cohortValues: bigCohort(MINIMUM_COHORT_SIZE) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: MINIMUM_COHORT_SIZE, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.DEEZER_FANS)!;
    expect(m.status).toBe('AVAILABLE');
    expect(m.sampleQuality).toBe('MEDIUM');
  });

  it(`amostra >= ${HIGH_QUALITY_SAMPLE_SIZE}: qualidade HIGH`, () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.DEEZER_FANS, artistValue: 2000, cohortValues: bigCohort(HIGH_QUALITY_SAMPLE_SIZE) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: HIGH_QUALITY_SAMPLE_SIZE, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.DEEZER_FANS)!;
    expect(m.sampleQuality).toBe('HIGH');
  });

  it('fallback determinístico: fallbackLevel e cohortDefinition retornados exatamente como fornecidos pelo chamador', () => {
    const result = computeMarketBenchmark(
      baseInput({ fallbackLevel: 1, cohortSize: 12, cohortDefinition: { sourceArtistUuid: 'sc-uuid-9', countryFilter: 'BR', candidateCount: 40 } }),
    );
    expect(result.fallbackLevel).toBe(1);
    expect(result.cohortDefinition).toEqual({ sourceArtistUuid: 'sc-uuid-9', countryFilter: 'BR', candidateCount: 40 });
  });

  it('mediana calculada corretamente (par e ímpar) e exposta mesmo quando coorte é insuficiente', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 100, cohortValues: [1, 2] },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 2, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    expect(m.cohortMedian).toBe(1.5);
  });

  it('empates na coorte: percentil não quebra, usa rank médio', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: Array(12).fill(5000) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 12, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    expect(m.percentile).toBe(50);
  });

  it('outlier na coorte não trava o cálculo', () => {
    const cohort = [...bigCohort(11), 999_999_999];
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 1500, cohortValues: cohort },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 12, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    expect(m.percentile).not.toBeNull();
    expect(m.percentile).toBeGreaterThanOrEqual(0);
    expect(m.percentile).toBeLessThanOrEqual(100);
  });

  it('métrica sem valor do artista (mas coorte suficiente): ARTIST_VALUE_UNAVAILABLE, nunca comparado a 0', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.TIKTOK_FOLLOWERS, artistValue: null, cohortValues: bigCohort(15) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 15, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.TIKTOK_FOLLOWERS)!;
    expect(m.status).toBe('ARTIST_VALUE_UNAVAILABLE');
    expect(m.percentile).toBeNull();
  });

  it('amostras de tamanhos diferentes por métrica (item 20): cada métrica avaliada com sua própria sampleSize', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: bigCohort(20) },
      { metricKey: METRIC_KEYS.INSTAGRAM_FOLLOWERS, artistValue: 5000, cohortValues: bigCohort(2) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 20, metrics }));
    const spotify = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    const instagram = result.metrics.find((x) => x.metricKey === METRIC_KEYS.INSTAGRAM_FOLLOWERS)!;
    expect(spotify.status).toBe('AVAILABLE');
    expect(instagram.status).toBe('INSUFFICIENT_COHORT');
  });

  it('nenhuma coorte (todas as métricas sem dado): INSUFFICIENT_MARKET_DATA, nunca P68 inventado', () => {
    const result = computeMarketBenchmark(baseInput({ cohortSize: 0 }));
    expect(result.status).toBe('INSUFFICIENT_MARKET_DATA');
    expect(result.score).toBeNull();
  });

  it('todos os valores da coorte iguais entre si: percentil bem definido (50), não NaN/Infinity', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.DEEZER_FANS, artistValue: 42, cohortValues: Array(10).fill(42) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 10, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.DEEZER_FANS)!;
    expect(Number.isFinite(m.percentile)).toBe(true);
    expect(m.percentile).toBe(50);
  });

  it('métrica única disponível: score agregado igual ao percentil dessa métrica', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: bigCohort(15) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 15, metrics }));
    const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    expect(result.score).toBe(m.percentile);
  });

  it('múltiplas métricas: score é a média dos percentis disponíveis', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 1_000_000, cohortValues: bigCohort(15) },
      { metricKey: METRIC_KEYS.INSTAGRAM_FOLLOWERS, artistValue: 1, cohortValues: bigCohort(15) },
    ];
    const result = computeMarketBenchmark(baseInput({ cohortSize: 15, metrics }));
    const spotify = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
    const instagram = result.metrics.find((x) => x.metricKey === METRIC_KEYS.INSTAGRAM_FOLLOWERS)!;
    expect(result.score).toBeCloseTo(((spotify.percentile as number) + (instagram.percentile as number)) / 2, 5);
  });

  it('engineVersion sempre retornado', () => {
    const result = computeMarketBenchmark(baseInput());
    expect(result.engineVersion).toBe(MARKET_BENCHMARK_ENGINE_VERSION);
  });

  it('determinismo: mesma entrada produz exatamente o mesmo resultado', () => {
    const metrics: BenchmarkMetricInput[] = [
      { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 12345, cohortValues: bigCohort(15) },
    ];
    const input = baseInput({ cohortSize: 15, metrics });
    expect(computeMarketBenchmark(input)).toEqual(computeMarketBenchmark(input));
  });

  // ── Sensibilidade do mínimo (item 15) ───────────────────────────────────
  describe('sensibilidade de minimumCohortSize', () => {
    it.each([10, 20, 30, 50])('amostra de tamanho %i produz percentil válido e determinístico', (n) => {
      const metrics: BenchmarkMetricInput[] = [
        { metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: bigCohort(n) },
      ];
      const result = computeMarketBenchmark(baseInput({ cohortSize: n, metrics }));
      const m = result.metrics.find((x) => x.metricKey === METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS)!;
      expect(m.status).toBe('AVAILABLE');
      expect(m.percentile).toBeGreaterThanOrEqual(0);
      expect(m.percentile).toBeLessThanOrEqual(100);
    });

    it('amostra de 9 (abaixo do mínimo): INSUFFICIENT_COHORT; amostra de 10: AVAILABLE — prova a fronteira exata', () => {
      const nine: BenchmarkMetricInput[] = [{ metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: bigCohort(9) }];
      const ten: BenchmarkMetricInput[] = [{ metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: 5000, cohortValues: bigCohort(10) }];
      const r9 = computeMarketBenchmark(baseInput({ cohortSize: 9, metrics: nine }));
      const r10 = computeMarketBenchmark(baseInput({ cohortSize: 10, metrics: ten }));
      expect(r9.metrics[0].status).toBe('INSUFFICIENT_COHORT');
      expect(r10.metrics[0].status).toBe('AVAILABLE');
    });
  });
});

// ── Propriedades (item 41) ────────────────────────────────────────────────
describe('propriedades — monotonicidade do percentil', () => {
  it('percentil é não-decrescente com o valor do artista (mesma coorte)', () => {
    const cohort = bigCohort(20);
    const values = [500, 1000, 1500, 2000, 3000, 5000];
    const percentiles = values.map((v) => {
      const result = computeMarketBenchmark(
        baseInput({ cohortSize: 20, metrics: [{ metricKey: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, artistValue: v, cohortValues: cohort }] }),
      );
      return result.metrics[0].percentile as number;
    });
    for (let i = 1; i < percentiles.length; i++) {
      expect(percentiles[i]).toBeGreaterThanOrEqual(percentiles[i - 1]);
    }
  });
});
