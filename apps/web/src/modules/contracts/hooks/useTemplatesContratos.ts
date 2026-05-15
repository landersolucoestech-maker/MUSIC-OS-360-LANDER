import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/app/providers/TenantContext";
import type {
  TemplateContrato,
  TemplateContratoInsert,
  TemplateContratoUpdate,
} from "../types/contracts.types";

export type { TemplateContrato, TemplateContratoInsert, TemplateContratoUpdate };

export function useTemplatesContratos() {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<TemplateContrato>({
    queryKey: [...QUERY_KEYS.TEMPLATES_CONTRATOS],
    table: "templates_contratos",
    onMutationSuccess: {
      onCreate: (t) =>
        emit(DomainEvents.CONTRACT_TEMPLATE_CREATED, {
          id:    (t as TemplateContrato & { id: string }).id,
          nome:  (t as TemplateContrato & { nome?: string }).nome ?? undefined,
          tipo:  (t as TemplateContrato & { tipo?: string }).tipo ?? undefined,
          org_id: orgId,
        }),
      onUpdate: (t) =>
        emit(DomainEvents.CONTRACT_TEMPLATE_UPDATED, {
          id:    (t as TemplateContrato & { id: string }).id,
          nome:  (t as TemplateContrato & { nome?: string }).nome ?? undefined,
          tipo:  (t as TemplateContrato & { tipo?: string }).tipo ?? undefined,
          org_id: orgId,
        }),
      onDelete: (id) =>
        emit(DomainEvents.CONTRACT_TEMPLATE_DELETED, { id, org_id: orgId }),
    },
  }, {
    create: { success: "Template criado com sucesso!", error: "Erro ao criar template" },
    update: { success: "Template atualizado com sucesso!", error: "Erro ao atualizar template" },
    delete: { success: "Template excluído com sucesso!", error: "Erro ao excluir template" },
  });

  return {
    templates: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addTemplate: result.create,
    updateTemplate: result.update,
    deleteTemplate: result.delete,
  };
}
