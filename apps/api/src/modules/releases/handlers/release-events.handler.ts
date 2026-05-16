/**
 * release-events.handler.ts
 *
 * Module-local @OnEvent handlers for release domain events.
 * Handles: release.published, release.approved, release.distributed
 *
 * Cross-cutting concerns (WS notification, event log persistence) are handled
 * centrally by NotificationHandler in core/events/.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ReleasePublishedPayload,
  ReleaseApprovedPayload,
  ReleaseDistributedPayload,
} from '../../../core/events/domain-events.types';

@Injectable()
export class ReleaseEventsHandler {
  private readonly logger = new Logger(ReleaseEventsHandler.name);

  @OnEvent(DOMAIN_EVENTS.RELEASE_PUBLISHED)
  onReleasePublished(event: DomainEvent<ReleasePublishedPayload>): void {
    const { releaseId, titulo, publishedAt } = event.payload;
    this.logger.log(
      `[${DOMAIN_EVENTS.RELEASE_PUBLISHED}] releaseId=${releaseId} titulo="${titulo}" at=${publishedAt} tenant=${event.tenantId}`,
    );
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_APPROVED)
  onReleaseApproved(event: DomainEvent<ReleaseApprovedPayload>): void {
    const { releaseId, titulo, approvedBy, approvedAt } = event.payload;
    this.logger.log(
      `[${DOMAIN_EVENTS.RELEASE_APPROVED}] releaseId=${releaseId} titulo="${titulo}" by=${approvedBy} at=${approvedAt} tenant=${event.tenantId}`,
    );
  }

  @OnEvent(DOMAIN_EVENTS.RELEASE_DISTRIBUTED)
  onReleaseDistributed(event: DomainEvent<ReleaseDistributedPayload>): void {
    const { releaseId, titulo, distribuidora, distributedAt } = event.payload;
    this.logger.log(
      `[${DOMAIN_EVENTS.RELEASE_DISTRIBUTED}] releaseId=${releaseId} titulo="${titulo}" distribuidora=${distribuidora ?? 'N/A'} at=${distributedAt} tenant=${event.tenantId}`,
    );
  }
}
