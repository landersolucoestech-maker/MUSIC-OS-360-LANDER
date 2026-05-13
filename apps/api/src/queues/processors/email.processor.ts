/**
 * queues/processors/email.processor.ts
 *
 * Processor BullMQ para a fila "emails".
 * Cada job é processado com logs estruturados e tipagem estrita.
 *
 * Em produção, substituir os Logger.log() pelas chamadas reais ao
 * Resend (ou outro provider de email) via EmailService injectado.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, EMAIL_JOB_NAMES } from '../queue.constants';

// ─── Payloads tipados por job ─────────────────────────────────────────────────

export interface WelcomeEmailPayload {
  tenantId: string;
  userId:   string;
  email:    string;
  name:     string;
}

export interface PasswordResetEmailPayload {
  email:     string;
  resetLink: string;
}

export interface ContractExpiryEmailPayload {
  tenantId:     string;
  contractId:   string;
  artistName:   string;
  expiresAt:    string;
  recipientEmail: string;
}

export interface InviteUserEmailPayload {
  tenantId:    string;
  inviterName: string;
  email:       string;
  inviteLink:  string;
}

export interface MonitoringAlertEmailPayload {
  tenantId:       string;
  recipientEmail: string;
  alertType:      string;
  trackTitle:     string;
  platform:       string;
  detectedAt:     string;
}

export type EmailJobPayload =
  | WelcomeEmailPayload
  | PasswordResetEmailPayload
  | ContractExpiryEmailPayload
  | InviteUserEmailPayload
  | MonitoringAlertEmailPayload;

// ─── Processor ────────────────────────────────────────────────────────────────

@Processor(QUEUE_NAMES.EMAILS)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobPayload>): Promise<void> {
    this.logger.log(
      `[emails] processando job="${job.name}" id=${job.id} attempt=${job.attemptsMade + 1}`,
    );

    switch (job.name) {
      case EMAIL_JOB_NAMES.WELCOME:
        await this.handleWelcome(job as Job<WelcomeEmailPayload>);
        break;

      case EMAIL_JOB_NAMES.PASSWORD_RESET:
        await this.handlePasswordReset(job as Job<PasswordResetEmailPayload>);
        break;

      case EMAIL_JOB_NAMES.CONTRACT_EXPIRY:
        await this.handleContractExpiry(job as Job<ContractExpiryEmailPayload>);
        break;

      case EMAIL_JOB_NAMES.INVITE_USER:
        await this.handleInviteUser(job as Job<InviteUserEmailPayload>);
        break;

      case EMAIL_JOB_NAMES.MONITORING_ALERT:
        await this.handleMonitoringAlert(job as Job<MonitoringAlertEmailPayload>);
        break;

      default:
        this.logger.warn(`[emails] job desconhecido: "${job.name}" — ignorado`);
    }

    this.logger.log(`[emails] job="${job.name}" id=${job.id} concluído`);
  }

  // ── Handlers individuais ────────────────────────────────────────────────────

  private async handleWelcome(job: Job<WelcomeEmailPayload>): Promise<void> {
    const { email, name, tenantId, userId } = job.data;
    this.logger.log(
      `[emails/welcome] → para=${email} nome="${name}" tenant=${tenantId} user=${userId}`,
    );
    // TODO (produção): await this.emailService.sendWelcome({ email, name });
  }

  private async handlePasswordReset(
    job: Job<PasswordResetEmailPayload>,
  ): Promise<void> {
    const { email, resetLink } = job.data;
    this.logger.log(
      `[emails/password-reset] → para=${email} link=${resetLink}`,
    );
    // TODO (produção): await this.emailService.sendPasswordReset({ email, resetLink });
  }

  private async handleContractExpiry(
    job: Job<ContractExpiryEmailPayload>,
  ): Promise<void> {
    const { contractId, artistName, expiresAt, recipientEmail } = job.data;
    this.logger.log(
      `[emails/contract-expiry] → para=${recipientEmail} artista="${artistName}" contrato=${contractId} expira=${expiresAt}`,
    );
    // TODO (produção): await this.emailService.sendContractExpiry({ ... });
  }

  private async handleInviteUser(
    job: Job<InviteUserEmailPayload>,
  ): Promise<void> {
    const { email, inviterName, inviteLink } = job.data;
    this.logger.log(
      `[emails/invite-user] → para=${email} convidado por="${inviterName}" link=${inviteLink}`,
    );
    // TODO (produção): await this.emailService.sendInvite({ ... });
  }

  private async handleMonitoringAlert(
    job: Job<MonitoringAlertEmailPayload>,
  ): Promise<void> {
    const { recipientEmail, alertType, trackTitle, platform, detectedAt } =
      job.data;
    this.logger.log(
      `[emails/monitoring-alert] → para=${recipientEmail} tipo=${alertType} faixa="${trackTitle}" plataforma=${platform} detectado=${detectedAt}`,
    );
    // TODO (produção): await this.emailService.sendMonitoringAlert({ ... });
  }
}
