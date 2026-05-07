import type { Tables, TablesInsert, TablesUpdate } from "@/shared/types/database";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export type Regra = Tables<"regras">;
export type RegraInsert = Omit<TablesInsert<"regras">, "user_id" | "id" | "created_at" | "updated_at">;
export type RegraUpdate = Omit<TablesUpdate<"regras">, "id" | "user_id" | "created_at" | "updated_at">;

export function useRegras() {
  const result = useDataQuery<Regra>({
    queryKey: [...QUERY_KEYS.REGRAS],
    table: "regras",
  }, {
    create: { success: "Regra criada com sucesso!", error: "Erro ao criar regra" },
    update: { success: "Regra atualizada com sucesso!", error: "Erro ao atualizar regra" },
    delete: { success: "Regra excluída com sucesso!", error: "Erro ao excluir regra" },
  });

  return {
    regras: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addRegra: result.create,
    updateRegra: result.update,
    deleteRegra: result.delete,
  };
}
