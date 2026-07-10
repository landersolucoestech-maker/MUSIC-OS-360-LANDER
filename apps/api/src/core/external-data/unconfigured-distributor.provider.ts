import {
  DistributorSubmissionPayload,
  ExternalDataExchangeProvider,
  ExternalDataRequestContext,
  ExternalDataSubmissionResult,
  ExternalDataWebhookPayload,
} from './external-data.types';

export class UnconfiguredDistributorProvider implements ExternalDataExchangeProvider<DistributorSubmissionPayload> {
  readonly metadata = {
    providerId: 'distributor-provider-not-configured',
    displayName: 'Distributor Provider Not Configured',
    kind: 'distributor' as const,
    supportsSubmit: false,
    supportsStatusCheck: false,
    mock: false,
  };

  async submit(
    _payload: DistributorSubmissionPayload,
    _context: ExternalDataRequestContext,
  ): Promise<ExternalDataSubmissionResult> {
    throw new Error('Distributor external data provider is not configured.');
  }

  async checkStatus(
    _submissionId: string,
    _context: ExternalDataRequestContext,
  ): Promise<ExternalDataSubmissionResult> {
    throw new Error('Distributor external data provider is not configured.');
  }

  normalizeWebhook(_payload: Record<string, unknown>): ExternalDataWebhookPayload {
    throw new Error('Distributor external data provider is not configured.');
  }
}
