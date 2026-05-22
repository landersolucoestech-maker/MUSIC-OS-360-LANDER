import {
  DistributorSubmissionPayload,
  ExternalDataExchangeProvider,
  ExternalDataRequestContext,
  ExternalDataSubmissionResult,
  ExternalDataSubmissionStatus,
  ExternalDataWebhookPayload,
} from './external-data.types';

function scenarioFrom(input: Record<string, unknown>): ExternalDataSubmissionStatus {
  const scenario = String(input['scenario'] ?? input['mockScenario'] ?? '').toLowerCase();
  if (scenario === 'validation_error') return 'rejected';
  if (scenario === 'pending') return 'pending';
  if (scenario === 'processing') return 'processing';
  if (scenario === 'failed') return 'failed';
  if (scenario === 'rejected') return 'rejected';
  return 'approved';
}

function id(prefix: string, seed: string): string {
  return `${prefix}_${Buffer.from(seed).toString('base64url').slice(0, 18)}`;
}

export class MockDistributorProvider implements ExternalDataExchangeProvider<DistributorSubmissionPayload> {
  readonly metadata = {
    providerId: 'mock-distributor',
    displayName: 'Mock Distributor',
    kind: 'distributor' as const,
    supportsSubmit: true,
    supportsStatusCheck: true,
    mock: true,
  };

  async submit(
    payload: DistributorSubmissionPayload,
    context: ExternalDataRequestContext,
  ): Promise<ExternalDataSubmissionResult> {
    const status = scenarioFrom(payload.metadata);
    const now = new Date().toISOString();
    const submissionId = id('dist_sub', context.idempotencyKey);

    return {
      providerId: this.metadata.providerId,
      kind: 'distributor',
      submissionId,
      externalArtistId: id('artist', payload.artistId),
      externalReleaseId: payload.releaseId ? id('release', payload.releaseId) : null,
      status,
      deliveryStatus: status === 'approved' ? 'delivered' : status,
      validationErrors: status === 'rejected' ? ['missing_release_date_or_artwork'] : [],
      pendingRequirements: status === 'pending' ? ['provider_catalog_review'] : [],
      providerNotes: status === 'processing' ? ['delivery queued by distributor'] : [],
      providerEventId: id('dist_evt', `${submissionId}:${status}`),
      lastSyncedAt: now,
      raw: {
        accepted: status !== 'failed',
        mode: 'mock',
        phonogram_count: payload.phonogramIds.length,
        release_id: payload.releaseId ?? null,
      },
    };
  }

  async checkStatus(submissionId: string, context: ExternalDataRequestContext): Promise<ExternalDataSubmissionResult> {
    const status = scenarioFrom({ scenario: context.idempotencyKey.includes('pending') ? 'processing' : 'approved' });
    const now = new Date().toISOString();

    return {
      providerId: this.metadata.providerId,
      kind: 'distributor',
      submissionId,
      externalArtistId: null,
      externalReleaseId: id('release', submissionId),
      status,
      deliveryStatus: status === 'approved' ? 'delivered' : status,
      validationErrors: [],
      pendingRequirements: status === 'processing' ? ['awaiting_store_ingestion'] : [],
      providerNotes: ['mock status check'],
      providerEventId: id('dist_evt', `${submissionId}:${status}:${now.slice(0, 13)}`),
      lastSyncedAt: now,
      raw: { mode: 'mock-status' },
    };
  }

  normalizeWebhook(payload: Record<string, unknown>): ExternalDataWebhookPayload {
    const status = String(payload['status'] ?? 'processing') as ExternalDataSubmissionStatus;
    return {
      providerId: this.metadata.providerId,
      kind: 'distributor',
      providerEventId: String(payload['event_id'] ?? payload['provider_event_id'] ?? id('dist_evt', JSON.stringify(payload))),
      submissionId: payload['submission_id'] ? String(payload['submission_id']) : null,
      entityType: payload['entity_type'] as ExternalDataWebhookPayload['entityType'] ?? null,
      entityId: payload['entity_id'] ? String(payload['entity_id']) : null,
      status,
      deliveryStatus: payload['delivery_status'] ? String(payload['delivery_status']) : status,
      validationErrors: Array.isArray(payload['validation_errors']) ? payload['validation_errors'].map(String) : [],
      pendingRequirements: Array.isArray(payload['pending_requirements']) ? payload['pending_requirements'].map(String) : [],
      providerNotes: Array.isArray(payload['provider_notes']) ? payload['provider_notes'].map(String) : [],
      externalIds: {
        external_artist_id: payload['external_artist_id'] ? String(payload['external_artist_id']) : null,
        external_release_id: payload['external_release_id'] ? String(payload['external_release_id']) : null,
      },
      raw: payload,
    };
  }
}
