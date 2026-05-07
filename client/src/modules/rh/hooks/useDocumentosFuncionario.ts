import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface DocumentoFuncionario {
  id: string;
  user_id?: string;
  funcionario_id?: string | null;
  tipo_documento?: string | null;
  nome_arquivo?: string | null;
  url_arquivo?: string | null;
  descricao?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type DocumentoFuncionarioInsert = Omit<DocumentoFuncionario, "id" | "user_id" | "created_at" | "updated_at">;
export type DocumentoFuncionarioUpdate = Partial<DocumentoFuncionarioInsert>;

export const TIPOS_DOCUMENTO = [
  "RG",
  "CPF",
  "CTPS",
  "Contrato",
  "Comprovante de Residência",
  "Certidão",
  "Atestado",
  "Diploma",
  "Outro",
] as const;

export function useDocumentosFuncionario(funcionarioId?: string) {
  const result = useDataQuery<DocumentoFuncionario>({
    queryKey: [...QUERY_KEYS.DOCUMENTOS_FUNCIONARIO, ...(funcionarioId ? [funcionarioId] : [])],
    table: "documentos_funcionario",
    filters: funcionarioId ? { funcionario_id: funcionarioId } : undefined,
    enabled: !!funcionarioId,
  }, {
    create: { success: "Documento enviado com sucesso!", error: "Erro ao enviar documento" },
    update: { success: "Documento atualizado com sucesso!", error: "Erro ao atualizar documento" },
    delete: { success: "Documento excluído com sucesso!", error: "Erro ao excluir documento" },
  });

  return {
    documentos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addDocumento: result.create,
    updateDocumento: result.update,
    deleteDocumento: result.delete,
  };
}
