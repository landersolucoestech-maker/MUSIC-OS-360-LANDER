import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  Projeto,
  ProjetoInsert,
  ProjetoUpdate,
  ProjetoObraSummary,
  ProjetoWithRelations,
  ProjetoWithRelationsExtended,
} from "../types/projetos.types";

export type { Projeto, ProjetoInsert, ProjetoUpdate, ProjetoObraSummary, ProjetoWithRelations, ProjetoWithRelationsExtended };

export function useProjetos() {
  const result = useDataQuery<ProjetoWithRelations>({
    queryKey: [...QUERY_KEYS.PROJETOS],
    table: "projetos",
    select: "*, artistas(*), obras(id, titulo, status)",
  }, {
    create: { success: "Projeto criado com sucesso!", error: "Erro ao criar projeto" },
    update: { success: "Projeto atualizado com sucesso!", error: "Erro ao atualizar projeto" },
    delete: { success: "Projeto excluído com sucesso!", error: "Erro ao excluir projeto" },
  });

  return {
    projetos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addProjeto: result.create,
    updateProjeto: result.update,
    deleteProjeto: result.delete,
  };
}
