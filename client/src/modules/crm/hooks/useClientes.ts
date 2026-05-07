import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export type ClienteSegmento = "contratante" | "parceiro" | "fornecedor" | "contato";

export interface Cliente {
  id: string;
  user_id?: string;
  nome: string;
  tipo?: string | null;
  segmento?: ClienteSegmento | string | null;
  email?: string | null;
  telefone?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  status?: string | null;
  observacoes?: string | null;
  temperatura?: string | null;
  responsavel?: string | null;
  empresa?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ClienteInsert = Omit<Cliente, "id" | "user_id" | "created_at" | "updated_at">;
export type ClienteUpdate = Partial<ClienteInsert>;

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
