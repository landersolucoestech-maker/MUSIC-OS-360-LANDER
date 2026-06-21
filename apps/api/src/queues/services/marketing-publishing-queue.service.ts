import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
import { MARKETING_PUBLISHING_JOB_NAMES, QUEUE_NAMES } from '../queue.constants';

export interface PublishContentJobPayload {
  tenantId: string;
  userId: string;
  contentId: string;
}

@Injectable()
export class MarketingPublishingQueueService {
  private readonly logger = new Logger(MarketingPublishingQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.MARKETING_PUBLISHING)
    private readonly queue: Queue<PublishContentJobPayload> | null,
  ) {}

  async enqueueContentPublish(payload: PublishContentJobPayload, scheduledFor: Date): Promise<string | undefined> {
    if (!this.queue) return undefined;

    const delay = Math.max(0, scheduledFor.getTime() - Date.now());
    const opts: JobsOptions = {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      jobId: `marketing-content:${payload.tenantId}:${payload.contentId}`,
      removeOnComplete: 200,
      removeOnFail: 1000,
    };

    const job = await this.queue.add(MARKETING_PUBLISHING_JOB_NAMES.PUBLISH_CONTENT, payload, opts);
    this.logger.log(`[marketing-publishing] content=${payload.contentId} jobId=${job.id} delay=${delay}ms`);
    return String(job.id);
  }
}
