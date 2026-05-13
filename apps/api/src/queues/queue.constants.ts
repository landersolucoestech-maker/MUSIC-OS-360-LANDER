/**
 * queues/queue.constants.ts
 *
 * Nomes das filas BullMQ do Music OS 360.
 * Usar estas constantes em vez de strings literais elimina erros de digitação
 * e centraliza o registo de todas as filas da plataforma.
 *
 * Filas futuras (prontas para adicionar):
 *   NOTIFICATIONS   — alertas push/email em tempo real
 *   AI_JOBS         — tarefas de IA (geração de conteúdo, classificação)
 *   UPLOADS         — processamento de áudio/imagem/vídeo
 *   METRICS         — ingestão de métricas de streaming e analytics
 *   WEBHOOKS        — reenvio de webhooks com retry
 *   DISTRIBUTION    — envio para distribuidoras (ONErpm, DistroKid…)
 *   ANALYTICS       — processamento de relatórios aggregados
 *   ACRCLOUD        — fingerprint e monitoramento musical
 *   AUTOMATIONS     — automações de regras e alertas
 */

export const QUEUE_NAMES = {
  EMAILS:        'emails',
  NOTIFICATIONS: 'notifications',
  AI_JOBS:       'ai-jobs',
  UPLOADS:       'uploads',
  METRICS:       'metrics',
  WEBHOOKS:      'webhooks',
  DISTRIBUTION:  'distribution',
  ANALYTICS:     'analytics',
  ACRCLOUD:      'acrcloud',
  AUTOMATIONS:   'automations',
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
