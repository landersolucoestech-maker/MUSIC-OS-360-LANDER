import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { Cliente, ClienteInsert, ClienteUpdate, ClienteSegmento } from "../types/crm.types";

export type { Cliente, ClienteInsert, ClienteUpdate, ClienteSegmento };

export function useClientes() {
  const result = useDataQuery<Cliente>({
    queryKey: [...QUERY_KEYS.CLIENTES],
    table: "clientes",
  }, {
    create: { success: "Cliente criado com sucesso!", error: "Erro ao criar cliente" },
    update: { success: "Cliente atualizado com sucesso!", error: "Erro ao atualizar cliente" },
    delete: { success: "Cliente excluído com sucesso!", error: "Erro ao excluir cliente" },
  });

  return {
    clientes: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addCliente: result.create,
    updateCliente: result.update,
    deleteCliente: result.delete,
  };
}
