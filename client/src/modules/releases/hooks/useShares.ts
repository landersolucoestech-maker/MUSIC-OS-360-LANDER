import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/app/providers/TenantContext";
import type {
  Share,
  ShareInsert,
  ShareUpdate,
  ShareWithRelations,
} from "../types";

export type { Share, ShareInsert, ShareUpdate, ShareWithRelations };

export function useShares() {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<ShareWithRelations>({
    queryKey: [...QUERY_KEYS.SHARES],
    table: "shares",
    select: "*, obras(*), artistas(*)",
    onMutationSuccess: {
      onCreate: (s) =>
        emit(DomainEvents.SHARE_CREATED, {
          id:          (s as ShareWithRelations & { id: string }).id,
          obra_id:     (s as ShareWithRelations & { obra_id?: string }).obra_id ?? undefined,
          artista_id:  (s as ShareWithRelations & { artista_id?: string }).artista_id ?? undefined,
          percentual:  (s as ShareWithRelations & { percentual?: number }).percentual ?? undefined,
          org_id:      orgId,
        }),
      onUpdate: (s) =>
        emit(DomainEvents.SHARE_UPDATED, {
          id:          (s as ShareWithRelations & { id: string }).id,
          obra_id:     (s as ShareWithRelations & { obra_id?: string }).obra_id ?? undefined,
          artista_id:  (s as ShareWithRelations & { artista_id?: string }).artista_id ?? undefined,
          percentual:  (s as ShareWithRelations & { percentual?: number }).percentual ?? undefined,
          org_id:      orgId,
        }),
      onDelete: (id) =>
        emit(DomainEvents.SHARE_DELETED, { id, org_id: orgId }),
    },
  }, {
    create: { success: "Share criado com sucesso!", error: "Erro ao criar share" },
    update: { success: "Share atualizado com sucesso!", error: "Erro ao atualizar share" },
    delete: { success: "Share excluído com sucesso!", error: "Erro ao excluir share" },
  });

  return {
    shares: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addShare: result.create,
    updateShare: result.update,
    deleteShare: result.delete,
  };
}
