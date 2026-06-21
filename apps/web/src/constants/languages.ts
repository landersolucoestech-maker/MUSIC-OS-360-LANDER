/**
 * constants/languages.ts
 *
 * FONTE ÚNICA DE VERDADE — Idiomas da música (PT-BR).
 *
 * Todos os módulos do frontend devem importar daqui. É proibido manter listas
 * locais/duplicadas de idioma. Catálogo ordenado alfabeticamente (locale pt-BR).
 * Camada de apresentação apenas — não altera backend/contratos.
 */

import { sortLabelsPtBr, sortOptionsPtBr, toGenreSlug } from "./musicalGenres";

export { sortLabelsPtBr, sortOptionsPtBr };

/** Slug estável (value canônico) derivado do rótulo do idioma. */
export const toLanguageSlug = toGenreSlug;

/** Rótulos canônicos de idioma (PT-BR), já ordenados alfabeticamente. */
export const LANGUAGE_LABELS: string[] = sortLabelsPtBr([
  "Alemão",
  "Amárico",
  "Árabe",
  "Bengali",
  "Cantonês",
  "Chinês Mandarim",
  "Coreano",
  "Dinamarquês",
  "Espanhol",
  "Filipino",
  "Finlandês",
  "Francês",
  "Grego",
  "Hebraico",
  "Hindi",
  "Holandês",
  "Indonésio",
  "Inglês",
  "Instrumental (Sem Letra)",
  "Iorubá",
  "Italiano",
  "Japonês",
  "Latim",
  "Malaio",
  "Multilíngue",
  "Norueguês",
  "Persa",
  "Polonês",
  "Português",
  "Punjabi",
  "Russo",
  "Suaíli",
  "Sueco",
  "Tailandês",
  "Tamil",
  "Telugu",
  "Turco",
  "Ucraniano",
  "Urdu",
  "Vietnamita",
  "Zulu",
  "Outro",
]);

export interface LanguageOption {
  value: string;
  label: string;
}

/** Catálogo canônico {value(slug), label}, ordenado alfabeticamente. */
export const LANGUAGES: LanguageOption[] = LANGUAGE_LABELS.map((label) => ({
  value: toLanguageSlug(label),
  label,
}));

/** Mapa slug → rótulo (para exibir o rótulo a partir de um value persistido). */
export const LANGUAGE_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value, l.label]),
);
