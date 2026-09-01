/**
 * analytics/market-benchmark-refresh.types.ts
 *
 * Fase 3.2 — payload do job de refresh em background do Market Benchmark.
 * Item 27: só identifiers seguros — nenhum token/secret/credencial.
 */
export interface MarketBenchmarkRefreshJobPayload {
  tenant_id: string;
  artist_id: string;
  target_uuid: string;
  engine_version: string;
  reason: 'cold' | 'stale' | 'manual';
  idempotency_key: string;
}

/** Resultado observável do job (item 28), gravado nos logs — não persistido em tabela própria (reusa o snapshot já persistido + logs estruturados). */
export interface MarketBenchmarkRefreshJobResult {
  status: 'OK' | 'INSUFFICIENT_MARKET_DATA';
  candidateCount: number;
  metricRequestCount: number;
  cacheHits: number;
  cacheMisses: number;
  fallbackLevel: 1 | 2;
  durationMs: number;
}
