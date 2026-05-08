/* ============================================================
   MUSIC OS 360 — Admin Master Module — Types
   ============================================================ */

export type AdminRole =
  | "super_admin"
  | "admin"
  | "operator"
  | "support"
  | "finance"
  | "viewer";

export type TenantStatus =
  | "active"
  | "suspended"
  | "trial"
  | "cancelled"
  | "pending";

export type PlanTier = "starter" | "growth" | "pro" | "enterprise";

export type SubscriptionStatus =
  | "active"
  | "trial"
  | "past_due"
  | "cancelled"
  | "paused";

export type SecurityEventType =
  | "failed_login"
  | "mfa_bypass"
  | "suspicious_ip"
  | "brute_force"
  | "token_abuse"
  | "account_locked";

export type SystemService =
  | "api"
  | "database"
  | "auth"
  | "storage"
  | "realtime"
  | "queue"
  | "email"
  | "webhooks";

export type SystemHealth = "healthy" | "degraded" | "critical" | "down";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "impersonate"
  | "plan_change"
  | "suspend"
  | "activate"
  | "export";

/* ─── Tenant ─── */
export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: PlanTier;
  owner_email: string;
  users_count: number;
  artists_count: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  mrr: number;
  created_at: string;
  trial_ends_at?: string;
  last_active_at: string;
  country: string;
  logo_url?: string;
}

/* ─── User ─── */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  tenant_id: string;
  tenant_name: string;
  status: "active" | "inactive" | "blocked";
  last_login: string;
  created_at: string;
  mfa_enabled: boolean;
  sessions_count: number;
}

/* ─── Plan ─── */
export interface AdminPlan {
  id: string;
  name: string;
  tier: PlanTier;
  price_monthly: number;
  price_annual: number;
  max_users: number;
  max_artists: number;
  max_storage_gb: number;
  features: string[];
  active_subscribers: number;
  mrr: number;
  color: string;
}

/* ─── Subscription ─── */
export interface AdminSubscription {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  mrr: number;
  billing_cycle: "monthly" | "annual";
  started_at: string;
  current_period_end: string;
  trial_ends_at?: string;
  payment_method: string;
  last_payment_at?: string;
  next_payment_at?: string;
}

/* ─── Revenue ─── */
export interface RevenueDataPoint {
  month: string;
  mrr: number;
  arr: number;
  new_mrr: number;
  churned_mrr: number;
  expansion_mrr: number;
}

/* ─── Audit Log ─── */
export interface AdminAuditLog {
  id: string;
  action: AuditAction;
  entity: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  tenant_id: string;
  tenant_name: string;
  ip_address: string;
  details?: string;
  created_at: string;
}

/* ─── Security Event ─── */
export interface AdminSecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  ip_address: string;
  user_email?: string;
  tenant_id?: string;
  tenant_name?: string;
  description: string;
  resolved: boolean;
  created_at: string;
}

/* ─── System Metric ─── */
export interface AdminSystemMetric {
  service: SystemService;
  health: SystemHealth;
  uptime_pct: number;
  latency_ms: number;
  requests_per_min: number;
  error_rate_pct: number;
  last_checked_at: string;
}

/* ─── Notification ─── */
export interface AdminNotification {
  id: string;
  type: "alert" | "payment" | "security" | "tenant" | "system" | "support";
  severity: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

/* ─── Global KPIs ─── */
export interface AdminKPIs {
  mrr: number;
  arr: number;
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  churned_tenants: number;
  total_users: number;
  active_users_30d: number;
  churn_rate_pct: number;
  trial_conversion_pct: number;
  avg_ltv: number;
  avg_cac: number;
  open_tickets: number;
  system_uptime_pct: number;
  mrr_growth_pct: number;
  new_tenants_30d: number;
  dau: number;
  mau: number;
  sessions_today: number;
  nps_score: number;
}

/* ─── Support Ticket ─── */
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "waiting";
export type TicketPriority = "critical" | "high" | "medium" | "low";

export interface AdminSupportTicket {
  id: string;
  subject: string;
  category: string;
  tenant_id: string;
  tenant_name: string;
  requester_email: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  first_response_at?: string;
}

/* ─── Integration ─── */
export type IntegrationStatus = "active" | "inactive" | "error" | "pending";

export interface AdminIntegration {
  id: string;
  name: string;
  provider: string;
  category: "payment" | "communication" | "analytics" | "storage" | "music" | "accounting";
  status: IntegrationStatus;
  tenants_using: number;
  last_sync_at?: string;
  description: string;
  icon: string;
}
