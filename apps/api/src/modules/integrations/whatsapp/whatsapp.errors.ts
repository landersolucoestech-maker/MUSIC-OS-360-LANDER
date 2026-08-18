export type WhatsAppErrorCode =
  | 'WHATSAPP_NOT_CONFIGURED'
  | 'WHATSAPP_AUTH_ERROR'
  | 'WHATSAPP_INVALID_RECIPIENT'
  | 'WHATSAPP_RATE_LIMITED'
  | 'WHATSAPP_UPSTREAM_ERROR'
  | 'WHATSAPP_WEBHOOK_INVALID';

export class WhatsAppError extends Error {
  readonly code: WhatsAppErrorCode;

  constructor(code: WhatsAppErrorCode, message: string) {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code;
  }
}
