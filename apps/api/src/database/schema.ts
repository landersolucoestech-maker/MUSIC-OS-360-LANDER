/**
 * database/schema.ts
 *
 * Type re-exports for backward compatibility.
 * Entity classes live in database/entities.ts.
 * All type aliases map to their corresponding TypeORM entity class.
 */

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
