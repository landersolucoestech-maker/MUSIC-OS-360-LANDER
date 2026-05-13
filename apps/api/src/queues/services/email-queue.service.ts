/**
 * queues/services/email-queue.service.ts
 *
 * Producer service para a fila "emails".
 * Encapsula o InjectQueue do BullMQ e expõe métodos tipados
 * para cada tipo de email da plataforma.
 *
 * Injectar EmailQueueService em qualquer módulo que precise
 * de enviar emails assíncronos — sem acoplamento directo ao BullMQ.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import {
  QUEUE_NAMES,
  EMAIL_JOB_NAMES,
} from '../queue.constants';
import type {
  WelcomeEmailPayload,
  PasswordResetEmailPayload,
  ContractExpiryEmailPayload,
  InviteUserEmailPayload,
  MonitoringAlertEmailPayload,
} from '../processors/email.processor';

// ─── Opções padrão por prioridade ─────────────────────────────────────────────

const HIGH_PRIORITY: Partial<JobsOptions> = { priority: 1 };
const NORMAL_PRIORITY: Partial<JobsOptions> = { priority: 5 };

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAILS)
    private readonly emailQueue: Queue,
  ) {}

  // ── Welcome email (enviado após registo do utilizador) ────────────────────

  async enqueueWelcomeEmail(payload: WelcomeEmailPayload): Promise<void> {
    const job = await this.emailQueue.add(
      EMAIL_JOB_NAMES.WELCOME,
      payload,
      {
        ...HIGH_PRIORITY,
        jobId: `welcome:${payload.userId}`,
      },
    );
    this.logger.log(
      `[emails] enqueued "${EMAIL_JOB_NAMES.WELCOME}" jobId=${job.id} para=${payload.email}`,
    );
  }

  // ── Password reset ────────────────────────────────────────────────────────

  async enqueuePasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    const job = await this.emailQueue.add(
      EMAIL_JOB_NAMES.PASSWORD_RESET,
      payload,
      HIGH_PRIORITY,
    );
    this.logger.log(
      `[emails] enqueued "${EMAIL_JOB_NAMES.PASSWORD_RESET}" jobId=${job.id} para=${payload.email}`,
    );
  }

  // ── Alerta de expiração de contrato ───────────────────────────────────────

  async enqueueContractExpiryEmail(
    payload: ContractExpiryEmailPayload,
  ): Promise<void> {
    const job = await this.emailQueue.add(
      EMAIL_JOB_NAMES.CONTRACT_EXPIRY,
      payload,
      {
        ...NORMAL_PRIORITY,
        jobId: `contract-expiry:${payload.contractId}`,
      },
    );
    this.logger.log(
      `[emails] enqueued "${EMAIL_JOB_NAMES.CONTRACT_EXPIRY}" jobId=${job.id} contrato=${payload.contractId}`,
    );
  }

  // ── Convite de utilizador ─────────────────────────────────────────────────

  async enqueueInviteUserEmail(
    payload: InviteUserEmailPayload,
  ): Promise<void> {
    const job = await this.emailQueue.add(
      EMAIL_JOB_NAMES.INVITE_USER,
      payload,
      HIGH_PRIORITY,
    );
    this.logger.log(
      `[emails] enqueued "${EMAIL_JOB_NAMES.INVITE_USER}" jobId=${job.id} para=${payload.email}`,
    );
  }

  // ── Alerta de monitoramento musical ──────────────────────────────────────

  async enqueueMonitoringAlertEmail(
    payload: MonitoringAlertEmailPayload,
  ): Promise<void> {
    const job = await this.emailQueue.add(
      EMAIL_JOB_NAMES.MONITORING_ALERT,
      payload,
      NORMAL_PRIORITY,
    );
    this.logger.log(
      `[emails] enqueued "${EMAIL_JOB_NAMES.MONITORING_ALERT}" jobId=${job.id} tipo=${payload.alertType}`,
    );
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  async getQueueStats(): Promise<{
    waiting:   number;
    active:    number;
    completed: number;
    failed:    number;
    delayed:   number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }
}
