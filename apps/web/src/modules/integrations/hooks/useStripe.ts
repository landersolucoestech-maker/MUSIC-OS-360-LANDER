/**
 * integrations/hooks/useStripe.ts
 *
 * Hook stub para integração Stripe (billing de subscriptions SaaS).
 *
 * ÂMBITO: billing da plataforma MUSIC OS 360 por tenant.
 * NÃO abrange recebimentos externos de direitos ou pagamentos para artistas (domínio Accounting).
 *
 * ESTADO ACTUAL: standalone — sem billing real; plano simulado em TenantContext.
 * MIGRAÇÃO FUTURA:
 *   1. Configurar Stripe com price IDs por plano
 *   2. Implementar webhook endpoint no backend
 *   3. Substituir TenantBilling mock por dados reais da subscription
 *
 * Contrato: @/shared/integrations/contracts/payments.contract → IPaymentsProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import type { TenantSubscription } from "@/shared/integrations/contracts/payments.contract";
import { PLAN_FEATURES } from "@/shared/integrations/contracts/payments.contract";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do Stripe ──────────────────────────────────────────────

export interface StripeStatus extends IntegrationRuntimeStatus {
  integration_id: "stripe";
  publishable_key_configured: boolean;
  webhook_configured: boolean;
  mode: "live" | "test" | "disabled";
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useStripeStatus() {
  return useQuery<StripeStatus>({
    queryKey: ["integrations", "stripe", "status"],
    queryFn: async (): Promise<StripeStatus> => ({
      integration_id: "stripe",
      status: "disabled",
      connected: false,
      publishable_key_configured: false,
      webhook_configured: false,
      mode: "disabled",
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Hook de subscription (mock) ─────────────────────────────────────────────

/**
 * Em modo standalone devolve a subscription mock do tenant.
 * MIGRAÇÃO FUTURA: chamar backend que consulta Stripe API.
 */
export function useStripeSubscription(tenantId: string) {
  return useQuery<TenantSubscription | null>({
    queryKey: ["integrations", "stripe", "subscription", tenantId],
    queryFn: async (): Promise<TenantSubscription> => ({
      tenant_id: tenantId,
      subscription_id: "mock_sub_professional",
      plan: "professional",
      status: "active",
      current_period_start: new Date(Date.now() - 15 * 86400_000).toISOString(),
      current_period_end: new Date(Date.now() + 15 * 86400_000).toISOString(),
      trial_end: null,
      cancel_at: null,
      features: PLAN_FEATURES["professional"],
      amount_cents: 49900,
      currency: "brl",
    }),
    staleTime: 5 * 60_000,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

export function useStripeCheckout() {
  return {
    createSession: () => disabledIntegration("Stripe"),
  };
}

export function useStripePortal() {
  return {
    createSession: () => disabledIntegration("Stripe"),
  };
}
