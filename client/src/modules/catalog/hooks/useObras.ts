import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { storage } from "@/shared/lib/storage";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/shared/providers";
import type { Obra, ObraInsert, ObraUpdate, ObraWithRelations } from "../types/catalog.types";

export type { Obra, ObraInsert, ObraUpdate, ObraWithRelations };

export function useObras() {
  const queryClient = useQueryClient();
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

  const bulkUpdateEcad = async (ids: string[], codEcad: string): Promise<{ succeeded: number; failed: number }> => {
    const results = await Promise.allSettled(
      ids.map((id) =>
        storage.update<ObraWithRelations & { id: string }>(
          "obras",
          id,
          { cod_ecad: codEcad } as Partial<ObraWithRelations & { id: string }>,
        )
      )
    );
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OBRAS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROJETOS });
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    return { succeeded, failed };
  };

  return {
    obras: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addObra: result.create,
    updateObra: result.update,
    deleteObra: result.delete,
    bulkUpdateEcad,
  };
}
