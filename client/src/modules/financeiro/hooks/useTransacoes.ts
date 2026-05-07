import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Transacao {
  id: string;
  user_id?: string;
  descricao: string;
  tipo: string;
  categoria?: string | null;
  valor: number;
  data: string;
  status?: string | null;
  artista_id?: string | null;
  cliente_id?: string | null;
  venda_id?: string | null;
  origem?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type TransacaoInsert = Omit<Transacao, "id" | "user_id" | "created_at" | "updated_at" | keyof { [key: string]: unknown }>;
export type TransacaoUpdate = Partial<TransacaoInsert>;

export interface TransacaoWithRelations extends Transacao {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
  vendas?: { id: string; [key: string]: unknown } | null;
}

export function useTransacoes() {
  const result = useDataQuery<TransacaoWithRelations>({
    queryKey: [...QUERY_KEYS.TRANSACOES],
    table: "transacoes",
    select: "*, clientes(*), artistas(*), vendas(*)",
    orderBy: { column: "data", ascending: false },
  }, {
    create: { success: "Transação criada com sucesso!", error: "Erro ao criar transação" },
    update: { success: "Transação atualizada com sucesso!", error: "Erro ao atualizar transação" },
    delete: { success: "Transação excluída com sucesso!", error: "Erro ao excluir transação" },
  });

  return {
    transacoes: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addTransacao: result.create,
    updateTransacao: result.update,
    deleteTransacao: result.delete,
  };
}
