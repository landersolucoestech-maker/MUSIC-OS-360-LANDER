/**
 * database/schema.ts
 *
 * Combines two concerns:
 *  1. Entity type re-exports (backward-compat aliases)
 *  2. Zod insert / update schemas for request validation
 *
 * Pattern per entity:
 *   const createXxxSchema   — fields for INSERT (no auto-generated fields)
 *   const updateXxxSchema   — all fields partial (except tenant_id)
 *   type  CreateXxxInput    — inferred from createXxxSchema
 *   type  UpdateXxxInput    — inferred from updateXxxSchema
 */

import { z } from 'zod';
import {
  ArtistStatus, ArtistStatusCadastro,
  ContractStatus,
  WorkStatus, PhonogramStatus,
  ReleaseStatus, ShareStatus,
  TransactionTipo, TransactionStatus,
  InvoiceStatus, ClientStatus, LeadStatus,
  CampaignStatus, BriefingStatus,
  EventStatus, ProjectStatus,
  TakedownStatus, ContentDetectionStatus,
  SupportTicketStatus, SupportTicketPriority,
  UploadStatus, IntegrationStatus, WebhookEventStatus,
  AIJobStatus, EcadReportStatus,
  EmployeeStatus, PayrollStatus, LeaveRequestStatus,
  ArtistGoalStatus, NotificationType,
  SystemRole,
} from '@music-os-360/types';

// ─── Entity class re-exports (backward-compat) ────────────────────────────────
export {
  OrganizationEntity    as Organization,
  TenantEntity          as Tenant,
  OrgMemberEntity       as OrgMember,
  BillingSubscriptionEntity as BillingSubscription,
  ArtistEntity          as Artist,
  WorkEntity            as Work,
  PhonogramEntity       as Phonogram,
  ContractEntity        as Contract,
  ContractTemplateEntity as ContractTemplate,
  TransactionEntity     as Transaction,
  InvoiceEntity         as Invoice,
  ClientEntity          as Client,
  LeadEntity            as Lead,
  LeadInteractionEntity as LeadInteraction,
  CampaignEntity        as Campaign,
  BriefingEntity        as Briefing,
  EventEntity           as Event,
  ProjectEntity         as Project,
  ReleaseEntity         as Release,
  ShareEntity           as Share,
  TakedownEntity        as Takedown,
  SupportTicketEntity   as SupportTicket,
  NotificationEntity    as Notification,
  UploadEntity          as Upload,
  IntegrationEntity     as Integration,
  OAuthConnectionEntity as OAuthConnection,
  WebhookEventEntity    as WebhookEvent,
  AuditLogEntity        as AuditLog,
  AIJobEntity           as AIJob,
  ArtistGoalEntity      as ArtistGoal,
  ContentDetectionEntity as ContentDetection,
  EcadReportEntity      as EcadReport,
  EmployeeEntity        as Employee,
  PayrollEntryEntity    as PayrollEntry,
  LeaveRequestEntity    as LeaveRequest,
} from './entities';

// ─── Common primitives ────────────────────────────────────────────────────────
const uuid    = z.string().uuid();
const nonEmpty = z.string().min(1).max(500);
const optText  = z.string().max(5000).nullable().optional();
const optUrl   = z.string().url().max(2048).nullable().optional();
const money    = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor monetário inválido');
const jsonb    = z.record(z.unknown()).optional().default({});

// ─── Artists ──────────────────────────────────────────────────────────────────
export const createArtistSchema = z.object({
  tenant_id:             uuid,
  nome_artistico:        nonEmpty,
  nome_civil:            z.string().max(255).nullable().optional(),
  tipo:                  z.enum(['solo','banda','dupla','trio','grupo']).default('solo'),
  status:                z.nativeEnum(ArtistStatus).default(ArtistStatus.EM_NEGOCIACAO),
  status_cadastro:       z.nativeEnum(ArtistStatusCadastro).default(ArtistStatusCadastro.ATIVO),
  genero_musical:        z.string().max(100).nullable().optional(),
  email_encrypted:       optText,
  telefone_encrypted:    optText,
  cpf_cnpj_encrypted:    optText,
  foto_url:              optUrl,
  banner_url:            optUrl,
  observacoes:           optText,
  manager_nome:          z.string().max(255).nullable().optional(),
  manager_contato_encrypted: optText,
  produtor_executivo:    z.string().max(255).nullable().optional(),
  agencia_booking:       z.string().max(255).nullable().optional(),
  label_parceira:        z.string().max(255).nullable().optional(),
  spotify_artist_id:     z.string().max(255).nullable().optional(),
  youtube_channel_id:    z.string().max(255).nullable().optional(),
  contrato_id:           uuid.nullable().optional(),
  metadata:              jsonb,
  created_by:            z.string().max(255).nullable().optional(),
});
export const updateArtistSchema = createArtistSchema.omit({ tenant_id: true }).partial();
export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;

// ─── Works (Obras) ────────────────────────────────────────────────────────────
export const createWorkSchema = z.object({
  tenant_id:    uuid,
  titulo:       nonEmpty,
  compositor:   z.string().max(255).nullable().optional(),
  compositores: optText,
  co_compositores: optText,
  detentores:   optText,
  editora:      z.string().max(255).nullable().optional(),
  isrc:         z.string().max(20).nullable().optional(),
  iswc:         z.string().max(20).nullable().optional(),
  cod_abramus:  z.string().max(100).nullable().optional(),
  cod_ecad:     z.string().max(100).nullable().optional(),
  tipo:         z.string().min(1).max(100),
  genero:       z.string().max(100).nullable().optional(),
  status:       z.nativeEnum(WorkStatus).default(WorkStatus.PENDENTE),
  duracao:      z.string().max(20).nullable().optional(),
  metadata:     jsonb,
  created_by:   z.string().max(255).nullable().optional(),
});
export const updateWorkSchema = createWorkSchema.omit({ tenant_id: true }).partial();
export type CreateWorkInput = z.infer<typeof createWorkSchema>;
export type UpdateWorkInput = z.infer<typeof updateWorkSchema>;

// ─── Phonograms (Fonogramas) ───────────────────────────────────────────────────
export const createPhonogramSchema = z.object({
  tenant_id:    uuid,
  titulo:       nonEmpty,
  obra_id:      uuid.nullable().optional(),
  artista_id:   uuid.nullable().optional(),
  isrc:         z.string().max(20).nullable().optional(),
  duracao:      z.string().max(20).nullable().optional(),
  tipo:         z.string().min(1).max(100),
  status:       z.nativeEnum(PhonogramStatus).default(PhonogramStatus.PENDENTE),
  compositores: optText,
  interpretes:  optText,
  produtores:   optText,
  gravadora:    z.string().max(255).nullable().optional(),
  cod_abramus:  z.string().max(100).nullable().optional(),
  cod_ecad:     z.string().max(100).nullable().optional(),
  metadata:     jsonb,
  created_by:   z.string().max(255).nullable().optional(),
});
export const updatePhonogramSchema = createPhonogramSchema.omit({ tenant_id: true }).partial();
export type CreatePhonogramInput = z.infer<typeof createPhonogramSchema>;
export type UpdatePhonogramInput = z.infer<typeof updatePhonogramSchema>;

// ─── Contracts ────────────────────────────────────────────────────────────────
export const createContractSchema = z.object({
  tenant_id:        uuid,
  titulo:           nonEmpty,
  tipo:             z.string().min(1).max(100),
  status:           z.nativeEnum(ContractStatus).default(ContractStatus.RASCUNHO),
  artista_id:       uuid.nullable().optional(),
  cliente_id:       uuid.nullable().optional(),
  lancamento_id:    uuid.nullable().optional(),
  data_inicio:      z.coerce.date().nullable().optional(),
  data_fim:         z.coerce.date().nullable().optional(),
  valor:            money.nullable().optional(),
  exclusivo:        z.boolean().default(false),
  observacoes:      optText,
  arquivo_url:      optUrl,
  autentique_doc_id: z.string().max(255).nullable().optional(),
  signing_platform: z.string().max(100).nullable().optional(),
  metadata:         jsonb,
  created_by:       z.string().max(255).nullable().optional(),
});
export const updateContractSchema = createContractSchema.omit({ tenant_id: true }).partial();
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;

// ─── Transactions ─────────────────────────────────────────────────────────────
export const createTransactionSchema = z.object({
  tenant_id:   uuid,
  tipo:        z.nativeEnum(TransactionTipo),
  categoria:   z.string().min(1).max(100),
  descricao:   optText,
  valor:       money,
  data:        z.coerce.date(),
  status:      z.nativeEnum(TransactionStatus).default(TransactionStatus.PENDENTE),
  artista_id:  uuid.nullable().optional(),
  contrato_id: uuid.nullable().optional(),
  projeto_id:  uuid.nullable().optional(),
  referencia:  z.string().max(255).nullable().optional(),
  comprovante_url: optUrl,
  metadata:    jsonb,
  created_by:  z.string().max(255).nullable().optional(),
});
export const updateTransactionSchema = createTransactionSchema.omit({ tenant_id: true }).partial();
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// ─── Invoices (Notas Fiscais) ─────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  tenant_id:          uuid,
  numero:             z.string().max(100).nullable().optional(),
  tipo:               z.string().min(1).max(100),
  status:             z.nativeEnum(InvoiceStatus).default(InvoiceStatus.PENDENTE),
  prestador_id:       uuid.nullable().optional(),
  tomador_nome:       z.string().max(255).nullable().optional(),
  tomador_doc_encrypted: optText,
  valor:              money,
  descricao:          optText,
  data_emissao:       z.coerce.date().nullable().optional(),
  data_vencimento:    z.coerce.date().nullable().optional(),
  arquivo_url:        optUrl,
  metadata:           jsonb,
  created_by:         z.string().max(255).nullable().optional(),
});
export const updateInvoiceSchema = createInvoiceSchema.omit({ tenant_id: true }).partial();
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// ─── Clients ──────────────────────────────────────────────────────────────────
export const createClientSchema = z.object({
  tenant_id:           uuid,
  nome:                nonEmpty,
  segmento:            z.string().max(100).nullable().optional(),
  tipo_pessoa:         z.enum(['pessoa_fisica','pessoa_juridica']).default('pessoa_juridica'),
  cpf_cnpj_encrypted:  optText,
  responsavel:         z.string().max(255).nullable().optional(),
  email_encrypted:     optText,
  telefone_encrypted:  optText,
  endereco:            z.string().max(500).nullable().optional(),
  cidade:              z.string().max(100).nullable().optional(),
  estado:              z.string().length(2).nullable().optional(),
  status:              z.nativeEnum(ClientStatus).default(ClientStatus.ATIVO),
  observacoes:         optText,
  metadata:            jsonb,
  created_by:          z.string().max(255).nullable().optional(),
});
export const updateClientSchema = createClientSchema.omit({ tenant_id: true }).partial();
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// ─── Leads ────────────────────────────────────────────────────────────────────
export const createLeadSchema = z.object({
  tenant_id:          uuid,
  cliente_id:         uuid.nullable().optional(),
  nome:               nonEmpty,
  email_encrypted:    optText,
  telefone_encrypted: optText,
  empresa:            z.string().max(255).nullable().optional(),
  status:             z.nativeEnum(LeadStatus).default(LeadStatus.NOVO),
  score:              z.number().int().min(0).max(100).default(0),
  fonte:              z.string().max(100).nullable().optional(),
  pipeline_stage:     z.string().max(100).nullable().optional(),
  metadata:           jsonb,
  created_by:         z.string().max(255).nullable().optional(),
});
export const updateLeadSchema = createLeadSchema.omit({ tenant_id: true }).partial();
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ─── Lead Interactions ────────────────────────────────────────────────────────
export const createLeadInteractionSchema = z.object({
  tenant_id:  uuid,
  lead_id:    uuid,
  tipo:       z.string().min(1).max(100),
  descricao:  optText,
  data:       z.coerce.date().optional(),
  created_by: z.string().max(255).nullable().optional(),
});
export type CreateLeadInteractionInput = z.infer<typeof createLeadInteractionSchema>;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const createCampaignSchema = z.object({
  tenant_id:  uuid,
  nome:       nonEmpty,
  tipo:       z.string().min(1).max(100),
  status:     z.nativeEnum(CampaignStatus).default(CampaignStatus.RASCUNHO),
  objetivo:   optText,
  orcamento:  money.nullable().optional(),
  data_inicio: z.coerce.date().nullable().optional(),
  data_fim:   z.coerce.date().nullable().optional(),
  artista_id: uuid.nullable().optional(),
  metadata:   jsonb,
  created_by: z.string().max(255).nullable().optional(),
});
export const updateCampaignSchema = createCampaignSchema.omit({ tenant_id: true }).partial();
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

// ─── Briefings ────────────────────────────────────────────────────────────────
export const createBriefingSchema = z.object({
  tenant_id:   uuid,
  titulo:      nonEmpty,
  descricao:   optText,
  artista_id:  uuid.nullable().optional(),
  campanha_id: uuid.nullable().optional(),
  status:      z.nativeEnum(BriefingStatus).default(BriefingStatus.RASCUNHO),
  prazo:       z.coerce.date().nullable().optional(),
  metadata:    jsonb,
  created_by:  z.string().max(255).nullable().optional(),
});
export const updateBriefingSchema = createBriefingSchema.omit({ tenant_id: true }).partial();
export type CreateBriefingInput = z.infer<typeof createBriefingSchema>;
export type UpdateBriefingInput = z.infer<typeof updateBriefingSchema>;

// ─── Events ───────────────────────────────────────────────────────────────────
export const createEventSchema = z.object({
  tenant_id:   uuid,
  titulo:      nonEmpty,
  tipo:        z.string().min(1).max(100),
  status:      z.nativeEnum(EventStatus).default(EventStatus.AGENDADO),
  data:        z.coerce.date(),
  local:       z.string().max(255).nullable().optional(),
  artista_id:  uuid.nullable().optional(),
  valor:       money.nullable().optional(),
  observacoes: optText,
  metadata:    jsonb,
  created_by:  z.string().max(255).nullable().optional(),
});
export const updateEventSchema = createEventSchema.omit({ tenant_id: true }).partial();
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const createProjectSchema = z.object({
  tenant_id:   uuid,
  nome:        nonEmpty,
  tipo:        z.string().min(1).max(100),
  status:      z.nativeEnum(ProjectStatus).default(ProjectStatus.PLANEJAMENTO),
  artista_id:  uuid.nullable().optional(),
  data_inicio: z.coerce.date().nullable().optional(),
  data_fim:    z.coerce.date().nullable().optional(),
  orcamento:   money.nullable().optional(),
  descricao:   optText,
  metadata:    jsonb,
  created_by:  z.string().max(255).nullable().optional(),
});
export const updateProjectSchema = createProjectSchema.omit({ tenant_id: true }).partial();
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ─── Releases (Lançamentos) ───────────────────────────────────────────────────
export const createReleaseSchema = z.object({
  tenant_id:       uuid,
  artista_id:      uuid.nullable().optional(),
  titulo:          nonEmpty,
  tipo:            z.enum(['album','ep','single','mixtape','compilacao']).default('single'),
  status:          z.nativeEnum(ReleaseStatus).default(ReleaseStatus.DRAFT),
  distribuidora:   z.string().max(255).nullable().optional(),
  upc:             z.string().max(20).nullable().optional(),
  data_lancamento: z.coerce.date().nullable().optional(),
  plataformas:     z.array(z.unknown()).optional().default([]),
  capa_url:        optUrl,
  metadata:        jsonb,
  created_by:      z.string().max(255).nullable().optional(),
});
export const updateReleaseSchema = createReleaseSchema.omit({ tenant_id: true }).partial();
export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;

// ─── Shares (Participações) ───────────────────────────────────────────────────
export const createShareSchema = z.object({
  tenant_id:    uuid,
  obra_id:      uuid.nullable().optional(),
  fonograma_id: uuid.nullable().optional(),
  titular_nome: nonEmpty,
  titular_doc:  z.string().max(50).nullable().optional(),
  papel:        z.string().min(1).max(100).default('autor'),
  percentual:   z.string().regex(/^\d{1,3}(\.\d{1,4})?$/, 'Percentual inválido'),
  status:       z.nativeEnum(ShareStatus).default(ShareStatus.ATIVO),
  metadata:     jsonb,
});
export const updateShareSchema = createShareSchema.omit({ tenant_id: true }).partial();
export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;

// ─── Takedowns ────────────────────────────────────────────────────────────────
export const createTakedownSchema = z.object({
  tenant_id:  uuid,
  titulo:     nonEmpty,
  plataforma: z.string().min(1).max(100),
  url:        optUrl,
  status:     z.nativeEnum(TakedownStatus).default(TakedownStatus.PENDENTE),
  obra_id:    uuid.nullable().optional(),
  artista_id: uuid.nullable().optional(),
  motivo:     optText,
  metadata:   jsonb,
  created_by: z.string().max(255).nullable().optional(),
});
export const updateTakedownSchema = createTakedownSchema.omit({ tenant_id: true }).partial();
export type CreateTakedownInput = z.infer<typeof createTakedownSchema>;
export type UpdateTakedownInput = z.infer<typeof updateTakedownSchema>;

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const createSupportTicketSchema = z.object({
  tenant_id:   uuid,
  subject:     nonEmpty,
  description: optText,
  status:      z.nativeEnum(SupportTicketStatus).default(SupportTicketStatus.OPEN),
  priority:    z.nativeEnum(SupportTicketPriority).default(SupportTicketPriority.MEDIUM),
  category:    z.string().max(100).nullable().optional(),
  created_by:  z.string().min(1).max(255),
  assigned_to: z.string().max(255).nullable().optional(),
  tags:        z.array(z.unknown()).optional().default([]),
  metadata:    jsonb,
});
export const updateSupportTicketSchema = createSupportTicketSchema.omit({ tenant_id: true, created_by: true }).partial();
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>;

// ─── Employees ────────────────────────────────────────────────────────────────
export const createEmployeeSchema = z.object({
  tenant_id:          uuid,
  nome:               nonEmpty,
  cargo:              z.string().max(255).nullable().optional(),
  departamento:       z.string().max(100).nullable().optional(),
  tipo_contrato:      z.enum(['clt','pj','estagio','freelancer','terceirizado']).default('clt'),
  status:             z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ATIVO),
  email_encrypted:    optText,
  telefone_encrypted: optText,
  cpf_encrypted:      optText,
  salario:            money.nullable().optional(),
  data_admissao:      z.coerce.date().nullable().optional(),
  data_demissao:      z.coerce.date().nullable().optional(),
  metadata:           jsonb,
  created_by:         z.string().max(255).nullable().optional(),
});
export const updateEmployeeSchema = createEmployeeSchema.omit({ tenant_id: true }).partial();
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// ─── Payroll Entries ──────────────────────────────────────────────────────────
export const createPayrollEntrySchema = z.object({
  tenant_id:      uuid,
  employee_id:    uuid,
  competencia:    z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve ser YYYY-MM'),
  salario_bruto:  money,
  descontos:      money.default('0'),
  salario_liquido: money,
  status:         z.nativeEnum(PayrollStatus).default(PayrollStatus.PENDENTE),
  arquivo_url:    optUrl,
  pago_em:        z.coerce.date().nullable().optional(),
  metadata:       jsonb,
});
export const updatePayrollEntrySchema = createPayrollEntrySchema.omit({ tenant_id: true, employee_id: true }).partial();
export type CreatePayrollEntryInput = z.infer<typeof createPayrollEntrySchema>;
export type UpdatePayrollEntryInput = z.infer<typeof updatePayrollEntrySchema>;

// ─── Leave Requests ───────────────────────────────────────────────────────────
export const createLeaveRequestSchema = z.object({
  tenant_id:    uuid,
  employee_id:  uuid,
  tipo:         z.string().min(1).max(100),
  status:       z.nativeEnum(LeaveRequestStatus).default(LeaveRequestStatus.PENDENTE),
  data_inicio:  z.coerce.date(),
  data_fim:     z.coerce.date(),
  motivo:       optText,
  documento_url: optUrl,
  metadata:     jsonb,
  created_by:   z.string().max(255).nullable().optional(),
});
export const updateLeaveRequestSchema = createLeaveRequestSchema.omit({ tenant_id: true, employee_id: true }).partial();
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestInput = z.infer<typeof updateLeaveRequestSchema>;

// ─── Uploads ──────────────────────────────────────────────────────────────────
export const createUploadSchema = z.object({
  tenant_id:     uuid,
  user_id:       z.string().min(1).max(255),
  file_id:       z.string().min(1).max(255),
  original_name: z.string().min(1).max(500),
  mime_type:     z.string().min(1).max(255),
  size_bytes:    z.number().int().positive(),
  r2_key:        z.string().min(1),
  category:      z.string().min(1).max(50),
  entity:        z.string().max(100).nullable().optional(),
  entity_id:     z.string().max(255).nullable().optional(),
  status:        z.nativeEnum(UploadStatus).default(UploadStatus.PENDING),
  metadata:      jsonb,
});
export type CreateUploadInput = z.infer<typeof createUploadSchema>;

// ─── Integrations ─────────────────────────────────────────────────────────────
export const createIntegrationSchema = z.object({
  tenant_id:            uuid,
  provider:             z.string().min(1).max(100),
  status:               z.nativeEnum(IntegrationStatus).default(IntegrationStatus.DISCONNECTED),
  credentials_encrypted: z.string().nullable().optional(),
  settings:             jsonb,
  metadata:             jsonb,
});
export const updateIntegrationSchema = createIntegrationSchema.omit({ tenant_id: true, provider: true }).partial();
export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;

// ─── AI Jobs ──────────────────────────────────────────────────────────────────
export const createAIJobSchema = z.object({
  tenant_id:  uuid,
  user_id:    z.string().min(1).max(255),
  provider:   z.string().min(1).max(50),
  model:      z.string().min(1).max(100),
  skill:      z.string().min(1).max(100),
  status:     z.nativeEnum(AIJobStatus).default(AIJobStatus.PENDING),
  metadata:   jsonb,
});
export type CreateAIJobInput = z.infer<typeof createAIJobSchema>;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const createAuditLogSchema = z.object({
  tenant_id:  uuid.nullable().optional(),
  user_id:    z.string().max(255).nullable().optional(),
  action:     z.string().min(1).max(100),
  entity:     z.string().min(1).max(100),
  entity_id:  z.string().max(255).nullable().optional(),
  before:     z.record(z.unknown()).nullable().optional(),
  after:      z.record(z.unknown()).nullable().optional(),
  ip_address: z.string().max(45).nullable().optional(),
  user_agent: z.string().nullable().optional(),
  request_id: z.string().max(255).nullable().optional(),
  metadata:   jsonb,
});
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;

// ─── Notifications ────────────────────────────────────────────────────────────
export const createNotificationSchema = z.object({
  tenant_id: uuid,
  user_id:   z.string().min(1).max(255),
  title:     z.string().min(1).max(255),
  body:      z.string().max(5000).nullable().optional(),
  /** Accepts NotificationType enum values OR arbitrary domain event identifiers (e.g. 'contract:expiring') */
  type:      z.string().min(1).max(100).default(NotificationType.INFO),
  entity:    z.string().max(100).nullable().optional(),
  entity_id: z.string().max(255).nullable().optional(),
  metadata:  jsonb,
});
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

// ─── Org Members ─────────────────────────────────────────────────────────────
export const inviteOrgMemberSchema = z.object({
  org_id:        uuid,
  tenant_id:     uuid,
  clerk_user_id: z.string().min(1).max(255),
  email:         z.string().email().max(255),
  full_name:     z.string().max(255).nullable().optional(),
  role:          z.nativeEnum(SystemRole).default(SystemRole.VIEWER),
});
export const updateOrgMemberSchema = inviteOrgMemberSchema
  .pick({ full_name: true, role: true })
  .partial();
export type InviteOrgMemberInput = z.infer<typeof inviteOrgMemberSchema>;
export type UpdateOrgMemberInput = z.infer<typeof updateOrgMemberSchema>;

// ─── Artist Goals ─────────────────────────────────────────────────────────────
export const createArtistGoalSchema = z.object({
  tenant_id:   uuid,
  artista_id:  uuid,
  titulo:      nonEmpty,
  tipo:        z.string().min(1).max(100),
  meta_valor:  money.nullable().optional(),
  valor_atual: money.default('0'),
  status:      z.nativeEnum(ArtistGoalStatus).default(ArtistGoalStatus.EM_ANDAMENTO),
  periodo:     z.enum(['diario','semanal','mensal','trimestral','anual']).default('mensal'),
  data_inicio: z.coerce.date().nullable().optional(),
  data_fim:    z.coerce.date().nullable().optional(),
  metadata:    jsonb,
  created_by:  z.string().max(255).nullable().optional(),
});
export const updateArtistGoalSchema = createArtistGoalSchema.omit({ tenant_id: true, artista_id: true }).partial();
export type CreateArtistGoalInput = z.infer<typeof createArtistGoalSchema>;
export type UpdateArtistGoalInput = z.infer<typeof updateArtistGoalSchema>;

// ─── Content Detections ───────────────────────────────────────────────────────
export const createContentDetectionSchema = z.object({
  tenant_id:          uuid,
  obra_id:            uuid.nullable().optional(),
  artista_id:         uuid.nullable().optional(),
  plataforma:         z.string().min(1).max(100),
  titulo_detectado:   z.string().max(500).nullable().optional(),
  url:                optUrl,
  score:              z.string().regex(/^0(\.\d{1,4})?$|^1(\.0{1,4})?$/).nullable().optional(),
  status:             z.nativeEnum(ContentDetectionStatus).default(ContentDetectionStatus.PENDENTE),
  tipo:               z.string().max(100).default('uso_nao_autorizado'),
  metadata:           jsonb,
});
export type CreateContentDetectionInput = z.infer<typeof createContentDetectionSchema>;

// ─── ECAD Reports ─────────────────────────────────────────────────────────────
export const createEcadReportSchema = z.object({
  tenant_id:     uuid,
  obra_id:       uuid.nullable().optional(),
  periodo:       z.string().regex(/^\d{4}-\d{2}$/, 'Período deve ser YYYY-MM'),
  tipo:          z.string().min(1).max(100),
  valor_bruto:   money.nullable().optional(),
  valor_liquido: money.nullable().optional(),
  status:        z.nativeEnum(EcadReportStatus).default(EcadReportStatus.PENDENTE),
  arquivo_url:   optUrl,
  metadata:      jsonb,
  created_by:    z.string().max(255).nullable().optional(),
});
export const updateEcadReportSchema = createEcadReportSchema.omit({ tenant_id: true }).partial();
export type CreateEcadReportInput = z.infer<typeof createEcadReportSchema>;
export type UpdateEcadReportInput = z.infer<typeof updateEcadReportSchema>;

// ─── Webhook Events ───────────────────────────────────────────────────────────
export const createWebhookEventSchema = z.object({
  tenant_id:   uuid.nullable().optional(),
  provider:    z.string().min(1).max(100),
  event_type:  z.string().min(1).max(100),
  external_id: z.string().max(255).nullable().optional(),
  payload:     z.record(z.unknown()),
  status:      z.nativeEnum(WebhookEventStatus).default(WebhookEventStatus.PENDING),
});
export type CreateWebhookEventInput = z.infer<typeof createWebhookEventSchema>;
