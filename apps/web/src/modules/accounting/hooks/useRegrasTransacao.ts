import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { accountingService } from "../services";
import { toast } from "sonner";

export interface RegraTransacao {
  id: string;
  nome: string;
  descricao: string;
  tipoTransacao: string;
  tipoCliente: string;
  categoria: string;
  camposVisiveis: string[];
  camposObrigatorios: string[];
  prioridade: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type RegraTransacaoInsert = Omit<RegraTransacao, "id" | "created_at" | "updated_at">;

export function useRegrasTransacao() {
  const queryClient = useQueryClient();

  const query = useQuery<RegraTransacao[]>({
    queryKey: [...QUERY_KEYS.REGRAS_TRANSACAO],
    queryFn: () => accountingService.listRegrasTransacao() as unknown as Promise<RegraTransacao[]>,
  });

  const createMutation = useMutation({
    mutationFn: (data: RegraTransacaoInsert) =>
      accountingService.createRegraTransacao(data as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REGRAS_TRANSACAO });
      toast.success("Regra criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar regra");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RegraTransacaoInsert> }) =>
      accountingService.updateRegraTransacao(id, data as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REGRAS_TRANSACAO });
      toast.success("Regra atualizada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar regra");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingService.deleteRegraTransacao(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REGRAS_TRANSACAO });
      toast.success("Regra excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir regra");
    },
  });

  return {
    regras: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createRegra: createMutation.mutate,
    updateRegra: updateMutation.mutate,
    deleteRegra: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
