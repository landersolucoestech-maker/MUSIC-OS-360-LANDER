import { matchCategoryRule, normalizeMatchText, type MatchableCategoryRule } from './finance-category-matcher.util';

function rule(overrides: Partial<MatchableCategoryRule> & Pick<MatchableCategoryRule, 'id' | 'keywords'>): MatchableCategoryRule {
  return {
    transaction_type: 'DESPESA',
    priority: 100,
    active: true,
    ...overrides,
  };
}

describe('normalizeMatchText', () => {
  it('remove acentos, baixa caixa e colapsa espaços', () => {
    expect(normalizeMatchText('  Pagamento SPOTIFY   Assinatura  ')).toBe('pagamento spotify assinatura');
    expect(normalizeMatchText('São Paulo — Café')).toBe('sao paulo — cafe');
  });
});

describe('matchCategoryRule — match simples', () => {
  it('encontra regra cuja keyword aparece na descrição', () => {
    const rules = [rule({ id: 'r1', keywords: ['spotify'] })];
    const result = matchCategoryRule(rules, { descricao: 'Pagamento Spotify mensal', transactionType: 'DESPESA' });
    expect(result?.id).toBe('r1');
  });

  it('retorna null quando nenhuma keyword corresponde', () => {
    const rules = [rule({ id: 'r1', keywords: ['spotify'] })];
    const result = matchCategoryRule(rules, { descricao: 'Aluguel do escritório', transactionType: 'DESPESA' });
    expect(result).toBeNull();
  });

  it('retorna null para descrição vazia', () => {
    const rules = [rule({ id: 'r1', keywords: ['spotify'] })];
    expect(matchCategoryRule(rules, { descricao: '', transactionType: 'DESPESA' })).toBeNull();
  });
});

describe('matchCategoryRule — múltiplas keywords', () => {
  it('casa se QUALQUER keyword da regra aparecer na descrição', () => {
    const rules = [rule({ id: 'r1', keywords: ['netflix', 'spotify', 'deezer'] })];
    expect(matchCategoryRule(rules, { descricao: 'Assinatura Deezer Premium', transactionType: 'DESPESA' })?.id).toBe('r1');
  });
});

describe('matchCategoryRule — prioridade', () => {
  it('prefere a regra de menor número de prioridade quando mais de uma corresponde', () => {
    const rules = [
      rule({ id: 'generic', keywords: ['show'], priority: 200 }),
      rule({ id: 'specific', keywords: ['show'], priority: 10 }),
    ];
    // Ambas correspondem — a de prioridade 10 deve ganhar SE já estiver ordenada
    // primeiro na lista recebida (contrato: chamador ordena por priority ASC).
    const ordered = [...rules].sort((a, b) => a.priority - b.priority);
    expect(matchCategoryRule(ordered, { descricao: 'Show ao vivo', transactionType: 'DESPESA' })?.id).toBe('specific');
  });

  it('em empate de prioridade, a primeira da lista recebida vence (ordem estável)', () => {
    const rules = [
      rule({ id: 'first', keywords: ['aluguel'], priority: 50 }),
      rule({ id: 'second', keywords: ['aluguel'], priority: 50 }),
    ];
    expect(matchCategoryRule(rules, { descricao: 'Pagamento aluguel estúdio', transactionType: 'DESPESA' })?.id).toBe('first');
  });
});

describe('matchCategoryRule — regra inativa', () => {
  it('nunca corresponde a uma regra inativa, mesmo com keyword correspondente', () => {
    const rules = [rule({ id: 'inactive', keywords: ['spotify'], active: false })];
    expect(matchCategoryRule(rules, { descricao: 'Pagamento Spotify', transactionType: 'DESPESA' })).toBeNull();
  });

  it('ignora a regra inativa e cai para a próxima ativa que também corresponde', () => {
    const rules = [
      rule({ id: 'inactive', keywords: ['spotify'], active: false, priority: 1 }),
      rule({ id: 'active', keywords: ['spotify'], active: true, priority: 999 }),
    ];
    expect(matchCategoryRule(rules, { descricao: 'Pagamento Spotify', transactionType: 'DESPESA' })?.id).toBe('active');
  });
});

describe('matchCategoryRule — transaction_type', () => {
  it('nunca corresponde a uma regra de tipo de transação diferente', () => {
    const rules = [rule({ id: 'r1', keywords: ['spotify'], transaction_type: 'RECEITA' })];
    expect(matchCategoryRule(rules, { descricao: 'Pagamento Spotify', transactionType: 'DESPESA' })).toBeNull();
  });
});
