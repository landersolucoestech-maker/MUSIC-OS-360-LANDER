import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { ContentDetection } from "@/modules/monitoring/rights/types";

export type Deteccao = ContentDetection;

export function useDeteccoes() {
  const result = useDataQuery<Deteccao>({
    queryKey: [...QUERY_KEYS.DETECCOES],
    table: "deteccoes",
    orderBy: { column: "detectado_em", ascending: false },
  }, {
    create: { success: "Detecção registrada com sucesso!", error: "Erro ao registrar detecção" },
    update: { success: "Detecção atualizada com sucesso!", error: "Erro ao atualizar detecção" },
    delete: { success: "Detecção excluída com sucesso!", error: "Erro ao excluir detecção" },
  });

  return {
    deteccoes: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addDeteccao: result.create,
    updateDeteccao: result.update,
    deleteDeteccao: result.delete,
  };
}
