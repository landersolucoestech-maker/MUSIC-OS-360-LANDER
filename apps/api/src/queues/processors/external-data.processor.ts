import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExternalDataExchangeService } from '../../core/external-data/external-data-exchange.service';
import { QUEUE_NAMES, WORKFLOW_JOB_NAMES } from '../queue.constants';

type ExternalDataJobPayload = Record<string, unknown> & {
  tenantId: string;
  userId?: string;
  providerId?: string;
};

@Processor(QUEUE_NAMES.STREAMING_SYNC)
@Injectable()
export class ExternalDataProcessor extends WorkerHost {
  private readonly logger = new Logger(ExternalDataProcessor.name);

  constructor(private readonly exchange: ExternalDataExchangeService) {
    super();
  }

  async process(job: Job<ExternalDataJobPayload>): Promise<void> {
    const d = job.data;
    if (!d.tenantId) throw new Error('External data job missing tenantId');
    this.logger.log(`[external-data] job=${job.name} id=${job.id} tenant=${d.tenantId}`);

    switch (job.name) {
      case WORKFLOW_JOB_NAMES.DISTRIBUTOR_SUBMIT:
        await this.exchange.submitDistributor({
          tenantId: d.tenantId,
          userId: String(d.userId ?? 'system:queue'),
          providerId: String(d.providerId ?? 'mock-distributor'),
          artistId: String(d['artistId']),
          releaseId: d['releaseId'] ? String(d['releaseId']) : null,
          phonogramIds: Array.isArray(d['phonogramIds']) ? d['phonogramIds'].map(String) : [],
          idempotencyKey: d['idempotencyKey'] ? String(d['idempotencyKey']) : String(job.id),
          metadata: { jobId: String(job.id) },
        });
        return;

      case WORKFLOW_JOB_NAMES.DISTRIBUTOR_STATUS_CHECK:
        await this.exchange.checkDistributorStatus({
          tenantId: d.tenantId,
          userId: String(d.userId ?? 'system:queue'),
          providerId: String(d.providerId ?? 'mock-distributor'),
          submissionId: String(d['submissionId']),
          entityType: d['entityType'] as any,
          entityId: d['entityId'] ? String(d['entityId']) : undefined,
          idempotencyKey: String(job.id),
        });
        return;

      case WORKFLOW_JOB_NAMES.SOCIETY_SUBMIT:
      case WORKFLOW_JOB_NAMES.EXTERNAL_DATA_SYNC:
        await this.exchange.submitSociety({
          tenantId: d.tenantId,
          userId: String(d.userId ?? 'system:queue'),
          providerId: String(d.providerId ?? d['societyHint'] ?? 'mock-society'),
          artistId: d['artistId'] ? String(d['artistId']) : null,
          workIds: Array.isArray(d['workIds']) ? d['workIds'].map(String) : [],
          phonogramIds: Array.isArray(d['phonogramIds']) ? d['phonogramIds'].map(String) : [],
          idempotencyKey: d['idempotencyKey'] ? String(d['idempotencyKey']) : String(job.id),
          metadata: { jobId: String(job.id) },
        });
        return;

      case WORKFLOW_JOB_NAMES.SOCIETY_STATUS_CHECK:
        await this.exchange.checkSocietyStatus({
          tenantId: d.tenantId,
          userId: String(d.userId ?? 'system:queue'),
          providerId: String(d.providerId ?? 'mock-society'),
          submissionId: String(d['submissionId']),
          entityType: d['entityType'] as any,
          entityId: d['entityId'] ? String(d['entityId']) : undefined,
          idempotencyKey: String(job.id),
        });
        return;

      default:
        this.logger.debug(`[external-data] ignored job=${job.name}`);
    }
  }
}
