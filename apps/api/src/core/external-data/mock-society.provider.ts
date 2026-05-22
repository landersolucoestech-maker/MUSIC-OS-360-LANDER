import {
  ExternalDataExchangeProvider,
  ExternalDataRequestContext,
  ExternalDataSubmissionResult,
  ExternalDataSubmissionStatus,
  ExternalDataWebhookPayload,
  SocietyDataSubmissionPayload,
} from './external-data.types';

function scenarioFrom(input: Record<string, unknown>): ExternalDataSubmissionStatus {
  const scenario = String(input['scenario'] ?? input['mockScenario'] ?? '').toLowerCase();
  if (scenario === 'validation_error') return 'rejected';
  if (scenario === 'pending') return 'pending';
  if (scenario === 'processing') return 'processing';
  if (scenario === 'failed') return 'failed';
  return 'approved';
}

function id(prefix: string, seed: string): string {
  return `${prefix}_${Buffer.from(seed).toString('base64url').slice(0, 18)}`;
}

export class MockSocietyProvider implements ExternalDataExchangeProvider<SocietyDataSubmissionPayload> {
  readonly metadata = {
    providerId: 'mock-society',
    displayName: 'Mock Society',
    kind: 'society' as const,
    supportsSubmit: true,
    supportsStatusCheck: true,
    mock: true,
  };

  async submit(
    payload: SocietyDataSubmissionPayload,
    context: ExternalDataRequestContext,
  ): Promise<ExternalDataSubmissionResult> {
    const status = scenarioFrom(payload.metadata);
    const now = new Date().toISOString();
    const submissionId = id('soc_sub', context.idempotencyKey);
    const firstWorkId = payload.workIds[0] ?? submissionId;
    const firstPhonogramId = payload.phonogramIds[0] ?? submissionId;

    return {
      providerId: this.metadata.providerId,
      kind: 'society',
      submissionId,
      externalWorkId: id('work', firstWorkId),
      externalPhonogramId: id('phonogram', firstPhonogramId),
      protocol: `PROTO-${now.slice(0, 10).replace(/-/g, '')}-${submissionId.slice(-8)}`,
      status,
      registrationStatus: status === 'approved' ? 'registered' : status,
      validationErrors: status === 'rejected' ? ['missing_author_identifier_or_document'] : [],
      pendingRequirements: status === 'pending' ? ['signed_registration_form'] : [],
      providerNotes: status === 'processing' ? ['registration analysis in progress'] : [],
      providerEventId: id('soc_evt', `${submissionId}:${status}`),
      lastSyncedAt: now,
      raw: {
        accepted: status !== 'failed',
        mode: 'mock',
        work_count: payload.workIds.length,
        phonogram_count: payload.phonogramIds.length,
      },
    };
  }

  async checkStatus(submissionId: string, context: ExternalDataRequestContext): Promise<ExternalDataSubmissionResult> {
    const status = scenarioFrom({ scenario: context.idempotencyKey.includes('pending') ? 'processing' : 'approved' });
    const now = new Date().toISOString();

    return {
      providerId: this.metadata.providerId,
      kind: 'society',
      submissionId,
      externalWorkId: id('work', submissionId),
      externalPhonogramId: id('phonogram', submissionId),
      protocol: `PROTO-${submissionId.slice(-10)}`,
      status,
      registrationStatus: status === 'approved' ? 'registered' : status,
      validationErrors: [],
      pendingRequirements: status === 'processing' ? ['society_manual_review'] : [],
      providerNotes: ['mock status check'],
      providerEventId: id('soc_evt', `${submissionId}:${status}:${now.slice(0, 13)}`),
      lastSyncedAt: now,
      raw: { mode: 'mock-status' },
    };
  }

  normalizeWebhook(payload: Record<string, unknown>): ExternalDataWebhookPayload {
    const status = String(payload['status'] ?? payload['registration_status'] ?? 'processing') as ExternalDataSubmissionStatus;
    return {
      providerId: this.metadata.providerId,
      kind: 'society',
      providerEventId: String(payload['event_id'] ?? payload['provider_event_id'] ?? id('soc_evt', JSON.stringify(payload))),
      submissionId: payload['submission_id'] ? String(payload['submission_id']) : null,
      entityType: payload['entity_type'] as ExternalDataWebhookPayload['entityType'] ?? null,
      entityId: payload['entity_id'] ? String(payload['entity_id']) : null,
      status,
      registrationStatus: payload['registration_status'] ? String(payload['registration_status']) : status,
      validationErrors: Array.isArray(payload['validation_errors']) ? payload['validation_errors'].map(String) : [],
      pendingRequirements: Array.isArray(payload['pending_requirements']) ? payload['pending_requirements'].map(String) : [],
      providerNotes: Array.isArray(payload['society_notes']) ? payload['society_notes'].map(String) : [],
      externalIds: {
        protocol: payload['protocol'] ? String(payload['protocol']) : null,
        external_work_id: payload['external_work_id'] ? String(payload['external_work_id']) : null,
        external_phonogram_id: payload['external_phonogram_id'] ? String(payload['external_phonogram_id']) : null,
      },
      raw: payload,
    };
  }
}
