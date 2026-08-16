import { useQuery } from "@tanstack/react-query";
import { usePaginatedDataQuery } from "@/shared/hooks/usePaginatedDataQuery";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { storage } from "@/shared/lib/storage";

export interface UseEntityLookupParams {
  /** Nome da tabela/recurso — mesma chave usada em TABLE_ENDPOINT (api-client.ts). */
  table: string;
  /** Termo digitado pelo usuário (não-debounced — o hook debounça internamente). */
  search: string;
  filters?: Record<string, unknown>;
  pageSize?: number;
  /** Só busca quando true — tipicamente `open` do popover, evita disparar
   * requests para um combobox que nunca foi aberto. */
  enabled?: boolean;
}

/**
 * Task I — lookup server-side reutilizável para selects/comboboxes/pickers.
 *
 * Substitui o padrão "useArtistas() sem filtro → primeiros 50 do tenant" por
 * busca real: cada tecla (debounced 300ms) vira uma query nova, escopada ao
 * termo digitado — nunca a tabela inteira, nunca um limit fixo maior. Sem
 * busca, mostra os mais recentes (mesmo default de sempre), mas ISSO é
 * intencional (browse-por-recência), não um cap silencioso de 50 pro tenant
 * inteiro — digitar qualquer parte do nome do registro #75 o traz de volta.
 *
 * Reaproveita usePaginatedDataQuery (queryKey, AbortSignal, keepPreviousData,
 * cancelamento de request obsoleta) já validado na Task H — só adiciona o
 * debounce, que ali cada página já fazia individualmente.
 */
export function useEntityLookup<T extends object>({
  table, search, filters, pageSize = 20, enabled = true,
}: UseEntityLookupParams) {
  const debouncedSearch = useDebounce(search, 300);

  const result = usePaginatedDataQuery<T>({
    queryKey: ["lookup", table],
    table,
    page: 1,
    pageSize,
    search: debouncedSearch || undefined,
    filters,
    enabled,
  });

  return {
    items: result.items,
    total: result.total,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    /** Busca em voo (debounce ainda não assentou) — usar para UI de "digitando…". */
    isDebouncing: search !== debouncedSearch,
  };
}

/**
 * Resolve UM registro por ID diretamente (GET /:resource/:id) — nunca varre
 * uma lista truncada. Usa-se para: (a) mostrar o label do valor já
 * selecionado num combobox antes de qualquer busca, e (b) resolver `?edit=id`
 * sem depender do registro estar entre os primeiros 50 carregados.
 */
export function useEntityById<T extends object>(table: string, id: string | null | undefined) {
  const query = useQuery<T | undefined>({
    queryKey: ["byId", table, id],
    queryFn: () => storage.findById<T & { id: string }>(table, id as string) as Promise<T | undefined>,
    enabled: !!id,
    staleTime: 30_000,
  });
  return { entity: query.data, isLoading: query.isLoading, error: query.error };
}
