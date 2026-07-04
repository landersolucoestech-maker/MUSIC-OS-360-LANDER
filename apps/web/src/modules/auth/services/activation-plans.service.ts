/**
 * activation-plans.service.ts — fonte ÚNICA dos planos de ativação do cadastro.
 *
 * REGRA DE NEGÓCIO:
 *   Os planos NÃO são fixos no código do formulário de cadastro.
 *   Eles são definidos pelos administradores no painel admin (origem da verdade)
 *   e expostos publicamente apenas os que estão ATIVOS e VISÍVEIS no cadastro.
 *
 *   - MOCK_MODE (dev standalone): retorna a configuração-semente que simula o que
 *     o admin publicaria. Isto NÃO é uma lista hardcoded dentro do componente —
 *     vive na camada de serviço/dados, exatamente como o restante do MOCK_DATA.
 *   - Produção: busca o catálogo público no backend (a ser implementado depois,
 *     ver contrato abaixo). O backend deve devolver SOMENTE planos ativos +
 *     visíveis + disponíveis para novas empresas, já ordenados.
 *
 * CONTRATO BACKEND (futuro):
 *   GET /api/v1/public/activation-plans  ->  ApiResponse<ActivationPlan[]>
 */
import { MOCK_MODE } from "@/shared/lib/env";
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
const MOCK_PUBLIC_PLANS: ActivationPlan[] = [
  {
    id: "trial-14",
    name: "Trial 14 dias",
    description: "Acesso completo por 14 dias para avaliar a plataforma.",
    price: null,
    currency: "BRL",
    period: "trial",
    trialDays: 14,
    order: 1,
  },
  {
    id: "trial-7",
    name: "Trial 7 dias",
    description: "Avaliação rápida com acesso às funções essenciais.",
    price: null,
    currency: "BRL",
    period: "trial",
    trialDays: 7,
    order: 2,
  },
];

function sortByOrder(plans: ActivationPlan[]): ActivationPlan[] {
  return [...plans].sort((a, b) => a.order - b.order);
}

export const activationPlansService = {
  /**
   * Lista os planos de ativação disponíveis publicamente para o cadastro.
   * Retorna apenas planos ativos/visíveis, ordenados por `order`.
   */
  async listPublicPlans(): Promise<ActivationPlan[]> {
    if (MOCK_MODE) {
      return sortByOrder(MOCK_PUBLIC_PLANS);
    }
    const plans = await publicApi.get<ActivationPlan[]>("/public/activation-plans");
    return sortByOrder(plans ?? []);
  },
};
