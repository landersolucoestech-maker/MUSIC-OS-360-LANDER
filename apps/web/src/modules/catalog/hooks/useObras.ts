import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/app/providers/TenantContext";
import type { Obra, ObraInsert, ObraUpdate, ObraWithRelations } from "../types/catalog.types";

export type { Obra, ObraInsert, ObraUpdate, ObraWithRelations };

export function useObras() {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<ObraWithRelations>({
    queryKey: [...QUERY_KEYS.OBRAS],
    table: "obras",
    select: "*, artistas(*), projetos(id, titulo)",
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
    addObra: result.create,
    updateObra: result.update,
    deleteObra: result.delete,
  };
}
