import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { DisabledIntegrationError } from "@/shared/lib/disabled-integration";

/**
 * Decision Gate item 9 (GAP-15): Autentique tem backend real
 * (`GET /integrations/status`, `POST /integrations/autentique/configure`,
 * `POST /integrations/autentique/documents` — apps/api/.../autentique/*).
 * Não há endpoint real de "desconectar" nem campos ricos de status
 * (has_token/has_global_fallback/last_sync_at/last_error) — o mapeamento
 * abaixo só preenche o que é real; o restante fica undefined de propósito
 * (AutentiqueConfigDialog já trata esses campos como opcionais).
 */
export interface AutentiqueStatus {
  connected: boolean;
  status?: string;
  has_token?: boolean;
  last_error?: string | null;
  last_sync_at?: string | null;
  has_global_fallback?: boolean;
}

interface IntegrationsStatusResponse {
  autentique?: { configured: boolean };
}

export function useAutentiqueStatus() {
  return useQuery<AutentiqueStatus>({
    queryKey: ["autentique", "status"] as const,
    queryFn: async () => {
      const res = await api.get<IntegrationsStatusResponse>("/integrations/status");
      return { connected: res.autentique?.configured ?? false };
    },
    staleTime: 30_000,
  });
}

export function useAutentiqueSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { token: string }) =>
      api.post("/integrations/autentique/configure", { apiToken: input.token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autentique", "status"] });
      toast.success("Autentique conectado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Sem endpoint real de desconexão — nunca fabricar sucesso. */
export function useAutentiqueDeleteCredentials() {
  return useMutation({
    mutationFn: async () => Promise.reject(new DisabledIntegrationError("Autentique (desconectar)")),
    onError: (err: Error) => toast.error(err.message),
  });
}
