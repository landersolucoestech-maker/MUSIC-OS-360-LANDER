export type ExternalDataExchangeKind = 'distributor' | 'society';

export type ExternalDataSubmissionStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'completed';

export interface ExternalDataProviderMetadata {
  providerId: string;
  displayName: string;
  kind: ExternalDataExchangeKind;
  supportsSubmit: boolean;
  supportsStatusCheck: boolean;
  mock: boolean;
}

export interface ExternalDataRequestContext {
  tenantId: string;
  userId: string;
  providerId: string;
  idempotencyKey: string;
  correlationId?: string | null;
}

export interface DistributorSubmissionPayload {
  tenantId: string;
  providerId: string;
  artistId: string;
  releaseId?: string | null;
  phonogramIds: string[];
  metadata: {
    artist?: Record<string, unknown> | null;
    release?: Record<string, unknown> | null;
    phonograms?: Array<Record<string, unknown>>;
    contributors?: Array<Record<string, unknown>>;
    files?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface SocietyDataSubmissionPayload {
  tenantId: string;
  providerId: string;
  artistId?: string | null;
  workIds: string[];
  phonogramIds: string[];
  metadata: {
    works?: Array<Record<string, unknown>>;
    phonograms?: Array<Record<string, unknown>>;
    contributors?: Array<Record<string, unknown>>;
    rightHolders?: Array<Record<string, unknown>>;
    documents?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

export interface ExternalDataSubmissionResult {
  providerId: string;
  kind: ExternalDataExchangeKind;
  submissionId: string;
  externalArtistId?: string | null;
  externalReleaseId?: string | null;
  externalWorkId?: string | null;
  externalPhonogramId?: string | null;
  protocol?: string | null;
  status: ExternalDataSubmissionStatus;
  deliveryStatus?: string | null;
  registrationStatus?: string | null;
  validationErrors: string[];
  pendingRequirements: string[];
  providerNotes: string[];
  providerEventId?: string | null;
  lastSyncedAt: string;
  raw: Record<string, unknown>;
}

export interface ExternalDataWebhookPayload {
  providerId: string;
  kind: ExternalDataExchangeKind;
  providerEventId: string;
  submissionId?: string | null;
  entityType?: 'artist' | 'release' | 'work' | 'phonogram' | null;
  entityId?: string | null;
  status?: ExternalDataSubmissionStatus | string | null;
  deliveryStatus?: string | null;
  registrationStatus?: string | null;
  validationErrors?: string[];
  pendingRequirements?: string[];
  providerNotes?: string[];
  externalIds?: Record<string, string | null>;
  raw: Record<string, unknown>;
}

export interface ExternalDataExchangeProvider<TPayload> {
  readonly metadata: ExternalDataProviderMetadata;
  submit(payload: TPayload, context: ExternalDataRequestContext): Promise<ExternalDataSubmissionResult>;
  checkStatus(submissionId: string, context: ExternalDataRequestContext): Promise<ExternalDataSubmissionResult>;
  normalizeWebhook(payload: Record<string, unknown>): ExternalDataWebhookPayload;
}
