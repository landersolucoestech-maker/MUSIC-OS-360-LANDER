import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface NotaFiscal {
  id: string;
  user_id?: string;
  numero?: string | null;
  serie?: string | null;
  tipo_nota?: string | null;
  status?: string | null;
  tomador_nome?: string | null;
  tomador_cnpj?: string | null;
  valor_total?: number | null;
  valor_servicos?: number | null;
  valor_iss?: number | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  descricao_servico?: string | null;
  cliente_id?: string | null;
  venda_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type NotaFiscalInsert = Omit<NotaFiscal, "id" | "user_id" | "created_at" | "updated_at">;
export type NotaFiscalUpdate = Partial<NotaFiscalInsert>;

export interface NotaFiscalWithRelations extends NotaFiscal {
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
  vendas?: { id: string; [key: string]: unknown } | null;
}

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
