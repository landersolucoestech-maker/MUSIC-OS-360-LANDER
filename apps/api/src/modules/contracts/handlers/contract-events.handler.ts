/**
 * contract-events.handler.ts
 *
 * Concrete automations triggered by contract domain events.
 *
 * ContractSigned →
 *   1. Update ArtistEntity.status to 'contratado' (when artistId linked).
 *   2. Enqueue signed-contract email to signatários.
 *
 * ContractExpired →
 *   1. Enqueue alert email to responsável.
 *   2. Enqueue expiry report for admin.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ArtistEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ContractSignedPayload,
  ContractExpiredPayload,
} from '../../../core/events/domain-events.types';

@Injectable()
export class ContractEventsHandler {
  private readonly logger = new Logger(ContractEventsHandler.name);
  private readonly artistRepo: Repository<ArtistEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
  ) {
    if (ds) this.artistRepo = ds.getRepository(ArtistEntity);
  }

  @OnEvent(DOMAIN_EVENTS.CONTRACT_SIGNED)
  async onContractSigned(event: DomainEvent<ContractSignedPayload>): Promise<void> {
    const { contractId, titulo, artistId, signedBy, signedAt } = event.payload;

    // 1. Update linked artist status to 'contratado'
    if (this.artistRepo && artistId) {
      try {
        await this.artistRepo.update(
          { id: artistId, tenant_id: event.tenantId },
          { status: 'contratado' as any },
        );
        this.logger.log(
          `ContractEventsHandler: artist "${artistId}" status → contratado (contract="${contractId}")`,
        );
      } catch (err) {
        this.logger.error(
          `ContractEventsHandler: failed to update artist status for "${artistId}" — ${String(err)}`,
        );
      }
    }

    // 2. Enqueue signed-contract confirmation email
    if (this.queue) {
      try {
        await this.queue.addMail({
          template:      'contract-signed',
          contractId,
          titulo,
          signedBy,
          signedAt,
          artistId:      artistId ?? null,
          tenantId:      event.tenantId,
          correlationId: event.correlationId ?? null,
        });
        this.logger.log(
          `ContractEventsHandler: confirmation email enqueued for signed contract "${contractId}"`,
        );
      } catch (err) {
        this.logger.warn(
          `ContractEventsHandler: failed to enqueue mail for contract "${contractId}" — ${String(err)}`,
        );
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.CONTRACT_EXPIRED)
  async onContractExpired(event: DomainEvent<ContractExpiredPayload>): Promise<void> {
    const { contractId, titulo, artistId, expiredAt } = event.payload;

    // 1. Enqueue expiry alert email
    if (this.queue) {
      try {
        await this.queue.addMail({
          template:      'contract-expired-alert',
          contractId,
          titulo,
          artistId:      artistId ?? null,
          expiredAt,
          tenantId:      event.tenantId,
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(
          `ContractEventsHandler: failed to enqueue expiry alert for contract "${contractId}" — ${String(err)}`,
        );
      }
    }

    // 2. Enqueue expiry admin report
    if (this.queue) {
      try {
        await this.queue.addReport('contract-expiry', {
          contractId,
          titulo,
          artistId:      artistId ?? null,
          expiredAt,
          tenantId:      event.tenantId,
          correlationId: event.correlationId ?? null,
        });
        this.logger.warn(
          `ContractEventsHandler: expiry report enqueued for contract "${contractId}" ("${titulo}") expiredAt=${expiredAt}`,
        );
      } catch (err) {
        this.logger.warn(
          `ContractEventsHandler: failed to enqueue expiry report for "${contractId}" — ${String(err)}`,
        );
      }
    }
  }
}
