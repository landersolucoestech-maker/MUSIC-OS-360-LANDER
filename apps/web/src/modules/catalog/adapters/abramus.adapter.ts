/**
 * catalog/adapters/abramus.adapter.ts
 *
 * Ponto de desacoplamento futuro: integração ABRAMUS → domínio Catálogo.
 *
 * ESTADO ATUAL: re-exporta os tipos e hooks do módulo integrations.
 * Todo código de catálogo que depende de ABRAMUS deve importar daqui,
 * não diretamente de @/modules/integrations.
 *
 * MIGRAÇÃO FUTURA:
 * - Mover lógica ABRAMUS específica do catálogo para cá
 * - Isolar o contrato do adaptador: CatalogAbramusPort
 * - integrations/ expõe apenas o cliente genérico
 *
 * Uso actual:
 *   import { useAbramusSearch, useAbramusImport } from "@/modules/catalog/adapters/abramus.adapter"
 */

export type {
  AbramusSearchResult,
  AbramusSearchResponse,
  AbramusKind,
  AbramusLocalMatch,
  AbramusStatus,
} from "@/modules/integrations/hooks/useAbramus";

export {
  useAbramusStatus,
  useAbramusSearch,
  useAbramusImport,
  useAbramusLocalLookup,
  useAbramusSyncAll,
  useAbramusSaveCredentials,
  useAbramusDeleteCredentials,
  useAbramusSetSchedule,
} from "@/modules/integrations/hooks/useAbramus";
