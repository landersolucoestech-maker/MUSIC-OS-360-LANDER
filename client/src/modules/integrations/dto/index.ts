/**
 * integrations/dto/index.ts
 *
 * Barrel que re-exporta todos os DTOs e tipos dos contratos de integração.
 *
 * REGRA: o frontend NUNCA importa directamente de @/shared/integrations/contracts/*.
 * Importa sempre daqui ou dos adapters do seu módulo.
 *
 * Uso:
 *   import type { AuthUser, AuthSession } from "@/modules/integrations/dto";
 *   import type { SendEmailParams } from "@/modules/integrations/dto";
 */

// ── Auth (Clerk) ──────────────────────────────────────────────────────────────
export type {
  AuthUser,
  AuthSession,
  AuthSignInParams,
  AuthSignUpParams,
  AuthInviteParams,
  IAuthProvider,
  AuthProviderCapabilities,
} from "@/shared/integrations/contracts/auth.contract";

export {
  CLERK_CAPABILITIES,
  MOCK_AUTH_CAPABILITIES,
} from "@/shared/integrations/contracts/auth.contract";

// ── Email (Resend) ────────────────────────────────────────────────────────────
export type {
  EmailTemplateId,
  EmailRecipient,
  EmailAttachment,
  SendEmailParams,
  SendEmailResult,
  EmailDeliveryStatus,
  IEmailProvider,
} from "@/shared/integrations/contracts/email.contract";

export { EMAIL_TEMPLATE_VARS } from "@/shared/integrations/contracts/email.contract";

// ── Storage (Cloudflare R2) ───────────────────────────────────────────────────
export type {
  StorageBucket,
  StorageObject,
  StorageUploadParams,
  StorageUploadResult,
  StoragePresignedUrlParams,
  IStorageProvider,
} from "@/shared/integrations/contracts/storage.contract";

export { buildStorageKey } from "@/shared/integrations/contracts/storage.contract";

// ── Payments (Stripe) ─────────────────────────────────────────────────────────
export type {
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentStatus,
  SubscriptionFeatures,
  TenantSubscription,
  PaymentMethod,
  Invoice,
  CreateCheckoutParams,
  CreatePortalParams,
  IPaymentsProvider,
} from "@/shared/integrations/contracts/payments.contract";

export { PLAN_FEATURES } from "@/shared/integrations/contracts/payments.contract";

// ── Signing (Autentique) ──────────────────────────────────────────────────────
export type {
  SigningStatus,
  SignerRole,
  Signer,
  SigningDocument,
  CreateSigningDocumentParams,
  SigningWebhookEvent,
  ISigningProvider,
} from "@/shared/integrations/contracts/signing.contract";

// ── Monitoring (PostHog + Sentry) ─────────────────────────────────────────────
export type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  FeatureFlagContext,
  IAnalyticsProvider,
  ErrorSeverity,
  ErrorContext,
  BreadcrumbEntry,
  PerformanceTransaction,
  IErrorMonitorProvider,
} from "@/shared/integrations/contracts/monitoring.contract";

// ── Streaming (Spotify, YouTube, TikTok, Instagram, Deezer, Apple, SoundCloud) ─
export type {
  StreamingPlatformId,
  AdsPlatformId,
  MetricsPeriod,
  MetricsDateRange,
  MetricTimeSeries,
  TrackMetrics,
  ArtistMetrics,
  VideoMetrics,
  SocialMetrics,
  AdCampaign,
  IStreamingProvider,
  IAdsProvider,
  StreamingPlatformMeta,
} from "@/shared/integrations/contracts/streaming.contract";

export { STREAMING_PLATFORMS } from "@/shared/integrations/contracts/streaming.contract";

// ── Rights (ECAD, UBC, Abramus) ───────────────────────────────────────────────
export type {
  RightsEntityId,
  RightsKind,
  RightsRegistrationStatus,
  RightsSearchQuery,
  RightsSearchResult,
  ArtistSearchQuery,
  ArtistSearchResult,
  RegisterObraInput,
  RegisterFonogramaInput,
  RegistrationResult,
  RegistrationHistoryEntry,
  GenerateISWCInput,
  GenerateISWCResult,
  GenerateISRCInput,
  GenerateISRCResult,
  ArrecadacaoTipo,
  ArrecadacaoEntry,
  ArrecadacaoSummary,
  ConciliacaoResult,
  IRightsProvider,
} from "@/shared/integrations/contracts/rights.contract";

export {
  arrecadacaoStorageKey,
  generateMockISWC,
  generateMockISRC,
} from "@/shared/integrations/contracts/rights.contract";

// ── Music Monitoring (ACRCloud) ───────────────────────────────────────────────
export type {
  MonitoringSourceType,
  FingerprintInput,
  FingerprintMatch,
  FingerprintResult,
  PlayReport,
  PlayReportQuery,
  PlayReportSummary,
  AlertSeverity,
  AlertType,
  MonitoringAlert,
  MonitoringProject,
  CreateMonitoringProjectInput,
  MusicSearchQuery,
  MusicSearchResult,
  IMusicMonitoringProvider,
} from "@/shared/integrations/contracts/music-monitoring.contract";

export {
  MONITORING_SOURCE_LABELS,
  ALERT_TYPE_LABELS,
  playReportsStorageKey,
  MONITORING_PROJECTS_KEY,
  MONITORING_ALERTS_KEY,
} from "@/shared/integrations/contracts/music-monitoring.contract";

// ── Chat (MusicChat) ──────────────────────────────────────────────────────────
export type {
  ChannelType,
  MessageType,
  EntityReference,
  ChatAttachment,
  ChatMember,
  ChatChannel,
  ChatMessage,
  SendMessageParams,
  CreateChannelParams,
  ChatNotification,
  IChatProvider,
} from "@/shared/integrations/contracts/chat.contract";

// ── Integration registry types ────────────────────────────────────────────────
export type {
  IntegrationId,
  IntegrationCategory,
  IntegrationStatus,
  IntegrationMeta,
  IntegrationCredentials,
  IntegrationHealthCheck,
  IntegrationRuntimeStatus,
} from "@/shared/integrations/types";
