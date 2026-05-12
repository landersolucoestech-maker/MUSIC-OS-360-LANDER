// App providers — barrel export
export { AuthProvider, useAuth, getSessionOrgId } from "./AuthContext";
export {
  TenantProvider,
  useTenant,
} from "./TenantContext";
export {
  PLAN_LABEL,
  INDUSTRY_LABEL,
  BILLING_STATUS_LABEL,
  ROLE_LABEL,
  ROLE_PERMISSIONS,
} from "./tenant-labels";
export type {
  Tenant,
  TenantPlan,
  TenantBillingStatus,
  TenantIndustry,
  TenantRole,
  TenantModuleKey,
  TenantModulePermission,
  TenantPermissions,
  TenantConfig,
  TenantBilling,
  TenantOnboarding,
  OnboardingStep,
} from "./TenantContext";
