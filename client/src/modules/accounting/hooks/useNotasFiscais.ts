import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  NotaFiscal,
  NotaFiscalInsert,
  NotaFiscalUpdate,
  NotaFiscalWithRelations,
} from "../types/accounting.types";

export type { NotaFiscal, NotaFiscalInsert, NotaFiscalUpdate, NotaFiscalWithRelations };

export function useNotasFiscais() {
  const result = useDataQuery<NotaFiscalWithRelations>({
    queryKey: [...QUERY_KEYS.NOTAS_FISCAIS],
    table: "notas_fiscais",
    select: "*, clientes(*), vendas(*)",
  }, {
    create: { success: "Nota fiscal criada com sucesso!", error: "Erro ao criar nota fiscal" },
    update: { success: "Nota fiscal atualizada com sucesso!", error: "Erro ao atualizar nota fiscal" },
    delete: { success: "Nota fiscal excluída com sucesso!", error: "Erro ao excluir nota fiscal" },
  });

  return {
    notasFiscais: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addNotaFiscal: result.create,
    updateNotaFiscal: result.update,
    deleteNotaFiscal: result.delete,
  };
}
