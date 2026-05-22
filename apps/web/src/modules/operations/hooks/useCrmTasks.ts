import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface CrmTask {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  type?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

const now = new Date();
const d = (offset: number) => new Date(now.getTime() + offset * 86_400_000).toISOString();

const MOCK_TASKS: CrmTask[] = [
  { id: "t1", tenant_id: "mock", title: "Onboarding artístico — João Silva", description: "Apresentar plataforma e fluxos ao artista", status: "pending", priority: "high", type: "artist.onboarding:artist-001", due_date: d(2), assigned_to: "admin@demo.com", created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "t2", tenant_id: "mock", title: "Coleta documental — Maria Santos", description: "Solicitar e validar documentos (CPF, CNPJ)", status: "in_progress", priority: "high", type: "artist.onboarding:artist-002", due_date: d(-1), assigned_to: "admin@demo.com", created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "t3", tenant_id: "mock", title: "Revisão jurídica contrato 2024-001", description: "Revisar cláusulas de exclusividade", status: "pending", priority: "urgent", type: "contract.execution:contract-001", due_date: d(0), assigned_to: "admin@demo.com", created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "t4", tenant_id: "mock", title: "Conciliação financeira — transação #4521", description: "Confirmar baixa bancária", status: "pending", priority: "medium", type: "transaction.reconciliation:tx-001", due_date: d(5), assigned_to: null, created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "t5", tenant_id: "mock", title: "Follow-up invoice vencida #INV-009", description: "Cobrar invoice vencida há 3 dias", status: "pending", priority: "high", type: "invoice.overdue:inv-009", due_date: d(-3), assigned_to: "admin@demo.com", created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "t6", tenant_id: "mock", title: "Setup distribuição digital — João Silva", description: "Configurar perfil nas distribuidoras e DSPs", status: "pending", priority: "medium", type: "artist.onboarding:artist-001", due_date: d(10), assigned_to: null, created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "t7", tenant_id: "mock", title: "Renovação contrato #2023-005", description: "Contrato vence em 25 dias — iniciar renovação", status: "pending", priority: "medium", type: "contract.renewal:contract-005", due_date: d(25), assigned_to: "admin@demo.com", created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
  { id: "t8", tenant_id: "mock", title: "Kickoff operacional — trio banda", description: "Reunião de alinhamento com equipa interna", status: "done", priority: "high", type: "artist.onboarding:artist-003", due_date: d(-5), assigned_to: "admin@demo.com", created_by: "system", created_at: now.toISOString(), updated_at: now.toISOString() },
];

export interface CrmTaskFilters {
  status?: string;
  priority?: string;
}

export function useCrmTasks(filters?: CrmTaskFilters) {
  const qc = useQueryClient();

  const query = useQuery<CrmTask[], Error>({
    queryKey: ["crm-tasks", filters],
    queryFn: MOCK_MODE
      ? () => Promise.resolve(MOCK_TASKS)
      : () => {
          const p = new URLSearchParams();
          if (filters?.status) p.set("status", filters.status);
          if (filters?.priority) p.set("priority", filters.priority);
          const qs = p.toString();
          return api.get<CrmTask[]>(`/crm/tasks${qs ? `?${qs}` : ""}`);
        },
    staleTime: 30_000,
  });

  const updateTask = useMutation({
    mutationFn: ({ id, ...data }: Partial<CrmTask> & { id: string }) =>
      MOCK_MODE
        ? Promise.resolve({ ...(MOCK_TASKS.find((t) => t.id === id) ?? {}), ...data } as CrmTask)
        : api.patch<CrmTask>(`/crm/tasks/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crm-tasks"] });
      void qc.invalidateQueries({ queryKey: ["operational-dashboard"] });
      toast.success("Tarefa atualizada");
    },
    onError: () => toast.error("Erro ao atualizar tarefa"),
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateTask: updateTask.mutate,
    isUpdating: updateTask.isPending,
  };
}
