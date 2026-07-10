import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { storage } from "@/shared/lib/storage";
import {
  startOfMonth,
  endOfMonth,
  differenceInDays,
  parseISO,
  isValid,
} from "date-fns";

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

function tryParseDate(v: unknown): Date | null {
  if (v instanceof Date) return isValid(v) ? v : null;
  if (typeof v !== "string" || !v) return null;
  const d = parseISO(v);
  return isValid(d) ? d : null;
}

function bucketBy(rows: Array<Record<string, unknown>>, key: string): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const r of rows) {
    const k = String(r[key] ?? "—");
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return acc;
}

/**
 * Computa o dashboard operacional dinamicamente a partir de MOCK_DATA.
 *
 * É a paridade conceitual com analytics.service.ts (backend). Não fabrica
 * números: se o storage estiver vazio, o dashboard mostra zeros (correto).
 * Se houver dados mock, o dashboard reflete-os.
 */
async function computeFromMockStorage(): Promise<OperationalDashboard> {
  const now       = new Date();
  const inicioMes = startOfMonth(now);
  const fimMes    = endOfMonth(now);

  type Row = Record<string, unknown> & { id: string };

  const [
    artistas, contratos, leads, tickets, campanhas, transacoes,
    notasFiscais, tarefas, eventos,
  ] = await Promise.all([
    storage.list<Row>("artistas"),
    storage.list<Row>("contratos"),
    storage.list<Row>("leads"),
    storage.list<Row>("support_tickets"),
    storage.list<Row>("campanhas"),
    storage.list<Row>("transacoes"),
    storage.list<Row>("notas_fiscais"),
    storage.list<Row>("tarefas_marketing"),
    storage.list<Row>("eventos"),
  ]);

  const contracts_by_status   = bucketBy(contratos, "status");
  const artists_by_status     = bucketBy(artistas,  "status");
  const invoices_by_status    = bucketBy(notasFiscais, "status");
  const transactions_by_status = bucketBy(transacoes, "status");
  const transactions_by_tipo  = bucketBy(transacoes, "tipo");

  const active_contracts_count = contratos.filter((c) => {
    const s = String(c["status"] ?? "").toLowerCase();
    return ["vigente", "ativo", "assinado"].includes(s);
  }).length;

  const contracts_expiring_soon_count = contratos.filter((c) => {
    if (String(c["status"] ?? "").toLowerCase() !== "ativo" && String(c["status"] ?? "").toLowerCase() !== "vigente") return false;
    const fim = tryParseDate(c["data_fim"]);
    if (!fim) return false;
    const dias = differenceInDays(fim, now);
    return dias >= 0 && dias <= 30;
  }).length;

  const open_tickets = tickets.filter((t) => {
    const s = String(t["status"] ?? "").toLowerCase();
    return s !== "resolved" && s !== "closed" && s !== "resolvido" && s !== "fechado";
  }).length;

  const revenue_current_month = transacoes
    .filter((t) => {
      if (String(t["tipo"] ?? "") !== "receita") return false;
      const s = String(t["status"] ?? "").toLowerCase();
      if (s === "cancelado" || s === "cancelled") return false;
      const data = tryParseDate(t["data"] ?? t["data_pagamento"]);
      return !!data && data >= inicioMes && data <= fimMes;
    })
    .reduce((acc, t) => acc + Number(t["valor"] ?? 0), 0);

  const expenses_current_month = transacoes
    .filter((t) => {
      if (String(t["tipo"] ?? "") !== "despesa") return false;
      const s = String(t["status"] ?? "").toLowerCase();
      if (s === "cancelado" || s === "cancelled") return false;
      const data = tryParseDate(t["data"] ?? t["data_pagamento"]);
      return !!data && data >= inicioMes && data <= fimMes;
    })
    .reduce((acc, t) => acc + Number(t["valor"] ?? 0), 0);

  const net_result_current_month = revenue_current_month - expenses_current_month;

  const pending_receivables = transacoes
    .filter((t) => {
      if (String(t["tipo"] ?? "") !== "receita") return false;
      const s = String(t["status"] ?? "").toLowerCase();
      return s === "pendente" || s === "agendado";
    })
    .reduce((acc, t) => acc + Number(t["valor"] ?? 0), 0);

  const overdue_invoices_count = notasFiscais.filter((n) => {
    const s = String(n["status"] ?? "").toLowerCase();
    return s === "vencida" || s === "overdue";
  }).length;

  const paid_transactions_count = transacoes.filter((t) => {
    const s = String(t["status"] ?? "").toLowerCase();
    return ["pago", "confirmado", "concluido"].includes(s);
  }).length;

  const cancelled_transactions_count = transacoes.filter((t) => {
    const s = String(t["status"] ?? "").toLowerCase();
    return s === "cancelado" || s === "cancelled";
  }).length;

  const pending_tasks_count = tarefas.filter((t) => {
    const s = String(t["status"] ?? "").toLowerCase();
    return s === "pendente" || s === "pending" || s === "aberta";
  }).length;

  const overdue_tasks_count = tarefas.filter((t) => {
    const s = String(t["status"] ?? "").toLowerCase();
    if (s === "concluida" || s === "done" || s === "completed") return false;
    const prazo = tryParseDate(t["prazo"] ?? t["due_date"]);
    return !!prazo && prazo < now;
  }).length;

  const onboarding_in_progress_count = artistas.filter((a) => {
    return String(a["status"] ?? "").toLowerCase() === "onboarding";
  }).length;

  const leads_filtered = leads.filter((l) => {
    const s = String(l["status"] ?? "").toLowerCase();
    return s !== "convertido" && s !== "perdido";
  });

  // External integrations / monitoring counters — não há fonte em mock,
  // então retornamos 0 (honesto) em vez de inventar números.
  return {
    artists: artistas.length,
    artists_by_status,
    contracts: contratos.length,
    contracts_by_status,
    active_contracts_count,
    contracts_expiring_soon_count,
    leads: leads_filtered.length,
    open_tickets,
    campaigns: campanhas.length,
    revenue_current_month,
    expenses_current_month,
    net_result_current_month,
    pending_receivables,
    overdue_invoices_count,
    paid_transactions_count,
    cancelled_transactions_count,
    invoices_by_status,
    transactions_by_status,
    transactions_by_tipo,
    pending_tasks_count,
    overdue_tasks_count,
    onboarding_in_progress_count,
    overdue_followups_count: 0,
    pending_distribution_setups: 0,
    pending_external_syncs: 0,
    failed_external_syncs: 0,
    successful_external_syncs: 0,
    distributor_submissions_count: 0,
    society_submissions_count: 0,
    external_validation_errors_count: 0,
    pending_provider_requirements_count: 0,
    generated_at: new Date().toISOString(),
    // eventos não tem campo no DashboardOperacional mas o cálculo está aqui para futuro:
    _events_total: eventos.length,
  } as OperationalDashboard;
}

export function useOperationalDashboard() {
  const { data, isLoading, error, refetch } = useQuery<OperationalDashboard>({
    queryKey: ["operational-dashboard"],
    queryFn: () => api.get<OperationalDashboard>("/analytics/dashboard"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return { dashboard: data ?? null, isLoading, error, refetch };
}

