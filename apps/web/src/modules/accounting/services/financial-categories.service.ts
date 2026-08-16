import { api } from "@/lib/api";
import type {
  FinancialCategory,
  FinancialCategoryFilters,
} from "../types/financial-categories.types";

function buildQuery(params: object = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    usp.set(key, String(value));
  });
  const query = usp.toString();
  return query ? `?${query}` : "";
}

export const financialCategoriesService = {
  list: (params: FinancialCategoryFilters = {}) =>
    api.get<FinancialCategory[]>(`/financial-categories${buildQuery(params)}`),
  tree: (params: Pick<FinancialCategoryFilters, "parent_id"> = {}) =>
    api.get<FinancialCategory[]>(`/financial-categories/tree${buildQuery(params)}`),
  findById: (id: string) => api.get<FinancialCategory>(`/financial-categories/${id}`),
  descendants: (id: string) => api.get<FinancialCategory[]>(`/financial-categories/${id}/descendants`),
  ancestors: (id: string) => api.get<FinancialCategory[]>(`/financial-categories/${id}/ancestors`),
  search: (params: FinancialCategoryFilters = {}) =>
    api.get<FinancialCategory[]>(`/financial-categories/search${buildQuery(params)}`),
  create: (data: Partial<FinancialCategory>) => api.post<FinancialCategory>("/financial-categories", data),
  update: (id: string, data: Partial<FinancialCategory>) => api.patch<FinancialCategory>(`/financial-categories/${id}`, data),
  move: (id: string, data: { parent_id?: string | null; tree_order?: number }) =>
    api.patch<FinancialCategory>(`/financial-categories/${id}/move`, data),
  reorder: (id: string, tree_order: number) =>
    api.patch<FinancialCategory>(`/financial-categories/${id}/reorder`, { tree_order }),
  archive: (id: string) => api.patch<FinancialCategory>(`/financial-categories/${id}/archive`, {}),
  restore: (id: string) => api.patch<FinancialCategory>(`/financial-categories/${id}/restore`, {}),
  remove: async (id: string) => {
    await api.delete(`/financial-categories/${id}`);
    return { deleted: true };
  },
};
