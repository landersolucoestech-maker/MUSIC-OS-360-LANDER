/**
 * MUSIC OS 360 — Tenant Isolation
 *
 * Utilities that enforce data scoping per tenant.
 * In standalone/mock mode the tenant_id is always MOCK_TENANT_ID.
 * In production mode the tenant_id comes from the JWT (org_id claim).
 *
 * Usage:
 *   const filtered = isolateByTenant(allRecords, currentTenantId);
 *   const record   = assertTenantOwnership(record, currentTenantId);
 */

export const MOCK_TENANT_ID = "ten-gravadora-exemplo-001";

// ─── Type helpers ─────────────────────────────────────────────────────────────

/** Any record that carries a tenant_id field (server-side) */
export interface TenantScoped {
  tenant_id?: string;
}

// ─── Isolation helpers ────────────────────────────────────────────────────────

/**
 * Filter an array of records to only those belonging to the given tenant.
 * Records without a tenant_id field are treated as belonging to the current tenant
 * (backwards-compatible for mock data that lacks the field).
 */
export function isolateByTenant<T extends TenantScoped>(
  records: T[],
  tenantId: string,
): T[] {
  return records.filter(r => !r.tenant_id || r.tenant_id === tenantId);
}

/**
 * Assert that a single record belongs to the given tenant.
 * Throws if the record is owned by a different tenant (guards against IDOR).
 * Returns the record unchanged when valid.
 */
export function assertTenantOwnership<T extends TenantScoped>(
  record: T,
  tenantId: string,
  resourceLabel = "record",
): T {
  if (record.tenant_id && record.tenant_id !== tenantId) {
    throw new Error(
      `TenantIsolationError: ${resourceLabel} belongs to a different tenant.`,
    );
  }
  return record;
}

/**
 * Stamp a new record with the current tenant's id before persisting.
 */
export function stampTenantId<T>(record: T, tenantId: string): T & { tenant_id: string } {
  return { ...record, tenant_id: tenantId };
}

/**
 * Build a localStorage key scoped to a specific tenant.
 * Prevents data leakage when the app runs with multiple tenants in dev.
 *
 * @example
 *   tenantStorageKey("ten-abc-001", "musicos360_mock_data")
 *   // => "musicos360_ten-abc-001_mock_data"
 */
export function tenantStorageKey(tenantId: string, baseKey: string): string {
  return `musicos360_${tenantId}_${baseKey}`;
}

// ─── Feature-gate guard ───────────────────────────────────────────────────────

/**
 * Throws a descriptive error when a disabled feature is accessed.
 * Use in hooks/services that gate on feature flags.
 */
export function assertFeatureEnabled(
  featureName: string,
  isEnabled: boolean,
): void {
  if (!isEnabled) {
    throw new Error(
      `FeatureGateError: feature "${featureName}" is not enabled for this tenant.`,
    );
  }
}
