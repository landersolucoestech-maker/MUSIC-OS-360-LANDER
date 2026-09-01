/**
 * analytics/career-stage.config.ts
 *
 * Fase 3 — configuração centralizada e versionada do Career Stage Engine.
 * Nenhum peso/threshold/ceiling condicional espalhado em código de
 * UI/serviço (item 12) — tudo aqui, testado em career-stage.engine.spec.ts.
 *
 * MODELO: ABSOLUTO / MODEL-BASED (Fase 3.1, item 23) — cada métrica é
 * comparada contra um `ceiling` FIXO e versionado (ver AUDIENCE_CEILINGS),
 * nunca contra outros artistas. "Estágio da carreira" mede maturidade
 * absoluta segundo esse modelo, não posição relativa a pares. Comparação
 * relativa (percentil vs. mercado real) é responsabilidade EXCLUSIVA do
 * Market Benchmark Engine (market-benchmark.engine.ts) — os dois nunca se
 * misturam: Career Stage não lê nenhum resultado do Benchmark, e o Benchmark
 * nunca usa o score já normalizado do Career Stage como entrada (usa sempre
 * o valor bruto da métrica — ver market-benchmark.engine.ts item 19).
 */
import { METRIC_KEYS, type MetricKey } from '../metric-keys';

// Fase 3.1: bump por mudança de fórmula (AUDIENCE deixou de incluir
// SPOTIFY_MONTHLY_LISTENERS — corrige double counting com STREAMING, item
// 28). Snapshots gravados com engine_version=1.0.0 permanecem no banco
// (append-only) e não são recalculados retroativamente.
export const CAREER_STAGE_ENGINE_VERSION = '1.1.0';

export type CareerStageDimensionKey = 'AUDIENCE' | 'STREAMING' | 'SOCIAL' | 'MARKET_PRESENCE' | 'GROWTH' | 'MOMENTUM';

export const CAREER_STAGE_DIMENSION_KEYS: CareerStageDimensionKey[] = [
  'AUDIENCE', 'STREAMING', 'SOCIAL', 'MARKET_PRESENCE', 'GROWTH', 'MOMENTUM',
];

/**
 * Somam exatamente 100 (testado). AUDIENCE tem o maior peso por ser o sinal
 * mais amplo (soma de alcance entre plataformas de consumo musical).
 * STREAMING isolado porque é o sinal mais direto de "as pessoas realmente
 * ouvem" — distinto de seguidores passivos. SOCIAL cobre Instagram/TikTok
 * (engajamento social puro, fora do consumo musical direto). MARKET_PRESENCE
 * (Apple Music playlist count) tem peso baixo porque hoje é a dimensão com
 * menor cobertura real observada (investigação Soundcharts, Fase 3). GROWTH
 * e MOMENTUM são auxiliares (curto e longo prazo, respectivamente).
 */
export const CAREER_STAGE_WEIGHTS: Record<CareerStageDimensionKey, number> = {
  AUDIENCE: 25,
  STREAMING: 20,
  SOCIAL: 20,
  MARKET_PRESENCE: 10,
  GROWTH: 20,
  MOMENTUM: 5,
};

/**
 * Métricas que alimentam cada dimensão de tamanho/audiência (current value,
 * log-normalizado).
 *
 * AUDITORIA 2026-08-31 (Fase 3.1, item 28 — double counting): SPOTIFY_MONTHLY_LISTENERS
 * vivia em AUDIENCE e em STREAMING simultaneamente, sobreponderando o
 * Spotify em relação a YouTube/Deezer/SoundCloud (que só contribuem uma
 * vez). Corrigido: AUDIENCE agora cobre exclusivamente alcance de
 * PLATAFORMAS NÃO cobertas por outra dimensão (YouTube/Deezer/SoundCloud —
 * "quantas pessoas te seguem/assistem fora do Spotify"); STREAMING continua
 * isolado no Spotify (o sinal mais direto de "as pessoas realmente ouvem").
 * Cada métrica de audiência agora contribui para EXATAMENTE uma dimensão de
 * tamanho — verificado por teste (career-stage.config.spec.ts).
 */
export const DIMENSION_METRICS: Record<'AUDIENCE' | 'STREAMING' | 'SOCIAL' | 'MARKET_PRESENCE', MetricKey[]> = {
  AUDIENCE: [
    METRIC_KEYS.YOUTUBE_SUBSCRIBERS,
    METRIC_KEYS.DEEZER_FANS,
    METRIC_KEYS.SOUNDCLOUD_FOLLOWERS,
  ],
  STREAMING: [METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS],
  SOCIAL: [METRIC_KEYS.INSTAGRAM_FOLLOWERS, METRIC_KEYS.TIKTOK_FOLLOWERS],
  MARKET_PRESENCE: [METRIC_KEYS.APPLE_MUSIC_PLAYLIST_COUNT],
};

/**
 * Métricas elegíveis para as dimensões de crescimento — GROWTH usa a janela
 * de 30d (curto prazo), MOMENTUM usa 90d (tendência de médio prazo). Mesmo
 * conjunto de métricas-base (audiência) que sustenta AUDIENCE/STREAMING/
 * SOCIAL — reaproveita o histórico já ingerido (Fase 2), nunca chamada nova.
 */
export const GROWTH_ELIGIBLE_METRICS: MetricKey[] = [
  METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS,
  METRIC_KEYS.YOUTUBE_SUBSCRIBERS,
  METRIC_KEYS.DEEZER_FANS,
  METRIC_KEYS.SOUNDCLOUD_FOLLOWERS,
  METRIC_KEYS.INSTAGRAM_FOLLOWERS,
  METRIC_KEYS.TIKTOK_FOLLOWERS,
];

/**
 * Valor de referência (não um limite físico) que mapeia para score=100 na
 * normalização logarítmica de cada métrica — ver metric-normalization.util.ts.
 * Ordens de grandeza escolhidas para refletir o teto realista de audiência
 * de cada plataforma para um artista independente/emergente típico do
 * produto, não o recorde mundial da plataforma.
 */
export const AUDIENCE_CEILINGS: Record<MetricKey, number> = {
  [METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS]: 50_000_000,
  [METRIC_KEYS.YOUTUBE_SUBSCRIBERS]: 30_000_000,
  [METRIC_KEYS.YOUTUBE_VIEWS]: 500_000_000,
  [METRIC_KEYS.YOUTUBE_VIDEOS]: 2_000,
  [METRIC_KEYS.DEEZER_FANS]: 10_000_000,
  [METRIC_KEYS.SOUNDCLOUD_FOLLOWERS]: 10_000_000,
  [METRIC_KEYS.INSTAGRAM_FOLLOWERS]: 50_000_000,
  [METRIC_KEYS.TIKTOK_FOLLOWERS]: 50_000_000,
  [METRIC_KEYS.APPLE_MUSIC_PLAYLIST_COUNT]: 5_000,
};

/** +50%/-50% no período mapeiam para score 100/0 — ver normalizeGrowthPercent. */
export const GROWTH_POSITIVE_CEILING = 50;
export const GROWTH_NEGATIVE_FLOOR = -50;

/**
 * Coverage gate (item 14): abaixo destes mínimos, o resultado é
 * INSUFFICIENT_DATA — nunca um score calculado sobre 1 métrica isolada.
 */
export const CAREER_STAGE_COVERAGE_GATE = {
  minimumAvailableDimensions: 2,
  /** Fração do peso total (0-1) que precisa estar coberta por dimensões disponíveis. */
  minimumCoverageWeight: 0.3,
};

/** Confiabilidade do dado ainda usável, mas sinalizada como potencialmente desatualizada. */
export const STALE_AFTER_DAYS = 14;

export interface CareerStageClassificationBand {
  min: number;
  max: number;
  label: string;
}

/** Thresholds do item 15 — configuração, não condicional espalhada. */
export const CAREER_STAGE_CLASSIFICATION: CareerStageClassificationBand[] = [
  { min: 0.0, max: 1.9, label: 'Início' },
  { min: 2.0, max: 3.9, label: 'Emergente' },
  { min: 4.0, max: 5.9, label: 'Em Desenvolvimento' },
  { min: 6.0, max: 7.4, label: 'Em Ascensão' },
  { min: 7.5, max: 8.9, label: 'Consolidado' },
  { min: 9.0, max: 10.0, label: 'Alta Relevância' },
];

/** Dimensão é considerada fator positivo/gargalo fora desta faixa neutra (score 0-100). */
export const EXPLAINABILITY_THRESHOLDS = { positive: 65, bottleneck: 35 };
