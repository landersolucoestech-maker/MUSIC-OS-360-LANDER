import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { CrmTaskEntity } from '../../../database/entities';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  InvoiceCreatedPayload,
  InvoiceStatusChangedPayload,
  InvoiceIssuedPayload,
  InvoiceOverduePayload,
} from '../../../core/events/domain-events.types';

@Injectable()
export class InvoiceEventsHandler {
  private readonly logger = new Logger(InvoiceEventsHandler.name);
  private readonly taskRepo: Repository<CrmTaskEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly activityLogs: ActivityLogsService,
  ) {
    if (ds) this.taskRepo = ds.getRepository(CrmTaskEntity);
  }

  @OnEvent(DOMAIN_EVENTS.INVOICE_CREATED)
  async onInvoiceCreated(event: DomainEvent<InvoiceCreatedPayload>): Promise<void> {
    const { invoiceId, numero, valor, createdBy } = event.payload;
    this.logger.log(`Invoice created: ${numero ?? invoiceId} R$${valor}`);

    if (this.activityLogs && createdBy) {
      try {
        await this.activityLogs.create(event.tenantId, createdBy, {
          entity_type:  'invoice',
          entity_id:    invoiceId,
          action:       'created',
          description:  `Nota fiscal${numero ? ` nº ${numero}` : ''} criada`,
          metadata:     { valor, numero, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for invoice created "${invoiceId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.INVOICE_STATUS_CHANGED)
  async onInvoiceStatusChanged(event: DomainEvent<InvoiceStatusChangedPayload>): Promise<void> {
    const { invoiceId, numero, previousStatus, newStatus, changedBy } = event.payload;
    this.logger.log(`Invoice status: ${numero ?? invoiceId} ${previousStatus} → ${newStatus}`);

    if (this.activityLogs && changedBy) {
      try {
        await this.activityLogs.create(event.tenantId, changedBy, {
          entity_type:  'invoice',
          entity_id:    invoiceId,
          action:       'status_changed',
          description:  `Nota fiscal${numero ? ` nº ${numero}` : ''}: ${previousStatus} → ${newStatus}`,
          metadata:     { previousStatus, newStatus, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for invoice status change "${invoiceId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.INVOICE_ISSUED)
  async onInvoiceIssued(event: DomainEvent<InvoiceIssuedPayload>): Promise<void> {
    const { invoiceId, numero, valor, issuedBy, issuedAt } = event.payload;
    this.logger.log(`Invoice issued: ${numero ?? invoiceId} R$${valor} by ${issuedBy}`);

    if (this.activityLogs && issuedBy) {
      try {
        await this.activityLogs.create(event.tenantId, issuedBy, {
          entity_type:  'invoice',
          entity_id:    invoiceId,
          action:       'issued',
          description:  `Nota fiscal${numero ? ` nº ${numero}` : ''} emitida — R$${valor}`,
          metadata:     { valor, numero, issuedAt, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for invoice issued "${invoiceId}" — ${String(err)}`);
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.INVOICE_OVERDUE)
  async onInvoiceOverdue(event: DomainEvent<InvoiceOverduePayload>): Promise<void> {
    const { invoiceId, numero, valor, dataVencimento } = event.payload;
    this.logger.warn(`Invoice overdue: ${numero ?? invoiceId} R$${valor} (venceu ${dataVencimento})`);

    if (this.activityLogs) {
      try {
        await this.activityLogs.create(event.tenantId, 'system', {
          entity_type:  'invoice',
          entity_id:    invoiceId,
          action:       'overdue',
          description:  `Nota fiscal${numero ? ` nº ${numero}` : ''} vencida — R$${valor} (venceu ${dataVencimento})`,
          metadata:     { valor, numero, dataVencimento },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for invoice overdue "${invoiceId}" — ${String(err)}`);
      }
    }

    // Create financial follow-up CRM task (idempotent via type key)
    if (this.taskRepo) {
      try {
        const existing = await this.taskRepo.findOne({
          where: { tenant_id: event.tenantId, type: `invoice.overdue:${invoiceId}` },
        });
        if (!existing) {
          const due = new Date();
          due.setDate(due.getDate() + 3);
          const task = this.taskRepo.create({
            tenant_id:   event.tenantId,
            title:       `Follow-up cobrança: nota fiscal${numero ? ` nº ${numero}` : ''} vencida`,
            description: `Nota fiscal vencida em ${dataVencimento} — R$${valor}. Contatar cliente e regularizar.`,
            status:      'pending',
            priority:    'high',
            type:        `invoice.overdue:${invoiceId}`,
            assigned_to: null,
            due_date:    due,
            created_by:  'system',
          });
          await this.taskRepo.save(task);
          this.logger.log(`Financial follow-up task created for overdue invoice "${invoiceId}"`);
        }
      } catch (err) {
        this.logger.warn(`Failed to create follow-up task for invoice "${invoiceId}" — ${String(err)}`);
      }
    }
  }
}
