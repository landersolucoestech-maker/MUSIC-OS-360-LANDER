import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Campanha {
  id: string;
  user_id?: string;
  nome: string;
  artista_id?: string | null;
  status?: string | null;
  tipo?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  orcamento?: number | null;
  gasto?: number | null;
  impressoes?: number | null;
  cliques?: number | null;
  conversoes?: number | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type CampanhaInsert = Omit<Campanha, "id" | "user_id" | "created_at" | "updated_at">;
export type CampanhaUpdate = Partial<CampanhaInsert>;

export interface CampanhaWithRelations extends Campanha {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}

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
