/**
 * contract-workflow.handler.ts
 *
 * CONTRACT_SIGNED:
 *   1. Create 5 execution CRM tasks (jurídico, financeiro, operacional, release setup, futura integração)
 *   2. Emit CONTRACT_INTEGRATION_READY
 *   3. Enqueue integrations-sync job
 *
 * CONTRACT_EXPIRING_SOON:
 *   1. Create CRM task for renewal
 *   2. Enqueue workflow-followup job
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ContractEntity, CrmTaskEntity } from '../../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../../core/events/events.service';
import { WorkflowQueueService } from '../../../queues/services/workflow-queue.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ContractSignedPayload,
  ContractExpiringSoonPayload,
} from '../../../core/events/domain-events.types';

const SIGNED_TASKS: ReadonlyArray<{ title: string; description: string; priority: string; daysFromNow: number }> = [
  { title: 'Arquivamento jurídico',            description: 'Enviar contrato assinado ao departamento jurídico',         priority: 'high',   daysFromNow: 2  },
  { title: 'Lançamento financeiro',            description: 'Registrar contrato no sistema financeiro e emitir NF',       priority: 'high',   daysFromNow: 3  },
  { title: 'Briefing operacional',             description: 'Reunião com equipa para alinhar entregas do contrato',       priority: 'medium', daysFromNow: 5  },
  { title: 'Setup de lançamento / metadata',   description: 'Configurar releases e metadados do artista na plataforma',  priority: 'medium', daysFromNow: 7  },
  { title: 'Configuração de integração futura', description: 'Preparar credenciais e mapeamentos para distribuidoras',   priority: 'low',    daysFromNow: 14 },
];

@Injectable()
export class ContractWorkflowHandler {
  private readonly logger = new Logger(ContractWorkflowHandler.name);

  private readonly contractRepo: Repository<ContractEntity> | null = null;
  private readonly taskRepo:     Repository<CrmTaskEntity>  | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly events: EventsService,
    @Optional() private readonly workflowQueue: WorkflowQueueService,
  ) {
    if (ds) {
      this.contractRepo = ds.getRepository(ContractEntity);
      this.taskRepo     = ds.getRepository(CrmTaskEntity);
    }
  }

  // ── CONTRACT_SIGNED ───────────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_SIGNED)
  async onContractSigned(event: DomainEvent<ContractSignedPayload>): Promise<void> {
    const { contractId, titulo, artistId, signedBy, signedAt } = event.payload;

    // 1. Idempotency
    if (this.taskRepo) {
      try {
        const existing = await this.taskRepo.findOne({
          where: { tenant_id: event.tenantId, type: `contract.execution:${contractId}` },
        });
        if (existing) {
          this.logger.debug(`Execution tasks already created for contract "${contractId}" — skipping`);
          return;
        }
      } catch (err) {
        this.logger.warn(`Idempotency check failed for contract "${contractId}" — ${String(err)}`);
        return;
      }
    }

    const now = new Date();

    // 2. Create execution CRM tasks
    if (this.taskRepo) {
      try {
        const tasks = SIGNED_TASKS.map((t) => {
          const due = new Date(now);
          due.setDate(due.getDate() + t.daysFromNow);
          return this.taskRepo!.create({
            tenant_id:   event.tenantId,
            title:       t.title,
            description: t.description,
            status:      'pending',
            priority:    t.priority,
            type:        `contract.execution:${contractId}`,
            assigned_to: signedBy,
            due_date:    due,
            created_by:  signedBy,
          });
        });
        await this.taskRepo.save(tasks);
        this.logger.log(`Created ${tasks.length} execution tasks for contract "${contractId}" ("${titulo}")`);
      } catch (err) {
        this.logger.error(`Failed to create execution tasks for "${contractId}" — ${String(err)}`);
      }
    }

    // 3. Fetch contract valor for integration payload
    let valorStr: string | null = null;
    if (this.contractRepo) {
      try {
        const contract = await this.contractRepo.findOne({
          where: { id: contractId, tenant_id: event.tenantId },
        });
        valorStr = contract?.valor ? String(contract.valor) : null;
      } catch (_) { /* non-fatal */ }
    }

    // 4. Emit CONTRACT_INTEGRATION_READY
    if (this.events) {
      try {
        this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_INTEGRATION_READY, {
          tenantId:      event.tenantId,
          userId:        signedBy,
          aggregateType: 'contract',
          aggregateId:   contractId,
          payload: {
            contractId,
            tenantId:     event.tenantId,
            titulo,
            artistId:     artistId ?? null,
            valor:        valorStr,
            readyAt:      signedAt,
            integrations: ['distribution', 'financial', 'society-data-exchange'],
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to emit CONTRACT_INTEGRATION_READY for "${contractId}" — ${String(err)}`);
      }
    }

    // 5. Enqueue integration job
    if (this.workflowQueue) {
      try {
        await this.workflowQueue.enqueueWorkflowFollowup({
          tenantId:    event.tenantId,
          entityType:  'contract',
          entityId:    contractId,
          trigger:     'contract.signed',
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue workflow followup for "${contractId}" — ${String(err)}`);
      }
    }
  }

  // ── CONTRACT_EXPIRING_SOON ────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_EXPIRING_SOON)
  async onContractExpiringSoon(event: DomainEvent<ContractExpiringSoonPayload>): Promise<void> {
    const { contractId, titulo, daysLeft } = event.payload;

    if (!this.taskRepo) return;

    // Idempotency: one renewal task per contract per 30-day window
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const existing = await this.taskRepo
        .createQueryBuilder('t')
        .where('t.tenant_id = :tenantId AND t.type = :type AND t.created_at > :cutoff', {
          tenantId: event.tenantId,
          type:     `contract.renewal:${contractId}`,
          cutoff,
        })
        .getOne();
      if (existing) return;
    } catch (_) { return; }

    const due = new Date();
    due.setDate(due.getDate() + Math.max(daysLeft - 5, 1));

    try {
      const task = this.taskRepo.create({
        tenant_id:   event.tenantId,
        title:       `Renovação de contrato: "${titulo}"`,
        description: `O contrato vence em ${daysLeft} dias. Iniciar negociação de renovação ou encerramento.`,
        status:      'pending',
        priority:    daysLeft <= 7 ? 'high' : 'medium',
        type:        `contract.renewal:${contractId}`,
        assigned_to: null,
        due_date:    due,
        created_by:  'system',
      });
      await this.taskRepo.save(task);
      this.logger.log(`Created renewal task for contract "${contractId}" (${daysLeft} days remaining)`);
    } catch (err) {
      this.logger.warn(`Failed to create renewal task for "${contractId}" — ${String(err)}`);
    }

    if (this.workflowQueue) {
      try {
        await this.workflowQueue.enqueueWorkflowFollowup({
          tenantId:    event.tenantId,
          entityType:  'contract',
          entityId:    contractId,
          trigger:     'contract.expiring_soon',
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue workflow followup for expiring "${contractId}" — ${String(err)}`);
      }
    }
  }
}
