/**
 * artist-events.handler.ts
 *
 * Concrete automations triggered by artist domain events.
 *
 * ArtistCreated →
 *   1. Bootstrap 3 initial artist goals (streams, followers, revenue).
 *   2. Write activity log entry.
 *   3. Enqueue media-folder creation job.
 *
 * ArtistStatusChanged →
 *   1. Write activity log with before/after status.
 *   2. Emit WORKFLOW_TRANSITIONED for audit trail.
 *
 * ArtistDeleted →
 *   1. Write activity log entry.
 *
 * ArtistUpdated →
 *   1. Enqueue cache invalidation for artist profile.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ArtistGoalEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { EventsService, DOMAIN_EVENTS } from '../../../core/events/events.service';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ArtistCreatedPayload,
  ArtistUpdatedPayload,
  ArtistStatusChangedPayload,
  ArtistDeletedPayload,
} from '../../../core/events/domain-events.types';

const INITIAL_GOALS = [
  { titulo: 'Meta de Streams Mensais',     tipo: 'streams',   meta_valor: '10000', periodo: 'mensal' },
  { titulo: 'Meta de Seguidores',          tipo: 'followers', meta_valor: '5000',  periodo: 'mensal' },
  { titulo: 'Meta de Receita Mensal (R$)', tipo: 'receita',   meta_valor: '3000',  periodo: 'mensal' },
] as const;

@Injectable()
export class ArtistEventsHandler {
  private readonly logger = new Logger(ArtistEventsHandler.name);
  private readonly goalRepo: Repository<ArtistGoalEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
    @Optional() private readonly activityLogs: ActivityLogsService,
    @Optional() private readonly events: EventsService,
  ) {
    if (ds) this.goalRepo = ds.getRepository(ArtistGoalEntity);
  }

  @OnEvent(DOMAIN_EVENTS.ARTIST_CREATED)
  async onArtistCreated(event: DomainEvent<ArtistCreatedPayload>): Promise<void> {
    const { artistId, tenantId, nomeArtistico } = event.payload;

    // 1. Bootstrap initial artist goals
    if (this.goalRepo) {
      try {
        const goals = INITIAL_GOALS.map((g) =>
          this.goalRepo!.create({
            id:          randomUUID(),
            tenant_id:   tenantId,
            artista_id:  artistId,
            titulo:      g.titulo,
            tipo:        g.tipo,
            meta_valor:  g.meta_valor,
            valor_atual: '0',
            periodo:     g.periodo,
            data_inicio: new Date(),
            data_fim:    null,
            metadata:    { bootstrapped: true, correlationId: event.correlationId ?? null },
            created_by:  event.userId ?? null,
          }),
        );
        await this.goalRepo.save(goals);
        this.logger.log(
          `Bootstrapped ${goals.length} goals for artist "${artistId}" (${nomeArtistico}) tenant=${tenantId}`,
        );
      } catch (err) {
        this.logger.error(`Failed to bootstrap goals for "${artistId}" — ${String(err)}`);
      }
    }

    // 2. Activity log
    if (this.activityLogs && event.userId) {
      try {
        await this.activityLogs.create(tenantId, event.userId, {
          entity_type:  'artist',
          entity_id:    artistId,
          action:       'created',
          description:  `Artista "${nomeArtistico}" criado`,
          metadata: {
            nomeArtistico,
            status:        event.payload.status,
            tipo:          event.payload.tipo,
            correlationId: event.correlationId ?? null,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for artist created "${artistId}" — ${String(err)}`);
      }
    }

    // 3. Enqueue media-folder creation (fire-and-forget)
    if (this.queue) {
      try {
        await this.queue.addNotification({
          job:           'create-artist-media-folder',
          artistId,
          tenantId,
          nome:          nomeArtistico,
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue media folder job for "${artistId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.ARTIST_STATUS_CHANGED)
  async onArtistStatusChanged(event: DomainEvent<ArtistStatusChangedPayload>): Promise<void> {
    const { artistId, tenantId, nomeArtistico, previousStatus, newStatus, changedBy } = event.payload;

    this.logger.log(
      `Artist status changed: "${nomeArtistico}" (${artistId}) ${previousStatus} → ${newStatus} by ${changedBy} tenant=${tenantId}`,
    );

    // 1. Activity log with before/after
    if (this.activityLogs && changedBy) {
      try {
        await this.activityLogs.create(tenantId, changedBy, {
          entity_type:  'artist',
          entity_id:    artistId,
          action:       'status_changed',
          description:  `Status do artista "${nomeArtistico}" alterado: ${previousStatus} → ${newStatus}`,
          metadata: {
            nomeArtistico,
            previousStatus,
            newStatus,
            correlationId: event.correlationId ?? null,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for artist status change "${artistId}" — ${String(err)}`);
      }
    }

    // 2. Emit WORKFLOW_TRANSITIONED for audit trail + WorkflowEventsHandler to pick up
    if (this.events) {
      try {
        this.events.emitTyped(DOMAIN_EVENTS.WORKFLOW_TRANSITIONED, {
          tenantId,
          userId: changedBy,
          aggregateType: 'artist',
          aggregateId:   artistId,
          payload: {
            entityType:     'artist',
            entityId:       artistId,
            tenantId,
            fromStatus:     previousStatus,
            toStatus:       newStatus,
            actorId:        changedBy,
            actorRole:      undefined,
            reason:         null,
            transitionedAt: event.occurredAt,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to emit WORKFLOW_TRANSITIONED for artist "${artistId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.ARTIST_DELETED)
  async onArtistDeleted(event: DomainEvent<ArtistDeletedPayload>): Promise<void> {
    const { artistId, tenantId, nomeArtistico, deletedBy } = event.payload;

    this.logger.log(`Artist soft-deleted: "${nomeArtistico}" (${artistId}) by ${deletedBy} tenant=${tenantId}`);

    if (this.activityLogs && deletedBy) {
      try {
        await this.activityLogs.create(tenantId, deletedBy, {
          entity_type:  'artist',
          entity_id:    artistId,
          action:       'deleted',
          description:  `Artista "${nomeArtistico}" removido (soft-delete)`,
          metadata: {
            nomeArtistico,
            deletedBy,
            correlationId: event.correlationId ?? null,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for artist deleted "${artistId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.ARTIST_UPDATED)
  async onArtistUpdated(event: DomainEvent<ArtistUpdatedPayload>): Promise<void> {
    const { artistId, changedFields } = event.payload;

    // Enqueue cache invalidation for artist profile
    if (this.queue) {
      try {
        await this.queue.addNotification({
          job:           'invalidate-artist-cache',
          artistId,
          tenantId:      event.tenantId,
          changedFields,
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue cache invalidation for "${artistId}" — ${String(err)}`);
      }
    }
  }
}
