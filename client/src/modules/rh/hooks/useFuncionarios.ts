import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface Funcionario {
  id: string;
  user_id?: string;
  nome_completo: string;
  cargo?: string | null;
  setor?: string | null;
  salario_base?: number | null;
  tipo_contrato?: string | null;
  data_admissao?: string | null;
  status?: string | null;
  vinculo_usuario_id?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type FuncionarioInsert = Omit<Funcionario, "id" | "user_id" | "created_at" | "updated_at">;
export type FuncionarioUpdate = Partial<FuncionarioInsert>;

export const SETORES = [
  "Administrativo",
  "Financeiro",
  "Marketing",
  "Jurídico",
  "Produção Musical",
  "A&R",
  "TI",
  "RH",
  "Comercial",
  "Operações",
] as const;

export const TIPOS_CONTRATO = [
  "CLT",
  "PJ",
  "Freelancer",
  "Estágio",
  "Temporário",
] as const;

export const STATUS_FUNCIONARIO = [
  "ativo",
  "inativo",
  "férias",
  "afastado",
  "desligado",
] as const;

export function useFuncionarios() {
  const result = useDataQuery<Funcionario>({
    queryKey: [...QUERY_KEYS.FUNCIONARIOS],
    table: "funcionarios",
  }, {
    create: { success: "Funcionário criado com sucesso!", error: "Erro ao criar funcionário" },
    update: { success: "Funcionário atualizado com sucesso!", error: "Erro ao atualizar funcionário" },
    delete: { success: "Funcionário excluído com sucesso!", error: "Erro ao excluir funcionário" },
  });

  return {
    funcionarios: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addFuncionario: result.create,
    updateFuncionario: result.update,
    deleteFuncionario: result.delete,
  };
}
