import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { Conteudo, ConteudoInsert, ConteudoUpdate, ConteudoWithRelations } from "../types/marketing.types";

export type { Conteudo, ConteudoInsert, ConteudoUpdate, ConteudoWithRelations };

export function useConteudos() {
  const result = useDataQuery<ConteudoWithRelations>({
    queryKey: [...QUERY_KEYS.CONTEUDOS],
    table: "conteudos",
    select: "*, lancamentos(*, artistas(*))",
    orderBy: { column: "created_at", ascending: false },
  }, {
    create: { success: "Conteúdo criado com sucesso!", error: "Erro ao criar conteúdo" },
    update: { success: "Conteúdo atualizado com sucesso!", error: "Erro ao atualizar conteúdo" },
    delete: { success: "Conteúdo excluído com sucesso!", error: "Erro ao excluir conteúdo" },
  });

  return {
    conteudos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addConteudo: result.create,
    updateConteudo: result.update,
    deleteConteudo: result.delete,
  };
}
