import type {
  AdminTenant, AdminUser, AdminPlan, AdminSubscription,
  RevenueDataPoint, AdminAuditLog, AdminSecurityEvent,
  AdminSystemMetric, AdminNotification, AdminKPIs,
  AdminSupportTicket, AdminIntegration, PlatformIntegrationProvider,
} from "../types";

export const MOCK_KPIS: AdminKPIs = {
  mrr: 0,
  arr: 0,
  total_tenants: 0,
  active_tenants: 0,
  trial_tenants: 0,
  churned_tenants: 0,
  total_users: 0,
  active_users_30d: 0,
  churn_rate_pct: 0,
  trial_conversion_pct: 0,
  avg_ltv: 0,
  avg_cac: 0,
  open_tickets: 0,
  system_uptime_pct: 0,
  mrr_growth_pct: 0,
  new_tenants_30d: 0,
  dau: 0,
  mau: 0,
  sessions_today: 0,
  nps_score: 0,
};

export const MOCK_REVENUE: RevenueDataPoint[] = [];
export const MOCK_PLANS: AdminPlan[] = [];
export const MOCK_TENANTS: AdminTenant[] = [];
export const MOCK_SUBSCRIPTIONS: AdminSubscription[] = [];
export const MOCK_ADMIN_USERS: AdminUser[] = [];
export const MOCK_AUDIT_LOGS: AdminAuditLog[] = [];
export const MOCK_SECURITY_EVENTS: AdminSecurityEvent[] = [];
export const MOCK_SYSTEM_METRICS: AdminSystemMetric[] = [];
export const MOCK_SUPPORT_TICKETS: AdminSupportTicket[] = [];
export const MOCK_INTEGRATIONS: AdminIntegration[] = [];
export const MOCK_PLATFORM_PROVIDERS: PlatformIntegrationProvider[] = [];
export const MOCK_ADMIN_NOTIFICATIONS: AdminNotification[] = [];
