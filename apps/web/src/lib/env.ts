/**
 * lib/env.ts — Variáveis de ambiente centralizadas.
 *
 * Re-exporta de shared/lib/env. Nenhum ficheiro deve ler
 * import.meta.env directamente — importar sempre daqui ou de @/shared/lib/env.
 */
export {
  MOCK_MODE,
  API_BASE_URL,
  IS_DEV,
  IS_PROD,
  WS_URL,
  ENV_MODE,
} from "@/shared/lib/env";
