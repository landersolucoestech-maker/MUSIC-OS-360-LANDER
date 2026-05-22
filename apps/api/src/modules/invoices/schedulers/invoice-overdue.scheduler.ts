import { Injectable, Logger, OnApplicationBootstrap, Inject, Optional } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { InvoiceEntity } from '../../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../../core/events/events.service';

const DAY_MS    = 24 * 60 * 60 * 1000;
const DEDUP_HRS = 23; // skip re-notification within 23h (allows daily run with drift)

const ACTIVE_STATUSES = ['pendente', 'emitida', 'pending', 'issued'];

@Injectable()
export class InvoiceOverdueScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(InvoiceOverdueScheduler.name);
  private readonly repo: Repository<InvoiceEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly events: EventsService,
  ) {
    if (ds) this.repo = ds.getRepository(InvoiceEntity);
  }

  onApplicationBootstrap(): void {
    if (!this.repo || !this.events) return;

    this.runCheck().catch((err: unknown) =>
      this.logger.warn(`InvoiceOverdueScheduler initial run failed: ${String(err)}`),
    );

    setInterval(() => {
      this.runCheck().catch((err: unknown) =>
        this.logger.warn(`InvoiceOverdueScheduler daily run failed: ${String(err)}`),
      );
    }, DAY_MS);
  }

  async runCheck(): Promise<void> {
    if (!this.repo || !this.events) return;

    const now = new Date();
    const dedupCutoff = new Date(now.getTime() - DEDUP_HRS * 60 * 60 * 1000);

    const overdueInvoices = await this.repo
      .createQueryBuilder('i')
      .where('i.data_vencimento IS NOT NULL')
      .andWhere('i.data_vencimento < :now', { now })
      .andWhere('i.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('i.deleted_at IS NULL')
      .getMany();

    for (const invoice of overdueInvoices) {
      const lastNotified = invoice.metadata?.['last_overdue_notified_at'] as string | undefined;
      if (lastNotified && new Date(lastNotified) > dedupCutoff) continue;

      try {
        // Mark status as overdue in DB
        await this.repo
          .createQueryBuilder()
          .update(InvoiceEntity)
          .set({
            status:     'vencida',
            metadata:   { ...invoice.metadata, last_overdue_notified_at: now.toISOString() },
            updated_at: now,
          } as any)
          .where('id = :id', { id: invoice.id })
          .execute();

        this.events.emitTyped(DOMAIN_EVENTS.INVOICE_OVERDUE, {
          tenantId:      invoice.tenant_id,
          userId:        'system',
          aggregateType: 'invoice',
          aggregateId:   invoice.id,
          payload: {
            invoiceId:      invoice.id,
            tenantId:       invoice.tenant_id,
            numero:         invoice.numero ?? null,
            valor:          String(invoice.valor),
            dataVencimento: invoice.data_vencimento!.toISOString(),
          },
        });

        this.logger.warn(`InvoiceOverdueScheduler: marked invoice "${invoice.id}" (${invoice.numero ?? 'no-number'}) as vencida`);
      } catch (err) {
        this.logger.warn(`InvoiceOverdueScheduler: failed for "${invoice.id}" — ${String(err)}`);
      }
    }
  }
}
