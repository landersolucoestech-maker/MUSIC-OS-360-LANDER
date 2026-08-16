import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/app/providers/TenantContext";
import type { Obra, ObraInsert, ObraUpdate, ObraWithRelations } from "../types/catalog.types";

export type { Obra, ObraInsert, ObraUpdate, ObraWithRelations };

export function useObras(enabled = true, artistaId?: string) {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<ObraWithRelations>({
    // artistaId entra na queryKey: sem isso, abrir a Visão 360 do artista A e
    // depois do artista B reaproveitaria (errado) o cache de A — mesma key,
    // filtro server-side diferente (ver Task G).
    queryKey: artistaId ? [...QUERY_KEYS.OBRAS, "by-artist", artistaId] : [...QUERY_KEYS.OBRAS],
    table: "obras",
    select: "*, artistas(*), projetos(id, titulo)",
    enabled,
    filters: artistaId ? { artista_id: artistaId } : undefined,
    additionalInvalidateKeys: [[...QUERY_KEYS.PROJETOS]],
    onMutationSuccess: {
      onCreate: (o) =>
        emit(DomainEvents.MUSIC_REGISTERED, {
          obra_id: (o as ObraWithRelations & { id: string }).id,
          titulo: o.titulo ?? "",
          org_id: orgId,
        }),
      onUpdate: (o) =>
        emit(DomainEvents.MUSIC_UPDATED, {
          obra_id: (o as ObraWithRelations & { id: string }).id,
          titulo: o.titulo ?? "",
          org_id: orgId,
        }),
      onDelete: (id) =>
        emit(DomainEvents.MUSIC_DELETED, { obra_id: id, org_id: orgId }),
    },
  }, {
    create: { success: "Obra criada com sucesso!", error: "Erro ao criar obra" },
    update: { success: "Obra atualizada com sucesso!", error: "Erro ao atualizar obra" },
    delete: { success: "Obra excluída com sucesso!", error: "Erro ao excluir obra" },
  });

  return {
    obras: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    addObra: result.create,
    updateObra: result.update,
    deleteObra: result.delete,
  };
}
