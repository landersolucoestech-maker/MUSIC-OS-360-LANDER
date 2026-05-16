/**
 * notification.handler.ts
 *
 * Cross-cutting @OnEvent listener that converts domain events into
 * real-time in-app notifications delivered via WsGateway.
 *
 * For every domain event received it:
 *  1. Persists the event to domain_event_log via DomainEventLogService.
 *  2. Broadcasts a `notification` WebSocket message to the tenant room.
 *
 * The WsGateway.sendToTenant() call is a fire-and-forget; errors are
 * caught and logged without affecting the calling request.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent }    from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { WsGateway } from '../websocket/ws.gateway';
import { DomainEventLogService } from './domain-event-log.service';
import { DOMAIN_EVENTS } from './events.service';
import { CorrelationContext } from './correlation.context';
import type { DomainEvent } from './events.service';
import type {
  ArtistCreatedPayload,
  ArtistUpdatedPayload,
  ContractSignedPayload,
  ContractExpiredPayload,
  ReleaseApprovedPayload,
  ReleaseDistributedPayload,
  ReleasePublishedPayload,
  CampaignStartedPayload,
  CampaignEndedPayload,
  LeadConvertedPayload,
  TicketResolvedPayload,
  WorkflowTransitionedPayload,
} from './domain-events.types';

/** Human-readable notification titles per event type */
const EVENT_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  [DOMAIN_EVENTS.ARTIST_CREATED]:       (p) => `Artista criado: ${p['nomeArtistico'] ?? ''}`,
  [DOMAIN_EVENTS.ARTIST_UPDATED]:       (p) => `Artista actualizado: ${p['nomeArtistico'] ?? ''}`,
  [DOMAIN_EVENTS.CONTRACT_SIGNED]:      (p) => `Contrato assinado: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.CONTRACT_EXPIRED]:     (p) => `Contrato vencido: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.RELEASE_PUBLISHED]:    (p) => `Lançamento publicado: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.RELEASE_APPROVED]:     (p) => `Lançamento aprovado: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.RELEASE_DISTRIBUTED]:  (p) => `Lançamento distribuído: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.CAMPAIGN_STARTED]:     (p) => `Campanha iniciada: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.CAMPAIGN_ENDED]:       (p) => `Campanha encerrada: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.LEAD_CONVERTED]:       (p) => `Lead convertido: ${p['nome'] ?? ''}`,
  [DOMAIN_EVENTS.TICKET_RESOLVED]:      (p) => `Ticket resolvido: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.WORKFLOW_TRANSITIONED]:(p) => `Transição de estado: ${p['entityType'] ?? ''} → ${p['toStatus'] ?? ''}`,
};

@Injectable()
export class NotificationHandler {
  private readonly logger = new Logger(NotificationHandler.name);

  constructor(
    @Optional() private readonly wsGateway: WsGateway,
    private readonly eventLog: DomainEventLogService,
  ) {}

  // ── Persist + notify for all domain events using wildcard ─────────────────

  @OnEvent('artist.*')
  async onArtistEvent(event: DomainEvent<ArtistCreatedPayload | ArtistUpdatedPayload>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('contract.*')
  async onContractEvent(event: DomainEvent<ContractSignedPayload | ContractExpiredPayload>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('release.*')
  async onReleaseEvent(event: DomainEvent<ReleaseApprovedPayload | ReleaseDistributedPayload | ReleasePublishedPayload>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('campaign.*')
  async onCampaignEvent(event: DomainEvent<CampaignStartedPayload | CampaignEndedPayload>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('lead.converted')
  async onLeadConverted(event: DomainEvent<LeadConvertedPayload>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('ticket.resolved')
  async onTicketResolved(event: DomainEvent<TicketResolvedPayload>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('workflow.transitioned')
  async onWorkflowTransitioned(event: DomainEvent<WorkflowTransitionedPayload>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('transaction.created')
  async onTransactionCreated(event: DomainEvent<unknown>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('asset.uploaded')
  async onAssetUploaded(event: DomainEvent<unknown>): Promise<void> {
    await this.handle(event);
  }

  // ── Shared logic ──────────────────────────────────────────────────────────

  private async handle<T>(event: DomainEvent<T>): Promise<void> {
    // Attach correlationId from AsyncLocalStorage if not already set
    const corrId = event.correlationId ?? CorrelationContext.get();
    const enriched: DomainEvent<T> = corrId ? { ...event, correlationId: corrId } : event;

    // 1. Persist to domain_event_log
    await this.eventLog.persist(enriched);

    // 2. Broadcast WebSocket notification to tenant room
    if (!this.wsGateway) return;

    const labelFn  = EVENT_LABELS[event.type];
    const payload  = event.payload as Record<string, unknown>;
    const title    = labelFn ? labelFn(payload) : event.type;

    try {
      this.wsGateway.sendToTenant(event.tenantId, 'notification', {
        id:            randomUUID(),
        type:          event.type,
        title,
        tenantId:      event.tenantId,
        userId:        event.userId   ?? null,
        correlationId: corrId         ?? null,
        occurredAt:    event.occurredAt,
        payload,
      });
    } catch (err) {
      this.logger.error(
        `NotificationHandler: WS broadcast failed for "${event.type}" — ${String(err)}`,
      );
    }
  }
}
