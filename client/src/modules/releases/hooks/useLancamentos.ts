import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Lancamento {
  id: string;
  user_id?: string;
  titulo: string;
  tipo?: string | null;
  status?: string | null;
  artista_id?: string | null;
  data_lancamento?: string | null;
  distribuidora?: string | null;
  plataformas?: string[] | null;
  fonograma_ids?: string[] | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type LancamentoInsert = Omit<Lancamento, "id" | "user_id" | "created_at" | "updated_at">;
export type LancamentoUpdate = Partial<LancamentoInsert>;

export interface LancamentoWithRelations extends Lancamento {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
}

export function useLancamentos() {
  const result = useDataQuery<LancamentoWithRelations>({
    queryKey: [...QUERY_KEYS.LANCAMENTOS],
    table: "lancamentos",
    select: "*, artistas(*)",
    orderBy: { column: "data_lancamento", ascending: false },
  }, {
    create: { success: "Lançamento criado com sucesso!", error: "Erro ao criar lançamento" },
    update: { success: "Lançamento atualizado com sucesso!", error: "Erro ao atualizar lançamento" },
    delete: { success: "Lançamento excluído com sucesso!", error: "Erro ao excluir lançamento" },
  });

  return {
    lancamentos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addLancamento: result.create,
    updateLancamento: result.update,
    deleteLancamento: result.delete,
  };
}
