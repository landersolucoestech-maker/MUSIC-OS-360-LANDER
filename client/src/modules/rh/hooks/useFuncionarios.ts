import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { Funcionario, FuncionarioInsert, FuncionarioUpdate } from "../types/rh.types";

export type { Funcionario, FuncionarioInsert, FuncionarioUpdate };

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
