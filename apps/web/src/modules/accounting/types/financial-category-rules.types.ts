export type FinancialTransactionType =
  | "Receita"
  | "Despesa"
  | "Investimento"
  | "Imposto"
  | "Transferência";

export type FinancialCounterpartyType =
  | "Empresa"
  | "Pessoa"
  | "Artista"
  | "Governo"
  | "Conta Própria";

export type FinancialCategoryLink =
  | "Artista"
  | "Projeto"
  | "Contrato"
  | "Evento"
  | "Centro de custo"
  | "Competência"
  | "Conta Origem"
  | "Conta Destino";

export interface FinancialCategoryRuleEntity {
  id: string;
  transaction_type: FinancialTransactionType;
  counterparty_type: FinancialCounterpartyType;
  category: string;
  subcategory: string | null;
  links: FinancialCategoryLink[] | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialCategoryRuleDraft {
  transaction_type: FinancialTransactionType;
  counterparty_type: FinancialCounterpartyType;
  category: string;
  subcategory: string | null;
  links: FinancialCategoryLink[] | null;
  active: boolean;
  sort_order: number;
}

