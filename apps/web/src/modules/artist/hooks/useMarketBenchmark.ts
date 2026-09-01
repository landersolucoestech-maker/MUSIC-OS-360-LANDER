import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";

// Espelha MarketBenchmarkResult (apps/api/.../analytics/market-benchmark.engine.ts).
export type BenchmarkMetricStatus = "AVAILABLE" | "ARTIST_VALUE_UNAVAILABLE" | "INSUFFICIENT_COHORT";
export type SampleQuality = "HIGH" | "MEDIUM" | "INSUFFICIENT";

export interface BenchmarkMetricResult {
  metricKey: string;
  status: BenchmarkMetricStatus;
  artistValue: number | null;
  cohortMedian: number | null;
  percentile: number | null;
  sampleSize: number;
  sampleQuality: SampleQuality;
  source: "soundcharts";
}

export interface CohortDefinition {
  sourceArtistUuid: string | null;
  countryFilter: string | null;
  candidateCount: number;
}

export interface MarketBenchmarkResult {
  status: "OK" | "INSUFFICIENT_MARKET_DATA";
  score: number | null;
  label: string | null;
  cohortDefinition: CohortDefinition;
  sampleSize: number;
  fallbackLevel: 1 | 2;
  metrics: BenchmarkMetricResult[];
  engineVersion: string;
  calculatedAt: string;
}

// Fase 3.2 — leitura sempre rápida (item 4/26): o refresh de coorte externa
// (até ~65s de chamadas Soundcharts) roda em background; o GET nunca espera
// por ele. `readStatus` diz o que a UI deve mostrar; `result` é o último
// cálculo conhecido (servido mesmo quando STALE — stale-while-revalidate).
export type MarketBenchmarkReadStatus = "READY" | "STALE" | "REFRESHING" | "INTEGRATION_UNAVAILABLE" | "ERROR";

export interface MarketBenchmarkReadResult {
  readStatus: MarketBenchmarkReadStatus;
  result: MarketBenchmarkResult | null;
  staleSince: string | null;
}

export const marketBenchmarkKey = (artistId: string | null | undefined) => ["artists", artistId, "market-benchmark"];

/**
 * Fase 3.2 — Benchmark de Mercado: leitura rápida (nunca bloqueia por
 * refresh externo). Enquanto `readStatus` for REFRESHING, faz polling curto
 * para pegar o resultado assim que o worker em background terminar — sem
 * mostrar progresso inventado (item 31), só reconsultando.
 */
export function useMarketBenchmark(artistId: string | null | undefined) {
  return useQuery({
    queryKey: marketBenchmarkKey(artistId),
    queryFn: async () => {
      if (!artistId) return null;
      return api.get<MarketBenchmarkReadResult>(`/artists/${artistId}/market-benchmark`);
    },
    enabled: Boolean(artistId),
    staleTime: 5 * 60_000,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as MarketBenchmarkReadResult | null | undefined;
      return data?.readStatus === "REFRESHING" ? 5_000 : false;
    },
  });
}
