import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type {
  TemplateContrato,
  TemplateContratoInsert,
  TemplateContratoUpdate,
} from "../types/contracts.types";

export type { TemplateContrato, TemplateContratoInsert, TemplateContratoUpdate };

export function useTemplatesContratos() {
  const result = useDataQuery<TemplateContrato>({
    queryKey: [...QUERY_KEYS.TEMPLATES_CONTRATOS],
    table: "templates_contratos",
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
