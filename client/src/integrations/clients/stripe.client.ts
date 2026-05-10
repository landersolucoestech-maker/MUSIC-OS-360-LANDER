/**
 * integrations/clients/stripe.client.ts
 *
 * Stub do cliente HTTP para Stripe.
 *
 * REGRA CRÍTICA: a Stripe secret key NUNCA chega ao frontend.
 * O frontend chama endpoints do backend que executam as chamadas Stripe server-side.
 * O frontend pode usar Stripe.js (apenas para tokenização de cartão — sem secret key).
 *
 * Âmbito: billing SaaS por tenant. NÃO cobre royalties de artistas.
 *
 * Backend endpoints que o frontend chama (via paymentsAdapter):
 *   POST /api/billing/checkout           → cria Checkout Session → retorna { url }
 *   POST /api/billing/portal             → cria Customer Portal  → retorna { url }
 *   GET  /api/billing/subscription       → consulta subscription do tenant
 *   GET  /api/billing/invoices           → lista facturas
 *   GET  /api/billing/payment-methods    → lista métodos de pagamento
 *   POST /api/billing/cancel             → cancela subscription
 *
 * Webhook (backend apenas):
 *   POST /webhooks/stripe                → processa eventos Stripe
 *   Eventos: customer.subscription.updated, invoice.paid, invoice.payment_failed,
 *            customer.subscription.deleted, checkout.session.completed
 *
 * Variáveis de ambiente necessárias (backend):
 *   STRIPE_SECRET_KEY          — nunca no frontend
 *   STRIPE_WEBHOOK_SECRET      — para validar assinatura de webhook
 *
 * Variáveis de ambiente do frontend (opcionais, apenas para Stripe.js):
 *   VITE_STRIPE_PUBLISHABLE_KEY — segura, pode estar no .env do frontend
 */

export const STRIPE_CLIENT_STUB = {
  note: "Stripe secret key é server-side only. Frontend usa URLs de redirect geradas pelo backend.",
  backendBaseUrl: "https://api.stripe.com/v1",
  requiredBackendEnvVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  optionalFrontendEnvVars: ["VITE_STRIPE_PUBLISHABLE_KEY"],
  sdkInstallCommand: "npm install stripe",
  sdkFrontendInstallCommand: "npm install @stripe/stripe-js @stripe/react-stripe-js",
} as const;
