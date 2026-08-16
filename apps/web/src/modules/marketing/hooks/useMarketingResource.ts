/**
 * Marketing Module — Generic resource hooks factory.
 *
 * Produces a typed { useList, useCreate, useUpdate, useRemove } bundle for any
 * entity backed by the marketing service repositories. Keeps every per-entity
 * hook a thin, consistent wrapper with shared cache invalidation and toasts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleConcurrencyConflict } from "@/shared/hooks/useConcurrencyConflict";
import type { CreateInput, ID } from "../types/marketing.types";

export const MARKETING_QUERY_ROOT = "marketing";

export interface ResourceRepository<T> {
  list(): Promise<T[]>;
  create(input: CreateInput<T>): Promise<T>;
  update(id: ID, patch: Partial<T>, expectedUpdatedAt?: string): Promise<T>;
  remove(id: ID): Promise<{ id: ID }>;
}

interface ResourceLabels {
  /** Singular display label, e.g. "Campanha". */
  singular: string;
}

export function createResourceHooks<
  T extends { id: ID; createdAt: string; updatedAt: string },
>(key: string, repo: ResourceRepository<T>, labels: ResourceLabels) {
  const queryKey = [MARKETING_QUERY_ROOT, key] as const;

  // Referência estável: sem isso, `.data` fica `undefined` enquanto não há
  // resultado (loading, ou erro sem sucesso anterior), e todo chamador que
  // aplica `const { data = [] } = useList()` aloca um array novo a cada
  // render — quebra useMemo/useEffect que dependam desse valor (mesma classe
  // de bug corrigida em shared/hooks/useDataQuery.ts).
  const EMPTY_LIST: T[] = [];

  function useList(enabled = true) {
    const query = useQuery({ queryKey, queryFn: () => repo.list(), enabled });
    return { ...query, data: query.data ?? EMPTY_LIST };
  }

  function useInvalidate() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: [MARKETING_QUERY_ROOT] });
  }

  function useCreate() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (input: CreateInput<T>) => repo.create(input),
      onSuccess: () => {
        invalidate();
        toast.success(`${labels.singular} criado(a) com sucesso`);
      },
      onError: () => toast.error(`Erro ao criar ${labels.singular.toLowerCase()}`),
    });
  }

  function useUpdate() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: ({ id, patch, expectedUpdatedAt }: { id: ID; patch: Partial<T>; expectedUpdatedAt?: string }) =>
        repo.update(id, patch, expectedUpdatedAt),
      onSuccess: () => {
        invalidate();
        toast.success(`${labels.singular} atualizado(a)`);
      },
      onError: (error: unknown) => {
        if (handleConcurrencyConflict(error, labels.singular.toLowerCase())) return;
        toast.error(`Erro ao atualizar ${labels.singular.toLowerCase()}`);
      },
    });
  }

  function useRemove() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (id: ID) => repo.remove(id),
      onSuccess: () => {
        invalidate();
        toast.success(`${labels.singular} removido(a)`);
      },
      onError: () => toast.error(`Erro ao remover ${labels.singular.toLowerCase()}`),
    });
  }

  return { queryKey, useList, useCreate, useUpdate, useRemove };
}
