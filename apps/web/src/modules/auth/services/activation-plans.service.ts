/**
 * activation-plans.service.ts — fonte ÚNICA dos planos de ativação do cadastro.
 *
 * REGRA DE NEGÓCIO:
 *   Os planos NÃO são fixos no código do formulário de cadastro.
 *   Eles são definidos pelos administradores no painel admin (origem da verdade)
 *   e expostos publicamente apenas os que estão ATIVOS e VISÍVEIS no cadastro.
 *
 *     o admin publicaria. Isto NÃO é uma lista hardcoded dentro do componente —
 *     vive na camada de serviço/dados, exatamente como o restante do MOCK_DATA.
 *   - Produção: busca o catálogo público no backend (a ser implementado depois,
 *     ver contrato abaixo). O backend deve devolver SOMENTE planos ativos +
 *     visíveis + disponíveis para novas empresas, já ordenados.
 *
 * CONTRATO BACKEND (futuro):
 *   GET /api/v1/public/activation-plans  ->  ApiResponse<ActivationPlan[]>
 */
import { publicApi } from "@/shared/lib/api-client";

/** Modelo público de um plano de ativação (subconjunto exposto ao cadastro). */
export interface ActivationPlan {
  /** Identificador estável do plano (uuid em produção). Enviado como activationPlanId. */
  id: string;
  /** Nome exibido (ex.: "Trial 14 dias"). */
  name: string;
  /** Descrição curta exibida no card. */
  description: string;
  /** Preço periódico, quando aplicável. null/undefined = sem preço (trial / sob consulta). */
  price?: number | null;
  /** Moeda ISO do preço (ex.: "BRL"). */
  currency?: string | null;
  /** Período de cobrança/uso. */
  period?: "mensal" | "anual" | "trial" | null;
  /** Dias de trial, quando aplicável. */
  trialDays?: number | null;
  /** Ordem de exibição definida pelo admin (asc). */
  order: number;
}

/**
 * Semente MOCK — simula os planos que o admin teria publicado.
 * Apenas planos ativos + visíveis no cadastro entram aqui.
 * (Em produção esta lista vem do backend; aqui é só a fonte do modo standalone.)
 */
function sortByOrder(plans: ActivationPlan[]): ActivationPlan[] {
  return [...plans].sort((a, b) => a.order - b.order);
}

export const activationPlansService = {
  /**
   * Lista os planos de ativação disponíveis publicamente para o cadastro.
   * Retorna apenas planos ativos/visíveis, ordenados por `order`.
   */
  async listPublicPlans(): Promise<ActivationPlan[]> {
    const plans = await publicApi.get<ActivationPlan[]>("/public/activation-plans");
    return sortByOrder(plans ?? []);
  },
};
