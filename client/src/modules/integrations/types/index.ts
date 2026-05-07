/**
 * Tipos canônicos do módulo integrations.
 * Cada sub-integração tem seus tipos re-exportados aqui para
 * facilitar imports centralizados.
 */
export type {
  AbramusStatus,
  AbramusSyncSchedule,
  AbramusSyncSummary,
  AbramusSyncCategorySummary,
  AbramusObraResult,
  AbramusFonogramaResult,
} from "../hooks/useAbramus";

export type {
  SpotifyStatus,
  SpotifyArtist,
  MetricEvolutionPoint,
} from "../hooks/useSpotify";

export type { ContentType } from "@/modules/marketing/hooks/useMarketingAI";
