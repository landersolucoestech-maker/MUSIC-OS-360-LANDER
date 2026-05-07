import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Projeto {
  id: string;
  user_id?: string;
  titulo: string;
  tipo?: string | null;
  status?: string | null;
  artista_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  orcamento?: number | null;
  descricao?: string | null;
  genero?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ProjetoInsert = Omit<Projeto, "id" | "user_id" | "created_at" | "updated_at">;
export type ProjetoUpdate = Partial<ProjetoInsert>;

export interface ProjetoObraSummary {
  id: string;
  titulo?: string;
  status?: string | null;
  [key: string]: unknown;
}

export interface ProjetoWithRelations extends Projeto {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
  obras?: ProjetoObraSummary[] | null;
}

export interface ProjetoWithRelationsExtended extends ProjetoWithRelations {
  total_obras?: number;
  obras_concluidas?: number;
}

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
