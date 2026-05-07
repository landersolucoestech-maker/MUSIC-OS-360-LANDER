/**
 * artist/mappers/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel export — re-exports the canonical artist mapper source of truth.
 * Import from here, not directly from components/.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type {
  ArtistaFormFields,
  FormToArtistaInput,
} from "./artista.mapper";

export {
  ESPECIALIDADES_LABELS,
  extractSpotifyId,
  extractYoutubeId,
  artistaToExportRow,
  importRowToArtista,
  artistaToFormFields,
  formToArtistaPayload,
} from "./artista.mapper";
