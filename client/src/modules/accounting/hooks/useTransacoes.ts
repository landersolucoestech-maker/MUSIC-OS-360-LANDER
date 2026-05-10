import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  Transacao,
  TransacaoInsert,
  TransacaoUpdate,
  TransacaoWithRelations,
} from "../types/accounting.types";

export type { Transacao, TransacaoInsert, TransacaoUpdate, TransacaoWithRelations };

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
