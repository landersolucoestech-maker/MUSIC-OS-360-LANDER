/**
 * shared/integrations/index.ts
 *
 * Barrel principal do sistema de integrações do MUSIC OS 360.
 *
 * Estrutura:
 *   types.ts    — IntegrationId, IntegrationCategory, IntegrationStatus, etc.
 *   registry.ts — metadados centrais de todas as integrações
 *   contracts/  — interfaces IXxxProvider por categoria
 *
 * REGRA: código de domínio importa de "@/modules/<domain>/adapters/<x>.adapter"
 * e NÃO directamente de "@/shared/integrations".
 * Este barrel é para uso interno de infraestrutura e Settings.
 */

export type {
  IntegrationId,
  IntegrationCategory,
  IntegrationStatus,
  IntegrationMeta,
  IntegrationCredentials,
  IntegrationHealthCheck,
  IntegrationRuntimeStatus,
} from "./types";

export {
  INTEGRATION_REGISTRY,
  getIntegration,
  getIntegrationsByCategory,
  getAllIntegrations,
  getAllCategories,
  credentialsStorageKey,
} from "./registry";

export * from "./contracts";
