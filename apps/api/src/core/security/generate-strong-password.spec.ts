import { generateStrongPassword } from './generate-strong-password';

describe('generateStrongPassword', () => {
  it('gera pelo menos 28 caracteres por padrão', () => {
    expect(generateStrongPassword().length).toBeGreaterThanOrEqual(28);
  });

  it('rejeita length < 28', () => {
    expect(() => generateStrongPassword(20)).toThrow(/>= 28/);
  });

  it('contém ao menos um caractere de cada classe exigida', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateStrongPassword();
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[!@#$%&*+\-=?_]/);
    }
  });

  it('nunca repete a mesma senha entre chamadas (alta entropia, não determinístico)', () => {
    const passwords = new Set(Array.from({ length: 100 }, () => generateStrongPassword()));
    expect(passwords.size).toBe(100);
  });

  it('nunca contém caracteres ambíguos (l, O, 0, 1) que dificultam leitura/digitação manual', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateStrongPassword();
      expect(pw).not.toMatch(/[lO01]/);
    }
  });

  it('nunca contém aspas, crases, barras invertidas, espaços, parênteses, colchetes ou chaves (Parte 75 — propensos a erro de cópia/digitação)', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateStrongPassword();
      expect(pw).not.toMatch(/["'`\\\s()[\]{}^]/);
    }
  });

  it('não referencia o projeto, usuário, UUID ou data — é puramente aleatória', () => {
    const pw = generateStrongPassword();
    expect(pw.toLowerCase()).not.toContain('music');
    expect(pw.toLowerCase()).not.toContain('lander');
    expect(pw).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(pw).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('respeita um comprimento customizado maior que o mínimo', () => {
    expect(generateStrongPassword(40).length).toBe(40);
  });
});
