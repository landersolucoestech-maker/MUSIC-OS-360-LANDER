/**
 * normalize-email.ts  (Parte 75)
 *
 * Normalização única e centralizada de e-mail para qualquer comparação,
 * busca ou criação de conta (bootstrap do owner institucional, resolução
 * de duplicidade, etc.) — sem isso, "Nome@Dominio.com" e " nome@dominio.com "
 * podiam ser tratados como contas diferentes em pontos distintos do código.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
