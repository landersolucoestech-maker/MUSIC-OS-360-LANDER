import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { storage } from "@/shared/lib/storage";

export interface Fonograma {
  id: string;
  user_id?: string;
  titulo?: string | null;
  obra_id?: string | null;
  artista_id?: string | null;
  isrc?: string | null;
  duracao?: string | null;
  tipo?: string | null;
  status?: string | null;
  compositores?: string | null;
  interpretes?: string | null;
  produtores?: string | null;
  gravadora?: string | null;
  agregadora?: string | null;
  cod_abramus?: string | null;
  cod_ecad?: string | null;
  isrc_pais?: string | null;
  isrc_registrante?: string | null;
  isrc_ano?: string | null;
  isrc_designacao?: string | null;
  criada_por_ia?: boolean | null;
  emissao?: string | null;
  gravacao_original?: string | null;
  data_lancamento?: string | null;
  data_registro?: string | null;
  duracao_min?: string | number | null;
  duracao_seg?: string | number | null;
  instrumental?: boolean | null;
  genero_musical?: string | null;
  classificacao?: string | null;
  midia?: string | null;
  nacional?: boolean | null;
  pub_simultanea?: boolean | null;
  pais_origem?: string | null;
  pais_publicacao?: string | null;
  observacoes?: string | null;
  arquivo_audio?: import("@/shared/types/database").Json | null;
  participacao?: unknown;
  origem_externa?: string | null;
  origem_externa_id?: string | null;
  origem_externa_sincronizado_em?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FonogramaInsert = Omit<Fonograma, "id" | "user_id" | "created_at" | "updated_at">;
export type FonogramaUpdate = Partial<FonogramaInsert>;

export interface FonogramaWithRelations extends Fonograma {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}

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
