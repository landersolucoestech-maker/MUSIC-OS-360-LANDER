/**
 * modules/integrations/hooks/useEcad.ts
 *
 * Integração ECAD (Escritório Central de Arrecadação e Distribuição).
 *
 * ESTADO REAL: o acesso à API do ECAD requer contrato institucional (via
 * ABRAMUS, UBC, AMAR ou associação afiliada) e um endpoint real no backend.
 * Até lá, este hook reporta o estado verdadeiro (desconectado) e TODA
 * operação falha explicitamente. É proibido simular conexão, arrecadação,
 * conciliação ou importação de relatório.
 *
 * Contrato: @/shared/integrations/contracts/rights.contract → IRightsProvider
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EcadStatus extends IntegrationRuntimeStatus {
  integration_id:       "ecad";
  associacao_filiada?:  string | null;
  username?:            string | null;
  ultimo_relatorio_em?: string | null;
}

export interface EcadArrecadacaoEntry {
  isrc:                 string;
  titulo:               string;
  artista:              string;
  periodo:              string;
  fonte:                string;
  execucoes:            number;
  valor_bruto_cents:    number;
  valor_liquido_cents:  number;
}

export interface EcadArrecadacaoSummary {
  periodo:                string;
  total_execucoes:        number;
  valor_bruto_cents:      number;
  valor_liquido_cents:    number;
  obras:                  number;
  entries:                EcadArrecadacaoEntry[];
}

export interface EcadConciliacaoResult {
  total_fonogramas:     number;
  conciliados:          number;
  nao_encontrados:      number;
  sem_cod_ecad:         number;
  discrepancias:        number;
}

const ECAD_UNAVAILABLE =
  "Integração ECAD ainda não está disponível (requer contrato institucional e endpoint real no backend).";

function ecadUnavailable(): never {
  throw new Error(ECAD_UNAVAILABLE);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useEcadStatus() {
  return useQuery<EcadStatus>({
    queryKey: ["integrations", "ecad", "status"],
    // Estado verdadeiro: não há integração ECAD configurável hoje.
    queryFn: async (): Promise<EcadStatus> => ({
      integration_id:      "ecad",
      status:              "disconnected",
      connected:           false,
      associacao_filiada:  null,
      username:            null,
      ultimo_relatorio_em: null,
      last_error:          ECAD_UNAVAILABLE,
      last_checked_at:     new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

export function useEcadSaveCredentials() {
  return useMutation({
    mutationFn: async (_input: { associacao: string; username: string; password: string }) =>
      ecadUnavailable(),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEcadDeleteCredentials() {
  return useMutation({
    mutationFn: async () => ecadUnavailable(),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEcadArrecadacao(periodo: string, enabled = true) {
  return useQuery<EcadArrecadacaoSummary>({
    queryKey: ["ecad", "arrecadacao", periodo],
    queryFn: async (): Promise<EcadArrecadacaoSummary> => ecadUnavailable(),
    enabled: enabled && Boolean(periodo),
    staleTime: 300_000,
    retry: false,
  });
}

export function useEcadConciliacao() {
  return useMutation<EcadConciliacaoResult, Error, { periodo: string }>({
    mutationFn: async (_input) => ecadUnavailable(),
    onError: (err) => toast.error(`Erro na conciliação ECAD: ${err.message}`),
  });
}

export function useEcadImportRelatorio() {
  return useMutation<{ linhas: number; importadas: number }, Error, File>({
    mutationFn: async (_file: File) => ecadUnavailable(),
    onError: (err) => toast.error(`Erro ao importar relatório: ${err.message}`),
  });
}
