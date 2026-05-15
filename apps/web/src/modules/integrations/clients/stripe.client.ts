/**
 * integrations/clients/stripe.client.ts
 *
 * Cliente HTTP para o backend Stripe Billing.
 *
 * REGRA CRÍTICA: a Stripe secret key NUNCA chega ao frontend.
 * O frontend chama endpoints do backend que executam as chamadas Stripe server-side.
 *
 * Backend endpoints:
 *   POST /billing/checkout     → cria Checkout Session → retorna { url }
 *   POST /billing/portal       → abre Customer Portal  → retorna { url }
 *   GET  /billing/subscription → consulta subscription do tenant
 */

import { api } from '@/shared/lib/api-client';

export const stripeClient = {
  createCheckout: (plan: string, successUrl: string, cancelUrl: string) =>
    api.post<{ url: string }>('/billing/checkout', { plan, successUrl, cancelUrl }),

  openPortal: (returnUrl: string) =>
    api.post<{ url: string }>('/billing/portal', { returnUrl }),

  getSubscription: () =>
    api.get<BillingSubscription | null>('/billing/subscription'),
};

export interface BillingSubscription {
  id:                 string;
  org_id:             string;
  stripe_customer_id: string | null;
  stripe_sub_id:      string | null;
  plan:               'starter' | 'professional' | 'enterprise';
  status:             'trial' | 'active' | 'past_due' | 'cancelled' | 'paused';
  trial_ends_at:      string | null;
  current_period_end: string | null;
  seats:              number;
  seats_used:         number;
  created_at:         string;
  updated_at:         string;
}
