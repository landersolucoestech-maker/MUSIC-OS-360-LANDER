import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { api } from "@/shared/lib/api-client";
import type { Transacao } from "./useTransacoes";

export interface UseTransacoesPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  tipo?: string;
  status?: string;
  categoria?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useTransacoesPaginated({
  page, pageSize, search, tipo, status, categoria, dateFrom, dateTo,
}: UseTransacoesPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (tipo) filters.tipo = tipo;
  if (status) filters.status = status;
  if (categoria) filters.categoria = categoria;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const result = usePaginatedDataQuery<Transacao>({
    queryKey: [...QUERY_KEYS.TRANSACOES],
    table: "transacoes",
    page: page + 1,
    pageSize,
    search,
    filters,
  });

  return {
    transacoes: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

interface TipoStatusRow {
  tipo: string;
  status: string;
  cnt: number;
  sum: number;
}

export interface FinanceiroKPIs {
  total: number;
  receitasPagas: number;
  despesasPagas: number;
  lucroLiquido: number;
  contasReceber: number;
  contasPagar: number;
  margem: number;
  receitasPendentes: number;
  despesasPendentes: number;
}

const EMPTY_KPIS: FinanceiroKPIs = {
  total: 0, receitasPagas: 0, despesasPagas: 0, lucroLiquido: 0, contasReceber: 0,
  contasPagar: 0, margem: 0, receitasPendentes: 0, despesasPendentes: 0,
};

/**
 * GET /transactions/stats — distribuição exata tipo×status + soma de valor,
 * tenant inteiro (Task H). Os KPIs de Financeiro.tsx nunca são calculados só
 * sobre a página ou o intervalo de datas atualmente filtrado na tabela.
 */
export function useFinanceiroStats() {
  const query = useQuery<TipoStatusRow[]>({
    queryKey: [...QUERY_KEYS.TRANSACOES, "stats"],
    queryFn: ({ signal }) => api.get<TipoStatusRow[]>("/transactions/stats", { signal }),
    staleTime: 30_000,
  });

  const rows = query.data ?? [];
  let total = 0, receitasPagas = 0, despesasPagas = 0, contasReceber = 0, contasPagar = 0;
  let receitasPendentes = 0, despesasPendentes = 0;
  for (const row of rows) {
    total += row.cnt;
    if (row.tipo === "receita" && row.status === "pago") { receitasPagas += row.sum; }
    else if (row.tipo === "despesa" && row.status === "pago") { despesasPagas += row.sum; }
    else if (row.tipo === "receita" && row.status === "pendente") { contasReceber += row.sum; receitasPendentes += row.cnt; }
    else if (row.tipo === "despesa" && row.status === "pendente") { contasPagar += row.sum; despesasPendentes += row.cnt; }
  }
  const lucroLiquido = receitasPagas - despesasPagas;
  const margem = receitasPagas > 0 ? Math.round((lucroLiquido / receitasPagas) * 100) : 0;

  const kpis: FinanceiroKPIs = rows.length === 0 ? EMPTY_KPIS : {
    total, receitasPagas, despesasPagas, lucroLiquido, contasReceber, contasPagar,
    margem, receitasPendentes, despesasPendentes,
  };

  return { kpis, isLoading: query.isLoading, error: query.error };
}
