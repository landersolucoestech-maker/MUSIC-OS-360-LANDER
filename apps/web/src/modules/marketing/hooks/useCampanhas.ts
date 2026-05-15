import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { Campanha, CampanhaInsert, CampanhaUpdate, CampanhaWithRelations } from "../types/marketing.types";

export type { Campanha, CampanhaInsert, CampanhaUpdate, CampanhaWithRelations };

export function useCampanhas() {
  const result = useDataQuery<CampanhaWithRelations>({
    queryKey: [...QUERY_KEYS.CAMPANHAS],
    table: "campanhas",
    select: "*, artistas(*)",
  }, {
    create: { success: "Campanha criada com sucesso!", error: "Erro ao criar campanha" },
    update: { success: "Campanha atualizada com sucesso!", error: "Erro ao atualizar campanha" },
    delete: { success: "Campanha excluída com sucesso!", error: "Erro ao excluir campanha" },
  });

  return {
    campanhas: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addCampanha: result.create,
    updateCampanha: result.update,
    deleteCampanha: result.delete,
  };
}
