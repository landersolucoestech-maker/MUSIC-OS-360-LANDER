/**
 * integrations/clients/resend.client.ts
 *
 * Stub do cliente HTTP para Resend.
 *
 * REGRA: a Resend API key NUNCA chega ao frontend.
 * O frontend chama o backend que executa o envio server-side.
 *
 * Backend endpoints (via emailAdapter):
 *   POST /api/email/send          → envia e-mail transaccional
 *   GET  /api/email/status/:id    → estado de entrega de uma mensagem
 *
 * Casos de uso no MUSIC OS 360:
 *   - Convite de utilizadores ao tenant
 *   - Alertas de expiração de contrato
 *   - Relatórios periódicos de accounting
 *   - Notificações de aprovação/rejeição de lançamento
 *   - Confirmação de assinatura digital (Autentique)
 *
 * Variáveis de ambiente necessárias (backend):
 *   RESEND_API_KEY             — nunca no frontend
 *   RESEND_FROM_EMAIL          — ex.: "MUSIC OS 360 <noreply@musicos360.com.br>"
 *
 * Documentação: https://resend.com/docs
 * SDK: npm install resend (backend only)
 */

export const RESEND_CLIENT_STUB = {
  note: "Resend API key é server-side only.",
  apiBaseUrl: "https://api.resend.com",
  requiredBackendEnvVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  sdkInstallCommand: "npm install resend",
} as const;
