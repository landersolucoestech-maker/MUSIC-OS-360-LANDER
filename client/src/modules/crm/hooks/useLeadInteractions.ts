import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";

export interface LeadInteraction {
  id: string;
  user_id?: string;
  lead_id?: string | null;
  tipo_interacao?: string | null;
  descricao?: string | null;
  data_interacao?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export type LeadInteractionInsert = Omit<LeadInteraction, "id" | "user_id" | "created_at">;

export const TIPO_INTERACAO_OPTIONS = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "reuniao", label: "Reunião" },
  { value: "proposta", label: "Proposta Enviada" },
  { value: "followup", label: "Follow-up" },
] as const;

export const TIPO_INTERACAO_LABELS: Record<string, string> = Object.fromEntries(
  TIPO_INTERACAO_OPTIONS.map((o) => [o.value, o.label])
);

export function useLeadInteractions(leadId?: string) {
  const result = useDataQuery<LeadInteraction>({
    queryKey: [...QUERY_KEYS.LEAD_INTERACTIONS, leadId || ""],
    table: "lead_interactions",
    orderBy: { column: "data_interacao", ascending: false },
    filters: leadId ? { lead_id: leadId } : undefined,
    enabled: !!leadId,
  }, {
    create: { success: "Interação registrada!", error: "Erro ao registrar interação" },
    delete: { success: "Interação removida!", error: "Erro ao remover interação" },
  });

  return {
    interactions: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addInteraction: result.create,
    deleteInteraction: result.delete,
    refetch: result.refetch,
  };
}
