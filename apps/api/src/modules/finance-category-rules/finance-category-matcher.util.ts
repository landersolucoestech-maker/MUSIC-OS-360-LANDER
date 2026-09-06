/**
 * finance-category-matcher.util.ts
 *
 * Task W — motor de correspondência determinístico entre uma transação
 * (type + descrição) e as regras de categorização por palavra-chave
 * (finance_category_keyword_rules). Porta fiel do algoritmo já usado (mas
 * nunca chamado em produção) pelo frontend em
 * apps/web/src/modules/accounting/utils/financialCategorizationRules.utils.ts
 * (matchTransactionCategory) — mesma normalização, mesmo critério de
 * prioridade — para que o comportamento seja idêntico entre as duas pontas
 * e exista UMA ÚNICA implementação real do matcher (o backend, ponto certo
 * da arquitetura para aplicar a regra na criação/importação de transações).
 *
 * Único, puro, sem I/O — testável isoladamente e reutilizável por qualquer
 * caminho de criação de transação (manual, OFX, importação em lote).
 */

export interface MatchableCategoryRule {
  id: string;
  keywords: string[];
  transaction_type: string;
  priority: number;
  active: boolean;
}

const DIACRITICS_REGEX = /[̀-ͯ]/g;

/** Mesma normalização do frontend: remove acentos, minúsculas, espaços colapsados. */
export function normalizeMatchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Encontra a regra ativa de maior precedência cuja alguma keyword aparece na
 * descrição normalizada. Determinístico: assume que `rules` já chega ordenada
 * por um critério estável (priority ASC, created_at ASC — mesmo padrão de
 * FinanceCategoryRulesService.list()); em caso de empate de priority, a
 * primeira da lista recebida vence. Regra inativa ou de tipo de transação
 * diferente nunca participa.
 */
export function matchCategoryRule<T extends MatchableCategoryRule>(
  rules: T[],
  input: { descricao: string; transactionType: string },
): T | null {
  const haystack = normalizeMatchText(input.descricao ?? '');
  if (!haystack) return null;

  const candidates = rules.filter(
    (rule) => rule.active && rule.transaction_type === input.transactionType,
  );

  for (const rule of candidates) {
    if (rule.keywords.some((keyword) => haystack.includes(normalizeMatchText(keyword)))) {
      return rule;
    }
  }
  return null;
}
