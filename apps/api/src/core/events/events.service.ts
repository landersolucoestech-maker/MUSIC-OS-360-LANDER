import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DomainEvent<T = unknown> {
  type: string;
  tenantId: string;
  userId?: string;
  payload: T;
  occurredAt: string;
}

/**
 * EventsService — wrapper tipado sobre EventEmitter2.
 * Usado para comunicação assíncrona entre módulos (CQRS lite).
 */
@Injectable()
export class EventsService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<T>(event: DomainEvent<T>): void {
    this.emitter.emit(event.type, event);
  }

  emitAsync<T>(event: DomainEvent<T>): Promise<unknown[]> {
    return this.emitter.emitAsync(event.type, event);
  }

  on<T>(eventType: string, handler: (event: DomainEvent<T>) => void): void {
    this.emitter.on(eventType, handler);
  }

  off<T>(eventType: string, handler: (event: DomainEvent<T>) => void): void {
    this.emitter.off(eventType, handler);
  }
}

/** Nomes de eventos de domínio padronizados */
export const DOMAIN_EVENTS = {
  ARTIST_CREATED: 'artist.created',
  ARTIST_UPDATED: 'artist.updated',
  CONTRACT_SIGNED: 'contract.signed',
  CONTRACT_EXPIRED: 'contract.expired',
  TRANSACTION_CREATED: 'transaction.created',
  RELEASE_PUBLISHED: 'release.published',
  TAKEDOWN_REQUESTED: 'takedown.requested',
  TENANT_CREATED: 'tenant.created',
  USER_INVITED: 'user.invited',
} as const;
