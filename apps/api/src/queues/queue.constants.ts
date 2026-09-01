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
  MARKETING_PUBLISHING: 'marketing-publishing',
  ARTIST_PLATFORM_SYNC: 'artist-platform-sync',
  ANALYTICS_REFRESH:   'analytics-refresh',
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

// ─── Job names das filas de workflow/integrações ──────────────────────────────

export const WORKFLOW_JOB_NAMES = {
  DISTRIBUTION_SYNC:    'distribution-sync',
  EXTERNAL_DATA_SYNC:   'external-data.sync',
  SOCIETY_SUBMIT:       'society.submit',
  SOCIETY_STATUS_CHECK: 'society.status-check',
  DISTRIBUTOR_SUBMIT:   'distributor.submit',
  DISTRIBUTOR_STATUS_CHECK: 'distributor.status-check',
  ONBOARDING_CHECK:     'onboarding-check',
  WORKFLOW_FOLLOWUP:    'workflow-followup',
} as const;

export type WorkflowJobName = (typeof WORKFLOW_JOB_NAMES)[keyof typeof WORKFLOW_JOB_NAMES];

export const MARKETING_PUBLISHING_JOB_NAMES = {
  PUBLISH_CONTENT: 'publish-content',
} as const;

export type MarketingPublishingJobName =
  (typeof MARKETING_PUBLISHING_JOB_NAMES)[keyof typeof MARKETING_PUBLISHING_JOB_NAMES];

export const ARTIST_PLATFORM_PROFILE_JOB_NAMES = {
  SYNC: 'artist-platform-profile-sync',
} as const;

export type ArtistPlatformProfileJobName =
  (typeof ARTIST_PLATFORM_PROFILE_JOB_NAMES)[keyof typeof ARTIST_PLATFORM_PROFILE_JOB_NAMES];

// Fase 3.2 — refresh em background da coorte externa do Market Benchmark
// (item 4: nenhuma chamada pesada à Soundcharts dentro do request HTTP).
export const ANALYTICS_REFRESH_JOB_NAMES = {
  MARKET_BENCHMARK_REFRESH: 'market-benchmark-refresh',
} as const;

export type AnalyticsRefreshJobName =
  (typeof ANALYTICS_REFRESH_JOB_NAMES)[keyof typeof ANALYTICS_REFRESH_JOB_NAMES];
