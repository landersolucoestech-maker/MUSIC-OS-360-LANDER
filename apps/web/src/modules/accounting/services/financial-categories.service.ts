import { api } from "@/lib/api";
import type {
  FinancialCategory,
  FinancialCategoryFilters,
  FinancialCategoryRule,
  FinanceCategoryRule,
  FinanceCategoryRuleApi,
  FinanceCategoryRuleDraft,
  FinanceRuleTransactionType,
  FinancialSuggestion,
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
  merge: (id: string, target_category_id: string) =>
    api.post<{ source: FinancialCategory; target: FinancialCategory }>(`/financial-categories/${id}/merge`, { target_category_id }),
  suggest: (context: Record<string, unknown>) =>
    api.post<FinancialSuggestion[]>("/financial-categories/suggest", context),
  createRule: (data: Partial<FinancialCategoryRule>) =>
    api.post<FinancialCategoryRule>("/financial-categories/rules", data),
  previewRules: (context: Record<string, unknown>) =>
    api.post<Array<{ rule: FinancialCategoryRule; matched: boolean; confidence: number; category: FinancialCategory | null }>>(
      "/financial-categories/rules/preview",
      { context },
    ),
  executeRules: (context: Record<string, unknown>) =>
    api.post<Array<{ rule: FinancialCategoryRule; category: FinancialCategory | null }>>(
      "/financial-categories/rules/execute",
      { context },
    ),
};

function getRuleKeywords(rule: FinanceCategoryRuleApi): string[] {
  const raw = rule.conditions.description_contains;
  return Array.isArray(raw) ? raw.map(String) : [];
}

function getRuleTransactionType(rule: FinanceCategoryRuleApi): FinanceRuleTransactionType {
  return rule.conditions.transaction_type === "DESPESA" ? "DESPESA" : "RECEITA";
}

function mapApiRule(rule: FinanceCategoryRuleApi, categories: FinancialCategory[] = []): FinanceCategoryRule {
  const categoryId = rule.category_id ?? String(rule.actions.category_id ?? "");
  const category = categories.find((item) => item.id === categoryId);
  return {
    id: rule.id,
    keywords: getRuleKeywords(rule),
    transactionType: getRuleTransactionType(rule),
    categoryId,
    categoryName: category?.name ?? String(rule.actions.category_name ?? "Categoria não identificada"),
    origin: "PERSONALIZADA",
    priority: rule.priority,
    active: rule.active,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
  };
}

function toApiRulePayload(draft: FinanceCategoryRuleDraft) {
  return {
    name: `${draft.transactionType} · ${draft.categoryName}`,
    description: `Regra automática por palavras-chave: ${draft.keywords.join(", ")}`,
    priority: draft.priority ?? 100,
    active: draft.active,
    category_id: draft.categoryId,
    conditions: {
      transaction_type: draft.transactionType,
      description_contains: draft.keywords,
    },
    actions: {
      category_id: draft.categoryId,
      category_name: draft.categoryName,
      confidence: 0.9,
    },
  };
}

export const financeCategorizationRulesService = {
  async list(categories: FinancialCategory[] = []) {
    const rules = await api.get<FinanceCategoryRuleApi[]>("/financial-categories/rules");
    return rules.map((rule) => mapApiRule(rule, categories));
  },
  async create(draft: FinanceCategoryRuleDraft) {
    const rule = await api.post<FinanceCategoryRuleApi>("/financial-categories/rules", toApiRulePayload(draft));
    return mapApiRule(rule);
  },
  async update(id: string, draft: FinanceCategoryRuleDraft, expectedUpdatedAt?: string) {
    const rule = await api.patch<FinanceCategoryRuleApi>(`/financial-categories/rules/${id}`, {
      ...toApiRulePayload(draft),
      expectedUpdatedAt,
    });
    return mapApiRule(rule);
  },
  async remove(id: string) {
    await api.delete(`/financial-categories/rules/${id}`);
    return { deleted: true };
  },
};
