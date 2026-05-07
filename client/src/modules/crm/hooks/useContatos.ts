import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Contato {
  id: string;
  user_id?: string;
  nome: string;
  tipo_contato?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  status?: string | null;
  cidade?: string | null;
  estado?: string | null;
  artista_id?: string | null;
  cliente_id?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ContatoInsert = Omit<Contato, "id" | "user_id" | "created_at" | "updated_at">;
export type ContatoUpdate = Partial<ContatoInsert>;

export interface ContatoWithRelations extends Contato {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
}

export function useContatos() {
  const result = useDataQuery<ContatoWithRelations>({
    queryKey: [...QUERY_KEYS.CONTATOS],
    table: "contatos",
    select: "*, artistas(*), clientes(*)",
  }, {
    create: { success: "Contato criado com sucesso!", error: "Erro ao criar contato" },
    update: { success: "Contato atualizado com sucesso!", error: "Erro ao atualizar contato" },
    delete: { success: "Contato excluído com sucesso!", error: "Erro ao excluir contato" },
  });

  return {
    contatos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addContato: result.create,
    updateContato: result.update,
    deleteContato: result.delete,
  };
}
