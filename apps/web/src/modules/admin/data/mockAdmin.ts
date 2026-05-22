import type {
  AdminTenant, AdminUser, AdminPlan, AdminSubscription,
  RevenueDataPoint, AdminAuditLog, AdminSecurityEvent,
  AdminSystemMetric, AdminNotification, AdminKPIs,
  AdminSupportTicket, AdminIntegration,
} from "../types";

const NOW = new Date().toISOString();
const d = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

/* ─── KPIs ─── */
export const MOCK_KPIS: AdminKPIs = {
  mrr: 124750,
  arr: 1497000,
  total_tenants: 48,
  active_tenants: 41,
  trial_tenants: 5,
  churned_tenants: 2,
  total_users: 487,
  active_users_30d: 312,
  churn_rate_pct: 2.4,
  trial_conversion_pct: 68.3,
  avg_ltv: 18400,
  avg_cac: 1200,
  open_tickets: 14,
  system_uptime_pct: 99.97,
  mrr_growth_pct: 12.4,
  new_tenants_30d: 7,
  dau: 218,
  mau: 312,
  sessions_today: 1840,
  nps_score: 72,
};

/* ─── Revenue trend ─── */
export const MOCK_REVENUE: RevenueDataPoint[] = [
  { month: "Nov/24", mrr: 89200, arr: 1070400, new_mrr: 8400, churned_mrr: 1200, expansion_mrr: 2100 },
  { month: "Dez/24", mrr: 96500, arr: 1158000, new_mrr: 9100, churned_mrr: 1800, expansion_mrr: 2800 },
  { month: "Jan/25", mrr: 103800, arr: 1245600, new_mrr: 8900, churned_mrr: 2100, expansion_mrr: 3200 },
  { month: "Fev/25", mrr: 109200, arr: 1310400, new_mrr: 7400, churned_mrr: 1500, expansion_mrr: 2900 },
  { month: "Mar/25", mrr: 115600, arr: 1387200, new_mrr: 9800, churned_mrr: 1900, expansion_mrr: 4100 },
  { month: "Abr/25", mrr: 119400, arr: 1432800, new_mrr: 7200, churned_mrr: 1400, expansion_mrr: 2600 },
  { month: "Mai/25", mrr: 124750, arr: 1497000, new_mrr: 8800, churned_mrr: 1800, expansion_mrr: 3600 },
];

/* ─── Plans ─── */
export const MOCK_PLANS: AdminPlan[] = [
  {
    id: "plan-starter",
    name: "Starter",
    tier: "starter",
    price_monthly: 299,
    price_annual: 2990,
    max_users: 3,
    max_artists: 20,
    max_storage_gb: 5,
    features: ["Catálogo básico", "Contratos simples", "CRM básico"],
    active_subscribers: 12,
    mrr: 3588,
    color: "#6B7280",
  },
  {
    id: "plan-growth",
    name: "Growth",
    tier: "growth",
    price_monthly: 699,
    price_annual: 6990,
    max_users: 10,
    max_artists: 100,
    max_storage_gb: 25,
    features: ["Tudo do Starter", "Analytics", "Marketing", "Suporte prioritário"],
    active_subscribers: 18,
    mrr: 12582,
    color: "#3B82F6",
  },
  {
    id: "plan-pro",
    name: "Pro",
    tier: "pro",
    price_monthly: 1499,
    price_annual: 14990,
    max_users: 30,
    max_artists: 500,
    max_storage_gb: 100,
    features: ["Tudo do Growth", "API access", "Webhooks", "Integrações avançadas"],
    active_subscribers: 8,
    mrr: 11992,
    color: "#8B5CF6",
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    tier: "enterprise",
    price_monthly: 4999,
    price_annual: 49990,
    max_users: 999,
    max_artists: 999,
    max_storage_gb: 1000,
    features: ["Tudo do Pro", "SLA dedicado", "Custom branding", "Onboarding dedicado"],
    active_subscribers: 3,
    mrr: 14997,
    color: "#F59E0B",
  },
];

/* ─── Tenants ─── */
export const MOCK_TENANTS: AdminTenant[] = [
  { id: "t-001", name: "Universal Music Brasil", slug: "universal-br", status: "active", plan: "enterprise", owner_email: "admin@universal.com.br", users_count: 28, artists_count: 312, storage_used_mb: 48200, storage_limit_mb: 1024000, mrr: 4999, created_at: d(-420), last_active_at: d(-1), country: "BR" },
  { id: "t-002", name: "Sony Music Entertainment", slug: "sony-music", status: "active", plan: "pro", owner_email: "admin@sony.com.br", users_count: 15, artists_count: 187, storage_used_mb: 21400, storage_limit_mb: 102400, mrr: 1499, created_at: d(-380), last_active_at: NOW, country: "BR" },
  { id: "t-003", name: "Warner Music Brasil", slug: "warner-br", status: "active", plan: "pro", owner_email: "admin@warner.com.br", users_count: 12, artists_count: 143, storage_used_mb: 18700, storage_limit_mb: 102400, mrr: 1499, created_at: d(-310), last_active_at: d(-2), country: "BR" },
  { id: "t-004", name: "Deckdisc Records", slug: "deckdisc", status: "active", plan: "growth", owner_email: "admin@deckdisc.com.br", users_count: 6, artists_count: 52, storage_used_mb: 5100, storage_limit_mb: 25600, mrr: 699, created_at: d(-220), last_active_at: d(-1), country: "BR" },
  { id: "t-005", name: "Tratore Distribuição", slug: "tratore", status: "active", plan: "growth", owner_email: "admin@tratore.com.br", users_count: 8, artists_count: 78, storage_used_mb: 9300, storage_limit_mb: 25600, mrr: 699, created_at: d(-190), last_active_at: NOW, country: "BR" },
  { id: "t-006", name: "Independente Produções", slug: "ind-prod", status: "trial", plan: "growth", owner_email: "contato@indprod.com.br", users_count: 2, artists_count: 12, storage_used_mb: 420, storage_limit_mb: 25600, mrr: 0, created_at: d(-10), trial_ends_at: d(20), last_active_at: d(-1), country: "BR" },
  { id: "t-007", name: "Estúdio Norte Records", slug: "norte-rec", status: "suspended", plan: "starter", owner_email: "admin@norterec.com.br", users_count: 3, artists_count: 18, storage_used_mb: 890, storage_limit_mb: 5120, mrr: 299, created_at: d(-150), last_active_at: d(-45), country: "BR" },
  { id: "t-008", name: "Gravadora Exemplo Ltda", slug: "exemplo", status: "active", plan: "enterprise", owner_email: "admin@musicos360.com", users_count: 42, artists_count: 280, storage_used_mb: 62100, storage_limit_mb: 1024000, mrr: 4999, created_at: d(-600), last_active_at: NOW, country: "BR" },
];

/* ─── Subscriptions ─── */
export const MOCK_SUBSCRIPTIONS: AdminSubscription[] = [
  { id: "sub-001", tenant_id: "t-001", tenant_name: "Universal Music Brasil", plan: "enterprise", status: "active", mrr: 4999, billing_cycle: "annual", started_at: d(-420), current_period_end: d(300), payment_method: "Cartão Corporativo •• 4242", last_payment_at: d(-30), next_payment_at: d(300) },
  { id: "sub-002", tenant_id: "t-002", tenant_name: "Sony Music Entertainment", plan: "pro", status: "active", mrr: 1499, billing_cycle: "monthly", started_at: d(-380), current_period_end: d(20), payment_method: "Boleto Bancário", last_payment_at: d(-10), next_payment_at: d(20) },
  { id: "sub-003", tenant_id: "t-003", tenant_name: "Warner Music Brasil", plan: "pro", status: "active", mrr: 1499, billing_cycle: "monthly", started_at: d(-310), current_period_end: d(18), payment_method: "Cartão •• 1234", last_payment_at: d(-12), next_payment_at: d(18) },
  { id: "sub-004", tenant_id: "t-004", tenant_name: "Deckdisc Records", plan: "growth", status: "active", mrr: 699, billing_cycle: "annual", started_at: d(-220), current_period_end: d(145), payment_method: "Pix Recorrente", last_payment_at: d(-30), next_payment_at: d(145) },
  { id: "sub-005", tenant_id: "t-005", tenant_name: "Tratore Distribuição", plan: "growth", status: "active", mrr: 699, billing_cycle: "monthly", started_at: d(-190), current_period_end: d(8), payment_method: "Cartão •• 5678", last_payment_at: d(-22), next_payment_at: d(8) },
  { id: "sub-006", tenant_id: "t-006", tenant_name: "Independente Produções", plan: "growth", status: "trial", mrr: 0, billing_cycle: "monthly", started_at: d(-10), current_period_end: d(20), trial_ends_at: d(20), payment_method: "—" },
  { id: "sub-007", tenant_id: "t-007", tenant_name: "Estúdio Norte Records", plan: "starter", status: "past_due", mrr: 299, billing_cycle: "monthly", started_at: d(-150), current_period_end: d(-15), payment_method: "Cartão •• 9999", last_payment_at: d(-45) },
  { id: "sub-008", tenant_id: "t-008", tenant_name: "Gravadora Exemplo Ltda", plan: "enterprise", status: "active", mrr: 4999, billing_cycle: "annual", started_at: d(-600), current_period_end: d(180), payment_method: "Cartão Corporativo •• 8888", last_payment_at: d(-30), next_payment_at: d(180) },
];

/* ─── Users ─── */
export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: "u-001", name: "Carlos Mendes", email: "carlos@universal.com.br", role: "admin", tenant_id: "t-001", tenant_name: "Universal Music Brasil", status: "active", last_login: d(-1), created_at: d(-420), mfa_enabled: true, sessions_count: 3 },
  { id: "u-002", name: "Ana Silva", email: "ana@sony.com.br", role: "admin", tenant_id: "t-002", tenant_name: "Sony Music Entertainment", status: "active", last_login: NOW, created_at: d(-380), mfa_enabled: true, sessions_count: 2 },
  { id: "u-003", name: "Roberto Lima", email: "roberto@warner.com.br", role: "admin", tenant_id: "t-003", tenant_name: "Warner Music Brasil", status: "active", last_login: d(-2), created_at: d(-310), mfa_enabled: false, sessions_count: 1 },
  { id: "u-004", name: "Admin MusicOS 360", email: "admin@musicos360.com", role: "super_admin", tenant_id: "t-008", tenant_name: "Gravadora Exemplo Ltda", status: "active", last_login: NOW, created_at: d(-600), mfa_enabled: true, sessions_count: 5 },
  { id: "u-005", name: "João Costa", email: "joao@tratore.com.br", role: "operator", tenant_id: "t-005", tenant_name: "Tratore Distribuição", status: "active", last_login: d(-3), created_at: d(-190), mfa_enabled: false, sessions_count: 1 },
  { id: "u-006", name: "Maria Fernanda", email: "maria@ind-prod.com.br", role: "viewer", tenant_id: "t-006", tenant_name: "Independente Produções", status: "active", last_login: d(-1), created_at: d(-10), mfa_enabled: false, sessions_count: 1 },
  { id: "u-007", name: "Paulo Neto", email: "paulo@norterec.com.br", role: "admin", tenant_id: "t-007", tenant_name: "Estúdio Norte Records", status: "blocked", last_login: d(-50), created_at: d(-150), mfa_enabled: false, sessions_count: 0 },
];

/* ─── Audit Logs ─── */
export const MOCK_AUDIT_LOGS: AdminAuditLog[] = [
  { id: "al-001", action: "plan_change", entity: "Subscription", entity_id: "sub-002", user_id: "u-004", user_name: "Admin MusicOS 360", user_email: "admin@musicos360.com", tenant_id: "t-002", tenant_name: "Sony Music Entertainment", ip_address: "189.28.100.42", details: "Growth → Pro", created_at: d(-1) },
  { id: "al-002", action: "suspend", entity: "Tenant", entity_id: "t-007", user_id: "u-004", user_name: "Admin MusicOS 360", user_email: "admin@musicos360.com", tenant_id: "t-007", tenant_name: "Estúdio Norte Records", ip_address: "189.28.100.42", details: "Inadimplência > 30 dias", created_at: d(-2) },
  { id: "al-003", action: "impersonate", entity: "Tenant", entity_id: "t-004", user_id: "u-004", user_name: "Admin MusicOS 360", user_email: "admin@musicos360.com", tenant_id: "t-004", tenant_name: "Deckdisc Records", ip_address: "189.28.100.42", details: "Suporte técnico", created_at: d(-3) },
  { id: "al-004", action: "create", entity: "Tenant", entity_id: "t-006", user_id: "u-004", user_name: "Admin MusicOS 360", user_email: "admin@musicos360.com", tenant_id: "t-006", tenant_name: "Independente Produções", ip_address: "200.178.45.12", details: "Trial iniciado", created_at: d(-10) },
  { id: "al-005", action: "export", entity: "Report", entity_id: "report-mrr-apr", user_id: "u-004", user_name: "Admin MusicOS 360", user_email: "admin@musicos360.com", tenant_id: "t-008", tenant_name: "Gravadora Exemplo Ltda", ip_address: "189.28.100.42", details: "Relatório MRR Abril 2025", created_at: d(-5) },
  { id: "al-006", action: "login", entity: "User", entity_id: "u-004", user_id: "u-004", user_name: "Admin MusicOS 360", user_email: "admin@musicos360.com", tenant_id: "t-008", tenant_name: "Gravadora Exemplo Ltda", ip_address: "189.28.100.42", created_at: NOW },
];

/* ─── Security Events ─── */
export const MOCK_SECURITY_EVENTS: AdminSecurityEvent[] = [
  { id: "se-001", type: "brute_force", severity: "high", ip_address: "185.220.101.45", user_email: "admin@norterec.com.br", tenant_id: "t-007", tenant_name: "Estúdio Norte Records", description: "27 tentativas de login em 5 minutos. IP bloqueado.", resolved: true, created_at: d(-2) },
  { id: "se-002", type: "suspicious_ip", severity: "medium", ip_address: "103.88.62.14", user_email: "joao@tratore.com.br", tenant_id: "t-005", tenant_name: "Tratore Distribuição", description: "Login de localização incomum (Singapura).", resolved: false, created_at: d(-1) },
  { id: "se-003", type: "failed_login", severity: "low", ip_address: "177.94.128.33", user_email: "roberto@warner.com.br", tenant_id: "t-003", tenant_name: "Warner Music Brasil", description: "5 tentativas de login com senha errada.", resolved: true, created_at: d(-4) },
  { id: "se-004", type: "account_locked", severity: "high", ip_address: "198.51.100.22", user_email: "paulo@norterec.com.br", tenant_id: "t-007", tenant_name: "Estúdio Norte Records", description: "Conta bloqueada após 10 tentativas consecutivas.", resolved: false, created_at: NOW },
];

/* ─── System Metrics ─── */
export const MOCK_SYSTEM_METRICS: AdminSystemMetric[] = [
  { service: "api",      health: "healthy",  uptime_pct: 99.97, latency_ms: 42,  requests_per_min: 8420, error_rate_pct: 0.03, last_checked_at: NOW },
  { service: "database", health: "healthy",  uptime_pct: 99.99, latency_ms: 8,   requests_per_min: 15800, error_rate_pct: 0.01, last_checked_at: NOW },
  { service: "auth",     health: "healthy",  uptime_pct: 99.95, latency_ms: 65,  requests_per_min: 1240, error_rate_pct: 0.05, last_checked_at: NOW },
  { service: "storage",  health: "degraded", uptime_pct: 98.20, latency_ms: 380, requests_per_min: 320,  error_rate_pct: 1.80, last_checked_at: NOW },
  { service: "realtime", health: "healthy",  uptime_pct: 99.90, latency_ms: 18,  requests_per_min: 4200, error_rate_pct: 0.10, last_checked_at: NOW },
  { service: "queue",    health: "healthy",  uptime_pct: 99.93, latency_ms: 22,  requests_per_min: 2100, error_rate_pct: 0.07, last_checked_at: NOW },
  { service: "email",    health: "healthy",  uptime_pct: 99.80, latency_ms: 190, requests_per_min: 140,  error_rate_pct: 0.20, last_checked_at: NOW },
  { service: "webhooks", health: "healthy",  uptime_pct: 99.75, latency_ms: 120, requests_per_min: 880,  error_rate_pct: 0.25, last_checked_at: NOW },
];

/* ─── Support Tickets ─── */
export const MOCK_SUPPORT_TICKETS: AdminSupportTicket[] = [
  { id: "tk-001", subject: "Erro ao importar OFX — conciliação bancária", category: "Financeiro", tenant_id: "t-002", tenant_name: "Sony Music Entertainment", requester_email: "ana@sony.com.br", status: "open", priority: "high", assigned_to: "Suporte Tier 2", created_at: d(-1), updated_at: d(-1) },
  { id: "tk-002", subject: "Não consigo adicionar artista — limite atingido", category: "Catálogo", tenant_id: "t-004", tenant_name: "Deckdisc Records", requester_email: "admin@deckdisc.com.br", status: "in_progress", priority: "medium", assigned_to: "Carlos Suporte", created_at: d(-2), updated_at: NOW, first_response_at: d(-2) },
  { id: "tk-003", subject: "Relatório P&L exportando valores incorretos", category: "Relatórios", tenant_id: "t-001", tenant_name: "Universal Music Brasil", requester_email: "admin@universal.com.br", status: "waiting", priority: "critical", created_at: d(-3), updated_at: d(-1) },
  { id: "tk-004", subject: "Integração ABRAMUS retornando erro 403", category: "Integrações", tenant_id: "t-003", tenant_name: "Warner Music Brasil", requester_email: "admin@warner.com.br", status: "open", priority: "high", assigned_to: "Dev Team", created_at: d(-1), updated_at: NOW, first_response_at: NOW },
  { id: "tk-005", subject: "Dashboard não carrega gráficos no Safari", category: "Interface", tenant_id: "t-005", tenant_name: "Tratore Distribuição", requester_email: "joao@tratore.com.br", status: "in_progress", priority: "medium", assigned_to: "Front-end Team", created_at: d(-4), updated_at: d(-2), first_response_at: d(-4) },
  { id: "tk-006", subject: "Solicitação de upgrade para plano Enterprise", category: "Comercial", tenant_id: "t-004", tenant_name: "Deckdisc Records", requester_email: "admin@deckdisc.com.br", status: "resolved", priority: "low", assigned_to: "Carlos Suporte", created_at: d(-7), updated_at: d(-5), resolved_at: d(-5) },
  { id: "tk-007", subject: "Trial não converte — problema no checkout", category: "Cobrança", tenant_id: "t-006", tenant_name: "Independente Produções", requester_email: "contato@indprod.com.br", status: "open", priority: "critical", created_at: NOW, updated_at: NOW },
];

/* ─── Integrations ─── */
export const MOCK_INTEGRATIONS: AdminIntegration[] = [
  { id: "int-001", name: "Stripe", provider: "stripe", category: "payment", status: "active", tenants_using: 38, last_sync_at: NOW, description: "Processamento de pagamentos e assinaturas recorrentes", icon: "stripe" },
  { id: "int-002", name: "ABRAMUS", provider: "abramus", category: "music", status: "active", tenants_using: 28, last_sync_at: d(-1), description: "Conciliação de direitos autorais e recebimentos externos de direitos ECAD", icon: "abramus" },
  { id: "int-003", name: "Twilio", provider: "twilio", category: "communication", status: "active", tenants_using: 15, last_sync_at: d(-2), description: "SMS, WhatsApp e notificações por canal", icon: "twilio" },
  { id: "int-004", name: "Google Analytics", provider: "google", category: "analytics", status: "active", tenants_using: 41, last_sync_at: NOW, description: "Análise de tráfego e comportamento de usuários", icon: "google" },
  { id: "int-005", name: "AWS S3", provider: "aws", category: "storage", status: "active", tenants_using: 48, last_sync_at: NOW, description: "Armazenamento de áudio, documentos e assets", icon: "aws" },
  { id: "int-006", name: "Contaazul", provider: "contaazul", category: "accounting", status: "error", tenants_using: 6, last_sync_at: d(-3), description: "Sincronização contábil e emissão de NF-e", icon: "contaazul" },
  { id: "int-007", name: "Meta Ads", provider: "meta", category: "analytics", status: "active", tenants_using: 22, last_sync_at: d(-1), description: "Gestão de campanhas Facebook e Instagram Ads", icon: "meta" },
  { id: "int-008", name: "Spotify for Artists", provider: "spotify", category: "music", status: "pending", tenants_using: 0, description: "Sincronização de streams e analytics do Spotify", icon: "spotify" },
];

/* ─── Notifications ─── */
export const MOCK_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  { id: "n-001", type: "security", severity: "error", title: "Conta bloqueada", message: "Conta paulo@norterec.com.br bloqueada por tentativas excessivas.", read: false, created_at: NOW, action_url: "/admin/security" },
  { id: "n-002", type: "payment", severity: "warning", title: "Pagamento atrasado", message: "Estúdio Norte Records está com pagamento em atraso há 45 dias.", read: false, created_at: d(-1), action_url: "/admin/subscriptions" },
  { id: "n-003", type: "tenant", severity: "info", title: "Novo trial iniciado", message: "Independente Produções iniciou trial do plano Growth.", read: false, created_at: d(-10), action_url: "/admin/clients" },
  { id: "n-004", type: "system", severity: "warning", title: "Storage degradado", message: "Serviço de storage com latência elevada (380ms).", read: true, created_at: d(-1), action_url: "/admin/system" },
  { id: "n-005", type: "alert", severity: "success", title: "MRR recorde", message: "MRR atingiu R$ 124.750 — crescimento de 12,4% no mês.", read: true, created_at: d(-2) },
];
