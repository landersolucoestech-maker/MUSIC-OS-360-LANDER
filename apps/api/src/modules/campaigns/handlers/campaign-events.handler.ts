/**
 * campaign-events.handler.ts
 *
 * Concrete automations triggered by campaign domain events.
 *
 * CampaignStarted →
 *   1. Enqueue monitoring setup (content-detection bootstrap for campaign assets).
 *   2. Log campaign start for observability.
 *
 * CampaignEnded →
 *   1. Enqueue performance report generation.
 *   2. Enqueue summary notification for the responsible user.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { NotificationEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { CampaignStartedPayload, CampaignEndedPayload } from '../../../core/events/domain-events.types';

@Injectable()
export class CampaignEventsHandler {
  private readonly logger = new Logger(CampaignEventsHandler.name);
  private readonly notifRepo: Repository<NotificationEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
  ) {
    if (ds) this.notifRepo = ds.getRepository(NotificationEntity);
  }

  @OnEvent(DOMAIN_EVENTS.CAMPAIGN_STARTED)
  async onCampaignStarted(event: DomainEvent<CampaignStartedPayload>): Promise<void> {
    const { campaignId, tenantId, titulo, startedBy, startedAt } = event.payload;

    // 1. Enqueue monitoring/content-detection setup for campaign
    if (this.queue) {
      try {
        await this.queue.addNotification({
          job:           'setup-campaign-monitoring',
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
          `CampaignEventsHandler: failed to enqueue monitoring for campaign "${campaignId}" — ${String(err)}`,
        );
      }
    }

    // 2. Notify responsible user of campaign start
    if (this.notifRepo && event.userId) {
      try {
        await this.notifRepo.save(
          this.notifRepo.create({
            id:        randomUUID(),
            tenant_id: tenantId,
            user_id:   event.userId,
            title:     `Campanha iniciada: "${titulo}"`,
            body:      `Campanha iniciada em ${startedAt} por ${startedBy}. Monitoramento configurado automaticamente.`,
            type:      DOMAIN_EVENTS.CAMPAIGN_STARTED,
            entity:    'campaign',
            entity_id: campaignId,
            read_at:   null,
            metadata:  { startedBy, startedAt, correlationId: event.correlationId ?? null },
          }),
        );
      } catch (err) {
        this.logger.error(
          `CampaignEventsHandler: failed to persist start notification for campaign "${campaignId}" — ${String(err)}`,
        );
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.CAMPAIGN_ENDED)
  async onCampaignEnded(event: DomainEvent<CampaignEndedPayload>): Promise<void> {
    const { campaignId, tenantId, titulo, endedAt } = event.payload;

    // 1. Enqueue performance report generation
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
          `CampaignEventsHandler: failed to enqueue performance report for campaign "${campaignId}" — ${String(err)}`,
        );
      }
    }

    // 2. Persist end notification for responsible user
    if (this.notifRepo && event.userId) {
      try {
        await this.notifRepo.save(
          this.notifRepo.create({
            id:        randomUUID(),
            tenant_id: tenantId,
            user_id:   event.userId,
            title:     `Campanha encerrada: "${titulo}"`,
            body:      `Campanha encerrada em ${endedAt}. Relatório de performance em processamento.`,
            type:      DOMAIN_EVENTS.CAMPAIGN_ENDED,
            entity:    'campaign',
            entity_id: campaignId,
            read_at:   null,
            metadata:  { endedAt, correlationId: event.correlationId ?? null },
          }),
        );
      } catch (err) {
        this.logger.error(
          `CampaignEventsHandler: failed to persist end notification for campaign "${campaignId}" — ${String(err)}`,
        );
      }
    }
  }
}
