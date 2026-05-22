import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface OperationalDashboard {
  artists: number;
  artists_by_status: Record<string, number>;
  contracts: number;
  contracts_by_status: Record<string, number>;
  active_contracts_count: number;
  contracts_expiring_soon_count: number;
  leads: number;
  open_tickets: number;
  campaigns: number;
  open_opportunities: number;
  revenue_current_month: number;
  expenses_current_month: number;
  net_result_current_month: number;
  pending_receivables: number;
  overdue_invoices_count: number;
  paid_transactions_count: number;
  cancelled_transactions_count: number;
  invoices_by_status: Record<string, number>;
  transactions_by_status: Record<string, number>;
  transactions_by_tipo: Record<string, number>;
  pending_tasks_count: number;
  overdue_tasks_count: number;
  onboarding_in_progress_count: number;
  overdue_followups_count: number;
  stalled_pipelines_count: number;
  pending_distribution_setups: number;
  pending_external_syncs: number;
  failed_external_syncs: number;
  successful_external_syncs: number;
  distributor_submissions_count: number;
  society_submissions_count: number;
  external_validation_errors_count: number;
  pending_provider_requirements_count: number;
  generated_at: string;
}

const MOCK_DASHBOARD: OperationalDashboard = {
  artists: 12,
  artists_by_status: { ativo: 8, contratado: 3, inativo: 1 },
  contracts: 9,
  contracts_by_status: { vigente: 5, pendente: 3, encerrado: 1 },
  active_contracts_count: 5,
  contracts_expiring_soon_count: 2,
  leads: 7,
  open_tickets: 3,
  campaigns: 4,
  open_opportunities: 6,
  revenue_current_month: 48500,
  expenses_current_month: 12300,
  net_result_current_month: 36200,
  pending_receivables: 18000,
  overdue_invoices_count: 2,
  paid_transactions_count: 23,
  cancelled_transactions_count: 1,
  invoices_by_status: { pendente: 4, paga: 18, vencida: 2 },
  transactions_by_status: { pago: 23, pendente: 6, cancelado: 1 },
  transactions_by_tipo: { receita: 18, despesa: 12 },
  pending_tasks_count: 8,
  overdue_tasks_count: 3,
  onboarding_in_progress_count: 3,
  overdue_followups_count: 2,
  stalled_pipelines_count: 1,
  pending_distribution_setups: 2,
  pending_external_syncs: 1,
  failed_external_syncs: 0,
  successful_external_syncs: 14,
  distributor_submissions_count: 8,
  society_submissions_count: 6,
  external_validation_errors_count: 0,
  pending_provider_requirements_count: 1,
  generated_at: new Date().toISOString(),
};

export function useOperationalDashboard() {
  const { data, isLoading, error, refetch } = useQuery<OperationalDashboard>({
    queryKey: ["operational-dashboard"],
    queryFn: MOCK_MODE
      ? () => Promise.resolve(MOCK_DASHBOARD)
      : () => api.get<OperationalDashboard>("/analytics/dashboard"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return { dashboard: data ?? null, isLoading, error, refetch };
}
