/**
 * billing-plans.service.ts — fonte ÚNICA dos planos de billing.
 *
 * GOVERNANÇA (fonte da verdade):
 *   Painel Admin → Banco de Dados → Sincronização Stripe → Workspaces → Tela Billing.
 *
 *   Os planos, preços, recursos, limites, assentos e IDs de Stripe (Product/Price)
 *   NÃO podem ser hardcoded na tela. São criados/editados pelo Painel Admin e
 *   persistidos no banco; o Stripe é apenas sincronizado a partir do banco.
 *
 *   - MOCK_MODE (dev standalone): retorna a configuração-semente que simula o que
 *     o Admin teria publicado — vive na camada de serviço, NUNCA no componente.
 *   - Produção: busca os planos ativos no backend (a implementar), que os lê do
 *     banco controlado pelo Admin.
 *
 * CONTRATO BACKEND (futuro):
 *   GET /billing/plans  ->  ApiResponse<BillingPlan[]>   (apenas planos ativos/visíveis, ordenados)
 */
import { MOCK_MODE } from "@/shared/lib/env";
import { api } from "@/shared/lib/api-client";
import { adminPlansService } from "@/modules/admin/services/admin-plans.service";

export interface BillingPlan {
  /** Identificador estável (uuid em produção; casa com tenant.plan). */
  id: string;
  name: string;
  /** Rótulo de preço exibido (ex.: "R$ 390/mês"). Fonte: banco (Admin). */
  price: string;
  /** Valor numérico do preço, quando aplicável (centavos ou unidade — definido pelo Admin). */
  priceAmount?: number | null;
  /** Período de cobrança. */
  interval?: "mensal" | "anual" | null;
  /** Recursos exibidos no card. */
  features: string[];
  /** Assentos inclusos no plano (null = ilimitado). */
  seats?: number | null;
  /** Limites por recurso (artists, contracts, storageGb...). */
  limits?: Record<string, number | null>;
  /** Referência Stripe — sincronizada a partir do banco, nunca hardcoded na UI. */
  stripePriceId?: string | null;
  /** Ordem de exibição definida pelo Admin. */
  order: number;
}

function sortByOrder(plans: BillingPlan[]): BillingPlan[] {
  return [...plans].sort((a, b) => a.order - b.order);
}

export const billingPlansService = {
  /**
   * Lista os planos publicados pelo Admin (ativos/visíveis), ordenados.
   * A fonte é o Painel Admin (adminPlansService) — nada hardcoded aqui.
   */
  async listPlans(): Promise<BillingPlan[]> {
    if (MOCK_MODE) {
      const adminPlans = await adminPlansService.list();
      const mapped: BillingPlan[] = adminPlans
        .filter((p) => p.active !== false)
        .map((p, i) => ({
          id: p.tier,
          name: p.name,
          price: `R$ ${Number(p.price_monthly ?? 0).toLocaleString("pt-BR")}/mês`,
          priceAmount: p.price_monthly ?? null,
          interval: "mensal",
          features: p.features ?? [],
          seats: p.max_users ?? null,
          limits: { artists: p.max_artists ?? null, storageGb: p.max_storage_gb ?? null },
          stripePriceId: p.stripe_price_id ?? null,
          order: i + 1,
        }));
      return sortByOrder(mapped);
    }
    const plans = await api.get<BillingPlan[]>("/billing/plans");
    return sortByOrder(plans ?? []);
  },
};
