import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  Share,
  ShareInsert,
  ShareUpdate,
  ShareWithRelations,
} from "../types";

export type { Share, ShareInsert, ShareUpdate, ShareWithRelations };

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
