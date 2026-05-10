import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  Contrato,
  ContratoInsert,
  ContratoUpdate,
  ContratoVersao,
  ContratoWithRelations,
} from "../types/contracts.types";

export type { Contrato, ContratoInsert, ContratoUpdate, ContratoVersao, ContratoWithRelations };

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
