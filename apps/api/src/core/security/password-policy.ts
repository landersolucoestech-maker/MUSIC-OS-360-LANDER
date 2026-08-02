/**
 * password-policy.ts  (Parte 74)
 *
 * Política de força para senhas ESCOLHIDAS PELO USUÁRIO (ex.: troca
 * obrigatória da senha provisória). Distinto de generate-strong-password.ts,
 * que gera a senha provisória em si (CSPRNG, 24+ caracteres) — aqui só
 * validamos o que um humano digitou.
 */

export const MIN_USER_PASSWORD_LENGTH = 12;

const LOWER_RE = /[a-z]/;
const UPPER_RE = /[A-Z]/;
const DIGIT_RE = /[0-9]/;
const SYMBOL_RE = /[^A-Za-z0-9]/;

/** Retorna a lista de requisitos NÃO atendidos (vazia = senha forte o suficiente). */
export function strongPasswordViolations(password: string): string[] {
  const violations: string[] = [];
  if (password.length < MIN_USER_PASSWORD_LENGTH) {
    violations.push(`mínimo de ${MIN_USER_PASSWORD_LENGTH} caracteres`);
  }
  if (!LOWER_RE.test(password)) violations.push('ao menos uma letra minúscula');
  if (!UPPER_RE.test(password)) violations.push('ao menos uma letra maiúscula');
  if (!DIGIT_RE.test(password)) violations.push('ao menos um número');
  if (!SYMBOL_RE.test(password)) violations.push('ao menos um símbolo');
  return violations;
}
