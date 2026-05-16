/**
 * release-events.handler.ts
 *
 * Concrete automations triggered by release domain events.
 *
 * ReleaseApproved →
 *   1. Persist checklist notification for the approver.
 *   2. Persist artist-targeted notification (if artistId present).
 *   3. Enqueue WorkflowTask job (distribution validation checklist).
 *   4. Enqueue distribution validation report.
 *
 * ReleaseDistributed →
 *   1. Enqueue post-distribution report generation.
 *
 * ReleasePublished →
 *   1. Enqueue monitoring setup (content detection bootstrap).
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { DATA_SOURCE } from '../../../database/database.module';
import { NotificationEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ReleasePublishedPayload,
  ReleaseApprovedPayload,
  ReleaseDistributedPayload,
} from '../../../core/events/domain-events.types';

const APPROVAL_CHECKLIST = [
  'Verificar arte de capa (3000x3000px, RGB, JPG/PNG)',
  'Confirmar ISRC atribuído a todos os fonogramas',
  'Confirmar UPC / EAN do álbum',
  'Seleccionar distribuidora e plataformas de destino',
  'Validar metadados (título, artistas, créditos, ISWC)',
] as const;

@Injectable()
export class ReleaseEventsHandler {
  private readonly logger = new Logger(ReleaseEventsHandler.name);
  private readonly notifRepo: Repository<NotificationEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
  ) {
    if (ds) this.notifRepo = ds.getRepository(NotificationEntity);
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_APPROVED)
  async onReleaseApproved(event: DomainEvent<ReleaseApprovedPayload>): Promise<void> {
    const { releaseId, titulo, artistId, approvedBy } = event.payload;

    // 1. Persist checklist notification for the approver
    if (this.notifRepo && event.userId) {
      try {
        await this.notifRepo.save(
          this.notifRepo.create({
            id:        randomUUID(),
            tenant_id: event.tenantId,
            user_id:   event.userId,
            title:     `Checklist de lançamento aprovado: "${titulo}"`,
            body:      APPROVAL_CHECKLIST.map((item, i) => `${i + 1}. ${item}`).join('\n'),
            type:      'release.approved.checklist',
            entity:    'release',
            entity_id: releaseId,
            read_at:   null,
            metadata:  { checklist: APPROVAL_CHECKLIST, artistId, approvedBy, correlationId: event.correlationId ?? null },
          }),
        );
        this.logger.log(
          `ReleaseEventsHandler: checklist notification created for release "${releaseId}" approver="${approvedBy}"`,
        );
      } catch (err) {
        this.logger.error(`ReleaseEventsHandler: failed to persist checklist notification — ${String(err)}`);
      }
    }

    // 2. Persist artist-targeted notification when artistId is known
    if (this.notifRepo && artistId) {
      try {
        await this.notifRepo.save(
          this.notifRepo.create({
            id:        randomUUID(),
            tenant_id: event.tenantId,
            user_id:   artistId,
            title:     `Seu lançamento foi aprovado: "${titulo}"`,
            body:      `O lançamento "${titulo}" foi aprovado por ${approvedBy} e segue para distribuição. Aguarde o checklist de validação.`,
            type:      'release.approved.artist',
            entity:    'release',
            entity_id: releaseId,
            read_at:   null,
            metadata:  { artistId, approvedBy, correlationId: event.correlationId ?? null },
          }),
        );
        this.logger.log(
          `ReleaseEventsHandler: artist notification persisted for artist="${artistId}" release="${releaseId}"`,
        );
      } catch (err) {
        this.logger.error(`ReleaseEventsHandler: failed to persist artist notification — ${String(err)}`);
      }
    }

    if (this.queue) {
      try {
        // 3. Enqueue WorkflowTask: distribution validation checklist
        await this.queue.addNotification({
          job:           'create-workflow-task',
          taskType:      'release-distribution-checklist',
          entityType:    'release',
          entityId:      releaseId,
          titulo,
          artistId:      artistId ?? null,
          assignedTo:    approvedBy,
          tenantId:      event.tenantId,
          dueOffsetDays: 3,
          checklist:     APPROVAL_CHECKLIST,
          correlationId: event.correlationId ?? null,
        });

        // 4. Enqueue distribution validation report
        await this.queue.addReport('release-approval-validation', {
          releaseId,
          titulo,
          tenantId:      event.tenantId,
          approvedBy,
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(`ReleaseEventsHandler: failed to enqueue tasks for "${releaseId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_DISTRIBUTED)
  async onReleaseDistributed(event: DomainEvent<ReleaseDistributedPayload>): Promise<void> {
    const { releaseId, titulo, distribuidora } = event.payload;

    if (this.queue) {
      try {
        await this.queue.addReport('release-distribution-report', {
          releaseId,
          titulo,
          distribuidora: distribuidora ?? null,
          tenantId:      event.tenantId,
          correlationId: event.correlationId ?? null,
        });
        this.logger.log(
          `ReleaseEventsHandler: distribution report enqueued for release "${releaseId}" via "${distribuidora ?? 'N/A'}"`,
        );
      } catch (err) {
        this.logger.warn(`ReleaseEventsHandler: failed to enqueue distribution report for "${releaseId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_PUBLISHED)
  async onReleasePublished(event: DomainEvent<ReleasePublishedPayload>): Promise<void> {
    const { releaseId, titulo } = event.payload;

    if (this.queue) {
      try {
        await this.queue.addNotification({
          job:           'setup-release-monitoring',
          releaseId,
          titulo,
          tenantId:      event.tenantId,
          correlationId: event.correlationId ?? null,
        });
        this.logger.log(
          `ReleaseEventsHandler: monitoring setup enqueued for published release "${releaseId}" ("${titulo}")`,
        );
      } catch (err) {
        this.logger.warn(`ReleaseEventsHandler: failed to enqueue monitoring setup for "${releaseId}" — ${String(err)}`);
      }
    }
  }
}
