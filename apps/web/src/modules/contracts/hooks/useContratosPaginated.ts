import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { api } from "@/shared/lib/api-client";
import type { ContratoWithRelations } from "./useContratos";

export interface UseContratosPaginatedParams {
  /** 0-indexado, mesma convenção de usePagination()/TablePagination. */
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  type?: string;
  signingPlatform?: string;
}

export function useContratosPaginated({ page, pageSize, search, status, type, signingPlatform }: UseContratosPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (signingPlatform) filters.signing_platform = signingPlatform;

  const result = usePaginatedDataQuery<ContratoWithRelations>({
    queryKey: [...QUERY_KEYS.CONTRATOS],
    table: "contratos",
    page: page + 1,
    pageSize,
    search,
    filters,
  });

  return {
    contratos: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface ContratoStats {
  total: number;
  byGroup: Record<string, number>;
  sumByGroup?: Record<string, number>;
  totalSum?: number;
}

const EMPTY_STATS: ContratoStats = { total: 0, byGroup: {} };

/**
 * Contagem + soma de valor por status, sobre o TENANT INTEIRO — GET
 * /contracts/stats (agregado no banco). Task H: os KPIs de Contratos.tsx
 * não podem mais ser calculados só sobre a página atual.
 */
export function useContratosStats() {
  const query = useQuery<ContratoStats>({
    queryKey: [...QUERY_KEYS.CONTRATOS, "stats"],
    queryFn: ({ signal }) => api.get<ContratoStats>("/contracts/stats", { signal }),
    staleTime: 30_000,
  });
  return {
    stats: query.data ?? EMPTY_STATS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
