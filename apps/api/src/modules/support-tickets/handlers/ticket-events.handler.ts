/**
 * ticket-events.handler.ts
 *
 * Concrete automations triggered by support-ticket domain events.
 *
 * TicketResolved →
 *   1. Record resolved_at timestamp on the SupportTicketEntity.
 *   2. Compute SLA compliance and store in metadata.
 *   3. Persist in-app notification for the ticket creator.
 *   4. Enqueue satisfaction email to ticket requester.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { SupportTicketEntity, NotificationEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { TicketResolvedPayload } from '../../../core/events/domain-events.types';

@Injectable()
export class TicketEventsHandler {
  private readonly logger = new Logger(TicketEventsHandler.name);
  private readonly ticketRepo: Repository<SupportTicketEntity> | null = null;
  private readonly notifRepo: Repository<NotificationEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
  ) {
    if (ds) {
      this.ticketRepo = ds.getRepository(SupportTicketEntity);
      this.notifRepo  = ds.getRepository(NotificationEntity);
    }
  }

  @OnEvent(DOMAIN_EVENTS.TICKET_RESOLVED)
  async onTicketResolved(event: DomainEvent<TicketResolvedPayload>): Promise<void> {
    const { ticketId, tenantId, titulo, resolvedBy, resolvedAt } = event.payload;

    let slaCompliant: boolean | null = null;
    let createdBy: string | null = null;

    // 1. Update ticket: set resolved_at + SLA metadata
    if (this.ticketRepo) {
      try {
        const ticket = await this.ticketRepo.findOne({
          where: { id: ticketId, tenant_id: tenantId },
          select: ['id', 'sla_deadline', 'created_by', 'metadata'],
        });

        if (ticket) {
          createdBy = ticket.created_by;

          // Compute SLA compliance
          if (ticket.sla_deadline) {
            const resolvedDate   = new Date(resolvedAt);
            const slaDeadline    = new Date(ticket.sla_deadline);
            slaCompliant         = resolvedDate <= slaDeadline;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (this.ticketRepo as any).update(
            { id: ticketId, tenant_id: tenantId },
            {
              resolved_at: new Date(resolvedAt),
              status:      'resolved',
              metadata:    {
                ...ticket.metadata,
                resolvedBy,
                slaCompliant: slaCompliant ?? null,
                correlationId: event.correlationId ?? null,
              },
            },
          );
          this.logger.log(
            `TicketEventsHandler: ticket "${ticketId}" resolved by "${resolvedBy}" slaCompliant=${slaCompliant ?? 'N/A'}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `TicketEventsHandler: failed to update ticket "${ticketId}" resolved_at — ${String(err)}`,
        );
      }
    }

    // 2. Persist in-app notification for the ticket creator
    const notifyUserId = event.userId ?? createdBy;
    if (this.notifRepo && notifyUserId) {
      try {
        const slaText = slaCompliant === null
          ? ''
          : slaCompliant
            ? ' (dentro do SLA)'
            : ' (fora do SLA)';

        await this.notifRepo.save(
          this.notifRepo.create({
            id:        randomUUID(),
            tenant_id: tenantId,
            user_id:   notifyUserId,
            title:     `Ticket resolvido: "${titulo}"${slaText}`,
            body:      `Ticket resolvido por ${resolvedBy} em ${resolvedAt}.`,
            type:      DOMAIN_EVENTS.TICKET_RESOLVED,
            entity:    'support_ticket',
            entity_id: ticketId,
            read_at:   null,
            metadata: {
              resolvedBy,
              resolvedAt,
              slaCompliant: slaCompliant ?? null,
              correlationId: event.correlationId ?? null,
            },
          }),
        );
      } catch (err) {
        this.logger.error(
          `TicketEventsHandler: failed to persist resolved notification for ticket "${ticketId}" — ${String(err)}`,
        );
      }
    }

    // 3. Enqueue satisfaction survey email (fire-and-forget)
    if (this.queue) {
      try {
        await this.queue.addMail({
          template:      'ticket-resolved-satisfaction',
          ticketId,
          titulo,
          resolvedBy,
          resolvedAt,
          slaCompliant:  slaCompliant ?? null,
          tenantId,
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(
          `TicketEventsHandler: failed to enqueue satisfaction email for ticket "${ticketId}" — ${String(err)}`,
        );
      }
    }
  }
}
