/**
 * lib/query-client.ts — QueryClient e constantes de cache centralizados.
 *
 * Re-exporta de shared/lib/query-config para que novos módulos
 * importem sempre de @/lib/query-client.
 */
export { CACHE_TIMES, QUERY_KEYS, QUERY_CACHE_CONFIG, getCacheConfig, createQueryClient } from "@/shared/lib/query-config";
