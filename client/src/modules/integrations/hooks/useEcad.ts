/**
 * modules/integrations/hooks/useEcad.ts
 *
 * Hook completo para integração ECAD.
 *
 * O ECAD (Escritório Central de Arrecadação e Distribuição) é a entidade
 * brasileira responsável pela arrecadação e distribuição de direitos autorais
 * de execução pública. O acesso à API requer contrato institucional.
 *
 * Funcionalidades:
 *   - Credenciais (associação filiada + utilizador + senha)
 *   - Status de conexão
 *   - Consulta de arrecadação por período e por ISRC
 *   - Importação de relatórios ECAD (.txt / .csv / .xml)
 *   - Conciliação automática com o catálogo local (cod_ecad nos fonogramas)
 *   - Exportação de demonstrativo de arrecadação
 *
 * ESTADO ACTUAL: mock funcional (credenciais em localStorage, dados simulados).
 * MIGRAÇÃO FUTURA: substituir mock por chamadas reais à API ECAD
 *   (acesso mediante contrato com ABRAMUS, UBC, AMAR ou associação afiliada).
 *
 * Contrato: @/shared/integrations/contracts/rights.contract → IRightsProvider
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MOCK_DATA } from "@/shared/data/mockData";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const CRED_KEY = "musicos360_ecad_credentials";

interface StoredCreds {
  associacao:  string;
  username:    string;
  saved_at:    string;
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

// ─── Mock data helpers ────────────────────────────────────────────────────────

function generateMockArrecadacao(periodo: string): EcadArrecadacaoSummary {
  const fonogramas = (MOCK_DATA["fonogramas"] ?? []) as Array<Record<string, unknown>>;
  const entries: EcadArrecadacaoEntry[] = fonogramas.slice(0, 8).map((f) => {
    const execucoes     = Math.floor(Math.random() * 50_000) + 5_000;
    const valor_bruto   = Math.floor(execucoes * (Math.random() * 0.05 + 0.02) * 100);
    const valor_liquido = Math.floor(valor_bruto * 0.85);
    return {
      isrc:                f.isrc as string || "BR-000-00-00000",
      titulo:              f.titulo as string || "Obra sem título",
      artista:             f.artista_nome as string || "Artista desconhecido",
      periodo,
      fonte:               ["Rádio", "TV Aberta", "TV por Assinatura", "Streaming", "Shows/Eventos"][Math.floor(Math.random() * 5)],
      execucoes,
      valor_bruto_cents:   valor_bruto,
      valor_liquido_cents: valor_liquido,
    };
  });
  return {
    periodo,
    total_execucoes:    entries.reduce((s, e) => s + e.execucoes, 0),
    valor_bruto_cents:  entries.reduce((s, e) => s + e.valor_bruto_cents, 0),
    valor_liquido_cents: entries.reduce((s, e) => s + e.valor_liquido_cents, 0),
    obras:              entries.length,
    entries,
  };
}

function generateMockConciliacao(): EcadConciliacaoResult {
  const fonogramas = (MOCK_DATA["fonogramas"] ?? []) as Array<Record<string, unknown>>;
  const total       = fonogramas.length;
  const sem_ecad    = fonogramas.filter((f) => !f.cod_ecad).length;
  const com_ecad    = total - sem_ecad;
  return {
    total_fonogramas: total,
    conciliados:      Math.floor(com_ecad * 0.9),
    nao_encontrados:  Math.floor(com_ecad * 0.1),
    sem_cod_ecad:     sem_ecad,
    discrepancias:    Math.floor(com_ecad * 0.05),
  };
}

// ─── Hook: Status ─────────────────────────────────────────────────────────────

export function useEcadStatus() {
  return useQuery<EcadStatus>({
    queryKey: ["integrations", "ecad", "status"],
    queryFn: async (): Promise<EcadStatus> => {
      const creds = readCreds();
      if (!creds) {
        return {
          integration_id:      "ecad",
          status:              "disconnected",
          connected:           false,
          associacao_filiada:  null,
          username:            null,
          ultimo_relatorio_em: null,
          last_error:          null,
          last_checked_at:     new Date().toISOString(),
        };
      }
      return {
        integration_id:      "ecad",
        status:              "connected",
        connected:           true,
        associacao_filiada:  creds.associacao,
        username:            creds.username,
        ultimo_relatorio_em: null,
        last_error:          null,
        last_checked_at:     new Date().toISOString(),
      };
    },
    staleTime: Infinity,
  });
}

// ─── Hook: Salvar credenciais ─────────────────────────────────────────────────

export function useEcadSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { associacao: string; username: string; password: string }) => {
      if (!input.associacao.trim()) throw new Error("Nome da associação filiada é obrigatório.");
      if (!input.username.trim())   throw new Error("Utilizador é obrigatório.");
      if (!input.password.trim())   throw new Error("Senha é obrigatória.");
      writeCreds({
        associacao: input.associacao.trim(),
        username:   input.username.trim(),
        saved_at:   new Date().toISOString(),
      });
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "ecad", "status"] });
      toast.success("Credenciais ECAD salvas. Conectado com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Desconectar ────────────────────────────────────────────────────────

export function useEcadDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      clearCreds();
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "ecad", "status"] });
      toast.success("Integração ECAD desconectada.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: Consulta de arrecadação ───────────────────────────────────────────

export function useEcadArrecadacao(periodo: string, enabled = true) {
  return useQuery<EcadArrecadacaoSummary>({
    queryKey: ["ecad", "arrecadacao", periodo],
    queryFn: async () => {
      const creds = readCreds();
      if (!creds) throw new Error("ECAD não está conectado. Configure as credenciais primeiro.");
      return generateMockArrecadacao(periodo);
    },
    enabled: enabled && Boolean(periodo),
    staleTime: 300_000,
  });
}

// ─── Hook: Conciliação ────────────────────────────────────────────────────────

export function useEcadConciliacao() {
  const queryClient = useQueryClient();
  return useMutation<EcadConciliacaoResult, Error, { periodo: string }>({
    mutationFn: async ({ periodo: _periodo }) => {
      const creds = readCreds();
      if (!creds) throw new Error("ECAD não está conectado. Configure as credenciais primeiro.");
      await new Promise((r) => setTimeout(r, 800));
      return generateMockConciliacao();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ecad"] });
      toast.success(
        `Conciliação ECAD concluída: ${data.conciliados} fonogramas conciliados, ${data.discrepancias} discrepâncias.`,
      );
    },
    onError: (err) => {
      toast.error(`Erro na conciliação ECAD: ${err.message}`);
    },
  });
}

// ─── Hook: Importar relatório ─────────────────────────────────────────────────

export function useEcadImportRelatorio() {
  const queryClient = useQueryClient();
  return useMutation<{ linhas: number; importadas: number }, Error, File>({
    mutationFn: async (file: File) => {
      const creds = readCreds();
      if (!creds) throw new Error("ECAD não está conectado. Configure as credenciais primeiro.");
      await new Promise((r) => setTimeout(r, 600));
      const linhas = Math.floor(file.size / 80);
      return { linhas, importadas: Math.floor(linhas * 0.95) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ecad"] });
      toast.success(`Relatório ECAD importado: ${data.importadas} de ${data.linhas} linhas processadas.`);
    },
    onError: (err) => {
      toast.error(`Erro ao importar relatório: ${err.message}`);
    },
  });
}
