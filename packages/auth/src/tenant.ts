// ─── Tenant Scope Utilities ───────────────────────────────────────────────────

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  plan: "starter" | "professional" | "enterprise";
}

export interface TenantScopedQuery {
  tenant_id: string;
}

/**
 * Garante que uma query inclua o tenant_id correto.
 * Impede cross-tenant data leakage.
 */
export function scopeToTenant<T extends object>(
  data: T,
  tenantId: string,
): T & TenantScopedQuery {
  return { ...data, tenant_id: tenantId };
}

/**
 * Valida que um recurso pertence ao tenant correto.
 * Lança erro se tenant_id não bate (prevenção de IDOR).
 */
export function assertTenantOwnership(
  resourceTenantId: string,
  requestingTenantId: string,
  resourceName = "recurso",
): void {
  if (resourceTenantId !== requestingTenantId) {
    throw new Error(
      `Acesso negado: ${resourceName} não pertence ao tenant ${requestingTenantId}`,
    );
  }
}

/**
 * Extrai tenant_id de um JWT payload padrão Music OS 360.
 */
export function extractTenantFromPayload(
  payload: Record<string, unknown>,
): string | null {
  return (
    (payload["tenant_id"] as string) ??
    (payload["tenantId"] as string) ??
    null
  );
}

/**
 * Feature flags por plano de tenant.
 */
export const PLAN_FEATURES: Record<
  TenantContext["plan"],
  Record<string, boolean>
> = {
  starter: {
    analytics: false,
    monitoring: false,
    acrcloud: false,
    multiUser: false,
    apiAccess: false,
  },
  professional: {
    analytics: true,
    monitoring: true,
    acrcloud: false,
    multiUser: true,
    apiAccess: false,
  },
  enterprise: {
    analytics: true,
    monitoring: true,
    acrcloud: true,
    multiUser: true,
    apiAccess: true,
  },
};

export function hasFeature(
  plan: TenantContext["plan"],
  feature: string,
): boolean {
  return PLAN_FEATURES[plan]?.[feature] ?? false;
}
