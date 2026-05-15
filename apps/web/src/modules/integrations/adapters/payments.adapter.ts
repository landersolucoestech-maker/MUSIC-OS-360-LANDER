/**
 * integrations/adapters/payments.adapter.ts
 *
 * Adapter de billing SaaS — selecciona MockPaymentsProvider (standalone)
 * ou StripePaymentsProvider (produção — via backend).
 *
 * REGRA: o frontend NUNCA usa a Stripe secret key.
 * Em produção, o backend cria Checkout/Portal sessions e devolve a URL.
 *
 * Âmbito: billing da plataforma (subscriptions tenant).
 * NÃO cobre royalties de artistas (domínio Accounting).
 *
 * Uso:
 *   import { paymentsAdapter } from "@/modules/integrations/adapters/payments.adapter";
 *   const { url } = await paymentsAdapter.createCheckoutSession({ tenant_id, plan, success_url, cancel_url });
 */

import type { IPaymentsProvider } from "@/modules/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockPaymentsProvider } from "@/modules/integrations/providers";

function resolvePaymentsProvider(): IPaymentsProvider {
  if (MOCK_MODE) return mockPaymentsProvider;

  // PRODUÇÃO: StripePaymentsProvider que chama o backend:
  //   POST /api/billing/checkout  → backend cria session Stripe e retorna url
  //   POST /api/billing/portal    → backend cria session portal e retorna url
  //   GET  /api/billing/subscription → backend consulta Stripe API
  // import { BackendPaymentsProvider } from "@/modules/integrations/providers/backend/backend-payments.provider";
  // return new BackendPaymentsProvider();
  return mockPaymentsProvider;
}

export const paymentsAdapter: IPaymentsProvider = resolvePaymentsProvider();
