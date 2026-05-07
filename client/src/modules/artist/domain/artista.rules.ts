/**
 * Regras de negócio do domínio Artista.
 */
import type { Artista } from "../types";

export const ARTISTA_STATUS = {
  CONTRATADO: "contratado",
  EM_NEGOCIACAO: "em_negociacao",
  INATIVO: "inativo",
  SUSPENSO: "suspenso",
} as const;

export const ARTISTA_TIPO = {
  SOLO: "solo",
  BANDA: "banda",
  DUPLA: "dupla",
  GRUPO: "grupo",
} as const;

export const GENEROS_MUSICAIS = [
  "Pop",
  "Rock",
  "MPB",
  "Sertanejo",
  "Forró",
  "Funk",
  "Hip-Hop",
  "Gospel",
  "Eletrônico",
  "Reggae",
  "Pagode",
  "Axé",
  "Bossa Nova",
  "Jazz",
  "Clássico",
  "MPB/Bossa Nova",
  "Indie",
  "R&B",
  "Outro",
] as const;

export const TIPO_PESSOA = {
  PF: "PF",
  PJ: "PJ",
} as const;

/** Retorna true se o artista está em um contrato ativo. */
export function isArtistaContratado(artista: Artista): boolean {
  return artista.status === ARTISTA_STATUS.CONTRATADO;
}

/** Retorna o nome de exibição do artista. */
export function getArtistaDisplayName(artista: Artista): string {
  return artista.nome_artistico || artista.nome_civil || "—";
}

/** Retorna true se o artista possui dados de streaming configurados. */
export function hasStreamingData(artista: Artista): boolean {
  return Boolean(
    artista.spotify_artist_id ||
      artista.youtube_channel_id ||
      artista.deezer_url ||
      artista.apple_music_url,
  );
}
