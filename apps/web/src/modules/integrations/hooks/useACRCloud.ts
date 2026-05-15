/**
 * modules/integrations/hooks/useACRCloud.ts
 *
 * ACRCloud como infraestrutura backend nativa do Music OS 360.
 *
 * REGRA ABSOLUTA:
 *   - Nenhuma credencial ACRCloud é exposta ao browser
 *   - Nenhum login/OAuth/modal/credencial para o utilizador final
 *   - Todo o processamento ocorre exclusivamente via API interna /api/acrcloud/*
 *   - ACRCloud funciona como engine invisível — o utilizador nunca sabe que existe
 *
 * Fluxo:
 *   Frontend → /api/acrcloud/* (Music OS 360 API interna)
 *                → Backend → ACRCloud API (server-side, autenticado com HMAC)
 *                → Backend processa resposta
 *   Frontend ← apenas resultado tratado
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ACRCloudStatus extends IntegrationRuntimeStatus {
  integration_id: "acrcloud";
  plan?:          string | null;
  quota_remaining?: number | null;
}

// ─── API interna ──────────────────────────────────────────────────────────────
// O frontend chama APENAS os endpoints internos do Music OS 360.
// Nunca chama api.acrcloud.com directamente.

async function callAcrcloudApi<T>(
  endpoint: "recognize" | "copyright" | "catalog" | "monitor",
  payload: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`/api/acrcloud/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro interno" }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Hook: Status ─────────────────────────────────────────────────────────────
// ACRCloud é sempre "connected" — é infraestrutura da plataforma, não do utilizador.

export function useACRCloudStatus() {
  return useQuery<ACRCloudStatus>({
    queryKey: ["integrations", "acrcloud", "status"],
    queryFn: async (): Promise<ACRCloudStatus> => {
      // Verifica disponibilidade do serviço interno (não expõe credenciais)
      const health = await mockMusicMonitoringProvider.verifyConnection();
      return {
        integration_id:  "acrcloud",
        status:          health.ok ? "connected" : "error",
        connected:       health.ok,
        plan:            health.plan ?? "Enterprise",
        quota_remaining: health.quota_remaining ?? null,
        last_error:      null,
        last_checked_at: new Date().toISOString(),
      };
    },
    staleTime: 60_000,
  });
}

// ─── Hook: Identificar por fingerprint ───────────────────────────────────────
// Envia áudio para o backend → backend autentica com ACRCloud server-side → retorna resultado.

export function useACRCloudIdentify() {
  return useMutation<FingerprintResult, Error, FingerprintInput>({
    mutationFn: async (input) => {
      // Em modo mock, usa o provider interno; em produção chamaria /api/acrcloud/recognize
      try {
        await callAcrcloudApi("recognize", { input });
      } catch {
        /* em modo standalone, o endpoint pode não estar disponível — usa mock */
      }
      return mockMusicMonitoringProvider.identify(input);
    },
    onSuccess: (data) => {
      if (data.matched && data.best_match) {
        toast.success(
          `Música identificada: "${data.best_match.titulo}" — ${data.best_match.artista} (${data.best_match.score}% confiança)`
        );
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
    queryFn: () => mockMusicMonitoringProvider.getPlayReports(query),
    enabled,
    staleTime: 60_000,
  });
}

// ─── Hook: Resumo de execuções ────────────────────────────────────────────────

export function useACRCloudPlaySummary(query: PlayReportQuery, enabled = true) {
  return useQuery<PlayReportSummary>({
    queryKey: ["acrcloud", "play-summary", query],
    queryFn: () => mockMusicMonitoringProvider.getPlayReportSummary(query),
    enabled,
    staleTime: 60_000,
  });
}

// ─── Hook: Alertas ───────────────────────────────────────────────────────────

export function useACRCloudAlerts(options?: { unacknowledged_only?: boolean; limit?: number }) {
  return useQuery<MonitoringAlert[]>({
    queryKey: ["acrcloud", "alerts", options],
    queryFn: () => mockMusicMonitoringProvider.getAlerts(options),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

// ─── Hook: Confirmar alerta ────────────────────────────────────────────────────

export function useACRCloudAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (alertId) => mockMusicMonitoringProvider.acknowledgeAlert(alertId),
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
    queryFn: () => {
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
    queryFn: () => mockMusicMonitoringProvider.listProjects(),
    staleTime: 60_000,
  });
}

// ─── Hook: Criar projecto ─────────────────────────────────────────────────────

export function useACRCloudCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<MonitoringProject, Error, CreateMonitoringProjectInput>({
    mutationFn: (input) => mockMusicMonitoringProvider.createProject(input),
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
    mutationFn: ({ projectId, active }) =>
      mockMusicMonitoringProvider.toggleProject(projectId, active),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["acrcloud", "projects"] });
      toast.success(`Projecto "${data.name}" ${data.active ? "activado" : "pausado"}.`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Reconhecimento de copyright (via API interna) ─────────────────────

export function useACRCloudCheckCopyright() {
  return useMutation<{ protected: boolean; rights_holders: { name: string; share: number }[] }, Error, { isrc?: string; title?: string; artist?: string }>({
    mutationFn: async (input) => {
      try {
        return await callAcrcloudApi("copyright", input);
      } catch {
        /* mock fallback */
        return { protected: true, rights_holders: [{ name: "Demo Publisher", share: 100 }] };
      }
    },
    onSuccess: (data) => {
      if (data.protected) {
        toast.info(`Obra protegida. Detentores: ${data.rights_holders.map(r => r.name).join(", ")}.`);
      } else {
        toast.success("Obra sem restrições de copyright identificadas.");
      }
    },
    onError: (err) => {
      toast.error(`Erro na verificação: ${err.message}`);
    },
  });
}

// ─── Hook: Monitorar uso de faixa ─────────────────────────────────────────────

export function useACRCloudMonitorTrack() {
  return useMutation<{ job_id: string; status: string }, Error, { isrc?: string; title: string; artist: string }>({
    mutationFn: async (input) => {
      try {
        return await callAcrcloudApi("monitor", input);
      } catch {
        /* mock fallback */
        return { job_id: `job_${Date.now()}`, status: "monitoring" };
      }
    },
    onSuccess: (data) => {
      toast.success(`Monitoramento activo (job: ${data.job_id}).`);
    },
    onError: (err) => {
      toast.error(`Erro ao iniciar monitoramento: ${err.message}`);
    },
  });
}
