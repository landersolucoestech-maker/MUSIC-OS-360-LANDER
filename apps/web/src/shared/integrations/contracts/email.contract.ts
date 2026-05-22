/**
 * shared/integrations/contracts/email.contract.ts
 *
 * Contrato de e-mail transaccional — implementação alvo: Resend.
 *
 * ESTADO ACTUAL: hook useResend em modules/integrations/hooks/useResend.ts (mock).
 * MIGRAÇÃO FUTURA: IEmailProvider implementado via Resend SDK no backend.
 *
 * Casos de uso no MUSIC OS 360:
 *   - Convite de novos utilizadores ao tenant
 *   - Alertas de expiração de contrato
 *   - Relatórios periódicos de recebimentos externos de direitos/contabilidade
 *   - Notificações de aprovação/rejeição de lançamento
 *   - Confirmação de assinatura digital (Autentique)
 */

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type EmailTemplateId =
  | "user-invite"
  | "contract-expiry-alert"
  | "external-data-report"
  | "release-approved"
  | "release-rejected"
  | "signing-completed"
  | "signing-requested"
  | "password-reset"
  | "welcome";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | ArrayBuffer;
  content_type: string;
}

export interface SendEmailParams {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  /** HTML gerado ou template_id com variáveis */
  html?: string;
  text?: string;
  template_id?: EmailTemplateId;
  template_vars?: Record<string, string | number | boolean>;
  attachments?: EmailAttachment[];
  reply_to?: EmailRecipient;
  /** Tenant de origem — usado para from address personalizado */
  tenant_id?: string;
}

export interface SendEmailResult {
  message_id: string;
  status: "queued" | "sent" | "failed";
  sent_at: string;
}

export interface EmailDeliveryStatus {
  message_id: string;
  status: "delivered" | "bounced" | "complained" | "pending";
  events: Array<{ type: string; timestamp: string }>;
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

/**
 * IEmailProvider — contrato de envio de e-mail transaccional.
 *
 * Implementações previstas:
 *   - MockEmailProvider   (standalone — log em consola, toast de sucesso)
 *   - ResendEmailProvider (produção — Resend API via backend)
 */
export interface IEmailProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
  getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus>;
  /** Verifica se as credenciais configuradas são válidas */
  verifyConnection(): Promise<boolean>;
}

// ─── Template helpers ─────────────────────────────────────────────────────────

/** Variáveis esperadas por cada template */
export const EMAIL_TEMPLATE_VARS: Record<EmailTemplateId, string[]> = {
  "user-invite":          ["invitee_name", "inviter_name", "tenant_name", "invite_url"],
  "contract-expiry-alert":["artist_name", "contract_title", "expiry_date", "days_remaining"],
  "external-data-report":       ["period", "total_revenue", "report_url", "tenant_name"],
  "release-approved":     ["release_title", "artist_name", "release_date"],
  "release-rejected":     ["release_title", "artist_name", "rejection_reason"],
  "signing-completed":    ["document_title", "signer_name", "signed_at", "download_url"],
  "signing-requested":    ["document_title", "requester_name", "signing_url", "expires_at"],
  "password-reset":       ["user_name", "reset_url", "expires_at"],
  "welcome":              ["user_name", "tenant_name", "login_url"],
};
