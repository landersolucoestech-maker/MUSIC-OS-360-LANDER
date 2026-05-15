/**
 * integrations/hooks/useR2.ts
 *
 * Hook stub para integração Cloudflare R2 (armazenamento de ficheiros).
 *
 * ESTADO ACTUAL: standalone — ficheiros referenciados por URLs locais/mock.
 * MIGRAÇÃO FUTURA:
 *   1. Configurar bucket R2 e Worker de upload assinado
 *   2. Implementar IStorageProvider com R2 SDK
 *   3. Substituir referências a URLs locais por presigned URLs R2
 *
 * Contrato: @/shared/integrations/contracts/storage.contract → IStorageProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do R2 ──────────────────────────────────────────────────

export interface R2Status extends IntegrationRuntimeStatus {
  integration_id: "r2";
  account_id?: string | null;
  bucket_name?: string | null;
  public_domain?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useR2Status() {
  return useQuery<R2Status>({
    queryKey: ["integrations", "r2", "status"],
    queryFn: async (): Promise<R2Status> => ({
      integration_id: "r2",
      status: "disabled",
      connected: false,
      account_id: null,
      bucket_name: null,
      public_domain: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

/**
 * MIGRAÇÃO FUTURA: implementar upload real para R2 via Worker assinado.
 */
export function useR2Upload() {
  return {
    upload: (_file: File, _key: string) => disabledIntegration("Cloudflare R2"),
    isLoading: false,
  };
}

export function useR2PresignedUrl() {
  return {
    getUrl: (_key: string) => disabledIntegration("Cloudflare R2"),
  };
}
