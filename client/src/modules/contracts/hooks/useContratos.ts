import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/shared/providers";
import type {
  Contrato,
  ContratoInsert,
  ContratoUpdate,
  ContratoVersao,
  ContratoWithRelations,
} from "../types/contracts.types";

export type { Contrato, ContratoInsert, ContratoUpdate, ContratoVersao, ContratoWithRelations };

export function useContratos() {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<ContratoWithRelations>({
    queryKey: [...QUERY_KEYS.CONTRATOS],
    table: "contratos",
    select: "*, artistas(*), clientes(*)",
    additionalInvalidateKeys: [[...QUERY_KEYS.ARTISTAS]],
    onMutationSuccess: {
      onCreate: (c) =>
        emit(DomainEvents.CONTRACT_CREATED, {
          id: (c as ContratoWithRelations & { id: string }).id,
          artista_id: c.artista_id ?? undefined,
          valor: c.valor ?? undefined,
          org_id: orgId,
        }),
      onUpdate: (c) =>
        emit(DomainEvents.CONTRACT_UPDATED, {
          id: (c as ContratoWithRelations & { id: string }).id,
          artista_id: c.artista_id ?? undefined,
          valor: c.valor ?? undefined,
          org_id: orgId,
        }),
      onDelete: (id) =>
        emit(DomainEvents.CONTRACT_DELETED, { id, org_id: orgId }),
    },
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
