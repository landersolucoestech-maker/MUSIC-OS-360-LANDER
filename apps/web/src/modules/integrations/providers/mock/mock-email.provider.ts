/**
 * integrations/providers/mock/mock-email.provider.ts
 *
 * Implementação mock de IEmailProvider.
 * Em modo standalone: loga em consola e retorna resultado simulado.
 *
 * MIGRAÇÃO FUTURA: substituir por ResendEmailProvider (backend proxy).
 */

import type {
  IEmailProvider,
  SendEmailParams,
  SendEmailResult,
  EmailDeliveryStatus,
} from "@/modules/integrations/dto";

export class MockEmailProvider implements IEmailProvider {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const messageId = `mock_msg_${Date.now()}`;
    const to = Array.isArray(params.to)
      ? params.to.map((r) => r.email).join(", ")
      : params.to.email;

    console.info(
      `[MockEmailProvider] send → to: ${to} | subject: "${params.subject}" | template: ${params.template_id ?? "inline"}`
    );

    return {
      message_id: messageId,
      status:     "sent",
      sent_at:    new Date().toISOString(),
    };
  }

  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus> {
    return {
      message_id: messageId,
      status:     "delivered",
      events: [
        { type: "queued",    timestamp: new Date(Date.now() - 5000).toISOString() },
        { type: "delivered", timestamp: new Date().toISOString() },
      ],
    };
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}

export const mockEmailProvider = new MockEmailProvider();
