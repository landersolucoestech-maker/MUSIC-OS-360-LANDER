import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { api } from "@/shared/lib/api-client";
import type { EventoWithRelations } from "./useEventos";

export interface UseEventosScopedParams {
  /** ISO date-time bounds do período visível no calendário (dia/semana/mês/ano). */
  dateFrom: string;
  dateTo: string;
  search?: string;
  type?: string;
  status?: string;
}

/**
 * Eventos do período do calendário atualmente visível — nunca a tabela
 * inteira. `useEventos()` sem filtros ficava presa ao default do backend
 * (limit=50, ver PaginationDto), então tenants com mais de 50 eventos no
 * total perdiam eventos silenciosamente em qualquer mês/semana navegado.
 * Escopar por dateFrom/dateTo (coluna real `data`) resolve isso: cada
 * período tem, na prática, muito menos de 200 eventos.
 */
export function useEventosScoped({ dateFrom, dateTo, search, type, status }: UseEventosScopedParams) {
  const filters: Record<string, unknown> = { dateFrom, dateTo };
  if (type) filters.type = type;
  if (status) filters.status = status;

  const result = usePaginatedDataQuery<EventoWithRelations>({
    queryKey: [...QUERY_KEYS.EVENTOS, "scoped"],
    table: "eventos",
    page: 1,
    pageSize: 200,
    search,
    filters,
  });

  return {
    eventos: result.items,
    total: result.total,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface EventosKPIs {
  total: number;
  confirmados: number;
  pendentes: number;
  proximos7Dias: number;
}

const EMPTY_KPIS: EventosKPIs = { total: 0, confirmados: 0, pendentes: 0, proximos7Dias: 0 };

interface StatsResponse {
  total: number;
  byGroup: Record<string, number>;
  proximos7Dias: number;
}

/** GET /events/stats — KPIs exatos do tenant inteiro, independentes do período do calendário. */
export function useEventosStats() {
  const query = useQuery<StatsResponse>({
    queryKey: [...QUERY_KEYS.EVENTOS, "stats"],
    queryFn: ({ signal }) => api.get<StatsResponse>("/events/stats", { signal }),
    staleTime: 30_000,
  });

  const data = query.data;
  const kpis: EventosKPIs = !data ? EMPTY_KPIS : {
    total: data.total,
    confirmados: data.byGroup["confirmado"] ?? 0,
    pendentes: (data.byGroup["agendado"] ?? 0) + (data.byGroup["pendente"] ?? 0),
    proximos7Dias: data.proximos7Dias,
  };

  return { kpis, isLoading: query.isLoading, error: query.error };
}
