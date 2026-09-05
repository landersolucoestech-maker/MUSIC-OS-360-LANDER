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

export function useTransacoes(enabled = true, artistaId?: string) {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<TransacaoWithRelations>({
    queryKey: artistaId ? [...QUERY_KEYS.TRANSACOES, "by-artist", artistaId] : [...QUERY_KEYS.TRANSACOES],
    table: "transacoes",
    select: "*, clientes(*), artistas(*)",
    orderBy: { column: "data", ascending: false },
    enabled,
    // QueryTransactionDto: "artistId" é alias legado NUNCA lido pelo service (só existe
    // para não quebrar 400 em callers antigos) — o campo real é "artista_id". Enviar
    // "artistId" fazia esse filtro ser silenciosamente ignorado (200 com todas as
    // transações do tenant, não só as do artista) na aba Financeiro do Visão 360°.
    filters: artistaId ? { artista_id: artistaId } : undefined,
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
    refetch: result.refetch,
    addTransacao: result.create,
    updateTransacao: result.update,
    deleteTransacao: result.delete,
  };
}
