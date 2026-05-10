/**
 * integrations/hooks/useUbc.ts
 *
 * Hook stub para integração UBC (União Brasileira de Compositores).
 *
 * ESTADO ACTUAL: standalone — apenas referências em dados mock.
 * MIGRAÇÃO FUTURA:
 *   1. API UBC (acesso mediante filiação institucional)
 *   2. Consulta de obras registadas, distribuição de direitos
 *   3. Importação de registros para catálogo local
 *   4. Integração com módulo Accounting (receitas de distribuição UBC)
 *
 * Contrato: @/shared/integrations/contracts/rights.contract → IRightsProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos da UBC ─────────────────────────────────────────────────

export interface UbcStatus extends IntegrationRuntimeStatus {
  integration_id: "ubc";
  numero_filiado?: string | null;
  username?: string | null;
  ultimo_relatorio_em?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useUbcStatus() {
  return useQuery<UbcStatus>({
    queryKey: ["integrations", "ubc", "status"],
    queryFn: async (): Promise<UbcStatus> => ({
      integration_id: "ubc",
      status: "disabled",
      connected: false,
      numero_filiado: null,
      username: null,
      ultimo_relatorio_em: null,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

/**
 * MIGRAÇÃO FUTURA: pesquisar obras registadas na UBC.
 */
export function useUbcSearchObras() {
  return {
    data: null,
    isLoading: false,
    search: (_query: string) => disabledIntegration("UBC"),
  };
}

/**
 * MIGRAÇÃO FUTURA: consultar distribuição de direitos UBC por período.
 */
export function useUbcDistribuicao() {
  return {
    data: null,
    isLoading: false,
    fetch: (_periodo: string) => disabledIntegration("UBC"),
  };
}

/**
 * MIGRAÇÃO FUTURA: importar registro de obra da UBC para o catálogo local.
 */
export function useUbcImportObra() {
  return {
    isLoading: false,
    importar: (_externalId: string) => disabledIntegration("UBC"),
  };
}
