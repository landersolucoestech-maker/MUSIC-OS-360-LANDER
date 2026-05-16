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

// ─── Contracts ────────────────────────────────────────────────────────────────

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

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionCreatedPayload {
  transactionId: string;
  tenantId:      string;
  tipo:          string;
  categoria:     string;
  valor:         string;
  createdBy:     string;
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

// ─── Discriminated union over all event payloads ──────────────────────────────

export type AnyDomainEventPayload =
  | ArtistCreatedPayload
  | ArtistUpdatedPayload
  | ContractSignedPayload
  | ContractExpiredPayload
  | TransactionCreatedPayload
  | ReleasePublishedPayload
  | ReleaseApprovedPayload
  | ReleaseDistributedPayload
  | TakedownRequestedPayload
  | CampaignStartedPayload
  | CampaignEndedPayload
  | LeadConvertedPayload
  | AssetUploadedPayload
  | TicketResolvedPayload
  | WorkflowTransitionedPayload
  | TenantCreatedPayload
  | UserInvitedPayload;
