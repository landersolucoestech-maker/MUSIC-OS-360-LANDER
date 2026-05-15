/**
 * lib/api.ts — Ponto de entrada canónico para o cliente HTTP.
 *
 * Re-exporta de shared/lib/api-client para que novos módulos
 * importem sempre de @/lib/api em vez de @/shared/lib/api-client.
 */
export {
  api,
  setAccessToken,
  getAccessToken,
  TABLE_ENDPOINT,
  PENDING_TABLES,
} from "@/shared/lib/api-client";
