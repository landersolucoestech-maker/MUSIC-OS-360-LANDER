import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Conteudo {
  id: string;
  user_id?: string;
  titulo?: string | null;
  tipo_conteudo?: string[] | string | null;
  descricao?: string | null;
  formato?: string[] | string | null;
  plataforma?: string[] | string | null;
  status?: string | null;
  campanha_relacionada?: string | null;
  lancamento_id?: string | null;
  legenda?: string | null;
  horario_publicacao?: string | null;
  data_publicacao?: string | null;
  url?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ConteudoInsert = Omit<Conteudo, "id" | "user_id" | "created_at" | "updated_at">;
export type ConteudoUpdate = Partial<ConteudoInsert>;

export interface ConteudoWithRelations extends Conteudo {
  lancamentos?: {
    id: string;
    titulo?: string;
    artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
    [key: string]: unknown;
  } | null;
}

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
