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
 * Inclui todos os roles de negócio presentes no frontend (auth.ts AppRole).
 */
export enum FunctionalRole {
  FINANCIAL          = "financial",
  ACCOUNTING         = "accounting",
  JURIDICO           = "juridico",
  MARKETING          = "marketing",
  MARKETING_MANAGER  = "marketing_manager",
  ARTIST             = "artist",
  ARTISTA            = "artista",
  PRODUTOR           = "produtor",
  COMERCIAL          = "comercial",
  COLABORADOR        = "colaborador",
  RH_MANAGER         = "rh_manager",
  RADIO              = "radio",
  TV                 = "tv",
}

/** Union de todos os roles reconhecidos pelo sistema */
export type AnyRole = SystemRole | FunctionalRole;

// ─── Artistas ─────────────────────────────────────────────────────────────────

/**
 * ArtistStatus — superset de todos os status possíveis para artistas.
 * Cobre status de cadastro geral (ativo/inativo) e status de relacionamento
 * contratual (contratado/em_negociacao/onboarding).
 * Frontend deriva: type ArtistaStatus = `${ArtistStatus}`
 */
export enum ArtistStatus {
  CONTRATADO    = "contratado",
  ATIVO         = "ativo",
  INATIVO       = "inativo",
  PROSPECTO     = "prospecto",
  DESLIGADO     = "desligado",
  SUSPENSO      = "suspenso",
  EX_ARTISTA    = "ex_artista",
  EM_NEGOCIACAO = "em_negociacao",
  ONBOARDING    = "onboarding",
}

export enum ArtistStatusCadastro {
  ATIVO    = "ativo",
  INATIVO  = "inativo",
  SUSPENSO = "suspenso",
}

// ─── Contratos ────────────────────────────────────────────────────────────────

/**
 * ContractStatus — ciclo de vida de um contrato.
 * Inclui todos os estados do pipeline: rascunho → ativo → vencendo → encerrado.
 */
export enum ContractStatus {
  RASCUNHO              = "rascunho",
  EM_ANALISE            = "em_analise",
  AGUARDANDO_ASSINATURA = "aguardando_assinatura",
  ASSINADO              = "assinado",
  ATIVO                 = "ativo",
  VIGENTE               = "vigente",
  VENCENDO              = "vencendo",
  VENCIDO               = "vencido",
  ENCERRADO             = "encerrado",
  CANCELADO             = "cancelado",
}

// ─── Catálogo — Obras ─────────────────────────────────────────────────────────

/**
 * WorkStatus — ciclo de vida de uma obra musical.
 * "analise" e "em_analise" são mantidos como superset para compatibilidade
 * com dados legados frontend/backend.
 */
export enum WorkStatus {
  PENDENTE   = "pendente",
  ANALISE    = "analise",
  EM_ANALISE = "em_analise",
  REGISTRADO = "registrado",
  ATIVO      = "ativo",
  INATIVO    = "inativo",
  REJEITADO  = "rejeitado",
  ARQUIVADO  = "arquivado",
}

// ─── Catálogo — Fonogramas ────────────────────────────────────────────────────

/**
 * PhonogramStatus — ciclo de vida de um fonograma.
 * Mesma estratégia de superset que WorkStatus.
 */
export enum PhonogramStatus {
  PENDENTE   = "pendente",
  ANALISE    = "analise",
  EM_ANALISE = "em_analise",
  REGISTRADO = "registrado",
  ATIVO      = "ativo",
  INATIVO    = "inativo",
  REJEITADO  = "rejeitado",
  ARQUIVADO  = "arquivado",
}

// ─── Releases (Lançamentos) ───────────────────────────────────────────────────

/**
 * ReleaseStatus — ciclo de vida de um lançamento musical.
 * Conforme spec: draft → metadata_pending → assets_pending → review → approved →
 *                scheduled → distributed → released → archived / cancelled
 */
export enum ReleaseStatus {
  DRAFT            = "draft",
  METADATA_PENDING = "metadata_pending",
  ASSETS_PENDING   = "assets_pending",
  REVIEW           = "review",
  APPROVED         = "approved",
  SCHEDULED        = "scheduled",
  DISTRIBUTED      = "distributed",
  RELEASED         = "released",
  ARCHIVED         = "archived",
  CANCELLED        = "cancelled",
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

/**
 * TransactionStatus — estado de uma transacção financeira.
 * Inclui "concluido" (frontend) e "confirmado" (backend) como superset.
 */
export enum TransactionStatus {
  PENDENTE   = "pendente",
  CONCLUIDO  = "concluido",
  CONFIRMADO = "confirmado",
  CANCELADO  = "cancelado",
  AGENDADO   = "agendado",
}

// ─── Notas Fiscais (Invoices) ─────────────────────────────────────────────────

/**
 * InvoiceStatus — estado de uma nota fiscal / factura.
 * Superset: inclui estados frontend (rascunho/emitida/rejeitada) e backend (paga/vencida).
 */
export enum InvoiceStatus {
  RASCUNHO  = "rascunho",
  PENDENTE  = "pendente",
  EMITIDA   = "emitida",
  PAGA      = "paga",
  CANCELADA = "cancelada",
  VENCIDA   = "vencida",
  REJEITADA = "rejeitada",
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

/**
 * LeadStatus — pipeline de um lead no CRM.
 * Inclui "em_contato" (frontend) e "contato"/"qualificado" (backend).
 */
export enum LeadStatus {
  NOVO        = "novo",
  EM_CONTATO  = "em_contato",
  CONTATO     = "contato",
  QUALIFICADO = "qualificado",
  PROPOSTA    = "proposta",
  NEGOCIACAO  = "negociacao",
  FECHADO     = "fechado",
  PERDIDO     = "perdido",
  INATIVO     = "inativo",
}

export enum ClientStatus {
  ATIVO     = "ativo",
  INATIVO   = "inativo",
  PROSPECTO = "prospecto",
}

// ─── Marketing / Campanhas ────────────────────────────────────────────────────

export enum CampaignStatus {
  RASCUNHO     = "rascunho",
  PLANEJAMENTO = "planejamento",
  ATIVA        = "ativa",
  PAUSADA      = "pausada",
  CONCLUIDA    = "concluida",
  CANCELADA    = "cancelada",
}

export enum BriefingStatus {
  RASCUNHO     = "rascunho",
  EM_ANDAMENTO = "em_andamento",
  REVISAO      = "revisao",
  APROVADO     = "aprovado",
  CONCLUIDO    = "concluido",
  CANCELADO    = "cancelado",
}

// ─── Monitoramento ────────────────────────────────────────────────────────────

/**
 * TakedownStatus — estado de um processo de takedown.
 * Superset: inclui "enviado"/"processando"/"falhou" (frontend) e "em_andamento"/"concluido" (backend).
 */
export enum TakedownStatus {
  PENDENTE     = "pendente",
  ENVIADO      = "enviado",
  PROCESSANDO  = "processando",
  EM_ANDAMENTO = "em_andamento",
  CONCLUIDO    = "concluido",
  REJEITADO    = "rejeitado",
  FALHOU       = "falhou",
}

export enum ContentDetectionStatus {
  PENDENTE     = "pendente",
  EM_ANDAMENTO = "em_andamento",
  CONCLUIDO    = "concluido",
  REJEITADO    = "rejeitado",
  ARQUIVADO    = "arquivado",
}

// ─── Projetos ────────────────────────────────────────────────────────────────

/**
 * ProjectStatus — ciclo de vida de um projecto musical.
 * Conforme spec: planejamento → em_andamento → revisao → concluido / cancelado
 */
export enum ProjectStatus {
  PLANEJAMENTO  = "planejamento",
  EM_ANDAMENTO  = "em_andamento",
  REVISAO       = "revisao",
  CONCLUIDO     = "concluido",
  CANCELADO     = "cancelado",
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

/**
 * EventStatus — estado de um evento.
 * Superset: inclui "planejado"/"concluido"/"adiado" (frontend) e "agendado"/"realizado" (backend).
 */
export enum EventStatus {
  PLANEJADO  = "planejado",
  AGENDADO   = "agendado",
  CONFIRMADO = "confirmado",
  REALIZADO  = "realizado",
  CONCLUIDO  = "concluido",
  CANCELADO  = "cancelado",
  ADIADO     = "adiado",
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
  PENDENTE   = "pendente",
  PROCESSADO = "processado",
  PAGO       = "pago",
  CANCELADO  = "cancelado",
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
  PENDING   = "pending",
  PROCESSED = "processed",
  FAILED    = "failed",
  SKIPPED   = "skipped",
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
  PENDENTE  = "pendente",
  IMPORTADO = "importado",
  CONCLUIDO = "concluido",
  ERRO      = "erro",
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
