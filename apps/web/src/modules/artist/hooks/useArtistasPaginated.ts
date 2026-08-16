import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { api } from "@/shared/lib/api-client";
import type { Artista } from "../types/artista.types";

export interface UseArtistasPaginatedParams {
  /** 0-indexado, mesma convenção de usePagination()/TablePagination. */
  page: number;
  pageSize: number;
  search?: string;
  /** exclusivo/parceiro/independente — filtro server-side via EXISTS em contracts (ver artists.service.ts). */
  vinculo?: "exclusivo" | "parceiro" | "independente";
  genero?: string;
}

/**
 * Lista paginada server-side de artistas — companheira de useArtistas()
 * (que continua servindo os usos "me dê todos os artistas": dropdowns,
 * cross-referência em useMetrics/useAgendaParticipants, mutations dos
 * modais). Task H: a tabela de /artistas usa isso para as linhas
 * exibidas; vínculo/gêneros vêm de endpoints agregados dedicados
 * (useArtistasVinculoStats/useGenerosDistintos), nunca da lista completa.
 */
export type ArtistaComVinculo = Artista & { vinculo?: "exclusivo" | "parceiro" | "independente" };

export function useArtistasPaginated({ page, pageSize, search, vinculo, genero }: UseArtistasPaginatedParams) {
  const filters: Record<string, unknown> = {};
  if (vinculo) filters.vinculo = vinculo;
  if (genero) filters.genre = genero;

  const result = usePaginatedDataQuery<ArtistaComVinculo>({
    queryKey: [...QUERY_KEYS.ARTISTAS],
    table: "artistas",
    page: page + 1,
    pageSize,
    search,
    filters,
  });

  return {
    artistas: result.items,
    total: result.total,
    totalPages: result.totalPages,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface VinculoStats {
  exclusivo: number;
  parceiro: number;
  independente: number;
  total: number;
}

const EMPTY_VINCULO: VinculoStats = { exclusivo: 0, parceiro: 0, independente: 0, total: 0 };
const EMPTY_GENEROS: string[] = [];

/** GET /artists/stats/vinculo — contagem exata por vínculo, tenant inteiro. */
export function useArtistasVinculoStats() {
  const query = useQuery<VinculoStats>({
    queryKey: [...QUERY_KEYS.ARTISTAS, "stats", "vinculo"],
    queryFn: ({ signal }) => api.get<VinculoStats>("/artists/stats/vinculo", { signal }),
    staleTime: 30_000,
  });
  return { stats: query.data ?? EMPTY_VINCULO, isLoading: query.isLoading, error: query.error };
}

/** GET /artists/stats/generos — gêneros distintos do tenant, para o filtro. */
export function useGenerosDistintos() {
  const query = useQuery<string[]>({
    queryKey: [...QUERY_KEYS.ARTISTAS, "stats", "generos"],
    queryFn: ({ signal }) => api.get<string[]>("/artists/stats/generos", { signal }),
    staleTime: 60_000,
  });
  return { generos: query.data ?? EMPTY_GENEROS, isLoading: query.isLoading };
}
