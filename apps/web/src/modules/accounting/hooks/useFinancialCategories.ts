import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financialCategoriesService } from "../services/financial-categories.service";
import type { FinancialCategory, FinancialCategoryFilters } from "../types/financial-categories.types";

const K = {
  all: ["financial-categories"] as const,
  list: (params: FinancialCategoryFilters) => ["financial-categories", "list", params] as const,
  tree: (parentId?: string) => ["financial-categories", "tree", parentId ?? "root"] as const,
  detail: (id?: string) => ["financial-categories", "detail", id ?? "none"] as const,
  suggestions: (context: Record<string, unknown>) => ["financial-categories", "suggestions", context] as const,
  rulesPreview: (context: Record<string, unknown>) => ["financial-categories", "rules-preview", context] as const,
};

export function useFinancialCategories(params: FinancialCategoryFilters = {}) {
  return useQuery({
    queryKey: K.list(params),
    queryFn: () => financialCategoriesService.list({ ...params, limit: params.limit ?? 100 }),
  });
}

export function useFinancialCategoryTree(parentId?: string) {
  return useQuery({
    queryKey: K.tree(parentId),
    queryFn: () => financialCategoriesService.tree({ parent_id: parentId }),
  });
}

export function useFinancialCategory(id?: string) {
  return useQuery({
    queryKey: K.detail(id),
    queryFn: () => financialCategoriesService.findById(id!),
    enabled: Boolean(id),
  });
}

export function useFinancialCategorySuggestions(context: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: K.suggestions(context),
    queryFn: () => financialCategoriesService.suggest(context),
    enabled,
  });
}

export function useFinancialCategoryRules(context: Record<string, unknown>, enabled = false) {
  return useQuery({
    queryKey: K.rulesPreview(context),
    queryFn: () => financialCategoriesService.previewRules(context),
    enabled,
  });
}

export function useFinancialCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: K.all });

  return {
    create: useMutation({
      mutationFn: (data: Partial<FinancialCategory>) => financialCategoriesService.create(data),
      onSuccess: () => { invalidate(); toast.success("Categoria financeira criada"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<FinancialCategory> }) => financialCategoriesService.update(id, data),
      onSuccess: (_data, vars) => { invalidate(); qc.invalidateQueries({ queryKey: K.detail(vars.id) }); toast.success("Categoria financeira atualizada"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    move: useMutation({
      mutationFn: ({ id, parent_id, tree_order }: { id: string; parent_id?: string | null; tree_order?: number }) =>
        financialCategoriesService.move(id, { parent_id, tree_order }),
      onSuccess: () => { invalidate(); toast.success("Subárvore movida"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    reorder: useMutation({
      mutationFn: ({ id, tree_order }: { id: string; tree_order: number }) => financialCategoriesService.reorder(id, tree_order),
      onSuccess: () => { invalidate(); toast.success("Ordem atualizada"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    archive: useMutation({
      mutationFn: (id: string) => financialCategoriesService.archive(id),
      onSuccess: () => { invalidate(); toast.success("Categoria arquivada"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    restore: useMutation({
      mutationFn: (id: string) => financialCategoriesService.restore(id),
      onSuccess: () => { invalidate(); toast.success("Categoria restaurada"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: (id: string) => financialCategoriesService.remove(id),
      onSuccess: () => { invalidate(); toast.success("Categoria removida"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    merge: useMutation({
      mutationFn: ({ id, target_category_id }: { id: string; target_category_id: string }) =>
        financialCategoriesService.merge(id, target_category_id),
      onSuccess: () => { invalidate(); toast.success("Categorias mescladas"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    createRule: useMutation({
      mutationFn: (data: Record<string, unknown>) => financialCategoriesService.createRule(data),
      onSuccess: () => { invalidate(); toast.success("Regra automática criada"); },
      onError: (e: Error) => toast.error(e.message),
    }),
    executeRules: useMutation({
      mutationFn: (context: Record<string, unknown>) => financialCategoriesService.executeRules(context),
      onSuccess: () => { invalidate(); toast.success("Regras executadas"); },
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}
