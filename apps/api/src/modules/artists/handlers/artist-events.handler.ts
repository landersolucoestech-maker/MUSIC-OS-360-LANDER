/**
 * artist-events.handler.ts
 *
 * Module-local @OnEvent handlers for artist domain events.
 * Responsibilities:
 *  - Log artist lifecycle transitions for observability.
 *  - Side-effects local to the artists domain (e.g. create initial goal, clear cache).
 *
 * Cross-cutting concerns (WS notification, event log persistence) are handled
 * centrally by NotificationHandler in core/events/.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { ArtistCreatedPayload, ArtistUpdatedPayload } from '../../../core/events/domain-events.types';

@Injectable()
export class ArtistEventsHandler {
  private readonly logger = new Logger(ArtistEventsHandler.name);

  @OnEvent(DOMAIN_EVENTS.ARTIST_CREATED)
  onArtistCreated(event: DomainEvent<ArtistCreatedPayload>): void {
    const { artistId, nomeArtistico, createdBy } = event.payload;
    this.logger.log(
      `[${DOMAIN_EVENTS.ARTIST_CREATED}] artistId=${artistId} nome="${nomeArtistico}" by=${createdBy} tenant=${event.tenantId}`,
    );
  }

  @OnEvent(DOMAIN_EVENTS.ARTIST_UPDATED)
  onArtistUpdated(event: DomainEvent<ArtistUpdatedPayload>): void {
    const { artistId, nomeArtistico, changedFields, updatedBy } = event.payload;
    this.logger.log(
      `[${DOMAIN_EVENTS.ARTIST_UPDATED}] artistId=${artistId} nome="${nomeArtistico}" fields=${changedFields.join(',')} by=${updatedBy} tenant=${event.tenantId}`,
    );
  }
}
