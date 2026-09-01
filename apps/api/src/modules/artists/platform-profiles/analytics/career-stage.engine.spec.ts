import { computeCareerStage, type CareerStageEngineInput, type CareerStageMetricPoint } from './career-stage.engine';
import { METRIC_KEYS } from '../metric-keys';
import { CAREER_STAGE_WEIGHTS, CAREER_STAGE_CLASSIFICATION, CAREER_STAGE_ENGINE_VERSION } from './career-stage.config';
import type { GrowthResult } from '../metric-growth.util';

const ASOF = new Date('2026-08-31T00:00:00Z');

function point(metricKey: (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS], overrides: Partial<CareerStageMetricPoint> = {}): CareerStageMetricPoint {
  return { metricKey, currentValue: null, observedAt: null, growth30d: null, growth90d: null, ...overrides };
}

function growthOk(percentageChange: number): GrowthResult {
  return {
    status: 'OK',
    periodDays: 30,
    currentValue: 100,
    currentObservedAt: ASOF,
    previousValue: 90,
    previousObservedAt: new Date('2026-08-01'),
    absoluteChange: 10,
    percentageChange,
  };
}

function baseInput(overrides: Partial<CareerStageEngineInput> = {}): CareerStageEngineInput {
  return {
    artistId: 'artist-1',
    asOf: ASOF,
    metrics: [],
    platformsWithData: 0,
    mostRecentObservedAt: null,
    historyDepthDays: null,
    ...overrides,
  };
}

describe('CAREER_STAGE_WEIGHTS', () => {
  it('somam exatamente 100', () => {
    const total = Object.values(CAREER_STAGE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe('computeCareerStage', () => {
  it('nenhuma métrica disponível: INSUFFICIENT_DATA, score null, mas dimensions preenchidas para transparência', () => {
    const result = computeCareerStage(baseInput());
    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.score).toBeNull();
    expect(result.classification).toBeNull();
    expect(result.dimensions).toHaveLength(6);
    expect(result.dimensions.every((d) => d.status === 'UNAVAILABLE')).toBe(true);
  });

  it('todas as dimensões disponíveis com dado forte: score alto, classificação correspondente', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 40_000_000, observedAt: ASOF, growth30d: growthOk(20), growth90d: growthOk(40) }),
      point(METRIC_KEYS.YOUTUBE_SUBSCRIBERS, { currentValue: 20_000_000, observedAt: ASOF, growth30d: growthOk(15), growth90d: growthOk(30) }),
      point(METRIC_KEYS.DEEZER_FANS, { currentValue: 8_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.SOUNDCLOUD_FOLLOWERS, { currentValue: 8_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 40_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.TIKTOK_FOLLOWERS, { currentValue: 40_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.APPLE_MUSIC_PLAYLIST_COUNT, { currentValue: 4_000, observedAt: ASOF }),
    ];
    const result = computeCareerStage(baseInput({ metrics, platformsWithData: 7, mostRecentObservedAt: ASOF, historyDepthDays: 365 }));
    expect(result.status).toBe('OK');
    expect(result.score).toBeGreaterThan(8);
    expect(result.classification).toBe('Alta Relevância');
    expect(result.dimensions.every((d) => d.status === 'AVAILABLE')).toBe(true);
  });

  it('dimensões parciais: cobertura suficiente ainda produz OK, renormalizado sobre os pesos disponíveis', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.YOUTUBE_SUBSCRIBERS, { currentValue: 1_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 1_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 500_000, observedAt: ASOF }),
    ];
    const result = computeCareerStage(baseInput({ metrics, platformsWithData: 3, mostRecentObservedAt: ASOF }));
    expect(result.status).toBe('OK');
    expect(result.score).not.toBeNull();
    // AUDIENCE (youtube), STREAMING (spotify) e SOCIAL (instagram) disponíveis -> coverage = (25+20+20)/100
    expect(result.coverage).toBeCloseTo(0.65, 5);
  });

  it('dimensões insuficientes (< minimumAvailableDimensions ou < minimumCoverageWeight): INSUFFICIENT_DATA mesmo com 1 métrica real', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.APPLE_MUSIC_PLAYLIST_COUNT, { currentValue: 5, observedAt: ASOF }),
    ];
    // Só MARKET_PRESENCE disponível: 1 dimensão, peso 10% -> abaixo dos dois mínimos.
    const result = computeCareerStage(baseInput({ metrics, platformsWithData: 1, mostRecentObservedAt: ASOF }));
    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.score).toBeNull();
  });

  it('renormalização: dimensão indisponível nunca é tratada como score 0 (não puxa a média pra baixo)', () => {
    // Duas dimensões disponíveis com score máximo (~100) e nada mais.
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 50_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 50_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.TIKTOK_FOLLOWERS, { currentValue: 50_000_000, observedAt: ASOF }),
    ];
    const result = computeCareerStage(baseInput({ metrics, platformsWithData: 2, mostRecentObservedAt: ASOF }));
    expect(result.status).toBe('OK');
    // Se dimensões ausentes contassem como 0, o score cairia bem abaixo de 9;
    // renormalizado sobre os pesos disponíveis, deve ficar próximo do máximo.
    expect(result.score).toBeGreaterThan(9);
  });

  it('score real 0 (ZERO_REAL em todas as métricas): dimensão AVAILABLE com score 0, nunca UNAVAILABLE', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 0, observedAt: ASOF }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 0, observedAt: ASOF }),
      point(METRIC_KEYS.TIKTOK_FOLLOWERS, { currentValue: 0, observedAt: ASOF }),
    ];
    const result = computeCareerStage(baseInput({ metrics, platformsWithData: 2, mostRecentObservedAt: ASOF }));
    const streaming = result.dimensions.find((d) => d.key === 'STREAMING')!;
    expect(streaming.status).toBe('AVAILABLE');
    expect(streaming.score).toBe(0);
    expect(result.status).toBe('OK');
    expect(result.score).toBe(0);
    expect(result.classification).toBe('Início');
  });

  it('score fica sempre dentro de [0,10]', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 500_000_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 500_000_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.TIKTOK_FOLLOWERS, { currentValue: 500_000_000_000, observedAt: ASOF }),
    ];
    const result = computeCareerStage(baseInput({ metrics, platformsWithData: 2, mostRecentObservedAt: ASOF }));
    expect(result.score).not.toBeNull();
    expect(result.score as number).toBeLessThanOrEqual(10);
    expect(result.score as number).toBeGreaterThanOrEqual(0);
  });

  it('thresholds de classificação cobrem toda a faixa 0-10 sem buraco', () => {
    for (let s = 0; s <= 100; s++) {
      const score = s / 10;
      const band = CAREER_STAGE_CLASSIFICATION.find((b) => score >= b.min && score <= b.max);
      expect(band).toBeDefined();
    }
  });

  it('confidence é sensível a dado stale (> STALE_AFTER_DAYS): confidence menor que com dado fresco', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 1_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 500_000, observedAt: ASOF }),
    ];
    const fresh = computeCareerStage(baseInput({ metrics, platformsWithData: 2, mostRecentObservedAt: ASOF, historyDepthDays: 90 }));
    const staleDate = new Date(ASOF.getTime() - 60 * 24 * 60 * 60 * 1000);
    const stale = computeCareerStage(baseInput({ metrics, platformsWithData: 2, mostRecentObservedAt: staleDate, historyDepthDays: 90 }));
    expect(stale.confidence).toBeLessThan(fresh.confidence);
    expect(fresh.freshness).toBe('FRESH');
    expect(stale.freshness).toBe('STALE');
  });

  it('freshness UNKNOWN quando não há observedAt algum', () => {
    const result = computeCareerStage(baseInput());
    expect(result.freshness).toBe('UNKNOWN');
  });

  it('engineVersion é sempre retornado e bate com a config', () => {
    const result = computeCareerStage(baseInput());
    expect(result.engineVersion).toBe(CAREER_STAGE_ENGINE_VERSION);
  });

  it('positiveFactors/bottlenecks apontam para dados concretos (metricKey + rawValue), nunca frase vazia', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 50_000_000, observedAt: ASOF }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 10, observedAt: ASOF }),
      point(METRIC_KEYS.TIKTOK_FOLLOWERS, { currentValue: 10, observedAt: ASOF }),
    ];
    const result = computeCareerStage(baseInput({ metrics, platformsWithData: 2, mostRecentObservedAt: ASOF }));
    expect(result.positiveFactors.length).toBeGreaterThan(0);
    expect(result.bottlenecks.length).toBeGreaterThan(0);
    for (const item of [...result.positiveFactors, ...result.bottlenecks]) {
      expect(item.metrics.length).toBeGreaterThan(0);
      expect(item.evidence.length).toBeGreaterThan(0);
      expect(item.reason.length).toBeGreaterThan(0);
    }
  });

  it('determinismo: mesma entrada produz exatamente o mesmo resultado', () => {
    const metrics: CareerStageMetricPoint[] = [
      point(METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS, { currentValue: 1_234_567, observedAt: ASOF, growth30d: growthOk(5.5) }),
      point(METRIC_KEYS.INSTAGRAM_FOLLOWERS, { currentValue: 654_321, observedAt: ASOF }),
    ];
    const input = baseInput({ metrics, platformsWithData: 2, mostRecentObservedAt: ASOF, historyDepthDays: 60 });
    const a = computeCareerStage(input);
    const b = computeCareerStage(input);
    expect(a).toEqual(b);
  });
});
