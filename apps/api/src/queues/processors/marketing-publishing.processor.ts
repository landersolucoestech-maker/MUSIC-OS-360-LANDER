import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.tokens';
import { MarketingContentPostEntity } from '../../database/entities';
import { MARKETING_PUBLISHING_JOB_NAMES, QUEUE_NAMES } from '../queue.constants';
import type { PublishContentJobPayload } from '../services/marketing-publishing-queue.service';

@Processor(QUEUE_NAMES.MARKETING_PUBLISHING)
@Injectable()
export class MarketingPublishingProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketingPublishingProcessor.name);

  constructor(@Inject(DATA_SOURCE) private readonly ds: DataSource | null) {
    super();
  }

  async process(job: Job<PublishContentJobPayload>): Promise<void> {
    if (job.name !== MARKETING_PUBLISHING_JOB_NAMES.PUBLISH_CONTENT) return;
    if (!this.ds) throw new Error('Database unavailable');

    const repo = this.ds.getRepository(MarketingContentPostEntity);
    const row = await repo.findOne({
      where: { id: job.data.contentId, tenant_id: job.data.tenantId, deleted_at: null } as never,
    });

    if (!row) {
      this.logger.warn(`[marketing-publishing] content not found id=${job.data.contentId}`);
      return;
    }
    if (row.status !== 'agendado' || row.publication_status === 'published') return;

    await repo.update({ id: row.id, tenant_id: row.tenant_id } as never, {
      publication_status: 'publishing',
      publication_error: null,
    } as never);

    try {
      const result = await this.publish(row);
      await repo.update({ id: row.id, tenant_id: row.tenant_id } as never, {
        status: 'publicado',
        publication_status: 'published',
        provider_post_id: result.providerPostId,
        published_at: new Date(),
      } as never);
      this.logger.log(`[marketing-publishing] published content=${row.id} channel=${row.channel}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await repo.update({ id: row.id, tenant_id: row.tenant_id } as never, {
        status: 'falhou',
        publication_status: 'failed',
        publication_error: message,
      } as never);
      throw err;
    }
  }

  private async publish(row: MarketingContentPostEntity): Promise<{ providerPostId: string }> {
    const metadata = row.metadata ?? {};
    const mockPublishing = metadata['mockPublishing'] === true || process.env['MARKETING_PUBLISHING_MODE'] === 'mock';
    if (!mockPublishing) {
      throw new Error(
        `Publicacao real para ${row.channel} nao configurada. Configure provider OAuth/API e defina o adaptador de publicacao.`,
      );
    }

    return { providerPostId: `mock-${row.channel}-${row.id}` };
  }
}
