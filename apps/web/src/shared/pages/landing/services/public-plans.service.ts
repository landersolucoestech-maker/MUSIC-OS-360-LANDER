/**
 * services/public-plans.service.ts
 *
 * Decision Gate item 1 (product-completion audit): fonte ÚNICA de pricing
 * público da Landing — GET /billing/plans/public, sem autenticação, mesmo
 * catálogo real do painel Admin (AdminPlans → sincronizado com Stripe).
 * Nunca hardcodar preço aqui; nunca ler ADMIN_PLANS (mock, sempre vazio) —
 * ver apps/api/src/modules/billing/billing-plans.service.ts::listPublic()
 * para a allow-list de campos.
 */
import { api } from "@/shared/lib/api-client";

export interface PublicPlan {
  slug: string;
  name: string;
  description: string | null;
  /** Valor em centavos. */
  amount: number;
  currency: string;
  interval: string;
  features: string[];
}

export const publicPlansService = {
  async list(): Promise<PublicPlan[]> {
    return api.get<PublicPlan[]>("/billing/plans/public");
  },
};
