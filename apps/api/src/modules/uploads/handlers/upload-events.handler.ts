/**
 * upload-events.handler.ts
 *
 * Concrete automations triggered by upload domain events.
 *
 * AssetUploaded →
 *   1. Query UploadEntity to obtain size_bytes for validation.
 *   2. Validate MIME type against allowed list; reject if unsupported.
 *   3. Validate file size; reject if exceeds per-category limit.
 *   4. Keep UploadEntity.status = 'confirmed' after validation.
 *   5. Enqueue media processing job for valid audio/video/image assets.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { DatabaseContextService } from '../../../database/database-context.service';
import { UploadEntity } from '../../../database/entities';
import { UploadStatus } from '@music-os-360/types';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { AssetUploadedPayload } from '../../../core/events/domain-events.types';

// ── Validation configuration ─────────────────────────────────────────────────

/** MIME types accepted by the platform */
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg',
  'audio/x-m4a', 'audio/mp4',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

/** Max file size per MIME category (bytes) */
const MAX_SIZE_BYTES: Record<string, number> = {
  'audio/':       500 * 1024 * 1024,   // 500 MB
  'video/':       2   * 1024 * 1024 * 1024, // 2 GB
  'image/':       50  * 1024 * 1024,   // 50 MB
  'application/': 100 * 1024 * 1024,   // 100 MB
  'text/':        10  * 1024 * 1024,   // 10 MB
};

function getMaxSize(mimeType: string): number {
  for (const [prefix, limit] of Object.entries(MAX_SIZE_BYTES)) {
    if (mimeType.startsWith(prefix)) return limit;
  }
  return 10 * 1024 * 1024; // 10 MB fallback
}

/** MIME-type categories that require post-upload media processing */
const PROCESSABLE_MIME_PREFIXES = ['audio/', 'video/', 'image/'] as const;

function requiresProcessing(mimeType: string): boolean {
  return PROCESSABLE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class UploadEventsHandler {
  private readonly logger = new Logger(UploadEventsHandler.name);
  private readonly uploadRepo: Repository<UploadEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    if (ds) this.uploadRepo = ds.getRepository(UploadEntity);
  }

  @OnEvent(DOMAIN_EVENTS.ASSET_UPLOADED)
  async onAssetUploaded(event: DomainEvent<AssetUploadedPayload>): Promise<void> {
    const { uploadId, tenantId, entityType, entityId, fileName, mimeType, uploadedBy } = event.payload;

    // Fail-closed: an async handler without a tenant must not touch tenant data.
    if (!tenantId) {
      this.logger.warn('UploadEventsHandler: evento sem tenantId — abortado (fail-closed)');
      return;
    }

    const runInContext = <T>(work: (m: EntityManager | undefined) => Promise<T>): Promise<T> =>
      this.dbContext
        ? this.dbContext.runInTenantContext({ tenantId, orgId: null, role: null }, work)
        : work(undefined);

    await runInContext(async (manager) => {
      const uploadRepo = manager ? manager.getRepository(UploadEntity) : this.uploadRepo;

      // 1. Fetch entity for authoritative size_bytes
      let sizeBytes = 0;
      if (uploadRepo) {
        try {
          const record = await uploadRepo.findOne({
            where: { id: uploadId, tenant_id: tenantId },
            select: ['size_bytes', 'mime_type'],
          });
          sizeBytes = record?.size_bytes ?? 0;
        } catch (err) {
          this.logger.warn(`UploadEventsHandler: could not fetch upload record "${uploadId}" — ${String(err)}`);
        }
      }

      // 2. Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        this.logger.warn(
          `UploadEventsHandler: REJECTED upload "${uploadId}" — unsupported MIME type "${mimeType}"`,
        );
        if (uploadRepo) {
          await uploadRepo.update(
            { id: uploadId, tenant_id: tenantId },
            { status: UploadStatus.ERROR, metadata: { rejectionReason: `MIME type "${mimeType}" not allowed` } },
          ).catch(() => {/* ignore */});
        }
        if (this.queue) {
          await this.queue.addNotification({
            job:       'upload-rejected',
            uploadId,
            tenantId,
            fileName,
            reason:    `Tipo de arquivo não permitido: ${mimeType}`,
            uploadedBy,
          }).catch(() => {/* ignore */});
        }
        return;
      }

      // 3. Validate file size
      const maxBytes = getMaxSize(mimeType);
      if (sizeBytes > 0 && sizeBytes > maxBytes) {
        const maxMb = Math.round(maxBytes / 1024 / 1024);
        const sizeMb = Math.round(sizeBytes / 1024 / 1024);
        this.logger.warn(
          `UploadEventsHandler: REJECTED upload "${uploadId}" — size ${sizeMb} MB exceeds limit ${maxMb} MB for ${mimeType}`,
        );
        if (uploadRepo) {
          await uploadRepo.update(
            { id: uploadId, tenant_id: tenantId },
            { status: UploadStatus.ERROR, metadata: { rejectionReason: `File size ${sizeMb} MB exceeds limit ${maxMb} MB` } },
          ).catch(() => {/* ignore */});
        }
        if (this.queue) {
          await this.queue.addNotification({
            job:       'upload-rejected',
            uploadId,
            tenantId,
            fileName,
            reason:    `Arquivo muito grande (${sizeMb} MB). Limite: ${maxMb} MB`,
            uploadedBy,
          }).catch(() => {/* ignore */});
        }
        return;
      }

      // 4. Keep confirmed as the durable upload state after validation.
      if (uploadRepo) {
        try {
          await uploadRepo.update(
            { id: uploadId, tenant_id: tenantId },
            { status: 'confirmed' as any },
          );
          this.logger.log(
            `UploadEventsHandler: upload "${uploadId}" ("${fileName}") → status=confirmed tenant=${tenantId}`,
          );
        } catch (err) {
          this.logger.error(
            `UploadEventsHandler: failed to update upload status for "${uploadId}" — ${String(err)}`,
          );
        }
      }

      // 5. Enqueue media processing when applicable
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
            sizeBytes,
            uploadedBy,
            correlationId: event.correlationId ?? null,
          });
          this.logger.log(
            `UploadEventsHandler: media processing job enqueued for upload "${uploadId}" (${mimeType}, ${Math.round(sizeBytes / 1024)} KB)`,
          );
        } catch (err) {
          this.logger.warn(
            `UploadEventsHandler: failed to enqueue processing job for upload "${uploadId}" — ${String(err)}`,
          );
        }
      }
    });
  }
}
