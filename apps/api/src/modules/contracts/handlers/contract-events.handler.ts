/**
 * contract-events.handler.ts
 *
 * Module-local @OnEvent handlers for contract domain events.
 * Handles: contract.signed, contract.expired
 *
 * Cross-cutting concerns (WS notification, event log persistence) are handled
 * centrally by NotificationHandler in core/events/.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ContractSignedPayload,
  ContractExpiredPayload,
} from '../../../core/events/domain-events.types';

@Injectable()
export class ContractEventsHandler {
  private readonly logger = new Logger(ContractEventsHandler.name);

  @OnEvent(DOMAIN_EVENTS.CONTRACT_SIGNED)
  onContractSigned(event: DomainEvent<ContractSignedPayload>): void {
    const { contractId, titulo, signedBy, signedAt } = event.payload;
    this.logger.log(
      `[${DOMAIN_EVENTS.CONTRACT_SIGNED}] contractId=${contractId} titulo="${titulo}" by=${signedBy} at=${signedAt} tenant=${event.tenantId}`,
    );
  }

  @OnEvent(DOMAIN_EVENTS.CONTRACT_EXPIRED)
  onContractExpired(event: DomainEvent<ContractExpiredPayload>): void {
    const { contractId, titulo, expiredAt } = event.payload;
    this.logger.warn(
      `[${DOMAIN_EVENTS.CONTRACT_EXPIRED}] contractId=${contractId} titulo="${titulo}" expiredAt=${expiredAt} tenant=${event.tenantId}`,
    );
  }
}
