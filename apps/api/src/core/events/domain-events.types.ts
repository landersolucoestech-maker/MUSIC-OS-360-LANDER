/**
 * domain-events.types.ts
 *
 * Typed payload interfaces for every MUSIC OS 360 domain event.
 * Each interface maps exactly to one DOMAIN_EVENTS key.
 * Import via: import type { ArtistCreatedPayload } from './domain-events.types';
 */

// ─── Artists ──────────────────────────────────────────────────────────────────

export interface ArtistCreatedPayload {
  artistId:      string;
  tenantId:      string;
  nomeArtistico: string;
  tipo:          string;
  status:        string;
  createdBy:     string;
}

export interface ArtistUpdatedPayload {
  artistId:      string;
  tenantId:      string;
  nomeArtistico: string;
  changedFields: string[];
  updatedBy:     string;
}

export interface ArtistStatusChangedPayload {
  artistId:       string;
  tenantId:       string;
  nomeArtistico:  string;
  previousStatus: string;
  newStatus:      string;
  changedBy:      string;
}

export interface ArtistDeletedPayload {
  artistId:      string;
  tenantId:      string;
  nomeArtistico: string;
  deletedBy:     string;
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export interface ContractCreatedPayload {
  contractId: string;
  tenantId:   string;
  titulo:     string;
  tipo:       string;
  artistId:   string | null;
  createdBy:  string;
}

export interface ContractStatusChangedPayload {
  contractId:     string;
  tenantId:       string;
  titulo:         string;
  previousStatus: string;
  newStatus:      string;
  changedBy:      string;
}

export interface ContractSentForSignaturePayload {
  contractId:  string;
  tenantId:    string;
  titulo:      string;
  artistId:    string | null;
  autentiqueDocId: string;
  sentBy:      string;
}

export interface ContractCancelledPayload {
  contractId:  string;
  tenantId:    string;
  titulo:      string;
  artistId:    string | null;
  cancelledBy: string;
  cancelledAt: string;
}

export interface ContractExpiringSoonPayload {
  contractId: string;
  tenantId:   string;
  titulo:     string;
  artistId:   string | null;
  dataFim:    string;
  daysLeft:   number;
}

export interface ContractSignedPayload {
  contractId: string;
  tenantId:   string;
  titulo:     string;
  artistId:   string | null;
  signedBy:   string;
  signedAt:   string;
}

export interface ContractExpiredPayload {
  contractId: string;
  tenantId:   string;
  titulo:     string;
  artistId:   string | null;
  expiredAt:  string;
}

// ─── Operational Workflow ─────────────────────────────────────────────────────

export interface ArtistOnboardingStartedPayload {
  artistId:      string;
  tenantId:      string;
  nomeArtistico: string;
  tasks:         string[];
  startedAt:     string;
}

export interface DistributionSetupRequestedPayload {
  artistId:     string;
  tenantId:     string;
  contractId:   string | null;
  requestedAt:  string;
  providerHint: string | null;
}

export interface ExternalDataSyncRequestedPayload {
  artistId:    string;
  tenantId:    string;
  workIds:     string[];
  societyHint: string | null;
  requestedAt: string;
}

export interface ContractIntegrationReadyPayload {
  contractId:   string;
  tenantId:     string;
  titulo:       string;
  artistId:     string | null;
  valor:        string | null;
  readyAt:      string;
  integrations: string[];
}

// ─── Distribution Sync ────────────────────────────────────────────────────────

export interface DistributionSyncStartedPayload {
  tenantId:    string;
  artistId:    string;
  jobId:       string;
  provider:    string;
  contractId:  string | null;
  startedAt:   string;
}

export interface DistributionSyncCompletedPayload {
  tenantId:          string;
  artistId:          string;
  jobId:             string;
  provider:          string;
  externalReleaseId: string | null;
  completedAt:       string;
}

export interface DistributionSyncFailedPayload {
  tenantId:   string;
  artistId:   string;
  jobId:      string;
  provider:   string;
  error:      string;
  retryCount: number;
  failedAt:   string;
}

// External Data Exchange

// Society integrations are data exchange only. MUSIC OS 360 does not calculate royalties.
export interface ExternalDataSyncStartedPayload {
  tenantId:  string;
  artistId:  string;
  jobId:     string;
  society:   string;
  workIds:   string[];
  startedAt: string;
}

export interface ExternalDataSyncCompletedPayload {
  tenantId:    string;
  artistId:    string;
  jobId:       string;
  society:     string;
  completedAt: string;
}

export interface ExternalDataSyncFailedPayload {
  tenantId:   string;
  artistId:   string;
  jobId:      string;
  society:    string;
  error:      string;
  retryCount: number;
  failedAt:   string;
}

export interface SocietySubmissionCreatedPayload {
  tenantId:     string;
  artistId:     string;
  society:      string;
  submissionId: string;
  externalId:   string | null;
  createdAt:    string;
}

export interface SocietyStatusUpdatedPayload {
  tenantId:     string;
  artistId:     string;
  society:      string;
  submissionId: string;
  status:       string;
  externalId:   string | null;
  updatedAt:    string;
}

export interface DistributorSubmissionCreatedPayload {
  tenantId:     string;
  artistId:     string;
  distributor:  string;
  submissionId: string;
  externalId:   string | null;
  createdAt:    string;
}

export interface DistributorStatusUpdatedPayload {
  tenantId:     string;
  artistId:     string;
  distributor:  string;
  submissionId: string;
  status:       string;
  externalId:   string | null;
  updatedAt:    string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionCreatedPayload {
  transactionId: string;
  tenantId:      string;
  tipo:          string;
  categoria:     string;
  valor:         string;
  contratoId:    string | null;
  artistaId:     string | null;
  createdBy:     string;
}

export interface TransactionStatusChangedPayload {
  transactionId:  string;
  tenantId:       string;
  tipo:           string;
  valor:          string;
  previousStatus: string;
  newStatus:      string;
  changedBy:      string;
}

export interface TransactionPaidPayload {
  transactionId: string;
  tenantId:      string;
  tipo:          string;
  valor:         string;
  contratoId:    string | null;
  artistaId:     string | null;
  paidBy:        string;
  paidAt:        string;
}

export interface TransactionCancelledPayload {
  transactionId: string;
  tenantId:      string;
  tipo:          string;
  valor:         string;
  cancelledBy:   string;
  cancelledAt:   string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface InvoiceCreatedPayload {
  invoiceId:    string;
  tenantId:     string;
  tipo:         string;
  valor:        string;
  numero:       string | null;
  prestadorId:  string | null;
  createdBy:    string;
}

export interface InvoiceStatusChangedPayload {
  invoiceId:      string;
  tenantId:       string;
  numero:         string | null;
  previousStatus: string;
  newStatus:      string;
  changedBy:      string;
}

export interface InvoiceIssuedPayload {
  invoiceId:  string;
  tenantId:   string;
  tipo:       string;
  valor:      string;
  numero:     string | null;
  issuedBy:   string;
  issuedAt:   string;
}

export interface InvoiceOverduePayload {
  invoiceId:       string;
  tenantId:        string;
  numero:          string | null;
  valor:           string;
  dataVencimento:  string;
}

// ─── Financial Rules ──────────────────────────────────────────────────────────

export interface FinancialRuleTriggeredPayload {
  ruleId:     string;
  tenantId:   string;
  ruleName:   string;
  ruleType:   string;
  trigger:    string;
  entityId:   string | null;
  entityType: string | null;
  result:     Record<string, unknown>;
}

// ─── Releases ─────────────────────────────────────────────────────────────────

export interface ReleasePublishedPayload {
  releaseId:  string;
  tenantId:   string;
  titulo:     string;
  artistId:   string | null;
  publishedAt: string;
}

export interface ReleaseApprovedPayload {
  releaseId:  string;
  tenantId:   string;
  titulo:     string;
  artistId:   string | null;
  approvedBy: string;
  approvedAt: string;
}

export interface ReleaseDistributedPayload {
  releaseId:      string;
  tenantId:       string;
  titulo:         string;
  artistId:       string | null;
  distribuidora:  string | null;
  plataformas:    unknown[];
  distributedAt:  string;
}

// ─── Takedown ─────────────────────────────────────────────────────────────────

export interface TakedownRequestedPayload {
  takedownId:  string;
  tenantId:    string;
  entityType:  string;
  entityId:    string;
  reason:      string;
  requestedBy: string;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface CampaignStartedPayload {
  campaignId: string;
  tenantId:   string;
  titulo:     string;
  startedBy:  string;
  startedAt:  string;
}

export interface CampaignEndedPayload {
  campaignId: string;
  tenantId:   string;
  titulo:     string;
  endedAt:    string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface LeadConvertedPayload {
  leadId:      string;
  tenantId:    string;
  nome:        string;
  empresa:     string | null;
  convertedBy: string;
  convertedAt: string;
}

// ─── Assets / Uploads ─────────────────────────────────────────────────────────

export interface AssetUploadedPayload {
  uploadId:   string;
  tenantId:   string;
  entityType: string;
  entityId:   string;
  fileName:   string;
  mimeType:   string;
  uploadedBy: string;
  uploadedAt: string;
}

// ─── Support Tickets ──────────────────────────────────────────────────────────

export interface TicketResolvedPayload {
  ticketId:   string;
  tenantId:   string;
  titulo:     string;
  resolvedBy: string;
  resolvedAt: string;
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export interface WorkflowTransitionedPayload {
  entityType:  string;
  entityId:    string;
  tenantId:    string;
  fromStatus:  string;
  toStatus:    string;
  actorId:     string;
  actorRole:   string | undefined;
  reason:      string | null;
  transitionedAt: string;
}

// ─── Tenant / Users ───────────────────────────────────────────────────────────

export interface TenantCreatedPayload {
  tenantId: string;
  name:     string;
  slug:     string;
  plan:     string;
}

export interface UserInvitedPayload {
  tenantId:  string;
  userId:    string;
  email:     string;
  role:      string;
  invitedBy: string;
}

export interface LeadCreatedPayload {
  tenantId: string;
  leadId:   string;
  nome:     string;
  origem:   string;
}

export interface LeadUpdatedPayload {
  tenantId:      string;
  aggregateType: string;
  aggregateId:   string;
  action:        string;
}

// ─── Discriminated union over all event payloads ──────────────────────────────

export type AnyDomainEventPayload =
  | ArtistCreatedPayload
  | ArtistUpdatedPayload
  | ArtistStatusChangedPayload
  | ArtistDeletedPayload
  | ContractCreatedPayload
  | ContractStatusChangedPayload
  | ContractSentForSignaturePayload
  | ContractCancelledPayload
  | ContractExpiringSoonPayload
  | ContractSignedPayload
  | ContractExpiredPayload
  | TransactionCreatedPayload
  | TransactionStatusChangedPayload
  | TransactionPaidPayload
  | TransactionCancelledPayload
  | InvoiceCreatedPayload
  | InvoiceStatusChangedPayload
  | InvoiceIssuedPayload
  | InvoiceOverduePayload
  | FinancialRuleTriggeredPayload
  | ArtistOnboardingStartedPayload
  | DistributionSetupRequestedPayload
  | ExternalDataSyncRequestedPayload
  | ContractIntegrationReadyPayload
  | ReleasePublishedPayload
  | ReleaseApprovedPayload
  | ReleaseDistributedPayload
  | TakedownRequestedPayload
  | CampaignStartedPayload
  | CampaignEndedPayload
  | LeadCreatedPayload
  | LeadUpdatedPayload
  | LeadConvertedPayload
  | AssetUploadedPayload
  | TicketResolvedPayload
  | WorkflowTransitionedPayload
  | TenantCreatedPayload
  | UserInvitedPayload
  | DistributionSyncStartedPayload
  | DistributionSyncCompletedPayload
  | DistributionSyncFailedPayload
  | ExternalDataSyncStartedPayload
  | ExternalDataSyncCompletedPayload
  | ExternalDataSyncFailedPayload
  | SocietySubmissionCreatedPayload
  | SocietyStatusUpdatedPayload
  | DistributorSubmissionCreatedPayload
  | DistributorStatusUpdatedPayload;
