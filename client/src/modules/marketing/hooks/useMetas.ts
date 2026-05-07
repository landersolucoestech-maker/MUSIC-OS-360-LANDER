import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Meta {
  id: string;
  user_id?: string;
  artista_id?: string | null;
  tipo_meta?: string | null;
  descricao?: string | null;
  valor_meta: number;
  valor_atual: number;
  unidade?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type MetaInsert = Omit<Meta, "id" | "user_id" | "created_at" | "updated_at">;
export type MetaUpdate = Partial<MetaInsert>;

export interface MetaWithRelations extends Meta {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}

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
