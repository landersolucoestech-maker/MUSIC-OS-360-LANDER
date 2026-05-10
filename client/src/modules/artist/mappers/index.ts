/**
 * artist/mappers/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel export — re-exports the canonical artist mapper source of truth.
 * Import from here, not directly from components/.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type {
  ArtistaFormFields,
  ArtistaFormRelacionamento,
  ArtistaFormResponsavel,
  FormToArtistaInput,
  UrlValidationState,
} from "./artista.mapper";

export {
  ESPECIALIDADES_LABELS,
  extractSpotifyId,
  extractYoutubeId,
  gerarSlugArtistico,
  validateSpotifyUrl,
  validateYoutubeUrl,
  validateInstagramUrl,
  validateTiktokUrl,
  validateSoundcloudUrl,
  validateDeezerUrl,
  validateAppleMusicUrl,
  artistaToExportRow,
  importRowToArtista,
  artistaToFormFields,
  formToArtistaPayload,
  emptyRelacionamento,
} from "./artista.mapper";
