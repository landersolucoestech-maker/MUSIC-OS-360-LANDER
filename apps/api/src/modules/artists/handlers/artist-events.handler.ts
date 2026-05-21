/**
 * artist-events.handler.ts
 *
 * Concrete automations triggered by artist domain events.
 *
 * ArtistCreated →
 *   1. Bootstrap 3 initial artist goals (streams, followers, revenue).
 *   2. Enqueue media-folder creation job.
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
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { ArtistCreatedPayload, ArtistUpdatedPayload } from '../../../core/events/domain-events.types';

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
          `ArtistEventsHandler: bootstrapped ${goals.length} goals for artist "${artistId}" (${nomeArtistico}) tenant=${tenantId}`,
        );
      } catch (err) {
        this.logger.error(
          `ArtistEventsHandler: failed to bootstrap goals for "${artistId}" — ${String(err)}`,
        );
      }
    }

    // 2. Enqueue media-folder creation (fire-and-forget)
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
        this.logger.warn(
          `ArtistEventsHandler: failed to enqueue media folder job for "${artistId}" — ${String(err)}`,
        );
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
        this.logger.warn(
          `ArtistEventsHandler: failed to enqueue cache invalidation for "${artistId}" — ${String(err)}`,
        );
      }
    }
  }
}
