/**
 * analytics/market-benchmark.config.ts
 *
 * Fase 3.1 — correção do defeito conceitual reportado: a Fase 3 usava
 * "outros artistas do mesmo tenant" como coorte, o que confunde tenant
 * (fronteira de SEGURANÇA/OWNERSHIP) com MERCADO (população real
 * comparável). Coorte agora vem de artistas EXTERNOS reais descobertos via
 * Soundcharts `/related` (confirmado ao vivo, DJ Stay: 40 candidatos reais,
 * cada um com métricas reais buscáveis diretamente pelo UUID Soundcharts —
 * ver SoundchartsService.getRelatedArtists/getArtistCountryCode).
 *
 * Comparação interna entre artistas do MESMO tenant (o que a Fase 3 fazia)
 * continua sendo um indicador legítimo — só não pode se chamar "Market
 * Benchmark". Não implementada nesta missão como produto separado (fora do
 * pedido desta missão); se o produto quiser isso no futuro, é
 * PORTFOLIO/TENANT BENCHMARK, um domínio diferente (item 14).
 */
import { METRIC_KEYS, type MetricKey } from '../metric-keys';

export const MARKET_BENCHMARK_ENGINE_VERSION = '2.0.0';

/**
 * Mínimo validado (item 15): testado com 10/20/30/50 candidatos reais
 * (market-benchmark.engine.spec.ts, describe "sensibilidade do mínimo").
 * 10 é o piso clássico abaixo do qual o erro padrão de um percentil deixa de
 * ser controlável (erro padrão de uma proporção ~ 1/√n — com n=10, ±~16 pontos
 * percentuais de incerteza já é grande, mas é o menor n em que "percentil"
 * ainda tem algum significado estatístico mínimo). n>=30 é o limiar clássico
 * da aproximação normal — por isso SAMPLE_QUALITY usa 30 como piso de
 * confiabilidade "HIGH" (ver sampleQualityFor abaixo), não como mínimo de
 * cálculo. Manter 10 como piso de CÁLCULO e usar um indicador de qualidade
 * separado (em vez de simplesmente subir o mínimo) preserva mais artistas
 * com resultado real, mas honesto sobre a confiabilidade.
 */
export const MINIMUM_COHORT_SIZE = 10;

/** Amostra >= isto é estatisticamente mais robusta (aproximação normal clássica) — usado só para o rótulo de qualidade, não é um segundo mínimo de cálculo. */
export const HIGH_QUALITY_SAMPLE_SIZE = 30;

/**
 * Orçamento de chamadas à Soundcharts por refresh de coorte (item 17): a UI
 * NUNCA consulta a Soundcharts diretamente. Um cálculo de benchmark com
 * cache frio faz no máximo
 * `MAX_CANDIDATES_PER_REFRESH * (BENCHMARK_METRICS.length + 1 chamada de país)`
 * chamadas — para 20 candidatos × 7 métricas = 140, um teto deliberado (DJ
 * Stay tem 40 relacionados reais; 20 já é amostra grande o suficiente para
 * HIGH_QUALITY_SAMPLE_SIZE). Chamadas subsequentes dentro do TTL reusam
 * cache (market_reference_metrics), sem nova chamada.
 */
export const MAX_CANDIDATES_PER_REFRESH = 20;

/**
 * Concorrência do fetch de métricas de candidatos (Fase 3.2, item 11): 1 =
 * estritamente sequencial, nunca `Promise.all` irrestrito. Escolha
 * deliberadamente conservadora — sem confirmação de rate-limit/concorrência
 * do plano Soundcharts contratado (item 19: LICENSING_RETENTION_NOT_VERIFIED),
 * a opção mais segura é a mais lenta, não a mais rápida. Agora que o refresh
 * roda em background (não bloqueia mais o request HTTP — Fase 3.2), o custo
 * de ser sequencial deixou de ser um problema de latência percebida pelo
 * usuário.
 */
export const CANDIDATE_FETCH_CONCURRENCY = 1;

/**
 * TTL do CACHE DE REFERÊNCIA (por métrica de candidato externo) — item 18.
 * Deliberadamente SEPARADO do TTL do SNAPSHOT DE BENCHMARK
 * (BENCHMARK_SNAPSHOT_TTL_HOURS abaixo, item 13): o cache de referência é
 * granular por métrica (uma métrica pode estar fresca enquanto outra do
 * mesmo candidato está stale); o snapshot é o resultado agregado já
 * calculado, servido pela leitura rápida (getStatus) — os dois podem
 * divergir de propósito (ex.: snapshot TTL menor forçaria recálculo mais
 * frequente mesmo com cache de referência ainda fresco).
 */
export const COHORT_CACHE_TTL_HOURS = 24;

/**
 * TTL do SNAPSHOT DE BENCHMARK persistido (item 13): acima disto, uma leitura
 * (`getStatus`) ainda serve o último snapshot (stale-while-revalidate, item
 * 6), mas marca `readStatus=STALE` e enfileira um refresh em background.
 */
export const BENCHMARK_SNAPSHOT_TTL_HOURS = 24;

export type CohortFallbackLevel = 1 | 2;

/**
 * Fallback determinístico usando SOMENTE atributos reais confirmados
 * (item 13): related-artists é sempre a base (nunca puramente genre/tenant
 * standalone — não temos dado de gênero confiável para candidatos externos,
 * ver auditoria no relatório). L1 estreita por país quando o próprio
 * artista-alvo tem country_code conhecido na Soundcharts; cai para L2 (todos
 * os relacionados, sem filtro de país) quando L1 não atinge o mínimo — nunca
 * cai para "artistas do tenant" (removido, era o defeito conceitual desta
 * missão).
 */
export const COHORT_FALLBACK_LEVELS: Array<{ level: CohortFallbackLevel; description: string }> = [
  { level: 1, description: 'artistas relacionados (Soundcharts /related) com o mesmo country_code do artista-alvo' },
  { level: 2, description: 'artistas relacionados (Soundcharts /related), sem filtro de país' },
];

/** Métricas comparadas no benchmark — mesmo registry tipado usado no Career Stage/Histórico. */
export const BENCHMARK_METRICS: MetricKey[] = [
  METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS,
  METRIC_KEYS.YOUTUBE_SUBSCRIBERS,
  METRIC_KEYS.DEEZER_FANS,
  METRIC_KEYS.SOUNDCLOUD_FOLLOWERS,
  METRIC_KEYS.INSTAGRAM_FOLLOWERS,
  METRIC_KEYS.TIKTOK_FOLLOWERS,
];

export interface BenchmarkLabelBand {
  min: number;
  max: number;
  label: string;
}

/** Percentil agregado (0-100) → rótulo, config centralizada (item 34). */
export const BENCHMARK_LABELS: BenchmarkLabelBand[] = [
  { min: 0, max: 19, label: 'Abaixo da Média' },
  { min: 20, max: 44, label: 'Na Média' },
  { min: 45, max: 69, label: 'Acima da Média' },
  { min: 70, max: 89, label: 'Forte' },
  { min: 90, max: 100, label: 'Top Performer' },
];

export const STALE_AFTER_DAYS = 14;
