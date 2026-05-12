/**
 * modules/integrations/hooks/useACRCloud.ts
 *
 * Hook completo para integração ACRCloud (monitoramento musical por fingerprint).
 *
 * Funcionalidades:
 *   - Credenciais (access_key + access_secret + host)
 *   - Identificação de músicas por fingerprint de áudio
 *   - Relatórios de execução (rádio, TV, streaming, vídeo)
 *   - Alertas em tempo real (uso não autorizado, volume anômalo, etc.)
 *   - Projectos de monitoramento por artista/obra/ISRC
 *   - Pesquisa no catálogo ACRCloud
 *   - Reconhecimento de quota restante e plano
 *
 * Contrato: @/shared/integrations/contracts/music-monitoring.contract → IMusicMonitoringProvider
 * Mock:     @/integrations/providers/mock/mock-music-monitoring.provider → MockMusicMonitoringProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mockMusicMonitoringProvider } from "@/modules/integrations/providers/mock/mock-music-monitoring.provider";
import type {
  FingerprintInput,
  FingerprintResult,
  PlayReportQuery,
  PlayReport,
  PlayReportSummary,
  MonitoringAlert,
  MonitoringProject,
  CreateMonitoringProjectInput,
  MusicSearchQuery,
  MusicSearchResult,
} from "@/modules/integrations/dto";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const CRED_KEY = "musicos360_acrcloud_credentials";

interface StoredCreds {
  access_key:    string;
  host:          string;
  saved_at:      string;
}

function readCreds(): StoredCreds | null {
  try { return JSON.parse(localStorage.getItem(CRED_KEY) || "null"); } catch { return null; }
}
function writeCreds(c: StoredCreds) {
  try { localStorage.setItem(CRED_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}
function clearCreds() {
  try { localStorage.removeItem(CRED_KEY); } catch { /* ignore */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ACRCloudStatus extends IntegrationRuntimeStatus {
  integration_id: "acrcloud";
  host?:          string | null;
  access_key?:    string | null;
  plan?:          string | null;
  quota_remaining?: number | null;
}

// ─── Hook: Status ─────────────────────────────────────────────────────────────

export function useACRCloudStatus() {
  return useQuery<ACRCloudStatus>({
    queryKey: ["integrations", "acrcloud", "status"],
    queryFn: async (): Promise<ACRCloudStatus> => {
      const creds = readCreds();
      if (!creds) {
        return {
          integration_id:  "acrcloud",
          status:          "disconnected",
          connected:       false,
          host:            null,
          access_key:      null,
          plan:            null,
          quota_remaining: null,
          last_error:      null,
          last_checked_at: new Date().toISOString(),
        };
      }
      const health = await mockMusicMonitoringProvider.verifyConnection();
      return {
        integration_id:  "acrcloud",
        status:          health.ok ? "connected" : "error",
        connected:       health.ok,
        host:            creds.host,
        access_key:      `${creds.access_key.slice(0, 4)}${"*".repeat(Math.max(0, creds.access_key.length - 4))}`,
        plan:            health.plan ?? null,
        quota_remaining: health.quota_remaining ?? null,
        last_error:      null,
        last_checked_at: new Date().toISOString(),
      };
    },
    staleTime: 30_000,
  });
}

// ─── Hook: Salvar credenciais ─────────────────────────────────────────────────

export function useACRCloudSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { access_key: string; access_secret: string; host: string }) => {
      if (!input.access_key.trim())    throw new Error("Access Key é obrigatória.");
      if (!input.access_secret.trim()) throw new Error("Access Secret é obrigatório.");
      if (!input.host.trim())          throw new Error("Host é obrigatório.");
      writeCreds({
        access_key: input.access_key.trim(),
        host:       input.host.trim(),
        saved_at:   new Date().toISOString(),
      });
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "acrcloud", "status"] });
      toast.success("Credenciais ACRCloud salvas. Monitoramento activo.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Desconectar ────────────────────────────────────────────────────────

export function useACRCloudDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      clearCreds();
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "acrcloud", "status"] });
      toast.success("Integração ACRCloud desconectada.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Identificar por fingerprint ───────────────────────────────────────

export function useACRCloudIdentify() {
  return useMutation<FingerprintResult, Error, FingerprintInput>({
    mutationFn: async (input) => {
      const creds = readCreds();
      if (!creds) throw new Error("ACRCloud não está conectado. Configure as credenciais primeiro.");
      return mockMusicMonitoringProvider.identify(input);
    },
    onSuccess: (data) => {
      if (data.matched && data.best_match) {
        toast.success(`Música identificada: "${data.best_match.titulo}" — ${data.best_match.artista} (${data.best_match.score}% confiança)`);
      } else {
        toast.info("Nenhuma correspondência encontrada para o trecho de áudio.");
      }
    },
    onError: (err) => {
      toast.error(`Erro na identificação: ${err.message}`);
    },
  });
}

// ─── Hook: Relatórios de execução ─────────────────────────────────────────────

export function useACRCloudPlayReports(query: PlayReportQuery, enabled = true) {
  return useQuery<PlayReport[]>({
    queryKey: ["acrcloud", "play-reports", query],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) return [];
      return mockMusicMonitoringProvider.getPlayReports(query);
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Hook: Resumo de execuções ────────────────────────────────────────────────

export function useACRCloudPlaySummary(query: PlayReportQuery, enabled = true) {
  return useQuery<PlayReportSummary>({
    queryKey: ["acrcloud", "play-summary", query],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) {
        return {
          total_plays: 0,
          total_duration_seconds: 0,
          estimated_royalty_cents: 0,
          by_source: { radio: 0, tv: 0, streaming: 0, video: 0, podcast: 0, venue: 0, public: 0, unknown: 0 },
          by_country: {},
          period_from: query.date_from ?? new Date().toISOString(),
          period_to:   query.date_to   ?? new Date().toISOString(),
        };
      }
      return mockMusicMonitoringProvider.getPlayReportSummary(query);
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Hook: Alertas ───────────────────────────────────────────────────────────

export function useACRCloudAlerts(options?: { unacknowledged_only?: boolean; limit?: number }) {
  return useQuery<MonitoringAlert[]>({
    queryKey: ["acrcloud", "alerts", options],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) return [];
      return mockMusicMonitoringProvider.getAlerts(options);
    },
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

// ─── Hook: Confirmar alerta ────────────────────────────────────────────────────

export function useACRCloudAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (alertId) => {
      const creds = readCreds();
      if (!creds) throw new Error("ACRCloud não está conectado.");
      return mockMusicMonitoringProvider.acknowledgeAlert(alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acrcloud", "alerts"] });
      toast.success("Alerta marcado como lido.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Pesquisa no catálogo ────────────────────────────────────────────────

export function useACRCloudSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery<MusicSearchResult[]>({
    queryKey: ["acrcloud", "search", trimmed],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) return [];
      const searchQuery: MusicSearchQuery = { query: trimmed, limit: 20 };
      return mockMusicMonitoringProvider.search(searchQuery);
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 30_000,
  });
}

// ─── Hook: Projectos de monitoramento ────────────────────────────────────────

export function useACRCloudProjects() {
  return useQuery<MonitoringProject[]>({
    queryKey: ["acrcloud", "projects"],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) return [];
      return mockMusicMonitoringProvider.listProjects();
    },
    staleTime: 60_000,
  });
}

// ─── Hook: Criar projecto ─────────────────────────────────────────────────────

export function useACRCloudCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<MonitoringProject, Error, CreateMonitoringProjectInput>({
    mutationFn: async (input) => {
      const creds = readCreds();
      if (!creds) throw new Error("ACRCloud não está conectado. Configure as credenciais primeiro.");
      return mockMusicMonitoringProvider.createProject(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["acrcloud", "projects"] });
      toast.success(`Projecto "${data.name}" criado com sucesso.`);
    },
    onError: (err) => {
      toast.error(`Erro ao criar projecto: ${err.message}`);
    },
  });
}

// ─── Hook: Activar/desactivar projecto ───────────────────────────────────────

export function useACRCloudToggleProject() {
  const queryClient = useQueryClient();
  return useMutation<MonitoringProject, Error, { projectId: string; active: boolean }>({
    mutationFn: async ({ projectId, active }) => {
      const creds = readCreds();
      if (!creds) throw new Error("ACRCloud não está conectado.");
      return mockMusicMonitoringProvider.toggleProject(projectId, active);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["acrcloud", "projects"] });
      toast.success(`Projecto "${data.name}" ${data.active ? "activado" : "pausado"}.`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
}
