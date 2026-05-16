/**
 * upload-events.handler.ts
 *
 * Concrete automations triggered by upload domain events.
 *
 * AssetUploaded →
 *   1. Update UploadEntity.status = 'processing'.
 *   2. Enqueue media processing job (thumbnail gen, audio waveform, metadata extract).
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { UploadEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { AssetUploadedPayload } from '../../../core/events/domain-events.types';

/** MIME-type categories that require post-upload processing */
const PROCESSABLE_MIME_PREFIXES = ['audio/', 'video/', 'image/'] as const;

function requiresProcessing(mimeType: string): boolean {
  return PROCESSABLE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

@Injectable()
export class UploadEventsHandler {
  private readonly logger = new Logger(UploadEventsHandler.name);
  private readonly uploadRepo: Repository<UploadEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
  ) {
    if (ds) this.uploadRepo = ds.getRepository(UploadEntity);
  }

  @OnEvent(DOMAIN_EVENTS.ASSET_UPLOADED)
  async onAssetUploaded(event: DomainEvent<AssetUploadedPayload>): Promise<void> {
    const { uploadId, tenantId, entityType, entityId, fileName, mimeType, uploadedBy } = event.payload;

    // 1. Mark upload as processing
    if (this.uploadRepo) {
      try {
        await this.uploadRepo.update(
          { id: uploadId, tenant_id: tenantId },
          { status: 'processing' as any },
        );
        this.logger.log(
          `UploadEventsHandler: upload "${uploadId}" ("${fileName}") → status=processing tenant=${tenantId}`,
        );
      } catch (err) {
        this.logger.error(
          `UploadEventsHandler: failed to update upload status for "${uploadId}" — ${String(err)}`,
        );
      }
    }

    // 2. Enqueue media processing when applicable
    if (this.queue && requiresProcessing(mimeType)) {
      try {
        await this.queue.addNotification({
          job:           'process-media-asset',
          uploadId,
          tenantId,
          entityType,
          entityId,
          fileName,
          mimeType,
          uploadedBy,
          correlationId: event.correlationId ?? null,
        });
        this.logger.log(
          `UploadEventsHandler: media processing job enqueued for upload "${uploadId}" (${mimeType})`,
        );
      } catch (err) {
        this.logger.warn(
          `UploadEventsHandler: failed to enqueue processing job for upload "${uploadId}" — ${String(err)}`,
        );
      }
    }
  }
}
