/**
 * contracts/adapters/autentique.adapter.ts
 *
 * Ponto de desacoplamento futuro: integração Autentique → domínio Contratos.
 *
 * ESTADO ATUAL: re-exporta os tipos e hooks do módulo integrations.
 * Todo código de contratos que depende do Autentique deve importar daqui,
 * não diretamente de @/modules/integrations.
 *
 * MIGRAÇÃO FUTURA:
 * - Mover lógica Autentique específica de contratos para cá
 * - Isolar o contrato do adaptador: ContractsSigningPort
 * - integrations/ expõe apenas o cliente genérico de assinatura digital
 *
 * Uso actual:
 *   import { useAutentique } from "@/modules/contracts/adapters/autentique.adapter"
 */

export type { AutentiqueStatus } from "@/modules/integrations/hooks/useAutentique";

export {
  useAutentiqueStatus,
  useAutentiqueSaveCredentials,
  useAutentiqueDeleteCredentials,
  useAutentique,
} from "@/modules/integrations/hooks/useAutentique";
