/**
 * universal-event-log.handler.ts
 *
 * Single @OnEvent('**') wildcard listener that persists EVERY emitted domain
 * event to `domain_event_log`, regardless of which module emits it.
 *
 * This is the ONLY place where event log persistence happens.
 * NotificationHandler does NOT persist to the event log — it handles
 * only real-time WS notifications and in-app NotificationEntity records.
 *
 * Wildcard '**' requires EventEmitterModule.forRoot({ wildcard: true }).
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventLogService } from './domain-event-log.service';
import type { DomainEvent } from './events.service';

@Injectable()
export class UniversalEventLogHandler {
  private readonly logger = new Logger(UniversalEventLogHandler.name);

  constructor(private readonly eventLog: DomainEventLogService) {}

  @OnEvent('**')
  async onAnyEvent(event: DomainEvent<unknown>): Promise<void> {
    if (!event?.type) return;
    try {
      await this.eventLog.persist(event, { processedAt: new Date() });
    } catch (err) {
      this.logger.error(
        `UniversalEventLogHandler: failed to log event "${event?.type}" — ${String(err)}`,
      );
    }
  }
}
