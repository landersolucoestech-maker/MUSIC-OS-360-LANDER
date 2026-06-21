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
import type { CampaignEndedPayload, CampaignStartedPayload } from '../../../core/events/domain-events.types';

@Injectable()
export class CampaignEventsHandler {
  private readonly logger = new Logger(CampaignEventsHandler.name);
  private readonly notifRepo: Repository<NotificationEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    if (ds) this.notifRepo = ds.getRepository(NotificationEntity);
  }

  @OnEvent(DOMAIN_EVENTS.CAMPAIGN_STARTED)
  async onCampaignStarted(event: DomainEvent<CampaignStartedPayload>): Promise<void> {
    const tenantId = event.tenantId ?? event.payload.tenantId;
    if (!tenantId) return this.failClosed(event.type);

    const { campaignId, titulo, startedBy, startedAt } = event.payload;

    if (this.queue) {
      try {
        await this.queue.addNotification({
          job: 'setup-campaign-monitoring',
          campaignId,
          tenantId,
          titulo,
          startedAt,
          correlationId: event.correlationId ?? null,
        });
        this.logger.log(
          `CampaignEventsHandler: monitoring setup enqueued for campaign "${campaignId}" ("${titulo}") by ${startedBy}`,
        );
      } catch (err) {
        this.logger.warn(
          `CampaignEventsHandler: failed to enqueue monitoring for campaign "${campaignId}" - ${String(err)}`,
        );
      }
    }

    if (!this.notifRepo || !event.userId) return;
    try {
      await this.runInTenantContext(tenantId, async (manager) => {
        const notifRepo = manager ? manager.getRepository(NotificationEntity) : this.notifRepo;
        if (!notifRepo) return;
        await notifRepo.save(
          notifRepo.create({
            id: randomUUID(),
            tenant_id: tenantId,
            user_id: event.userId,
            title: `Campanha iniciada: "${titulo}"`,
            body: `Campanha iniciada em ${startedAt} por ${startedBy}. Monitoramento configurado automaticamente.`,
            type: DOMAIN_EVENTS.CAMPAIGN_STARTED,
            entity: 'campaign',
            entity_id: campaignId,
            read_at: null,
            metadata: { startedBy, startedAt, correlationId: event.correlationId ?? null },
          }),
        );
      });
    } catch (err) {
      this.logger.error(
        `CampaignEventsHandler: failed to persist start notification for campaign "${campaignId}" - ${String(err)}`,
      );
    }
  }

  @OnEvent(DOMAIN_EVENTS.CAMPAIGN_ENDED)
  async onCampaignEnded(event: DomainEvent<CampaignEndedPayload>): Promise<void> {
    const tenantId = event.tenantId ?? event.payload.tenantId;
    if (!tenantId) return this.failClosed(event.type);

    const { campaignId, titulo, endedAt } = event.payload;

    if (this.queue) {
      try {
        await this.queue.addReport('campaign-performance', {
          campaignId,
          titulo,
          tenantId,
          endedAt,
          correlationId: event.correlationId ?? null,
        });
        this.logger.log(
          `CampaignEventsHandler: performance report enqueued for campaign "${campaignId}" ("${titulo}") endedAt=${endedAt}`,
        );
      } catch (err) {
        this.logger.warn(
          `CampaignEventsHandler: failed to enqueue performance report for campaign "${campaignId}" - ${String(err)}`,
        );
      }
    }

    if (!this.notifRepo || !event.userId) return;
    try {
      await this.runInTenantContext(tenantId, async (manager) => {
        const notifRepo = manager ? manager.getRepository(NotificationEntity) : this.notifRepo;
        if (!notifRepo) return;
        await notifRepo.save(
          notifRepo.create({
            id: randomUUID(),
            tenant_id: tenantId,
            user_id: event.userId,
            title: `Campanha encerrada: "${titulo}"`,
            body: `Campanha encerrada em ${endedAt}. Relatorio de performance em processamento.`,
            type: DOMAIN_EVENTS.CAMPAIGN_ENDED,
            entity: 'campaign',
            entity_id: campaignId,
            read_at: null,
            metadata: { endedAt, correlationId: event.correlationId ?? null },
          }),
        );
      });
    } catch (err) {
      this.logger.error(
        `CampaignEventsHandler: failed to persist end notification for campaign "${campaignId}" - ${String(err)}`,
      );
    }
  }

  private failClosed(eventType: string): void {
    this.logger.warn(`CampaignEventsHandler: event "${eventType}" sem tenantId - abortado (fail-closed)`);
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
