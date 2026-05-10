/**
 * integrations/index.ts
 *
 * Barrel raiz da camada de integrações do MUSIC OS 360.
 *
 * HIERARQUIA (do mais interno para o mais externo):
 *
 *   dto/        — interfaces de contrato (IAuthProvider, IEmailProvider, …)
 *   providers/  — implementações (mock + futuras reais)
 *   adapters/   — selecção de provider conforme MOCK_MODE (ponto de entrada dos módulos)
 *   clients/    — stubs de clientes HTTP de terceiros (documentação server-side)
 *   webhooks/   — contratos/tipos de webhooks (processados exclusivamente no backend)
 *   services/   — orquestração multi-adapter (signing + notifications)
 *   mappers/    — transformações entidade ↔ DTO
 *
 * REGRA DE IMPORTAÇÃO para módulos de domínio:
 *
 *   ✅  import { authAdapter }        from "@/integrations/adapters";
 *   ✅  import { signingService }     from "@/integrations/services";
 *   ✅  import { contratoMapper }     from "@/integrations/mappers";
 *   ❌  import { mockAuthProvider }   from "@/integrations/providers";  // proibido fora de adapters/
 *   ❌  import posthog from "posthog-js";                               // proibido — usar analyticsAdapter
 *   ❌  import * as Sentry from "@sentry/react";                        // proibido — usar errorMonitorAdapter
 */

/* Adapters — ponto de entrada principal para módulos */
export {
  authAdapter,
  emailAdapter,
  storageAdapter,
  paymentsAdapter,
  signingAdapter,
  analyticsAdapter,
  errorMonitorAdapter,
  getStreamingAdapter,
  getAdsAdapter,
  getRightsAdapter,
  chatAdapter,
} from "./adapters";

/* Services — orquestração multi-adapter */
export {
  signingService,
  notificationsService,
} from "./services";
export type {
  SendForSigningInput,
  SendForSigningResult,
  SendUserInviteInput,
  SendContratoExpiryAlertInput,
  SendLancamentoStatusInput,
} from "./services";

/* Mappers — transformações entidade ↔ DTO */
export { contratoMapper, transacaoMapper } from "./mappers";
export type { ContratoEntity, TransacaoEntity, OfxEntry, TransacaoCsvRow } from "./mappers";

/* DTOs — interfaces de contrato (para implementações de providers reais) */
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
} from "./dto";

/* Webhooks — tipos (documentação — processados exclusivamente no backend) */
export type {
  StripeWebhookEvent,
  StripeWebhookPayload,
  AutentiqueWebhookEvent,
  AutentiqueWebhookPayload,
} from "./webhooks";
