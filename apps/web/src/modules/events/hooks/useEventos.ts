import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import type { Evento, EventoInsert, EventoUpdate, EventoWithRelations } from "../types/events.types";

export type { Evento, EventoInsert, EventoUpdate, EventoWithRelations };

export function useEventos() {
  const result = useDataQuery<EventoWithRelations>({
    queryKey: [...QUERY_KEYS.EVENTOS],
    table: "eventos",
    select: "*, artistas(*)",
    orderBy: { column: "data_inicio", ascending: true },
  }, {
    create: { success: "Evento criado com sucesso!", error: "Erro ao criar evento" },
    update: { success: "Evento atualizado com sucesso!", error: "Erro ao atualizar evento" },
    delete: { success: "Evento excluído com sucesso!", error: "Erro ao excluir evento" },
  });

  return {
    eventos: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addEvento: result.create,
    updateEvento: result.update,
    deleteEvento: result.delete,
  };
}
