/**
 * constants/musicalGenres.ts
 *
 * FONTE ÚNICA DE VERDADE — Gêneros Musicais (PT-BR).
 *
 * Todos os módulos do frontend devem importar daqui. É proibido manter listas
 * locais/duplicadas de gênero musical. Catálogo ordenado alfabeticamente
 * (locale pt-BR). Camada de apresentação apenas — não altera backend/contratos.
 */

/** Ordenação alfabética crescente em PT-BR (case/acento-insensível). */
export function sortLabelsPtBr(items: string[]): string[] {
  return [...items].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export function sortOptionsPtBr<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

/** Slug estável (value canônico) derivado do rótulo. */
export function toGenreSlug(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Rótulos canônicos (PT-BR), já ordenados alfabeticamente. */
export const MUSICAL_GENRE_LABELS: string[] = sortLabelsPtBr([
  "Afrobeat",
  "Alternativo",
  "Amapiano",
  "Arrocha",
  "Axé",
  "Baião",
  "Bachata",
  "Blues",
  "Bolero",
  "Boom Bap",
  "Bossa Nova",
  "Clássica",
  "Country",
  "Cumbia",
  "Dancehall",
  "Deep House",
  "Drill",
  "Drum and Bass",
  "Dubstep",
  "EDM",
  "Eletrônica",
  "Experimental",
  "Folk",
  "Forró",
  "Forró Pé de Serra",
  "Funk",
  "Funk Carioca",
  "Funk Paulista",
  "Gospel",
  "Hard Rock",
  "Heavy Metal",
  "Hip Hop",
  "House",
  "Indie",
  "Indie Rock",
  "Instrumental",
  "J-Pop",
  "Jazz",
  "K-Pop",
  "Latina",
  "Lo-fi",
  "Melodic Techno",
  "Metal",
  "MPB",
  "New Age",
  "Pagode",
  "Piseiro",
  "Pop",
  "Pop Rock",
  "Progressive House",
  "Punk",
  "R&B",
  "Rap",
  "Reggae",
  "Reggaeton",
  "Rock",
  "Salsa",
  "Samba",
  "Samba Rock",
  "Sertanejo",
  "Sertanejo Universitário",
  "Soul",
  "Tech House",
  "Techno",
  "Trance",
  "Trap",
  "Trap Funk",
  "Xote",
  "Outro",
]);

export interface GenreOption {
  value: string;
  label: string;
}

/** Catálogo canônico {value(slug), label}, ordenado alfabeticamente. */
export const MUSICAL_GENRES: GenreOption[] = MUSICAL_GENRE_LABELS.map((label) => ({
  value: toGenreSlug(label),
  label,
}));

/** Mapa slug → rótulo (para exibir o rótulo a partir de um value persistido). */
export const MUSICAL_GENRE_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  MUSICAL_GENRES.map((g) => [g.value, g.label]),
);
