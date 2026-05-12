/**
 * integrations/webhooks/index.ts
 *
 * Barrel de contratos/documentação de todos os webhooks do MUSIC OS 360.
 *
 * REGRA: estes módulos são APENAS documentação e tipos.
 * Nenhum webhook é processado no frontend.
 * Todos os webhooks são recebidos e validados no backend.
 */

export {
  STRIPE_WEBHOOK_EVENTS,
  STRIPE_WEBHOOK_ACTIONS,
} from "./stripe.webhook";

export type {
  StripeWebhookEvent,
  StripeWebhookPayload,
} from "./stripe.webhook";

export {
  AUTENTIQUE_WEBHOOK_EVENTS,
  AUTENTIQUE_WEBHOOK_ACTIONS,
} from "./autentique.webhook";

export type {
  AutentiqueWebhookEvent,
  AutentiqueWebhookPayload,
} from "./autentique.webhook";
