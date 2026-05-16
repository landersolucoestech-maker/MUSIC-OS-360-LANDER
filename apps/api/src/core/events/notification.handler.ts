/**
 * notification.handler.ts
 *
 * Cross-cutting @OnEvent listener that converts domain events into:
 *  1. Persistent domain_event_log records (via DomainEventLogService).
 *  2. Persistent in-app NotificationEntity records (for the acting/affected user).
 *  3. Real-time WebSocket broadcasts to the tenant room (via WsGateway).
 *
 * All three actions are fire-and-forget; errors are caught and logged
 * without affecting the calling request.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent }    from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { WsGateway } from '../websocket/ws.gateway';
import { DomainEventLogService } from './domain-event-log.service';
import { DOMAIN_EVENTS } from './events.service';
import { CorrelationContext } from './correlation.context';
import { DATA_SOURCE } from '../../database/database.module';
import { NotificationEntity } from '../../database/entities';
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
  [DOMAIN_EVENTS.TRANSACTION_CREATED]:  (p) => `Transacção registada: ${p['tipo'] ?? ''} ${p['valor'] ?? ''}`,
  [DOMAIN_EVENTS.ASSET_UPLOADED]:       (p) => `Ficheiro enviado: ${p['fileName'] ?? ''}`,
  [DOMAIN_EVENTS.TENANT_CREATED]:       (p) => `Conta criada: ${p['name'] ?? ''}`,
  [DOMAIN_EVENTS.USER_INVITED]:         (p) => `Utilizador convidado: ${p['email'] ?? ''}`,
};

/** Extracts aggregate entity + id from event for NotificationEntity.entity / entity_id */
const EVENT_AGGREGATE: Record<string, string> = {
  [DOMAIN_EVENTS.ARTIST_CREATED]:        'artist',
  [DOMAIN_EVENTS.ARTIST_UPDATED]:        'artist',
  [DOMAIN_EVENTS.CONTRACT_SIGNED]:       'contract',
  [DOMAIN_EVENTS.CONTRACT_EXPIRED]:      'contract',
  [DOMAIN_EVENTS.RELEASE_PUBLISHED]:     'release',
  [DOMAIN_EVENTS.RELEASE_APPROVED]:      'release',
  [DOMAIN_EVENTS.RELEASE_DISTRIBUTED]:   'release',
  [DOMAIN_EVENTS.CAMPAIGN_STARTED]:      'campaign',
  [DOMAIN_EVENTS.CAMPAIGN_ENDED]:        'campaign',
  [DOMAIN_EVENTS.LEAD_CONVERTED]:        'lead',
  [DOMAIN_EVENTS.TICKET_RESOLVED]:       'support_ticket',
  [DOMAIN_EVENTS.WORKFLOW_TRANSITIONED]: 'workflow',
  [DOMAIN_EVENTS.TRANSACTION_CREATED]:   'transaction',
  [DOMAIN_EVENTS.ASSET_UPLOADED]:        'upload',
};

@Injectable()
export class NotificationHandler {
  private readonly logger = new Logger(NotificationHandler.name);
  private readonly notifRepo: Repository<NotificationEntity> | null = null;

  constructor(
    @Optional() private readonly wsGateway: WsGateway,
    private readonly eventLog: DomainEventLogService,
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
  ) {
    if (ds) this.notifRepo = ds.getRepository(NotificationEntity);
  }

  // ── Handlers per event group ──────────────────────────────────────────────

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

  @OnEvent('tenant.created')
  async onTenantCreated(event: DomainEvent<unknown>): Promise<void> {
    await this.handle(event);
  }

  @OnEvent('user.invited')
  async onUserInvited(event: DomainEvent<unknown>): Promise<void> {
    await this.handle(event);
  }

  // ── Shared processing ─────────────────────────────────────────────────────

  private async handle<T>(event: DomainEvent<T>): Promise<void> {
    // Attach correlationId from AsyncLocalStorage if not already set
    const corrId    = event.correlationId ?? CorrelationContext.get();
    const enriched: DomainEvent<T> = corrId ? { ...event, correlationId: corrId } : event;
    const payload   = event.payload as Record<string, unknown>;
    const labelFn   = EVENT_LABELS[event.type];
    const title     = labelFn ? labelFn(payload) : event.type;

    // 1. Persist to domain_event_log (append-only audit)
    const now = new Date();
    await this.eventLog.persist(enriched, { processedAt: now });

    // 2. Persist in-app NotificationEntity for the acting user (when available)
    if (this.notifRepo && event.userId) {
      try {
        const aggregateType = EVENT_AGGREGATE[event.type] ?? null;
        const aggregateId   = event.aggregateId ?? null;
        const notification  = this.notifRepo.create({
          id:        randomUUID(),
          tenant_id: event.tenantId,
          user_id:   event.userId,
          title,
          body:      null,
          type:      event.type,
          entity:    aggregateType,
          entity_id: aggregateId,
          read_at:   null,
          metadata: {
            correlationId: corrId ?? null,
            occurredAt:    event.occurredAt,
          },
        });
        await this.notifRepo.save(notification);
      } catch (err) {
        this.logger.error(
          `NotificationHandler: failed to persist notification for "${event.type}" user=${event.userId} — ${String(err)}`,
        );
      }
    }

    // 3. Broadcast real-time WebSocket notification to entire tenant room
    if (!this.wsGateway) return;
    try {
      this.wsGateway.sendToTenant(event.tenantId, 'notification', {
        id:            randomUUID(),
        type:          event.type,
        title,
        tenantId:      event.tenantId,
        userId:        event.userId   ?? null,
        correlationId: corrId         ?? null,
        aggregateType: event.aggregateType ?? EVENT_AGGREGATE[event.type] ?? null,
        aggregateId:   event.aggregateId   ?? null,
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
