import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface ContratoVersao {
  versao: string;
  url: string;
  criado_em: string;
  notas?: string;
  autor?: string;
}

export interface Contrato {
  id: string;
  user_id?: string;
  titulo: string;
  tipo?: string | null;
  status?: string | null;
  artista_id?: string | null;
  cliente_id?: string | null;
  lancamento_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor?: number | null;
  exclusivo?: boolean | null;
  observacoes?: string | null;
  template_id?: string | null;
  assinado_em?: string | null;
  arquivo_url?: string | null;
  autentique_doc_id?: string | null;
  versoes?: ContratoVersao[];
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ContratoInsert = Omit<Contrato, "id" | "user_id" | "created_at" | "updated_at">;
export type ContratoUpdate = Partial<ContratoInsert>;

export interface ContratoWithRelations extends Contrato {
  artistas?: { id: string; nome_artistico?: string; [key: string]: unknown } | null;
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
}

export function useContratos() {
  const result = useDataQuery<ContratoWithRelations>({
    queryKey: [...QUERY_KEYS.CONTRATOS],
    table: "contratos",
    select: "*, artistas(*), clientes(*)",
    additionalInvalidateKeys: [[...QUERY_KEYS.ARTISTAS]],
  }, {
    create: { success: "Contrato criado com sucesso!", error: "Erro ao criar contrato" },
    update: { success: "Contrato atualizado com sucesso!", error: "Erro ao atualizar contrato" },
    delete: { success: "Contrato excluído com sucesso!", error: "Erro ao excluir contrato" },
  });

  return {
    contratos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addContrato: result.create,
    updateContrato: result.update,
    deleteContrato: result.delete,
  };
}
