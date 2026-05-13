/**
 * queues/processors/clerk-sync.processor.ts
 *
 * Processor BullMQ para a fila "clerk-sync".
 * Delega cada evento Clerk ao ClerkSyncService.process()
 * de forma assíncrona, com retry automático pelo BullMQ.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger }    from '@nestjs/common';
import { Job }                   from 'bullmq';
import { QUEUE_NAMES }           from '../queue.constants';
import { ClerkSyncService }      from '../../modules/auth/clerk-sync.service';

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface ClerkSyncPayload {
  event: Record<string, unknown>;
}

// ─── Processor ────────────────────────────────────────────────────────────────

@Processor(QUEUE_NAMES.CLERK_SYNC)
@Injectable()
export class ClerkSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ClerkSyncProcessor.name);

  constructor(private readonly clerkSync: ClerkSyncService) { super(); }

  async process(job: Job<ClerkSyncPayload>): Promise<void> {
    const { event } = job.data;
    const eventType = String(event['type'] ?? 'unknown');

    this.logger.log(
      `[clerk-sync] job="${job.name}" id=${job.id} type="${eventType}" attempt=${job.attemptsMade + 1}`,
    );

    await this.clerkSync.process(event);

    this.logger.log(`[clerk-sync] type="${eventType}" processado`);
  }
}
