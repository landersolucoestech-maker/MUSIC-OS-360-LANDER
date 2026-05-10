import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { storage } from "@/shared/lib/storage";
import type {
  Fonograma,
  FonogramaInsert,
  FonogramaUpdate,
  FonogramaWithRelations,
} from "../types/catalog.types";

export type { Fonograma, FonogramaInsert, FonogramaUpdate, FonogramaWithRelations };

export function useFonogramas() {
  const queryClient = useQueryClient();
  const result = useDataQuery<FonogramaWithRelations>({
    queryKey: [...QUERY_KEYS.FONOGRAMAS],
    table: "fonogramas",
    select: "*, artistas(*)",
  }, {
    create: { success: "Fonograma criado com sucesso!", error: "Erro ao criar fonograma" },
    update: { success: "Fonograma atualizado com sucesso!", error: "Erro ao atualizar fonograma" },
    delete: { success: "Fonograma excluído com sucesso!", error: "Erro ao excluir fonograma" },
  });

  const bulkUpdateObraId = async (ids: string[], obraId: string): Promise<{ succeeded: number; failed: number }> => {
    const results = await Promise.allSettled(
      ids.map((id) => storage.update<FonogramaWithRelations & { id: string }>("fonogramas", id, { obra_id: obraId } as Partial<FonogramaWithRelations & { id: string }>))
    );
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FONOGRAMAS });
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    return { succeeded, failed };
  };

  return {
    fonogramas: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addFonograma: result.create,
    updateFonograma: result.update,
    deleteFonograma: result.delete,
    bulkUpdateObraId,
  };
}
