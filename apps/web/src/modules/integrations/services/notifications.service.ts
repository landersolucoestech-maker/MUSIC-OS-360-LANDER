/**
 * integrations/services/notifications.service.ts
 *
 * Serviço de notificações transaccionais.
 * Orquestra: emailAdapter + analyticsAdapter + domain events.
 *
 * Casos de uso no MUSIC OS 360:
 *  - Convite de utilizador ao tenant
 *  - Alerta de contrato a expirar
 *  - Relatório mensal de accounting
 *  - Aprovação / rejeição de lançamento
 *
 * Uso:
 *   import { notificationsService } from "@/modules/integrations/services";
 *   await notificationsService.sendUserInvite({ ...  });
 */

import { emailAdapter }     from "@/modules/integrations/adapters/email.adapter";
import { analyticsAdapter } from "@/modules/integrations/adapters/analytics.adapter";
import { emit }             from "@/shared/domain-events";

/* ──────────────────────────────────────── */
/* Tipos de input                           */
/* ──────────────────────────────────────── */

export interface SendUserInviteInput {
  tenantId:    string;
  tenantName:  string;
  invitedBy:   string;
  to: { name: string; email: string };
  role:        string;
  inviteUrl:   string;
}

export interface SendContratoExpiryAlertInput {
  contratoId:    string;
  contratoTitle: string;
  daysRemaining: number;
  to: { name: string; email: string };
}

export interface SendLancamentoStatusInput {
  lancamentoId:    string;
  lancamentoTitle: string;
  status:          "approved" | "rejected";
  reason?:         string;
  to: { name: string; email: string };
}

/* ──────────────────────────────────────── */
/* Service                                  */
/* ──────────────────────────────────────── */

export const notificationsService = {
  async sendUserInvite(input: SendUserInviteInput): Promise<void> {
    const { tenantId, tenantName, invitedBy, to, role, inviteUrl } = input;

    await emailAdapter.send({
      to,
      subject:      `Você foi convidado para ${tenantName} no MUSIC OS 360`,
      template_id:  "user-invite",
      template_vars: { tenant_name: tenantName, invited_by: invitedBy, role, invite_url: inviteUrl },
    });

    analyticsAdapter.track("user.invite_sent", {
      tenant_id: tenantId,
      role,
      email:     to.email,
    });

    emit("user.invited", { tenantId, email: to.email, role });
  },

  async sendContratoExpiryAlert(input: SendContratoExpiryAlertInput): Promise<void> {
    const { contratoId, contratoTitle, daysRemaining, to } = input;

    await emailAdapter.send({
      to,
      subject:      `Contrato a expirar em ${daysRemaining} dias: ${contratoTitle}`,
      template_id:  "contrato-expiry-alert",
      template_vars: { contrato_title: contratoTitle, days_remaining: daysRemaining },
    });

    analyticsAdapter.track("contrato.expiry_alert_sent", {
      contrato_id:    contratoId,
      days_remaining: daysRemaining,
    });
  },

  async sendLancamentoStatus(input: SendLancamentoStatusInput): Promise<void> {
    const { lancamentoId, lancamentoTitle, status, reason, to } = input;

    await emailAdapter.send({
      to,
      subject:      `Lançamento ${status === "approved" ? "aprovado" : "rejeitado"}: ${lancamentoTitle}`,
      template_id:  `lancamento-${status}`,
      template_vars: { lancamento_title: lancamentoTitle, reason: reason ?? "" },
    });

    analyticsAdapter.track(`lancamento.${status}`, { lancamento_id: lancamentoId });

    emit(status === "approved" ? "lancamento.approved" : "lancamento.rejected", {
      lancamentoId,
      reason,
    });
  },
};
