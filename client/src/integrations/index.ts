/**
 * integrations/index.ts — COMPATIBILITY BARREL
 *
 * ATENÇÃO: Esta pasta foi consolidada em client/src/modules/integrations/.
 * Este ficheiro existe APENAS para compatibilidade de imports legados.
 * Importe sempre de "@/modules/integrations/" em novo código.
 *
 * Toda a infraestrutura de integrações (providers, adapters, clients,
 * services, mappers, webhooks, DTOs) vive agora em:
 *   client/src/modules/integrations/
 */

export * from "@/modules/integrations/adapters";
export * from "@/modules/integrations/services";
export * from "@/modules/integrations/mappers";
export type {
  IAuthProvider,
  IEmailProvider,
  IStorageProvider,
  IPaymentsProvider,
  ISigningProvider,
  IAnalyticsProvider,
  IErrorMonitorProvider,
  IStreamingProvider,
  IAdsProvider,
  IRightsProvider,
  IChatProvider,
  StreamingPlatformId,
  AdsPlatformId,
  RightsEntityId,
} from "@/modules/integrations/dto";
export type {
  StripeWebhookEvent,
  StripeWebhookPayload,
  AutentiqueWebhookEvent,
  AutentiqueWebhookPayload,
} from "@/modules/integrations/webhooks";
