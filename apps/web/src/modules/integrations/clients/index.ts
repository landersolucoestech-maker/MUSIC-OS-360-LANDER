/**
 * integrations/clients/index.ts
 *
 * Barrel de todos os stubs de clientes HTTP de terceiros.
 * Estes stubs documentam as variáveis de ambiente necessárias,
 * os endpoints backend correspondentes e os SDKs a instalar
 * quando a integração for activada em produção.
 *
 * REGRA: nenhum destes clientes é chamado directamente pelo frontend.
 * O frontend usa sempre os adapters em integrations/adapters/.
 */

export { CLERK_CLIENT_STUB }   from "./clerk.client";
export { STRIPE_CLIENT_STUB }  from "./stripe.client";
export { RESEND_CLIENT_STUB }  from "./resend.client";
