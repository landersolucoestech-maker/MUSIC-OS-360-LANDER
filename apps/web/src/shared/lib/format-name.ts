/**
 * Formatação de nomes de pessoas — APENAS camada de apresentação.
 *
 * Aplica title-case por palavra, mantendo minúsculas as partículas pt-BR
 * (de, da, do, das, dos, e, …) quando não são a primeira palavra do nome.
 *
 * NÃO altera dados persistidos, DTOs, services nem o banco. Não deve ser usado
 * para nomes artísticos (módulo `artistas`), que podem ter capitalização intencional.
 */

/** Partículas que permanecem minúsculas quando não iniciam o nome. */
const LOWERCASE_PARTICLES = new Set([
  "de", "da", "do", "das", "dos",
  "e",
  "di", "du", "del", "della", "van", "von", "der", "la", "le",
]);

/** Capitaliza um único token, preservando hífens (Ana-Maria) e apóstrofos (D'Angelo). */
function capitalizeToken(token: string): string {
  if (!token) return token;
  // Divide em sub-tokens por hífen/apóstrofo, capitaliza cada um e re-junta com o separador.
  return token.replace(/[^-'\s]+/g, (part) => {
    const lower = part.toLocaleLowerCase("pt-BR");
    return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
  });
}

/**
 * Formata um nome de pessoa para exibição.
 * - `null`/`undefined`/vazio → retorna o fallback (default: string vazia).
 * - Colapsa espaços; capitaliza cada palavra; partículas pt-BR em minúsculo (exceto a 1ª).
 */
export function formatPersonName(name: string | null | undefined, fallback = ""): string {
  if (name == null) return fallback;
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;

  const words = trimmed.split(" ");
  return words
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("pt-BR");
      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) return lower;
      return capitalizeToken(word);
    })
    .join(" ");
}
