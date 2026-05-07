import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Licenca {
  id: string;
  user_id?: string;
  titulo: string;
  obra_id?: string | null;
  cliente_id?: string | null;
  tipo?: string | null;
  tipo_uso?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor?: number | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type LicencaInsert = Omit<Licenca, "id" | "user_id" | "created_at" | "updated_at">;
export type LicencaUpdate = Partial<LicencaInsert>;

export interface LicencaWithRelations extends Licenca {
  clientes?: { id: string; nome?: string; [key: string]: unknown } | null;
}

export function useLicencas() {
  const result = useDataQuery<LicencaWithRelations>({
    queryKey: [...QUERY_KEYS.LICENCAS],
    table: "licencas",
    select: "*, clientes(*)",
  }, {
    create: { success: "Licença criada com sucesso!", error: "Erro ao criar licença" },
    update: { success: "Licença atualizada com sucesso!", error: "Erro ao atualizar licença" },
    delete: { success: "Licença excluída com sucesso!", error: "Erro ao excluir licença" },
  });

  return {
    licencas: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addLicenca: result.create,
    updateLicenca: result.update,
    deleteLicenca: result.delete,
  };
}
