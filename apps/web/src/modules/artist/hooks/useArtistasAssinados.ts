import { useQuery } from "@tanstack/react-query";
import type { ArtistaAssinado } from "@/modules/artist/types/artista.types";
import { storage } from "@/shared/lib/storage";
import { QUERY_KEYS, getCacheConfig } from "@/shared/lib/query-config";

export type { ArtistaAssinado };

const cacheConfig = getCacheConfig([...QUERY_KEYS.ARTISTAS]);

// Referência estável — ver mesmo comentário em shared/hooks/useDataQuery.ts:
// `query.data ?? []` alocaria um array novo a cada render sem dado (loading
// ou erro sem sucesso anterior), quebrando useMemo/useEffect que dependem
// deste array em quem consome o hook.
const EMPTY_ARTISTAS: readonly ArtistaAssinado[] = [];

export function useArtistasAssinados() {
  const query = useQuery<ArtistaAssinado[], Error, ArtistaAssinado[]>({
    queryKey: [...QUERY_KEYS.ARTISTAS],
    queryFn: async () =>
      storage.list<ArtistaAssinado>("artistas"),
    select: (data) =>
      data.filter((a) => a.status === "contratado"),
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.gcTime,
  });

  return {
    artistas: query.data ?? EMPTY_ARTISTAS,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

