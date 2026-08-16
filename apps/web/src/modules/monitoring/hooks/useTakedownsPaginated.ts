import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { api } from "@/shared/lib/api-client";
import type { TakedownWithRelations } from "../types/monitoring.types";

export interface UseTakedownsPaginatedParams {
  /** 0-indexado, mesma convenção de usePagination()/TablePagination. */
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  plataforma?: string;
}

export function useTakedownsPaginated({ page, pageSize, search, status, plataforma }: UseTakedownsPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (plataforma) filters.plataforma = plataforma;

  const result = usePaginatedDataQuery<TakedownWithRelations>({
    queryKey: [...QUERY_KEYS.TAKEDOWNS],
    table: "takedowns",
    page: page + 1,
    pageSize,
    search,
    filters,
  });

  return {
    takedowns: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface TakedownStats {
  total: number;
  byGroup: Record<string, number>;
}

const EMPTY_STATS: TakedownStats = { total: 0, byGroup: {} };

/**
 * Contagem por status, sobre o TENANT INTEIRO — GET /takedowns/stats
 * (agregado no banco). Task H: os KPIs de Takedowns.tsx não podem mais ser
 * calculados só sobre a página atual.
 */
export function useTakedownsStats() {
  const query = useQuery<TakedownStats>({
    queryKey: [...QUERY_KEYS.TAKEDOWNS, "stats"],
    queryFn: ({ signal }) => api.get<TakedownStats>("/takedowns/stats", { signal }),
    staleTime: 30_000,
  });
  return {
    stats: query.data ?? EMPTY_STATS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
