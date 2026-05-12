/**
 * integrations/clients/clerk.client.ts
 *
 * Stub do cliente HTTP para a API Clerk.
 *
 * ESTADO ACTUAL: stub — documentação da migração futura.
 * REGRA: este cliente NUNCA é chamado pelo frontend.
 *   Autenticação via Clerk é gerida pelo ClerkProvider (server-side tokens).
 *   O frontend usa apenas hooks Clerk (useUser, useSession) via @clerk/react.
 *
 * MIGRAÇÃO FUTURA:
 *   1. npm install @clerk/react
 *   2. Envolver <App> com <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>
 *   3. Substituir AuthProvider por ClerkAuthProvider
 *
 * Backend Clerk endpoints (server-side apenas):
 *   POST   /v1/sessions                     → criar sessão
 *   DELETE /v1/sessions/:session_id          → revogar sessão
 *   GET    /v1/users/:user_id               → perfil do utilizador
 *   POST   /v1/organizations/:org_id/invitations → convidar membro
 *   DELETE /v1/organizations/:org_id/memberships/:user_id → revogar membro
 *
 * Variáveis de ambiente necessárias (backend):
 *   CLERK_SECRET_KEY        — nunca no frontend
 *   CLERK_WEBHOOK_SECRET    — para validar webhooks
 *
 * Variáveis de ambiente do frontend (públicas):
 *   VITE_CLERK_PUBLISHABLE_KEY — segura, pode estar no .env do frontend
 */

export const CLERK_CLIENT_STUB = {
  note: "Clerk client é server-side only. Frontend usa @clerk/react SDK.",
  backendBaseUrl: "https://api.clerk.com/v1",
  requiredBackendEnvVars: ["CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET"],
  requiredFrontendEnvVars: ["VITE_CLERK_PUBLISHABLE_KEY"],
} as const;
