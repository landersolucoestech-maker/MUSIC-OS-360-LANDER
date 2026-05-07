import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface FeriasAusencia {
  id: string;
  user_id?: string;
  funcionario_id?: string | null;
  tipo?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  dias_totais?: number | null;
  status?: string | null;
  motivo?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FeriasAusenciaInsert = Omit<FeriasAusencia, "id" | "user_id" | "created_at" | "updated_at">;
export type FeriasAusenciaUpdate = Partial<FeriasAusenciaInsert>;

export const TIPOS_AUSENCIA = [
  "férias",
  "licença médica",
  "licença maternidade",
  "licença paternidade",
  "falta justificada",
  "falta injustificada",
  "day off",
  "folga compensatória",
] as const;

export const STATUS_AUSENCIA = [
  "pendente",
  "aprovado",
  "rejeitado",
  "em andamento",
  "concluído",
] as const;

export function useFeriasAusencias() {
  const result = useDataQuery<FeriasAusencia>({
    queryKey: [...QUERY_KEYS.FERIAS_AUSENCIAS],
    table: "ferias_ausencias",
  }, {
    create: { success: "Registro de ausência criado com sucesso!", error: "Erro ao criar registro de ausência" },
    update: { success: "Registro de ausência atualizado com sucesso!", error: "Erro ao atualizar registro de ausência" },
    delete: { success: "Registro de ausência excluído com sucesso!", error: "Erro ao excluir registro de ausência" },
  });

  return {
    feriasAusencias: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addFeriasAusencia: result.create,
    updateFeriasAusencia: result.update,
    deleteFeriasAusencia: result.delete,
  };
}
