import type {
  AdminTenant, AdminUser, AdminPlan, AdminSubscription,
  RevenueDataPoint, AdminAuditLog, AdminSecurityEvent,
  AdminSystemMetric, AdminNotification, AdminKPIs,
  AdminSupportTicket, AdminIntegration, PlatformIntegrationProvider,
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
    features: ["Tudo do Starter", "Métricas", "Marketing", "Suporte prioritário"],
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
  { id: "int-001", name: "Stripe", provider: "stripe", category: "payment", status: "active", tenants_using: 38, last_sync_at: NOW, description: "Pagamentos e assinaturas recorrentes (billing)", icon: "stripe" },
  { id: "int-002", name: "ABRAMUS", provider: "abramus", category: "music", status: "active", tenants_using: 28, last_sync_at: d(-1), description: "Direitos autorais e recebimentos ECAD", icon: "abramus" },
  { id: "int-003", name: "ECAD", provider: "ecad", category: "music", status: "active", tenants_using: 24, last_sync_at: d(-1), description: "Distribuição de direitos de execução pública", icon: "ecad" },
  { id: "int-004", name: "UBC", provider: "ubc", category: "music", status: "active", tenants_using: 12, last_sync_at: d(-2), description: "União Brasileira de Compositores", icon: "ubc" },
  { id: "int-005", name: "Autentique", provider: "autentique", category: "contracts", status: "active", tenants_using: 31, last_sync_at: NOW, description: "Assinatura eletrônica de contratos", icon: "autentique" },
  { id: "int-006", name: "Clicksign", provider: "clicksign", category: "contracts", status: "active", tenants_using: 18, last_sync_at: d(-1), description: "Assinatura digital de documentos", icon: "clicksign" },
  { id: "int-007", name: "NF-e", provider: "nfe", category: "fiscal", status: "active", tenants_using: 20, last_sync_at: d(-1), description: "Emissão de notas fiscais eletrônicas", icon: "nfe" },
  { id: "int-008", name: "Meta Business", provider: "meta_business", category: "marketing", status: "active", tenants_using: 22, last_sync_at: d(-1), description: "Campanhas Facebook e Instagram Ads", icon: "meta_business" },
  { id: "int-009", name: "Google Ads", provider: "google_business", category: "marketing", status: "pending", tenants_using: 0, description: "Campanhas e conversões Google Ads", icon: "google_business" },
  { id: "int-010", name: "OneRPM", provider: "onerpm", category: "distribution", status: "active", tenants_using: 26, last_sync_at: d(-1), description: "Distribuição digital multicanal", icon: "onerpm" },
  { id: "int-011", name: "DistroKid", provider: "distrokid", category: "distribution", status: "active", tenants_using: 19, last_sync_at: d(-2), description: "Distribuição de lançamentos", icon: "distrokid" },
];

/* ─── Provedores GLOBAIS da plataforma (Painel Admin > Integrações da Plataforma) ─── */
const ALL_PLANS = ["starter", "professional", "enterprise"];
const PRO_PLANS = ["professional", "enterprise"];

export const MOCK_PLATFORM_PROVIDERS: PlatformIntegrationProvider[] = [
  // ── Core da Plataforma ──
  { id: "pp-stripe", name: "Stripe", provider: "stripe", category: "billing", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 38, requiresGlobalCredentials: true, requiresTenantCredentials: false, isCore: true, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "ok", oauthStatus: "n/a", description: "Billing global da plataforma SaaS.", auditUpdatedAt: d(-1) },
  { id: "pp-resend", name: "Resend", provider: "resend", category: "email", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 48, requiresGlobalCredentials: true, requiresTenantCredentials: false, isCore: true, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "ok", oauthStatus: "n/a", description: "Envio transacional global da plataforma.", auditUpdatedAt: d(-3) },
  { id: "pp-sentry", name: "Sentry", provider: "sentry", category: "observability", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 48, requiresGlobalCredentials: true, requiresTenantCredentials: false, isCore: true, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Monitoramento global de erros e performance.", auditUpdatedAt: d(-5) },
  { id: "pp-r2", name: "R2 / S3", provider: "r2", category: "storage", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 48, requiresGlobalCredentials: true, requiresTenantCredentials: false, isCore: true, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Storage global de arquivos, capas, contratos e mídias.", auditUpdatedAt: d(-2) },
  { id: "pp-supabase", name: "Supabase", provider: "supabase", category: "core", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 48, requiresGlobalCredentials: true, requiresTenantCredentials: false, isCore: true, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Banco de dados, autenticação e RLS globais da plataforma.", auditUpdatedAt: d(-1) },
  { id: "pp-webhooks", name: "Webhooks", provider: "webhooks", category: "webhook", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 12, requiresGlobalCredentials: true, requiresTenantCredentials: false, isCore: true, lastHealthCheckAt: d(-1), lastGlobalError: "3 entregas com falha nas últimas 24h", webhookStatus: "failing", oauthStatus: "n/a", description: "Entrega global de eventos webhook da plataforma.", auditUpdatedAt: d(-1) },
  { id: "pp-apikeys", name: "API Keys", provider: "api_keys", category: "api", status: "active", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 9, requiresGlobalCredentials: true, requiresTenantCredentials: false, isCore: true, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Emissão e gestão de chaves de API da plataforma.", auditUpdatedAt: d(-4) },
  { id: "pp-nfe", name: "NF-e Provider", provider: "nfe", category: "fiscal", status: "active", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 20, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-1), lastGlobalError: null, webhookStatus: "ok", oauthStatus: "n/a", description: "Provedor de emissão de notas fiscais eletrônicas por tenant.", auditUpdatedAt: d(-2) },

  // ── Contratos ──
  { id: "pp-autentique", name: "Autentique Provider", provider: "autentique", category: "contracts", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 31, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "ok", oauthStatus: "n/a", description: "Provedor de assinatura eletrônica disponível para tenants.", auditUpdatedAt: d(-1) },
  { id: "pp-clicksign", name: "Clicksign Provider", provider: "clicksign", category: "contracts", status: "active", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 18, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-1), lastGlobalError: null, webhookStatus: "ok", oauthStatus: "n/a", description: "Provedor de assinatura digital de documentos por tenant.", auditUpdatedAt: d(-2) },
  { id: "pp-docusign", name: "DocuSign Provider", provider: "docusign", category: "contracts", status: "disabled", enabled: false, environment: "disabled", availabilityByPlan: ["enterprise"], tenantsUsing: 0, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-10), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Provedor opcional de assinatura eletrônica (não habilitado).", auditUpdatedAt: d(-10) },

  // ── Música, direitos e associações ──
  { id: "pp-ecad", name: "ECAD Provider", provider: "ecad", category: "rights", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 24, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-1), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Provedor de direitos de execução pública por tenant.", auditUpdatedAt: d(-2) },
  { id: "pp-abramus", name: "ABRAMUS Provider", provider: "abramus", category: "rights", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 28, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-1), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Provedor de direitos autorais e recebimentos ECAD por tenant.", auditUpdatedAt: d(-1) },
  { id: "pp-ubc", name: "UBC Provider", provider: "ubc", category: "rights", status: "error", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 12, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-2), lastGlobalError: "Falha de autenticação no último health check", webhookStatus: "none", oauthStatus: "n/a", description: "Provedor da União Brasileira de Compositores por tenant.", auditUpdatedAt: d(-2) },

  // ── Plataformas e redes (OAuth por tenant) ──
  { id: "pp-instagram", name: "Instagram Provider", provider: "instagram", category: "social", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 22, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "none", oauthStatus: "ok", description: "Provedor OAuth/API disponível para conexões de Instagram dos tenants.", auditUpdatedAt: d(-1) },
  { id: "pp-meta", name: "Facebook / Meta Provider", provider: "meta_business", category: "social", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 22, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "ok", oauthStatus: "ok", description: "Provedor OAuth/API disponível para conexões de Facebook e Instagram dos tenants.", auditUpdatedAt: d(-1) },
  { id: "pp-tiktok", name: "TikTok Provider", provider: "tiktok", category: "social", status: "pending", enabled: true, environment: "sandbox", availabilityByPlan: PRO_PLANS, tenantsUsing: 0, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-3), lastGlobalError: null, webhookStatus: "none", oauthStatus: "error", description: "Provedor OAuth disponível para conexão de contas TikTok dos tenants.", auditUpdatedAt: d(-3) },
  { id: "pp-youtube", name: "YouTube Provider", provider: "youtube", category: "social", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 14, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "none", oauthStatus: "ok", description: "Provedor OAuth/API disponível para conexão de canais YouTube dos tenants.", auditUpdatedAt: d(-2) },
  { id: "pp-spotify", name: "Spotify Provider", provider: "spotify", category: "music_platform", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 19, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: NOW, lastGlobalError: null, webhookStatus: "none", oauthStatus: "ok", description: "Provedor disponível para conexão de contas e leitura/sincronização de dados autorizados pelos tenants.", auditUpdatedAt: d(-1) },
  { id: "pp-deezer", name: "Deezer Provider", provider: "deezer", category: "music_platform", status: "active", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 7, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-1), lastGlobalError: null, webhookStatus: "none", oauthStatus: "ok", description: "Provedor disponível para conexão de contas Deezer autorizadas pelos tenants.", auditUpdatedAt: d(-2) },
  { id: "pp-apple", name: "Apple Music Provider", provider: "apple_music", category: "music_platform", status: "pending", enabled: false, environment: "disabled", availabilityByPlan: ["enterprise"], tenantsUsing: 0, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-15), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Provedor opcional para conexão de contas Apple Music dos tenants.", auditUpdatedAt: d(-15) },
  { id: "pp-soundcloud", name: "SoundCloud Provider", provider: "soundcloud", category: "music_platform", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 5, requiresGlobalCredentials: true, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-1), lastGlobalError: null, webhookStatus: "none", oauthStatus: "ok", description: "Provedor disponível para conexão de contas SoundCloud dos tenants.", auditUpdatedAt: d(-3) },

  // ── Conectores externos de lançamento (NÃO distribuição interna) ──
  { id: "pp-onerpm", name: "ONErpm Connector Provider", provider: "onerpm", category: "launch_connector", status: "active", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 26, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-1), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Conector externo para acionamento de lançamento em distribuidora, sem distribuição interna pelo sistema.", auditUpdatedAt: d(-1) },
  { id: "pp-distrokid", name: "DistroKid Connector Provider", provider: "distrokid", category: "launch_connector", status: "active", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 19, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-2), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Conector externo para fluxo de lançamento em distribuidora externa, sem DDEX e sem distribuição própria.", auditUpdatedAt: d(-2) },
  { id: "pp-somvibe", name: "Somvibe Connector Provider", provider: "somvibe", category: "launch_connector", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 8, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-2), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Conector externo disponível para tenants habilitados iniciarem lançamento em parceiro.", auditUpdatedAt: d(-4) },
  { id: "pp-musicpro", name: "MusicPro Connector Provider", provider: "musicpro", category: "launch_connector", status: "active", enabled: true, environment: "production", availabilityByPlan: PRO_PLANS, tenantsUsing: 4, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-3), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Conector externo para acionamento de lançamento em distribuidora parceira.", auditUpdatedAt: d(-5) },
  { id: "pp-symphonic", name: "Symphonic Connector Provider", provider: "symphonic", category: "launch_connector", status: "disabled", enabled: false, environment: "disabled", availabilityByPlan: ["enterprise"], tenantsUsing: 0, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-20), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Conector externo opcional para iniciar fluxo de lançamento sem transformar o sistema em distribuidora.", auditUpdatedAt: d(-20) },
  { id: "pp-soundon", name: "SoundOn Connector Provider", provider: "soundon", category: "launch_connector", status: "active", enabled: true, environment: "production", availabilityByPlan: ALL_PLANS, tenantsUsing: 6, requiresGlobalCredentials: false, requiresTenantCredentials: true, isCore: false, lastHealthCheckAt: d(-2), lastGlobalError: null, webhookStatus: "none", oauthStatus: "n/a", description: "Conector externo disponível para tenants habilitados acionarem lançamento em parceiro.", auditUpdatedAt: d(-6) },
];

/* ─── Notifications ─── */
export const MOCK_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  { id: "n-001", type: "security", severity: "error", title: "Conta bloqueada", message: "Conta paulo@norterec.com.br bloqueada por tentativas excessivas.", read: false, created_at: NOW, action_url: "/admin/security" },
  { id: "n-002", type: "payment", severity: "warning", title: "Pagamento atrasado", message: "Estúdio Norte Records está com pagamento em atraso há 45 dias.", read: false, created_at: d(-1), action_url: "/admin/subscriptions" },
  { id: "n-003", type: "tenant", severity: "info", title: "Novo trial iniciado", message: "Independente Produções iniciou trial do plano Growth.", read: false, created_at: d(-10), action_url: "/admin/clients" },
  { id: "n-004", type: "system", severity: "warning", title: "Storage degradado", message: "Serviço de storage com latência elevada (380ms).", read: true, created_at: d(-1), action_url: "/admin/system" },
  { id: "n-005", type: "alert", severity: "success", title: "MRR recorde", message: "MRR atingiu R$ 124.750 — crescimento de 12,4% no mês.", read: true, created_at: d(-2) },
];

