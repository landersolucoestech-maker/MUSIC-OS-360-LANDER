import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  Lancamento,
  LancamentoInsert,
  LancamentoUpdate,
  LancamentoWithRelations,
} from "../types";

export type { Lancamento, LancamentoInsert, LancamentoUpdate, LancamentoWithRelations };

export function useLancamentos() {
  const result = useDataQuery<LancamentoWithRelations>({
    queryKey: [...QUERY_KEYS.LANCAMENTOS],
    table: "lancamentos",
    select: "*, artistas(*)",
    orderBy: { column: "data_lancamento", ascending: false },
  }, {
    create: { success: "Lançamento criado com sucesso!", error: "Erro ao criar lançamento" },
    update: { success: "Lançamento atualizado com sucesso!", error: "Erro ao atualizar lançamento" },
    delete: { success: "Lançamento excluído com sucesso!", error: "Erro ao excluir lançamento" },
  });

  return {
    lancamentos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addLancamento: result.create,
    updateLancamento: result.update,
    deleteLancamento: result.delete,
  };
}
