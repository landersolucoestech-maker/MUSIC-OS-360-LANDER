/**
 * integrations/hooks/useEcad.ts
 *
 * Hook stub para integração ECAD (arrecadação de execução pública).
 *
 * ESTADO ACTUAL: standalone — dados de conciliação ECAD são MOCK_DATA
 *   (cod_ecad nos fonogramas, ECADViewModal em monitoring/).
 * MIGRAÇÃO FUTURA:
 *   1. API privada ECAD (acesso mediante contrato institucional)
 *   2. Consulta de arrecadação por ISRC, por período e por fonte
 *   3. Conciliação automática contra catálogo local
 *   4. Integração com módulo Accounting (lançamentos de receita ECAD)
 *
 * Contrato: @/shared/integrations/contracts/rights.contract → IRightsProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do ECAD ────────────────────────────────────────────────

export interface EcadStatus extends IntegrationRuntimeStatus {
  integration_id: "ecad";
  associacao_filiada?: string | null;
  username?: string | null;
  ultimo_relatorio_em?: string | null;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useEcadStatus() {
  return useQuery<EcadStatus>({
    queryKey: ["integrations", "ecad", "status"],
    queryFn: async (): Promise<EcadStatus> => ({
      integration_id: "ecad",
      status: "disabled",
      connected: false,
      associacao_filiada: null,
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
 * MIGRAÇÃO FUTURA: consultar ECAD API para arrecadação do período.
 */
export function useEcadArrecadacao() {
  return {
    data: null,
    isLoading: false,
    fetch: (_periodo: string) => disabledIntegration("ECAD"),
  };
}

/**
 * MIGRAÇÃO FUTURA: conciliar arrecadação ECAD com catálogo local
 * (fonogramas com cod_ecad preenchido).
 */
export function useEcadConciliacao() {
  return {
    data: null,
    isLoading: false,
    conciliar: (_periodo: string) => disabledIntegration("ECAD"),
  };
}

/**
 * MIGRAÇÃO FUTURA: importar relatório ECAD (arquivo .txt / .csv / .xml).
 */
export function useEcadImportRelatorio() {
  return {
    isLoading: false,
    importar: (_file: File) => disabledIntegration("ECAD"),
  };
}
