import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface FolhaPagamento {
  id: string;
  user_id?: string;
  funcionario_id?: string | null;
  periodo?: string | null;
  mes_referencia?: string | null;
  salario_bruto?: number | null;
  descontos?: number | null;
  bonus?: number | null;
  salario_liquido?: number | null;
  data_pagamento?: string | null;
  status?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FolhaPagamentoInsert = Omit<FolhaPagamento, "id" | "user_id" | "created_at" | "updated_at">;
export type FolhaPagamentoUpdate = Partial<FolhaPagamentoInsert>;

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
