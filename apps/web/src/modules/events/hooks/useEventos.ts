import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { Evento, EventoInsert, EventoUpdate, EventoWithRelations } from "../types/events.types";

export type { Evento, EventoInsert, EventoUpdate, EventoWithRelations };

export function useEventos(enabled = true, artistId?: string) {
  const result = useDataQuery<EventoWithRelations>({
    queryKey: artistId ? [...QUERY_KEYS.EVENTOS, "by-artist", artistId] : [...QUERY_KEYS.EVENTOS],
    table: "eventos",
    select: "*, artistas(*)",
    orderBy: { column: "data", ascending: true },
    enabled,
    // EventsService.list() só lê "artist_id" (pt-BR); "artistId" (camelCase)
    // existe no DTO só por compatibilidade e nunca é lido — ver events.dto.ts.
    filters: artistId ? { artist_id: artistId } : undefined,
  }, {
    create: { success: "Evento criado com sucesso!", error: "Erro ao criar evento" },
    update: { success: "Evento atualizado com sucesso!", error: "Erro ao atualizar evento" },
    delete: { success: "Evento excluído com sucesso!", error: "Erro ao excluir evento" },
  });

  return {
    eventos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addEvento: result.create,
    updateEvento: result.update,
    deleteEvento: result.delete,
  };
}
