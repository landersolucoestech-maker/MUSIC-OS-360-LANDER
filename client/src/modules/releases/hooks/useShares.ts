import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Share {
  id: string;
  user_id?: string;
  obra_id?: string | null;
  artista_id?: string | null;
  percentual?: number | null;
  tipo?: string | null;
  detentor?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export type ShareInsert = Omit<Share, "id" | "user_id" | "created_at">;
export type ShareUpdate = Partial<ShareInsert>;

export interface ShareWithRelations extends Share {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
  obras?: { id: string; titulo?: string; [key: string]: unknown } | null;
}

export function useShares() {
  const result = useDataQuery<ShareWithRelations>({
    queryKey: [...QUERY_KEYS.SHARES],
    table: "shares",
    select: "*, obras(*), artistas(*)",
  }, {
    create: { success: "Share criado com sucesso!", error: "Erro ao criar share" },
    update: { success: "Share atualizado com sucesso!", error: "Erro ao atualizar share" },
    delete: { success: "Share excluído com sucesso!", error: "Erro ao excluir share" },
  });

  return {
    shares: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addShare: result.create,
    updateShare: result.update,
    deleteShare: result.delete,
  };
}
