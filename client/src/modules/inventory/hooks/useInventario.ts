import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface InventarioItem {
  id: string;
  user_id?: string;
  nome: string;
  categoria?: string | null;
  quantidade?: number | null;
  valor_unitario?: number | null;
  localizacao?: string | null;
  status?: string | null;
  responsavel?: string | null;
  setor?: string | null;
  dataEntrada?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type InventarioInsert = Omit<InventarioItem, "id" | "user_id" | "created_at" | "updated_at">;
export type InventarioUpdate = Partial<InventarioInsert>;

export function useInventario() {
  const result = useDataQuery<InventarioItem>({
    queryKey: [...QUERY_KEYS.INVENTARIO],
    table: "inventario",
  }, {
    create: { success: "Item criado com sucesso!", error: "Erro ao criar item" },
    update: { success: "Item atualizado com sucesso!", error: "Erro ao atualizar item" },
    delete: { success: "Item excluído com sucesso!", error: "Erro ao excluir item" },
  });

  return {
    inventario: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addInventario: result.create,
    updateInventario: result.update,
    deleteInventario: result.delete,
  };
}
