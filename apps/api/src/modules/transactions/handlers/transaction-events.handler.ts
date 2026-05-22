import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ContractEntity, CrmTaskEntity } from '../../../database/entities';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { TransactionPaidPayload } from '../../../core/events/domain-events.types';

@Injectable()
export class TransactionEventsHandler {
  private readonly logger = new Logger(TransactionEventsHandler.name);
  private readonly contractRepo: Repository<ContractEntity> | null = null;
  private readonly taskRepo:     Repository<CrmTaskEntity>  | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly activityLogs: ActivityLogsService,
  ) {
    if (ds) {
      this.contractRepo = ds.getRepository(ContractEntity);
      this.taskRepo     = ds.getRepository(CrmTaskEntity);
    }
  }

  @OnEvent(DOMAIN_EVENTS.TRANSACTION_PAID)
  async onTransactionPaid(event: DomainEvent<TransactionPaidPayload>): Promise<void> {
    const { transactionId, contratoId, valor, paidBy, paidAt } = event.payload;

    // Update linked contract metadata with last payment info
    if (this.contractRepo && contratoId) {
      try {
        const contract = await this.contractRepo
          .createQueryBuilder('c')
          .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', {
            id: contratoId, tenantId: event.tenantId,
          })
          .getOne();

        if (contract) {
          const updatedMetadata = {
            ...contract.metadata,
            ultimo_pagamento_em:    paidAt,
            ultimo_pagamento_valor: valor,
            ultimo_pagamento_por:   paidBy,
          };
          await this.contractRepo
            .createQueryBuilder()
            .update(ContractEntity)
            .set({ metadata: updatedMetadata, updated_at: new Date() } as any)
            .where('id = :id', { id: contratoId })
            .execute();
          this.logger.log(`Contract "${contratoId}" metadata updated after transaction "${transactionId}" paid`);
        }
      } catch (err) {
        this.logger.warn(`Failed to update contract metadata for paid transaction "${transactionId}" — ${String(err)}`);
      }
    }

    // Activity log
    if (this.activityLogs) {
      try {
        await this.activityLogs.create(event.tenantId, paidBy, {
          entity_type:  'transaction',
          entity_id:    transactionId,
          action:       'paid',
          description:  `Transacção R$${valor} baixada/paga`,
          metadata:     { valor, contratoId, paidAt, correlationId: event.correlationId ?? null },
        });
      } catch { /* non-critical */ }
    }

    // Reconciliation CRM task (one per transaction, idempotent)
    if (this.taskRepo) {
      try {
        const existing = await this.taskRepo.findOne({
          where: { tenant_id: event.tenantId, type: `transaction.reconciliation:${transactionId}` },
        });
        if (!existing) {
          const due = new Date();
          due.setDate(due.getDate() + 5);
          const task = this.taskRepo.create({
            tenant_id:   event.tenantId,
            title:       `Conciliação financeira — transacção R$${valor}`,
            description: `Confirmar baixa e conciliação bancária da transacção ${transactionId} (paga em ${paidAt})`,
            status:      'pending',
            priority:    'medium',
            type:        `transaction.reconciliation:${transactionId}`,
            assigned_to: paidBy,
            due_date:    due,
            created_by:  paidBy,
          });
          await this.taskRepo.save(task);
          this.logger.log(`Reconciliation task created for transaction "${transactionId}"`);
        }
      } catch (err) {
        this.logger.warn(`Failed to create reconciliation task for "${transactionId}" — ${String(err)}`);
      }
    }
  }
}
