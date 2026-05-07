import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Obra {
  id: string;
  user_id?: string;
  titulo: string;
  compositor?: string | null;
  compositores?: string | string[] | null;
  letristas?: string | string[] | null;
  co_compositores?: string | null;
  detentores?: string | null;
  editora?: string | null;
  isrc?: string | null;
  iswc?: string | null;
  cod_abramus?: string | null;
  cod_ecad?: string | null;
  tipo?: string | null;
  genero?: string | null;
  status?: string | null;
  duracao?: string | null;
  origem_externa?: string | null;
  origem_externa_id?: string | null;
  origem_externa_sincronizado_em?: string | null;
  projeto_id?: string | null;
  artista_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ObraInsert = Omit<Obra, "id" | "user_id" | "created_at" | "updated_at">;
export type ObraUpdate = Partial<ObraInsert>;

export interface ObraWithRelations extends Obra {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
  projetos?: { id: string; titulo?: string; [key: string]: unknown } | null;
}

export function useObras() {
  const result = useDataQuery<ObraWithRelations>({
    queryKey: [...QUERY_KEYS.OBRAS],
    table: "obras",
    select: "*, artistas(*), projetos(id, titulo)",
    additionalInvalidateKeys: [[...QUERY_KEYS.PROJETOS]],
  }, {
    create: { success: "Obra criada com sucesso!", error: "Erro ao criar obra" },
    update: { success: "Obra atualizada com sucesso!", error: "Erro ao atualizar obra" },
    delete: { success: "Obra excluída com sucesso!", error: "Erro ao excluir obra" },
  });

  return {
    obras: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addObra: result.create,
    updateObra: result.update,
    deleteObra: result.delete,
  };
}
