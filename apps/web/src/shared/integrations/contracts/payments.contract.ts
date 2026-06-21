/**
 * shared/integrations/contracts/payments.contract.ts
 *
 * Contrato de pagamentos — implementação alvo: Stripe.
 *
 * ESTADO ACTUAL: standalone — sem billing real.
 * MIGRAÇÃO FUTURA: IPaymentsProvider implementado via Stripe SDK no backend.
 *
 * Âmbito: subscriptions SaaS por tenant (não recebimentos externos de direitos de artistas).
 * Recebimentos externos de direitos são um domínio separado (accounting + rights).
 */

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type SubscriptionPlan =
  | "starter"
  | "professional"
  | "enterprise"
  | "custom";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "paused";

export type PaymentStatus =
  | "succeeded"
  | "pending"
  | "failed"
  | "refunded";

export interface SubscriptionFeatures {
  maxArtists: number | "unlimited";
  maxObras: number | "unlimited";
  maxUsers: number | "unlimited";
  hasAnalytics: boolean;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
}

export interface TenantSubscription {
  tenant_id: string;
  subscription_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string | null;
  cancel_at?: string | null;
  features: SubscriptionFeatures;
  /** Preço em centavos (BRL) */
  amount_cents: number;
  currency: "brl" | "usd";
}

export interface PaymentMethod {
  id: string;
  type: "card" | "boleto" | "pix";
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  invoice_url: string;
  pdf_url: string;
  issued_at: string;
  due_at: string;
  paid_at?: string | null;
}

export interface CreateCheckoutParams {
  tenant_id: string;
  plan: SubscriptionPlan;
  success_url: string;
  cancel_url: string;
  trial_days?: number;
}

export interface CreatePortalParams {
  tenant_id: string;
  return_url: string;
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

/**
 * IPaymentsProvider — contrato de billing e subscriptions SaaS.
 *
 * Implementações previstas:
 *   - MockPaymentsProvider   (standalone — dados fixos)
 *   - StripePaymentsProvider (produção — Stripe API via backend)
 */
export interface IPaymentsProvider {
  /** Dados da subscription activa do tenant */
  getSubscription(tenantId: string): Promise<TenantSubscription | null>;

  /** Cria uma sessão de Checkout para subscrever ou upgradar */
  createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string }>;

  /** Cria uma sessão do Customer Portal para gerir billing */
  createPortalSession(params: CreatePortalParams): Promise<{ url: string }>;

  /** Lista os métodos de pagamento do tenant */
  listPaymentMethods(tenantId: string): Promise<PaymentMethod[]>;

  /** Lista facturas emitidas */
  listInvoices(tenantId: string, limit?: number): Promise<Invoice[]>;

  /** Cancela a subscription no fim do período */
  cancelSubscription(tenantId: string): Promise<void>;

  /** Verifica se o tenant tem acesso a uma feature pelo plano */
  hasFeature(tenantId: string, feature: keyof SubscriptionFeatures): Promise<boolean>;
}

// ─── Limites por plano ────────────────────────────────────────────────────────

export const PLAN_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  starter: {
    maxArtists: 5,
    maxObras: 100,
    maxUsers: 3,
    hasAnalytics: false,
    hasAdvancedReports: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  professional: {
    maxArtists: 25,
    maxObras: 1000,
    maxUsers: 10,
    hasAnalytics: true,
    hasAdvancedReports: true,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  enterprise: {
    maxArtists: "unlimited",
    maxObras: "unlimited",
    maxUsers: "unlimited",
    hasAnalytics: true,
    hasAdvancedReports: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
  custom: {
    maxArtists: "unlimited",
    maxObras: "unlimited",
    maxUsers: "unlimited",
    hasAnalytics: true,
    hasAdvancedReports: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  },
};

