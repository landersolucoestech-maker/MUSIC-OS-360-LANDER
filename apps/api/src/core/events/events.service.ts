import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorrelationContext } from './correlation.context';
import type {
  ArtistCreatedPayload,
  ArtistUpdatedPayload,
  ContractSignedPayload,
  ContractExpiredPayload,
  TransactionCreatedPayload,
  ReleasePublishedPayload,
  ReleaseApprovedPayload,
  ReleaseDistributedPayload,
  TakedownRequestedPayload,
  CampaignStartedPayload,
  CampaignEndedPayload,
  LeadConvertedPayload,
  AssetUploadedPayload,
  TicketResolvedPayload,
  WorkflowTransitionedPayload,
  TenantCreatedPayload,
  UserInvitedPayload,
} from './domain-events.types';

// ─── Core DomainEvent envelope ────────────────────────────────────────────────

export interface DomainEvent<T = unknown> {
  type:           string;
  tenantId:       string;
  userId?:        string;
  correlationId?: string;
  /** Domain aggregate name (e.g. 'artist', 'contract', 'release') */
  aggregateType?: string;
  /** ID of the aggregate instance */
  aggregateId?:   string;
  payload:        T;
  occurredAt:     string;
}

// ─── Event → Payload compile-time map ────────────────────────────────────────

/**
 * Map from event type string → payload type.
 * Used by `EventsService.emitTyped()` to enforce payload shape at compile time.
 */
export interface EventPayloadMap {
  'artist.created':        ArtistCreatedPayload;
  'artist.updated':        ArtistUpdatedPayload;
  'contract.signed':       ContractSignedPayload;
  'contract.expired':      ContractExpiredPayload;
  'transaction.created':   TransactionCreatedPayload;
  'release.published':     ReleasePublishedPayload;
  'release.approved':      ReleaseApprovedPayload;
  'release.distributed':   ReleaseDistributedPayload;
  'takedown.requested':    TakedownRequestedPayload;
  'campaign.started':      CampaignStartedPayload;
  'campaign.ended':        CampaignEndedPayload;
  'lead.converted':        LeadConvertedPayload;
  'asset.uploaded':        AssetUploadedPayload;
  'ticket.resolved':       TicketResolvedPayload;
  'workflow.transitioned': WorkflowTransitionedPayload;
  'tenant.created':        TenantCreatedPayload;
  'user.invited':          UserInvitedPayload;
}

export type DomainEventType = keyof EventPayloadMap;

/** Nomes de eventos de domínio padronizados */
export const DOMAIN_EVENTS = {
  // Artists
  ARTIST_CREATED:        'artist.created',
  ARTIST_UPDATED:        'artist.updated',

  // Contracts
  CONTRACT_SIGNED:       'contract.signed',
  CONTRACT_EXPIRED:      'contract.expired',

  // Accounting
  TRANSACTION_CREATED:   'transaction.created',

  // Releases
  RELEASE_PUBLISHED:     'release.published',
  RELEASE_APPROVED:      'release.approved',
  RELEASE_DISTRIBUTED:   'release.distributed',

  // Monitoring
  TAKEDOWN_REQUESTED:    'takedown.requested',

  // Marketing / CRM
  CAMPAIGN_STARTED:      'campaign.started',
  CAMPAIGN_ENDED:        'campaign.ended',
  LEAD_CONVERTED:        'lead.converted',

  // Assets
  ASSET_UPLOADED:        'asset.uploaded',

  // Support
  TICKET_RESOLVED:       'ticket.resolved',

  // Workflow
  WORKFLOW_TRANSITIONED: 'workflow.transitioned',

  // Tenant / Users
  TENANT_CREATED:        'tenant.created',
  USER_INVITED:          'user.invited',
} as const;

// ─── EventsService ────────────────────────────────────────────────────────────

/**
 * EventsService — typed wrapper over EventEmitter2.
 *
 * - `emitTyped` provides compile-time payload type enforcement via EventPayloadMap.
 * - `emit` / `emitAsync` accept any generic DomainEvent envelope.
 * - correlationId is auto-injected from CorrelationContext when not explicitly provided.
 */
@Injectable()
export class EventsService {
  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Type-safe emit — payload type is inferred from the event name via EventPayloadMap.
   * correlationId is auto-injected from the current async context.
   */
  emitTyped<K extends DomainEventType>(
    type: K,
    envelope: Omit<DomainEvent<EventPayloadMap[K]>, 'type' | 'occurredAt'> & {
      occurredAt?: string;
    },
  ): void {
    const event: DomainEvent<EventPayloadMap[K]> = {
      ...envelope,
      type,
      occurredAt:    envelope.occurredAt ?? new Date().toISOString(),
      correlationId: envelope.correlationId ?? CorrelationContext.get() ?? undefined,
    };
    this.emitter.emit(type, event);
  }

  emit<T>(event: DomainEvent<T>): void {
    const enriched: DomainEvent<T> = {
      ...event,
      correlationId: event.correlationId ?? CorrelationContext.get() ?? undefined,
    };
    this.emitter.emit(enriched.type, enriched);
  }

  emitAsync<T>(event: DomainEvent<T>): Promise<unknown[]> {
    const enriched: DomainEvent<T> = {
      ...event,
      correlationId: event.correlationId ?? CorrelationContext.get() ?? undefined,
    };
    return this.emitter.emitAsync(enriched.type, enriched);
  }

  on<T>(eventType: string, handler: (event: DomainEvent<T>) => void): void {
    this.emitter.on(eventType, handler);
  }

  off<T>(eventType: string, handler: (event: DomainEvent<T>) => void): void {
    this.emitter.off(eventType, handler);
  }
}
