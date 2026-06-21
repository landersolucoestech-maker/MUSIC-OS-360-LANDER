import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { DatabaseContextService } from '../../../database/database-context.service';
import { NotificationEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ReleaseApprovedPayload,
  ReleaseDistributedPayload,
  ReleasePublishedPayload,
} from '../../../core/events/domain-events.types';

const APPROVAL_CHECKLIST = [
  'Verificar arte de capa (3000x3000px, RGB, JPG/PNG)',
  'Confirmar ISRC atribuido a todos os fonogramas',
  'Confirmar UPC / EAN do album',
  'Selecionar distribuidora e plataformas de destino',
  'Validar metadados (titulo, artistas, creditos, ISWC)',
] as const;

@Injectable()
export class ReleaseEventsHandler {
  private readonly logger = new Logger(ReleaseEventsHandler.name);
  private readonly notifRepo: Repository<NotificationEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    if (ds) this.notifRepo = ds.getRepository(NotificationEntity);
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_APPROVED)
  async onReleaseApproved(event: DomainEvent<ReleaseApprovedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    if (!tenantId) return this.failClosed(event.type);

    const { releaseId, titulo, artistId, approvedBy } = event.payload;

    if (this.notifRepo && event.userId) {
      try {
        await this.runInTenantContext(tenantId, async (manager) => {
          const notifRepo = manager ? manager.getRepository(NotificationEntity) : this.notifRepo;
          if (!notifRepo) return;
          await notifRepo.save(
            notifRepo.create({
              id: randomUUID(),
              tenant_id: tenantId,
              user_id: event.userId,
              title: `Checklist de lancamento aprovado: "${titulo}"`,
              body: APPROVAL_CHECKLIST.map((item, i) => `${i + 1}. ${item}`).join('\n'),
              type: 'release.approved.checklist',
              entity: 'release',
              entity_id: releaseId,
              read_at: null,
              metadata: { checklist: APPROVAL_CHECKLIST, artistId, approvedBy, correlationId: event.correlationId ?? null },
            }),
          );
        });
        this.logger.log(
          `ReleaseEventsHandler: checklist notification created for release "${releaseId}" approver="${approvedBy}"`,
        );
      } catch (err) {
        this.logger.error(`ReleaseEventsHandler: failed to persist checklist notification - ${String(err)}`);
      }
    }

    if (this.notifRepo && artistId) {
      try {
        await this.runInTenantContext(tenantId, async (manager) => {
          const notifRepo = manager ? manager.getRepository(NotificationEntity) : this.notifRepo;
          if (!notifRepo) return;
          await notifRepo.save(
            notifRepo.create({
              id: randomUUID(),
              tenant_id: tenantId,
              user_id: artistId,
              title: `Seu lancamento foi aprovado: "${titulo}"`,
              body: `O lancamento "${titulo}" foi aprovado por ${approvedBy} e segue para distribuicao. Aguarde o checklist de validacao.`,
              type: 'release.approved.artist',
              entity: 'release',
              entity_id: releaseId,
              read_at: null,
              metadata: { artistId, approvedBy, correlationId: event.correlationId ?? null },
            }),
          );
        });
        this.logger.log(
          `ReleaseEventsHandler: artist notification persisted for artist="${artistId}" release="${releaseId}"`,
        );
      } catch (err) {
        this.logger.error(`ReleaseEventsHandler: failed to persist artist notification - ${String(err)}`);
      }
    }

    if (!this.queue) return;
    try {
      await this.queue.addNotification({
        job: 'create-workflow-task',
        taskType: 'release-distribution-checklist',
        entityType: 'release',
        entityId: releaseId,
        titulo,
        artistId: artistId ?? null,
        assignedTo: approvedBy,
        tenantId,
        dueOffsetDays: 3,
        checklist: APPROVAL_CHECKLIST,
        correlationId: event.correlationId ?? null,
      });

      await this.queue.addReport('release-approval-validation', {
        releaseId,
        titulo,
        tenantId,
        approvedBy,
        correlationId: event.correlationId ?? null,
      });
    } catch (err) {
      this.logger.warn(`ReleaseEventsHandler: failed to enqueue tasks for "${releaseId}" - ${String(err)}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_DISTRIBUTED)
  async onReleaseDistributed(event: DomainEvent<ReleaseDistributedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    if (!tenantId) return this.failClosed(event.type);

    const { releaseId, titulo, distribuidora } = event.payload;
    if (!this.queue) return;
    try {
      await this.queue.addReport('release-distribution-report', {
        releaseId,
        titulo,
        distribuidora: distribuidora ?? null,
        tenantId,
        correlationId: event.correlationId ?? null,
      });
      this.logger.log(
        `ReleaseEventsHandler: distribution report enqueued for release "${releaseId}" via "${distribuidora ?? 'N/A'}"`,
      );
    } catch (err) {
      this.logger.warn(`ReleaseEventsHandler: failed to enqueue distribution report for "${releaseId}" - ${String(err)}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_PUBLISHED)
  async onReleasePublished(event: DomainEvent<ReleasePublishedPayload>): Promise<void> {
    const tenantId = event.tenantId;
    if (!tenantId) return this.failClosed(event.type);

    const { releaseId, titulo } = event.payload;
    if (!this.queue) return;
    try {
      await this.queue.addNotification({
        job: 'setup-release-monitoring',
        releaseId,
        titulo,
        tenantId,
        correlationId: event.correlationId ?? null,
      });
      this.logger.log(
        `ReleaseEventsHandler: monitoring setup enqueued for published release "${releaseId}" ("${titulo}")`,
      );
    } catch (err) {
      this.logger.warn(`ReleaseEventsHandler: failed to enqueue monitoring setup for "${releaseId}" - ${String(err)}`);
    }
  }

  private failClosed(eventType: string): void {
    this.logger.warn(`ReleaseEventsHandler: event "${eventType}" sem tenantId - abortado (fail-closed)`);
  }

  private runInTenantContext<T>(
    tenantId: string,
    work: (manager: EntityManager | undefined) => Promise<T>,
  ): Promise<T> {
    return this.dbContext
      ? this.dbContext.runInTenantContext({ tenantId, orgId: null, role: null }, work)
      : work(undefined);
  }
}
