import { QUERY_KEYS } from "@/shared/lib/query-config";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { emit, DomainEvents } from "@/shared/domain-events";
import { useTenant } from "@/app/providers/TenantContext";
import type {
  NotaFiscal,
  NotaFiscalInsert,
  NotaFiscalUpdate,
  NotaFiscalWithRelations,
} from "../types/accounting.types";

export type { NotaFiscal, NotaFiscalInsert, NotaFiscalUpdate, NotaFiscalWithRelations };

function invoiceValue(invoice: NotaFiscalWithRelations): number | undefined {
  const row = invoice as NotaFiscalWithRelations & {
    valor_servicos?: number | string;
    valor?: number | string;
  };
  const raw = row.valor_servicos ?? row.valor;
  if (raw === null || raw === undefined || raw === "") return undefined;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useNotasFiscais() {
  const { tenant } = useTenant();
  const orgId = tenant?.id ?? "unknown";

  const result = useDataQuery<NotaFiscalWithRelations>({
    queryKey: [...QUERY_KEYS.NOTAS_FISCAIS],
    table: "notas_fiscais",
    select: "*, clientes(*)",
    onMutationSuccess: {
      onCreate: (nf) =>
        emit(DomainEvents.INVOICE_CREATED, {
          id: (nf as NotaFiscalWithRelations & { id: string }).id,
          numero: (nf as NotaFiscalWithRelations & { numero?: string }).numero ?? undefined,
          client_id: (nf as NotaFiscalWithRelations & { client_id?: string }).client_id ?? undefined,
          valor: invoiceValue(nf),
          org_id: orgId,
        }),
      onUpdate: (nf) =>
        emit(DomainEvents.INVOICE_UPDATED, {
          id: (nf as NotaFiscalWithRelations & { id: string }).id,
          numero: (nf as NotaFiscalWithRelations & { numero?: string }).numero ?? undefined,
          client_id: (nf as NotaFiscalWithRelations & { client_id?: string }).client_id ?? undefined,
          valor: invoiceValue(nf),
          org_id: orgId,
        }),
      onDelete: (id) =>
        emit(DomainEvents.INVOICE_DELETED, { id, org_id: orgId }),
    },
  }, {
    create: { success: "Nota fiscal criada com sucesso!", error: "Erro ao criar nota fiscal" },
    update: { success: "Nota fiscal atualizada com sucesso!", error: "Erro ao atualizar nota fiscal" },
    delete: { success: "Nota fiscal excluída com sucesso!", error: "Erro ao excluir nota fiscal" },
  });

  return {
    notasFiscais: result.data,
    isLoading: result.isLoading,
    error: result.error,
    addNotaFiscal: result.create,
    updateNotaFiscal: result.update,
    deleteNotaFiscal: result.delete,
  };
}
