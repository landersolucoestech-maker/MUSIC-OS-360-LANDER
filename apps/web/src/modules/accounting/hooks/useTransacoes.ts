import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/app/providers/TenantContext";
import type {
  Transacao,
  TransacaoInsert,
  TransacaoUpdate,
  TransacaoWithRelations,
} from "../types/accounting.types";

export type { Transacao, TransacaoInsert, TransacaoUpdate, TransacaoWithRelations };

export function useTransacoes() {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<TransacaoWithRelations>({
    queryKey: [...QUERY_KEYS.TRANSACOES],
    table: "transacoes",
    select: "*, clientes(*), artistas(*), vendas(*)",
    orderBy: { column: "data", ascending: false },
    onMutationSuccess: {
      onCreate: (t) =>
        emit(DomainEvents.TRANSACTION_CREATED, {
          id: (t as TransacaoWithRelations & { id: string }).id,
          tipo: t.tipo as "receita" | "despesa",
          valor: t.valor ?? 0,
          artista_id: t.artista_id ?? undefined,
          projeto_id: typeof t.projeto_id === "string" ? t.projeto_id : undefined,
          org_id: orgId,
        }),
      onUpdate: (t) =>
        emit(DomainEvents.TRANSACTION_UPDATED, {
          id: (t as TransacaoWithRelations & { id: string }).id,
          tipo: t.tipo as "receita" | "despesa",
          valor: t.valor ?? 0,
          artista_id: t.artista_id ?? undefined,
          projeto_id: typeof t.projeto_id === "string" ? t.projeto_id : undefined,
          org_id: orgId,
        }),
      onDelete: (id) =>
        emit(DomainEvents.TRANSACTION_DELETED, { id, org_id: orgId }),
    },
  }, {
    create: { success: "Transação criada com sucesso!", error: "Erro ao criar transação" },
    update: { success: "Transação atualizada com sucesso!", error: "Erro ao atualizar transação" },
    delete: { success: "Transação excluída com sucesso!", error: "Erro ao excluir transação" },
  });

  return {
    transacoes: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addTransacao: result.create,
    updateTransacao: result.update,
    deleteTransacao: result.delete,
  };
}
