/**
 * queues/queue.constants.ts
 *
 * Nomes das filas BullMQ do Music OS 360.
 * Usar estas constantes em vez de strings literais elimina erros de digitação
 * e centraliza o registo de todas as filas da plataforma.
 */

export const QUEUE_NAMES = {
  EMAILS:             'emails',
  NOTIFICATIONS:      'notifications',
  AI_JOBS:            'ai-jobs',
  INTEGRATIONS_SYNC:  'integrations-sync',
  STREAMING_SYNC:     'streaming-sync',
  WEBHOOKS:           'webhooks',
  EXPORTS:            'exports',
  IMPORTS:            'imports',
  CLERK_SYNC:         'clerk-sync',
  BILLING:            'billing',
  UPLOADS_PROCESS:    'uploads-process',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Job names da fila EMAILS ─────────────────────────────────────────────────

export const EMAIL_JOB_NAMES = {
  WELCOME:            'welcome',
  PASSWORD_RESET:     'password-reset',
  CONTRACT_EXPIRY:    'contract-expiry',
  INVITE_USER:        'invite-user',
  PAYMENT_RECEIPT:    'payment-receipt',
  MONITORING_ALERT:   'monitoring-alert',
} as const;

export type EmailJobName = (typeof EMAIL_JOB_NAMES)[keyof typeof EMAIL_JOB_NAMES];

// ─── Job names da fila NOTIFICATIONS ─────────────────────────────────────────

export const NOTIFICATION_JOB_NAMES = {
  SEND:               'send',
  BROADCAST_TENANT:   'broadcast-tenant',
} as const;

export type NotificationJobName = (typeof NOTIFICATION_JOB_NAMES)[keyof typeof NOTIFICATION_JOB_NAMES];
