/**
 * modules/admin/data/admin-source.ts
 *
 * Gate de exposição dos dados administrativos.
 * Em produção (IS_PROD), os mocks NÃO são expostos — todas as exports retornam
 * arrays vazios / KPIs zerados. As páginas admin devem renderizar empty state
 * "Admin analytics indisponível — endpoint real ainda não implementado".
 *
 * Em desenvolvimento, retorna os mocks completos para iteração de UI.
 *
 * Quando endpoints `/admin/*` reais existirem, substituir esta camada por
 * hooks que consomem a API real.
 */
import { IS_PROD } from "@/shared/lib/env";
import type {
  AdminKPIs, RevenueDataPoint, AdminPlan, AdminTenant,
  AdminSubscription, AdminUser, AdminAuditLog, AdminSecurityEvent,
  AdminNotification, AdminSupportTicket, AdminIntegration, AdminSystemMetric,
} from "../types";
import * as mocks from "./mockAdmin";

/** True quando estamos exibindo dados fictícios para iteração local. */
export const ADMIN_DATA_IS_MOCK: boolean = !IS_PROD;

const EMPTY_KPIS: AdminKPIs = {
  mrr: 0, arr: 0, total_tenants: 0, active_tenants: 0, trial_tenants: 0, churned_tenants: 0,
  total_users: 0, active_users_30d: 0, churn_rate_pct: 0, trial_conversion_pct: 0,
  avg_ltv: 0, avg_cac: 0, open_tickets: 0, system_uptime_pct: 0,
  mrr_growth_pct: 0, new_tenants_30d: 0, dau: 0, mau: 0, sessions_today: 0, nps_score: 0,
};

export const ADMIN_KPIS: AdminKPIs             = IS_PROD ? EMPTY_KPIS : mocks.MOCK_KPIS;
export const ADMIN_REVENUE: RevenueDataPoint[] = IS_PROD ? []         : mocks.MOCK_REVENUE;
export const ADMIN_PLANS: AdminPlan[]          = IS_PROD ? []         : mocks.MOCK_PLANS;
export const ADMIN_TENANTS: AdminTenant[]      = IS_PROD ? []         : mocks.MOCK_TENANTS;
export const ADMIN_SUBSCRIPTIONS: AdminSubscription[] = IS_PROD ? [] : mocks.MOCK_SUBSCRIPTIONS;
export const ADMIN_USERS: AdminUser[]          = IS_PROD ? []         : mocks.MOCK_ADMIN_USERS;
export const ADMIN_AUDIT_LOGS: AdminAuditLog[] = IS_PROD ? []         : mocks.MOCK_AUDIT_LOGS;
export const ADMIN_SECURITY_EVENTS: AdminSecurityEvent[] = IS_PROD ? [] : mocks.MOCK_SECURITY_EVENTS;
export const ADMIN_NOTIFICATIONS: AdminNotification[] = IS_PROD ? [] : mocks.MOCK_ADMIN_NOTIFICATIONS;
export const ADMIN_SUPPORT_TICKETS: AdminSupportTicket[] = IS_PROD ? [] : mocks.MOCK_SUPPORT_TICKETS;
export const ADMIN_INTEGRATIONS: AdminIntegration[] = IS_PROD ? [] : mocks.MOCK_INTEGRATIONS;
export const ADMIN_SYSTEM_METRICS: AdminSystemMetric[] = IS_PROD ? [] : (mocks as { MOCK_SYSTEM_METRICS?: AdminSystemMetric[] }).MOCK_SYSTEM_METRICS ?? [];
