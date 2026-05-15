/**
 * integrations/acrcloud/index.ts
 *
 * Ponto de entrada público para a integração ACRCloud.
 * Re-exporta hooks, provider mock e tipos do contrato.
 *
 * Uso:
 *   import { useACRCloudStatus, useACRCloudIdentify } from "@/integrations/acrcloud";
 *
 * MIGRAÇÃO FUTURA:
 *   Substituir o mockMusicMonitoringProvider por ACRCloudProvider (API real).
 */

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export {
  useACRCloudStatus,
  useACRCloudSaveCredentials,
  useACRCloudDeleteCredentials,
  useACRCloudIdentify,
  useACRCloudPlayReports,
  useACRCloudPlaySummary,
  useACRCloudAlerts,
  useACRCloudAcknowledgeAlert,
  useACRCloudSearch,
  useACRCloudProjects,
  useACRCloudCreateProject,
  useACRCloudToggleProject,
  type ACRCloudStatus,
} from "@/modules/integrations/hooks/useACRCloud";

// ─── Provider mock ─────────────────────────────────────────────────────────────
export { mockMusicMonitoringProvider } from "@/modules/integrations/providers/mock/mock-music-monitoring.provider";

// ─── Contrato / DTOs ──────────────────────────────────────────────────────────
export type {
  IMusicMonitoringProvider,
  FingerprintInput,
  FingerprintResult,
  FingerprintMatch,
  PlayReport,
  PlayReportQuery,
  PlayReportSummary,
  MonitoringAlert,
  MonitoringProject,
  CreateMonitoringProjectInput,
  MusicSearchQuery,
  MusicSearchResult,
  MonitoringSourceType,
  AlertType,
  AlertSeverity,
} from "@/shared/integrations/contracts/music-monitoring.contract";

export {
  MONITORING_SOURCE_LABELS,
  ALERT_TYPE_LABELS,
  MONITORING_PROJECTS_KEY,
  MONITORING_ALERTS_KEY,
  playReportsStorageKey,
} from "@/shared/integrations/contracts/music-monitoring.contract";
