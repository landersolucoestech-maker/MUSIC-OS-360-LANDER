import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminIntegrationsService,
  type AdminIntegration,
  type IntegrationCategory,
  type UpdateIntegrationGovernanceInput,
} from "@/modules/admin/services/admin-integrations.service";
import { adminPlanIntegrationsService } from "@/modules/admin/services/admin-integrations.service";

const EMPTY_SLUGS: string[] = [];

const EMPTY_INTEGRATIONS: AdminIntegration[] = [];
const EMPTY_CATEGORIES: IntegrationCategory[] = [];

/**
 * `data ?? []` é conveniência de render, NÃO tratamento de erro: `isError`/`error`
 * continuam expostos e a UI é obrigada a distinguir LOADING / ERROR / EMPTY.
 * Colapsar uma falha (404/403/500/rede) em lista vazia foi exatamente o bug que
 * fez a aba do Portal Admin dizer "nenhuma integração" com 14 registros no banco.
 */
export function useAdminIntegrations() {
  const query = useQuery<AdminIntegration[]>({
    queryKey: ["admin", "integrations"],
    queryFn: () => adminIntegrationsService.list(),
    retry: 1,
  });
  return { ...query, data: query.data ?? EMPTY_INTEGRATIONS };
}

export function useIntegrationCategories() {
  const query = useQuery<IntegrationCategory[]>({
    queryKey: ["admin", "integrations", "categories"],
    queryFn: () => adminIntegrationsService.listCategories(),
  });
  return { ...query, data: query.data ?? EMPTY_CATEGORIES };
}

export function useUpdateIntegrationGovernance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateIntegrationGovernanceInput }) =>
      adminIntegrationsService.update(id, patch),
    onSuccess: () => {
      // A governança muda o que os clientes resolvem — invalidar os dois lados.
      void qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
      void qc.invalidateQueries({ queryKey: ["integrations", "external-providers"] });
      toast.success("Governança atualizada.");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível atualizar a governança."),
  });
}

/** Integrações comerciais disponíveis para compor um plano — vem do backend. */
export function useCommercialIntegrations() {
  const query = useAdminIntegrations();
  return { ...query, data: query.data.filter((i) => i.classification === "commercial") };
}

export function usePlanIntegrations(planSlug: string | undefined) {
  const query = useQuery<string[]>({
    queryKey: ["admin", "plan-integrations", planSlug],
    queryFn: () => adminPlanIntegrationsService.get(planSlug!),
    enabled: !!planSlug,
  });
  return { ...query, data: query.data ?? EMPTY_SLUGS };
}

export function useSavePlanIntegrations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planSlug, integrations }: { planSlug: string; integrations: string[] }) =>
      adminPlanIntegrationsService.set(planSlug, integrations),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["admin", "plan-integrations"] });
      void qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
      // Entitlement muda o catálogo do cliente sem deploy — invalida os dois lados.
      void qc.invalidateQueries({ queryKey: ["integrations", "external-providers"] });
      if (res.rejected.length > 0) {
        toast.warning(`Ignorados (não comerciais): ${res.rejected.join(", ")}`);
      } else {
        toast.success("Integrações do plano salvas.");
      }
    },
    onError: (err: Error) => toast.error(err.message || "Falha ao salvar integrações do plano."),
  });
}
