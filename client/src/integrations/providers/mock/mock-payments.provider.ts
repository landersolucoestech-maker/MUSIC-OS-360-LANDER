/**
 * integrations/providers/mock/mock-payments.provider.ts
 *
 * Implementação mock de IPaymentsProvider.
 * Âmbito: billing SaaS por tenant. NÃO cobre royalties de artistas.
 *
 * MIGRAÇÃO FUTURA: substituir por StripePaymentsProvider (backend proxy).
 */

import type {
  IPaymentsProvider,
  TenantSubscription,
  PaymentMethod,
  Invoice,
  CreateCheckoutParams,
  CreatePortalParams,
  SubscriptionFeatures,
} from "@/integrations/dto";
import { PLAN_FEATURES } from "@/integrations/dto";

const MOCK_SUBSCRIPTION: TenantSubscription = {
  tenant_id:            "mock-tenant-001",
  subscription_id:      "mock_sub_professional",
  plan:                 "professional",
  status:               "active",
  current_period_start: new Date(Date.now() - 15 * 86400_000).toISOString(),
  current_period_end:   new Date(Date.now() + 15 * 86400_000).toISOString(),
  trial_end:            null,
  cancel_at:            null,
  features:             PLAN_FEATURES["professional"],
  amount_cents:         49900,
  currency:             "brl",
};

const MOCK_PAYMENT_METHOD: PaymentMethod = {
  id:         "pm_mock_001",
  type:       "card",
  last4:      "4242",
  brand:      "visa",
  exp_month:  12,
  exp_year:   2027,
  is_default: true,
};

export class MockPaymentsProvider implements IPaymentsProvider {
  async getSubscription(tenantId: string): Promise<TenantSubscription | null> {
    if (tenantId !== "mock-tenant-001") return null;
    return { ...MOCK_SUBSCRIPTION, tenant_id: tenantId };
  }

  async createCheckoutSession(_params: CreateCheckoutParams): Promise<{ url: string }> {
    console.info("[MockPaymentsProvider] createCheckoutSession — redirect simulado.");
    return { url: "/settings?billing=checkout-simulated" };
  }

  async createPortalSession(_params: CreatePortalParams): Promise<{ url: string }> {
    console.info("[MockPaymentsProvider] createPortalSession — redirect simulado.");
    return { url: "/settings?billing=portal-simulated" };
  }

  async listPaymentMethods(_tenantId: string): Promise<PaymentMethod[]> {
    return [MOCK_PAYMENT_METHOD];
  }

  async listInvoices(_tenantId: string, limit = 12): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    for (let i = 0; i < Math.min(limit, 3); i++) {
      const d = new Date(Date.now() - i * 30 * 86400_000);
      invoices.push({
        id:              `inv_mock_${i}`,
        tenant_id:       _tenantId,
        subscription_id: "mock_sub_professional",
        amount_cents:    49900,
        currency:        "brl",
        status:          "succeeded",
        invoice_url:     "#",
        pdf_url:         "#",
        issued_at:       d.toISOString(),
        due_at:          d.toISOString(),
        paid_at:         d.toISOString(),
      });
    }
    return invoices;
  }

  async cancelSubscription(_tenantId: string): Promise<void> {
    console.info("[MockPaymentsProvider] cancelSubscription — no-op em modo standalone.");
  }

  async hasFeature(
    _tenantId: string,
    feature: keyof SubscriptionFeatures
  ): Promise<boolean> {
    const f = PLAN_FEATURES["professional"][feature];
    if (typeof f === "boolean") return f;
    return f !== 0;
  }
}

export const mockPaymentsProvider = new MockPaymentsProvider();
