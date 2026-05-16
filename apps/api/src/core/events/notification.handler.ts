/**
 * notification.handler.ts
 *
 * Responsible ONLY for user-facing notifications:
 *  1. Persists in-app NotificationEntity for the acting/affected user.
 *  2. Broadcasts real-time WebSocket notification to the tenant room.
 *
 * Event-log persistence is handled entirely by UniversalEventLogHandler
 * (single @OnEvent('**') wildcard) — not duplicated here.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent }    from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { WsGateway } from '../websocket/ws.gateway';
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
const EVENT_LABELS: Record<string, (p: Record<string, unknown>) => string> = {
  [DOMAIN_EVENTS.ARTIST_CREATED]:        (p) => `Artista criado: ${p['nomeArtistico'] ?? ''}`,
  [DOMAIN_EVENTS.ARTIST_UPDATED]:        (p) => `Artista actualizado: ${p['nomeArtistico'] ?? ''}`,
  [DOMAIN_EVENTS.CONTRACT_SIGNED]:       (p) => `Contrato assinado: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.CONTRACT_EXPIRED]:      (p) => `Contrato vencido: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.RELEASE_PUBLISHED]:     (p) => `Lançamento publicado: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.RELEASE_APPROVED]:      (p) => `Lançamento aprovado: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.RELEASE_DISTRIBUTED]:   (p) => `Lançamento distribuído: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.CAMPAIGN_STARTED]:      (p) => `Campanha iniciada: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.CAMPAIGN_ENDED]:        (p) => `Campanha encerrada: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.LEAD_CONVERTED]:        (p) => `Lead convertido: ${p['nome'] ?? ''}`,
  [DOMAIN_EVENTS.TICKET_RESOLVED]:       (p) => `Ticket resolvido: ${p['titulo'] ?? ''}`,
  [DOMAIN_EVENTS.WORKFLOW_TRANSITIONED]: (p) => `Transição: ${p['entityType'] ?? ''} → ${p['toStatus'] ?? ''}`,
  [DOMAIN_EVENTS.TRANSACTION_CREATED]:   (p) => `Transacção: ${p['tipo'] ?? ''} ${p['valor'] ?? ''}`,
  [DOMAIN_EVENTS.ASSET_UPLOADED]:        (p) => `Ficheiro enviado: ${p['fileName'] ?? ''}`,
  [DOMAIN_EVENTS.TENANT_CREATED]:        (p) => `Conta criada: ${p['name'] ?? ''}`,
  [DOMAIN_EVENTS.USER_INVITED]:          (p) => `Utilizador convidado: ${p['email'] ?? ''}`,
  [DOMAIN_EVENTS.TAKEDOWN_REQUESTED]:    (p) => `Takedown solicitado: ${p['entityId'] ?? ''}`,
};

/** Aggregate entity type per event (for NotificationEntity.entity field) */
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
  [DOMAIN_EVENTS.TAKEDOWN_REQUESTED]:    'takedown',
};

@Injectable()
export class NotificationHandler {
  private readonly logger = new Logger(NotificationHandler.name);
  private readonly notifRepo: Repository<NotificationEntity> | null = null;

  constructor(
    @Optional() private readonly wsGateway: WsGateway,
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
  ) {
    if (ds) this.notifRepo = ds.getRepository(NotificationEntity);
  }

  // ── Event listeners ───────────────────────────────────────────────────────

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

  @OnEvent('takedown.requested')
  async onTakedownRequested(event: DomainEvent<unknown>): Promise<void> {
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

  // ── Shared: persist in-app notification + WS broadcast ───────────────────

  private async handle<T>(event: DomainEvent<T>): Promise<void> {
    const corrId  = event.correlationId ?? CorrelationContext.get();
    const payload = event.payload as Record<string, unknown>;
    const labelFn = EVENT_LABELS[event.type];
    const title   = labelFn ? labelFn(payload) : event.type;

    // 1. Persist in-app notification for acting user (when userId is available)
    if (this.notifRepo && event.userId) {
      try {
        const notification = this.notifRepo.create({
          id:        randomUUID(),
          tenant_id: event.tenantId,
          user_id:   event.userId,
          title,
          body:      null,
          type:      event.type,
          entity:    event.aggregateType ?? EVENT_AGGREGATE[event.type] ?? null,
          entity_id: event.aggregateId   ?? null,
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

    // 2. Real-time WS broadcast to entire tenant room
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
