// App providers — barrel export
export { AuthProvider, useAuth, getSessionOrgId } from "./AuthContext";
export { TenantProvider, useTenant, PLAN_LABEL, INDUSTRY_LABEL } from "./TenantContext";
export type { Tenant, TenantPlan, TenantBillingStatus, TenantIndustry } from "./TenantContext";
