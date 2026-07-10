import {
  ExternalDataExchangeProvider,
  ExternalDataRequestContext,
  ExternalDataSubmissionResult,
  ExternalDataWebhookPayload,
  SocietyDataSubmissionPayload,
} from './external-data.types';

export class MockSocietyProvider implements ExternalDataExchangeProvider<SocietyDataSubmissionPayload> {
  readonly metadata = {
    providerId: 'society-provider-not-configured',
    displayName: 'Society Provider Not Configured',
    kind: 'society' as const,
    supportsSubmit: false,
    supportsStatusCheck: false,
    mock: false,
  };

  async submit(
    _payload: SocietyDataSubmissionPayload,
    _context: ExternalDataRequestContext,
  ): Promise<ExternalDataSubmissionResult> {
    throw new Error('Society external data provider is not configured.');
  }

  async checkStatus(
    _submissionId: string,
    _context: ExternalDataRequestContext,
  ): Promise<ExternalDataSubmissionResult> {
    throw new Error('Society external data provider is not configured.');
  }

  normalizeWebhook(_payload: Record<string, unknown>): ExternalDataWebhookPayload {
    throw new Error('Society external data provider is not configured.');
  }
}
