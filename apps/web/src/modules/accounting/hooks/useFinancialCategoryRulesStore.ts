import { useCallback, useEffect, useState } from "react";
import { financialCategoryRulesSeed } from "@/modules/accounting/data/financial-category-rules.seed";
import type { FinancialCategoryRuleEntity } from "@/modules/accounting/types/financial-category-rules.types";

const storageKey = "musicos360_financial_category_rules";

function loadRules(): FinancialCategoryRuleEntity[] {
  if (typeof window === "undefined") return financialCategoryRulesSeed;

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return financialCategoryRulesSeed;

  try {
    const parsed = JSON.parse(stored) as FinancialCategoryRuleEntity[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : financialCategoryRulesSeed;
  } catch {
    return financialCategoryRulesSeed;
  }
}

function persistRules(rules: FinancialCategoryRuleEntity[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(rules));
}

export function useFinancialCategoryRulesStore() {
  const [rules, setRulesState] = useState<FinancialCategoryRuleEntity[]>(loadRules);

  useEffect(() => {
    persistRules(rules);
  }, [rules]);

  const setRules = useCallback((nextRules: FinancialCategoryRuleEntity[]) => {
    setRulesState(nextRules);
    persistRules(nextRules);
  }, []);

  const resetRules = useCallback(() => {
    setRules(financialCategoryRulesSeed);
  }, [setRules]);

  return { rules, setRules, resetRules };
}
