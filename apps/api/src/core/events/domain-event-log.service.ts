/**
 * domain-event-log.service.ts
 *
 * Persists every domain event to the `domain_event_log` table (append-only).
 * Injected into the DomainEventsModule and used by NotificationHandler.
 *
 * In DB-less / test environments (ds === null) all writes are no-ops.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { DomainEventLogEntity } from '../../database/entities';
import type { DomainEvent } from './events.service';

@Injectable()
export class DomainEventLogService {
  private readonly repo: Repository<DomainEventLogEntity> | null = null;
  private readonly logger = new Logger(DomainEventLogService.name);

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(DomainEventLogEntity);
  }

  async persist<T>(
    event: DomainEvent<T>,
    opts?: { processedAt?: Date; error?: string },
  ): Promise<void> {
    if (!this.repo) return;
    try {
      const entry = this.repo.create({
        tenant_id:      event.tenantId ?? null,
        event_type:     event.type,
        aggregate_type: event.aggregateType ?? null,
        aggregate_id:   event.aggregateId   ?? null,
        actor_id:       event.userId        ?? null,
        correlation_id: event.correlationId ?? null,
        payload:        event.payload as Record<string, unknown>,
        occurred_at:    new Date(event.occurredAt),
        processed_at:   opts?.processedAt ?? null,
        error:          opts?.error        ?? null,
      });
      await this.repo.save(entry);
    } catch (err) {
      this.logger.error(
        `DomainEventLogService: failed to persist event "${event.type}" ` +
        `aggregate=${event.aggregateType}:${event.aggregateId} — ${String(err)}`,
      );
    }
  }
}
