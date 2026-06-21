import type { FinanceCategoryRule, FinanceRuleTransactionType } from "../types/financial-categories.types";

export const FINANCE_RULE_TRANSACTION_LABEL: Record<FinanceRuleTransactionType, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
};

export const FINANCE_CATEGORY_OPTIONS: Record<FinanceRuleTransactionType, Array<{ id: string; name: string }>> = {
  RECEITA: [
    { id: "system-revenue-streaming", name: "Receitas Musicais / Streaming" },
    { id: "system-revenue-licensing", name: "Receitas Musicais / Licenciamento" },
    { id: "system-revenue-events", name: "Cachês / Show e Evento" },
    { id: "system-revenue-services", name: "Serviços / Produção Musical" },
    { id: "system-revenue-products", name: "Produtos / Venda Digital" },
  ],
  DESPESA: [
    { id: "system-expense-marketing", name: "Marketing / Anúncios" },
    { id: "system-expense-production", name: "Operacional / Produção Musical" },
    { id: "system-expense-audiovisual", name: "Operacional / Produção Audiovisual" },
    { id: "system-expense-admin", name: "Administrativo / Operação" },
    { id: "system-expense-taxes", name: "Impostos / Tributos" },
  ],
};

const createdAt = "2026-06-01T00:00:00.000Z";

export const SYSTEM_FINANCE_CATEGORY_RULES: FinanceCategoryRule[] = [
  {
    id: "system-rule-streaming",
    keywords: ["spotify", "deezer", "apple music", "youtube music"],
    transactionType: "RECEITA",
    categoryId: "system-revenue-streaming",
    categoryName: "Receitas Musicais / Streaming",
    origin: "SISTEMA",
    priority: 10,
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "system-rule-licensing",
    keywords: ["licenciamento", "sincronização", "sync", "master use"],
    transactionType: "RECEITA",
    categoryId: "system-revenue-licensing",
    categoryName: "Receitas Musicais / Licenciamento",
    origin: "SISTEMA",
    priority: 20,
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "system-rule-ads",
    keywords: ["meta ads", "google ads", "tiktok ads", "spotify ads", "impulsionamento"],
    transactionType: "DESPESA",
    categoryId: "system-expense-marketing",
    categoryName: "Marketing / Anúncios",
    origin: "SISTEMA",
    priority: 10,
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "system-rule-production",
    keywords: ["mixagem", "masterização", "estúdio", "produtor musical"],
    transactionType: "DESPESA",
    categoryId: "system-expense-production",
    categoryName: "Operacional / Produção Musical",
    origin: "SISTEMA",
    priority: 30,
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
];
