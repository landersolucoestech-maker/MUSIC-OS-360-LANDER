/**
 * queues/services/notifications-queue.service.ts
 *
 * Producer service para a fila "notifications".
 * Expõe métodos tipados para enfileirar notificações
 * que serão persistidas no banco e emitidas via WebSocket.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue }        from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUE_NAMES }        from '../queue.constants';
import type { NotificationPayload } from '../processors/notifications.processor';

// ─── Prioridades ──────────────────────────────────────────────────────────────

const HIGH_PRIORITY:   Partial<JobsOptions> = { priority: 1 };
const NORMAL_PRIORITY: Partial<JobsOptions> = { priority: 5 };

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsQueueService {
  private readonly logger = new Logger(NotificationsQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly queue: Queue,
  ) {}

  // ── Notificação genérica ──────────────────────────────────────────────────

  async enqueue(payload: NotificationPayload, opts?: Partial<JobsOptions>): Promise<void> {
    const job = await this.queue.add('notification', payload, {
      ...NORMAL_PRIORITY,
      ...opts,
    });
    this.logger.log(
      `[notifications] enqueued jobId=${job.id} userId=${payload.userId} type=${payload.type}`,
    );
  }

  // ── Notificação de alta prioridade (alertas críticos) ─────────────────────

  async enqueueUrgent(payload: NotificationPayload): Promise<void> {
    const job = await this.queue.add('notification', payload, HIGH_PRIORITY);
    this.logger.log(
      `[notifications] enqueued URGENT jobId=${job.id} userId=${payload.userId} type=${payload.type}`,
    );
  }

  // ── Contrato expirando ────────────────────────────────────────────────────

  async enqueueContractExpiring(
    tenantId: string,
    userId:   string,
    contractId: string,
    contractTitle: string,
    daysLeft: number,
  ): Promise<void> {
    await this.enqueue({
      tenantId,
      userId,
      title:    `Contrato vencendo em ${daysLeft} dias`,
      body:     contractTitle,
      type:     'contract:expiring',
      entity:   'contract',
      entityId: contractId,
      metadata: { daysLeft },
    });
  }

  // ── Pagamento falhado ─────────────────────────────────────────────────────

  async enqueuePaymentFailed(
    tenantId: string,
    userId:   string,
    plan: string,
  ): Promise<void> {
    await this.enqueueUrgent({
      tenantId,
      userId,
      title:    'Falha no pagamento da assinatura',
      body:     `Plano: ${plan}. Actualize o método de pagamento.`,
      type:     'billing:payment_failed',
      entity:   'billing',
      metadata: { plan },
    });
  }

  // ── AI job concluído ──────────────────────────────────────────────────────

  async enqueueAIJobCompleted(
    tenantId: string,
    userId:   string,
    skill:    string,
  ): Promise<void> {
    await this.enqueue({
      tenantId,
      userId,
      title:    'Tarefa de IA concluída',
      body:     `Habilidade: ${skill}`,
      type:     'ai:job_completed',
      entity:   'ai_job',
      metadata: { skill },
    });
  }

  // ── Stats da fila ─────────────────────────────────────────────────────────

  async getQueueStats(): Promise<{
    waiting:   number;
    active:    number;
    completed: number;
    failed:    number;
    delayed:   number;
  }> {
    const [waiting, active, completed, failed, delayed] = [
      await this.queue.getWaitingCount(),
      await this.queue.getActiveCount(),
      await this.queue.getCompletedCount(),
      await this.queue.getFailedCount(),
      await this.queue.getDelayedCount(),
    ];
    return { waiting, active, completed, failed, delayed };
  }
}
