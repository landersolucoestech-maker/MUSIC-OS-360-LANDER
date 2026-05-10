import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { FolhaPagamento, FolhaPagamentoInsert, FolhaPagamentoUpdate } from "../types/rh.types";

export type { FolhaPagamento, FolhaPagamentoInsert, FolhaPagamentoUpdate };

export const STATUS_PAGAMENTO = [
  "pendente",
  "pago",
  "cancelado",
] as const;

export function useFolhaPagamento() {
  const result = useDataQuery<FolhaPagamento>({
    queryKey: [...QUERY_KEYS.FOLHA_PAGAMENTO],
    table: "folha_pagamento",
  }, {
    create: { success: "Registro de pagamento criado com sucesso!", error: "Erro ao criar registro de pagamento" },
    update: { success: "Registro de pagamento atualizado com sucesso!", error: "Erro ao atualizar registro de pagamento" },
    delete: { success: "Registro de pagamento excluído com sucesso!", error: "Erro ao excluir registro de pagamento" },
  });

  return {
    folhaPagamento: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addFolhaPagamento: result.create,
    updateFolhaPagamento: result.update,
    deleteFolhaPagamento: result.delete,
  };
}
