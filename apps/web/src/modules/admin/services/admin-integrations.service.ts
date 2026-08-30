/**
 * modules/admin/services/admin-integrations.service.ts
 *
 * Portal Administrador → Configurações → Integrações.
 * Governança PERSISTIDA — substitui o antigo estado local seeded por um array
 * hardcoded (ADMIN_PLATFORM_PROVIDERS, que estava literalmente vazio, deixando
 * a aba sem nada para mostrar).
 */

import { api } from "@/shared/lib/api-client";

export type AudienceMode = "none" | "all" | "plans" | "tenants";
/** Rollout comercial — separado de técnico, entitlement e conexão. */
export type PublicationState =
  | "hidden" | "coming_soon" | "beta" | "available" | "temporarily_unavailable";
/** Estado operacional do adapter, governável pelo admin. */
export type TechnicalState =
  | "planned" | "in_development" | "configuring" | "awaiting_provider"
  | "homologating" | "ready" | "degraded" | "disabled" | "retired";
/** Capability derivada do CÓDIGO — veta um technical_state otimista. */
export type TechnicalCapability = "implemented" | "not_implemented";
export type IntegrationClassification =
  | "commercial" | "internal_platform" | "platform_billing";

export interface IntegrationAudience {
  mode: AudienceMode;
  plans: string[];
  tenantIds: string[];
}

export interface AdminIntegration {
  id: string;
  providerKey: string;
  name: string;
  categorySlug: string | null;
  categoryName: string | null;
  connectionKind: "oauth" | "tenant_credentials" | "platform_credentials";
  requiredEnv: string[];
  publicationState: PublicationState;
  technicalState: TechnicalState;
  classification: IntegrationClassification;
  /** Planos que incluem este slug — read-only; edição vive no editor de plano. */
  includedInPlans: string[];
  viewAudience: IntegrationAudience;
  useAudience: IntegrationAudience;
  isCore: boolean;
  notes: string | null;
  /** Somente leitura — derivado do código, não editável por admin. */
  technicalCapability: TechnicalCapability;
  capabilityEvidence: string | null;
  /** Publicado sem adapter: contradição que o admin precisa enxergar. */
  publishedWithoutCapability: boolean;
}

export interface IntegrationCategory {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  active: boolean;
}

export interface UpdateIntegrationGovernanceInput {
  categoryId?: string | null;
  publicationState?: PublicationState;
  viewAudience?: IntegrationAudience;
  useAudience?: IntegrationAudience;
  notes?: string | null;
}

export const adminIntegrationsService = {
  list: () => api.get<AdminIntegration[]>("/admin/integrations"),
  listCategories: () => api.get<IntegrationCategory[]>("/admin/integrations/categories"),
  update: (id: string, patch: UpdateIntegrationGovernanceInput) =>
    api.patch<AdminIntegration>(`/admin/integrations/${id}`, patch),
};

/**
 * Entitlements de integração por plano (billing_plans.integrations).
 * Lista dinâmica de slugs comerciais — o editor de plano não conhece provedor
 * nenhum em código.
 */
export const adminPlanIntegrationsService = {
  get: (planSlug: string) => api.get<string[]>(`/admin/integrations/plans/${planSlug}`),
  set: (planSlug: string, integrations: string[]) =>
    api.put<{ planSlug: string; integrations: string[]; rejected: string[] }>(
      `/admin/integrations/plans/${planSlug}`,
      { integrations },
    ),
};
