export const DATA_SOURCE = Symbol('DATA_SOURCE');

/**
 * Administrative, read-only connection used EXCLUSIVELY for cross-tenant
 * enumeration and request identity bootstrap. Always built from
 * DATABASE_URL (owner) regardless of DATABASE_SESSION_CONTEXT_ENABLED /
 * APP_DATABASE_URL. MUST NOT be used for INSERT/UPDATE/DELETE/UPSERT or any
 * domain operation — those run through DATA_SOURCE + runInTenantContext.
 */
export const ADMIN_DATA_SOURCE = Symbol('ADMIN_DATA_SOURCE');

/**
 * Owner connection restricted to the authenticated first-workspace bootstrap.
 * It is intentionally separate from ADMIN_DATA_SOURCE, whose contract is
 * read-only.
 */
export const PROVISIONING_DATA_SOURCE = Symbol('PROVISIONING_DATA_SOURCE');
