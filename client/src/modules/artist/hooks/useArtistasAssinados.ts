import { useQuery } from "@tanstack/react-query";
import type { Artista } from "@/modules/artist/hooks/useArtistas";
import { storage } from "@/shared/lib/storage";
import { QUERY_KEYS, getCacheConfig } from "@/shared/lib/query-config";

export type ArtistaAssinado = Artista;

const cacheConfig = getCacheConfig([...QUERY_KEYS.ARTISTAS]);

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
    artistas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
