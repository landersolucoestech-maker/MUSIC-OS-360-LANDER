/**
 * normalize-email.ts  (Parte 75)
 *
 * Mesma normalização do backend (apps/api/src/core/security/normalize-email.ts):
 * trim + lowercase antes de qualquer chamada de autenticação — sem isso,
 * "Nome@Dominio.com" e " nome@dominio.com " podiam se comportar como
 * entradas diferentes dependendo de onde a comparação acontecesse.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
