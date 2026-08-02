/**
 * auth-error-messages.ts  (Parte 75)
 *
 * Traduz o erro cru do Supabase Auth (ou de falha de rede) para uma
 * mensagem segura e específica o suficiente para o usuário agir, sem
 * revelar se um e-mail arbitrário existe no sistema (anti-enumeração —
 * "Invalid login credentials" é a resposta deliberadamente genérica do
 * Supabase tanto para senha errada quanto para conta inexistente, e isso
 * é mantido aqui também).
 */
import type { AuthError } from "@/shared/types/auth";

const INVALID_CREDENTIALS_RE = /invalid login credentials/i;

/**
 * Parte 77 — só erros GENUINAMENTE de credencial devem contar contra o
 * limitador de tentativas (ver security.ts/AuthRateLimiter.recordFailure).
 * Rede, 503, 500, timeout ou crash do frontend nunca podem consumir uma
 * tentativa do usuário legítimo.
 */
export function isCredentialsError(error: AuthError): boolean {
  return INVALID_CREDENTIALS_RE.test(error.message ?? "");
}

export function describeAuthError(error: AuthError): string {
  const message = error.message ?? "";

  if (INVALID_CREDENTIALS_RE.test(message)) {
    return "Credenciais inválidas.";
  }
  if (/email not confirmed/i.test(message)) {
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  }
  if (error.status === 429 || /rate limit|too many requests/i.test(message)) {
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  }
  if (/failed to fetch|network|fetch failed/i.test(message)) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  return message || "Não foi possível entrar. Tente novamente.";
}
