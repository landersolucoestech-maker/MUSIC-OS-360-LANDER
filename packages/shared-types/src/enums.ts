// ─── Tenant / Billing ─────────────────────────────────────────────────────────

export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum BillingStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

// ─── Artistas ─────────────────────────────────────────────────────────────────

export enum ArtistStatus {
  CONTRATADO = 'contratado',
  EM_NEGOCIACAO = 'em_negociacao',
  ONBOARDING = 'onboarding',
  INATIVO = 'inativo',
}

// ─── Contratos ────────────────────────────────────────────────────────────────

export enum ContractStatus {
  RASCUNHO = 'rascunho',
  EM_ANALISE = 'em_analise',
  AGUARDANDO_ASSINATURA = 'aguardando_assinatura',
  ASSINADO = 'assinado',
  VIGENTE = 'vigente',
  ENCERRADO = 'encerrado',
  CANCELADO = 'cancelado',
}

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export enum WorkStatus {
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  REGISTRADO = 'registrado',
  REJEITADO = 'rejeitado',
}

// ─── Financeiro ───────────────────────────────────────────────────────────────

export enum TransactionTipo {
  RECEITA = 'receita',
  DESPESA = 'despesa',
}

export enum TransactionStatus {
  PENDENTE = 'pendente',
  CONFIRMADO = 'confirmado',
  CANCELADO = 'cancelado',
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

export enum LeadStatus {
  NOVO = 'novo',
  CONTATO = 'contato',
  QUALIFICADO = 'qualificado',
  PROPOSTA = 'proposta',
  FECHADO = 'fechado',
  PERDIDO = 'perdido',
}

// ─── Monitoramento ────────────────────────────────────────────────────────────

export enum TakedownStatus {
  PENDENTE = 'pendente',
  EM_ANDAMENTO = 'em_andamento',
  CONCLUIDO = 'concluido',
  REJEITADO = 'rejeitado',
}

// ─── Projetos ────────────────────────────────────────────────────────────────

export enum ProjectStatus {
  PLANEJAMENTO = 'planejamento',
  EM_ANDAMENTO = 'em_andamento',
  CONCLUIDO = 'concluido',
  CANCELADO = 'cancelado',
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

export enum EventStatus {
  AGENDADO = 'agendado',
  CONFIRMADO = 'confirmado',
  REALIZADO = 'realizado',
  CANCELADO = 'cancelado',
}

// ─── RBAC ────────────────────────────────────────────────────────────────────

export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_OWNER = 'tenant_owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}
