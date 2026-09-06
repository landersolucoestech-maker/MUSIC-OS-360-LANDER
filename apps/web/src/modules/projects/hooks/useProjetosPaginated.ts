import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { api } from "@/shared/lib/api-client";
import type { ProjetoWithRelations } from "./useProjetos";

export interface UseProjetosPaginatedParams {
  /** 0-indexado, mesma convenção de usePagination()/TablePagination. */
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  type?: string;
  artistId?: string;
  genero?: string;
}

export function useProjetosPaginated({ page, pageSize, search, status, type, artistId, genero }: UseProjetosPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (artistId) filters.artistId = artistId;
  if (genero) filters.genero = genero;

  const result = usePaginatedDataQuery<ProjetoWithRelations>({
    queryKey: [...QUERY_KEYS.PROJETOS],
    table: "projetos",
    page: page + 1,
    pageSize,
    search,
    filters,
  });

  return {
    projetos: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface ProjetoStats {
  total: number;
  byGroup: Record<string, number>;
}

const EMPTY_STATS: ProjetoStats = { total: 0, byGroup: {} };

/**
 * Contagem por status, sobre o TENANT INTEIRO — GET /projects/stats
 * (agregado no banco). Task H: os KPIs de Projetos.tsx não podem mais ser
 * calculados só sobre a página atual (nem sobre a lista inteira baixada
 * no cliente).
 */
export function useProjetosStats() {
  const query = useQuery<ProjetoStats>({
    queryKey: [...QUERY_KEYS.PROJETOS, "stats"],
    queryFn: ({ signal }) => api.get<ProjetoStats>("/projects/stats", { signal }),
    staleTime: 30_000,
  });
  return {
    stats: query.data ?? EMPTY_STATS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
