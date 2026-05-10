import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { Meta, MetaInsert, MetaUpdate, MetaWithRelations } from "../types/marketing.types";

export type { Meta, MetaInsert, MetaUpdate, MetaWithRelations };

export function useMetas(artistaId?: string) {
  const result = useDataQuery<MetaWithRelations>({
    queryKey: artistaId ? [...QUERY_KEYS.METAS_ARTISTAS, artistaId] : [...QUERY_KEYS.METAS_ARTISTAS],
    table: "metas_artistas",
    select: "*, artistas(*)",
    filters: artistaId ? { artista_id: artistaId } : undefined,
  }, {
    create: { success: "Meta criada com sucesso!", error: "Erro ao criar meta" },
    update: { success: "Meta atualizada com sucesso!", error: "Erro ao atualizar meta" },
    delete: { success: "Meta excluída com sucesso!", error: "Erro ao excluir meta" },
  });

  const getMetasByArtista = (id: string) =>
    result.data.filter((m) => m.artista_id === id);

  const getProgressPercent = (meta: Meta) =>
    meta.valor_meta > 0 ? Math.min(Math.round((meta.valor_atual / meta.valor_meta) * 100), 100) : 0;

  return {
    metas: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addMeta: result.create,
    updateMeta: result.update,
    deleteMeta: result.delete,
    getMetasByArtista,
    getProgressPercent,
  };
}
