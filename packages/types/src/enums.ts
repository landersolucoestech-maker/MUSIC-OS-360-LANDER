// ─── Tenant / Billing ─────────────────────────────────────────────────────────

export enum TenantPlan {
  STARTER      = "starter",
  PROFESSIONAL = "professional",
  ENTERPRISE   = "enterprise",
}

export enum BillingStatus {
  TRIAL    = "trial",
  ACTIVE   = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  UNPAID   = "unpaid",
}

// ─── RBAC — System Roles (stored in org_members.role) ────────────────────────

/**
 * SystemRole — roles hierárquicos de sistema (armazenados em OrgMemberEntity.role).
 * Alinhado com roles.guard.ts ROLE_HIERARCHY.
 */
export enum SystemRole {
  SUPER_ADMIN  = "super_admin",
  TENANT_OWNER = "tenant_owner",
  OWNER        = "owner",
  ADMIN        = "admin",
  EDITOR       = "editor",
  MANAGER      = "manager",
  VIEWER       = "viewer",
}

/**
 * FunctionalRole — roles funcionais/domínio usados no RBAC service.
 * Não são roles de sistema; representam funções operacionais dentro do tenant.
 */
export enum FunctionalRole {
  FINANCIAL  = "financial",
  MARKETING  = "marketing",
  ARTIST     = "artist",
  RADIO      = "radio",
  TV         = "tv",
}

/** Union de todos os roles reconhecidos pelo sistema */
export type AnyRole = SystemRole | FunctionalRole;

// ─── Artistas ─────────────────────────────────────────────────────────────────

export enum ArtistStatus {
  CONTRATADO      = "contratado",
  EM_NEGOCIACAO   = "em_negociacao",
  ONBOARDING      = "onboarding",
  INATIVO         = "inativo",
}

export enum ArtistStatusCadastro {
  ATIVO    = "ativo",
  INATIVO  = "inativo",
  SUSPENSO = "suspenso",
}

// ─── Contratos ────────────────────────────────────────────────────────────────

export enum ContractStatus {
  RASCUNHO              = "rascunho",
  EM_ANALISE            = "em_analise",
  AGUARDANDO_ASSINATURA = "aguardando_assinatura",
  ASSINADO              = "assinado",
  VIGENTE               = "vigente",
  ENCERRADO             = "encerrado",
  CANCELADO             = "cancelado",
}

// ─── Catálogo — Obras ─────────────────────────────────────────────────────────

export enum WorkStatus {
  PENDENTE   = "pendente",
  EM_ANALISE = "em_analise",
  REGISTRADO = "registrado",
  REJEITADO  = "rejeitado",
}

// ─── Catálogo — Fonogramas ────────────────────────────────────────────────────

export enum PhonogramStatus {
  PENDENTE   = "pendente",
  EM_ANALISE = "em_analise",
  REGISTRADO = "registrado",
  REJEITADO  = "rejeitado",
  ARQUIVADO  = "arquivado",
}

// ─── Releases (Lançamentos) ───────────────────────────────────────────────────

/**
 * ReleaseStatus — ciclo de vida de um lançamento musical.
 * Workflow completo definido em FASE 2.
 */
export enum ReleaseStatus {
  PLANEJAMENTO    = "planejamento",
  EM_PREPARACAO   = "em_preparacao",
  EM_ANALISE      = "em_analise",
  APROVADO        = "aprovado",
  AGENDADO        = "agendado",
  DISTRIBUIDO     = "distribuido",
  PUBLICADO       = "publicado",
  ARQUIVADO       = "arquivado",
  CANCELADO       = "cancelado",
}

// ─── Shares (Participações) ───────────────────────────────────────────────────

export enum ShareStatus {
  ATIVO     = "ativo",
  INATIVO   = "inativo",
  PENDENTE  = "pendente",
  LIQUIDADO = "liquidado",
}

// ─── Financeiro / Accounting ──────────────────────────────────────────────────

export enum TransactionTipo {
  RECEITA = "receita",
  DESPESA = "despesa",
}

export enum TransactionStatus {
  PENDENTE   = "pendente",
  CONFIRMADO = "confirmado",
  CANCELADO  = "cancelado",
}

// ─── Notas Fiscais (Invoices) ─────────────────────────────────────────────────

export enum InvoiceStatus {
  PENDENTE  = "pendente",
  EMITIDA   = "emitida",
  PAGA      = "paga",
  CANCELADA = "cancelada",
  VENCIDA   = "vencida",
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export enum LeadStatus {
  NOVO        = "novo",
  CONTATO     = "contato",
  QUALIFICADO = "qualificado",
  PROPOSTA    = "proposta",
  FECHADO     = "fechado",
  PERDIDO     = "perdido",
}

export enum ClientStatus {
  ATIVO     = "ativo",
  INATIVO   = "inativo",
  PROSPECTO = "prospecto",
}

// ─── Marketing / Campanhas ────────────────────────────────────────────────────

export enum CampaignStatus {
  RASCUNHO    = "rascunho",
  PLANEJAMENTO = "planejamento",
  ATIVA       = "ativa",
  PAUSADA     = "pausada",
  CONCLUIDA   = "concluida",
  CANCELADA   = "cancelada",
}

export enum BriefingStatus {
  RASCUNHO    = "rascunho",
  EM_ANDAMENTO = "em_andamento",
  REVISAO     = "revisao",
  APROVADO    = "aprovado",
  CONCLUIDO   = "concluido",
  CANCELADO   = "cancelado",
}

// ─── Monitoramento ────────────────────────────────────────────────────────────

export enum TakedownStatus {
  PENDENTE     = "pendente",
  EM_ANDAMENTO = "em_andamento",
  CONCLUIDO    = "concluido",
  REJEITADO    = "rejeitado",
}

export enum ContentDetectionStatus {
  PENDENTE     = "pendente",
  EM_ANDAMENTO = "em_andamento",
  CONCLUIDO    = "concluido",
  REJEITADO    = "rejeitado",
  ARQUIVADO    = "arquivado",
}

// ─── Projetos ────────────────────────────────────────────────────────────────

export enum ProjectStatus {
  PLANEJAMENTO = "planejamento",
  EM_ANDAMENTO = "em_andamento",
  CONCLUIDO    = "concluido",
  CANCELADO    = "cancelado",
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

export enum EventStatus {
  AGENDADO  = "agendado",
  CONFIRMADO = "confirmado",
  REALIZADO = "realizado",
  CANCELADO = "cancelado",
}

// ─── RH / Funcionários ────────────────────────────────────────────────────────

export enum EmployeeStatus {
  ATIVO    = "ativo",
  INATIVO  = "inativo",
  FERIAS   = "ferias",
  LICENCA  = "licenca",
  DEMITIDO = "demitido",
}

export enum PayrollStatus {
  PENDENTE  = "pendente",
  PROCESSADO = "processado",
  PAGO      = "pago",
  CANCELADO = "cancelado",
}

export enum LeaveRequestStatus {
  PENDENTE  = "pendente",
  APROVADO  = "aprovado",
  REJEITADO = "rejeitado",
  CONCLUIDO = "concluido",
}

// ─── Uploads / Media ─────────────────────────────────────────────────────────

export enum UploadStatus {
  PENDING    = "pending",
  PROCESSING = "processing",
  READY      = "ready",
  ERROR      = "error",
  DELETED    = "deleted",
}

// ─── Integrações ─────────────────────────────────────────────────────────────

export enum IntegrationStatus {
  DISCONNECTED = "disconnected",
  CONNECTING   = "connecting",
  CONNECTED    = "connected",
  ERROR        = "error",
  DISABLED     = "disabled",
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export enum WebhookEventStatus {
  PENDING    = "pending",
  PROCESSED  = "processed",
  FAILED     = "failed",
  SKIPPED    = "skipped",
}

// ─── Support Tickets ─────────────────────────────────────────────────────────

export enum SupportTicketStatus {
  OPEN         = "open",
  IN_PROGRESS  = "in_progress",
  PENDING_USER = "pending_user",
  RESOLVED     = "resolved",
  CLOSED       = "closed",
  CANCELLED    = "cancelled",
}

export enum SupportTicketPriority {
  LOW      = "low",
  MEDIUM   = "medium",
  HIGH     = "high",
  CRITICAL = "critical",
}

// ─── AI Jobs ─────────────────────────────────────────────────────────────────

export enum AIJobStatus {
  PENDING    = "pending",
  PROCESSING = "processing",
  COMPLETED  = "completed",
  FAILED     = "failed",
  CANCELLED  = "cancelled",
}

// ─── ECAD / Reports ──────────────────────────────────────────────────────────

export enum EcadReportStatus {
  PENDENTE   = "pendente",
  IMPORTADO  = "importado",
  CONCLUIDO  = "concluido",
  ERRO       = "erro",
}

// ─── Artist Goals ─────────────────────────────────────────────────────────────

export enum ArtistGoalStatus {
  EM_ANDAMENTO = "em_andamento",
  CONCLUIDO    = "concluido",
  CANCELADO    = "cancelado",
  EXPIRADO     = "expirado",
}

// ─── Notifications ────────────────────────────────────────────────────────────

export enum NotificationType {
  INFO    = "info",
  WARNING = "warning",
  ERROR   = "error",
  SUCCESS = "success",
}
