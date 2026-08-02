import { MIN_USER_PASSWORD_LENGTH, strongPasswordViolations } from './password-policy';

describe('strongPasswordViolations', () => {
  it('senha vazia acumula todas as violações', () => {
    const violations = strongPasswordViolations('');
    expect(violations.length).toBe(5);
  });

  it('senha forte não tem violações', () => {
    expect(strongPasswordViolations('Correto-Cavalo9Bateria!')).toEqual([]);
  });

  it('reprova senha curta mesmo com todas as classes de caractere', () => {
    const violations = strongPasswordViolations('Ab1!Ab1!');
    expect(violations).toContain(`mínimo de ${MIN_USER_PASSWORD_LENGTH} caracteres`);
  });

  it('reprova senha só minúscula', () => {
    const violations = strongPasswordViolations('abcdefghijklmnop');
    expect(violations).toContain('ao menos uma letra maiúscula');
    expect(violations).toContain('ao menos um número');
    expect(violations).toContain('ao menos um símbolo');
  });

  it('reprova senha sem símbolo', () => {
    expect(strongPasswordViolations('Abcdefghijkl9')).toContain('ao menos um símbolo');
  });
});
