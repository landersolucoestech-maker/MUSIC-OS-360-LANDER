// Contrato canônico Apple Music (Métricas Fase 1 — corrige bug reportado
// "Link do Apple Music inválido" para uma URL corretamente cadastrada):
// o segmento de locale de 2 letras (/us/, /br/...) É OPCIONAL — a Apple Music
// aceita URLs com e sem ele. Compartilhado entre os dois consumidores backend
// (apple-music-artist-profile.provider.ts e artist-external-profile-sync.service.ts)
// e deve ficar em sincronia com o espelho no frontend
// (ArtistaPlatformMetrics.tsx normalizeAppleMusicProfileUrl) — se um mudar, o
// outro precisa mudar junto.
export const APPLE_MUSIC_URL_PATTERN =
  /^https?:\/\/(?:www\.|music\.)?apple\.com\/(?:[a-z]{2}\/)?artist\/(?:[^/?#]+\/)?(\d+)(?:[/?#].*)?$/i;

export function extractAppleMusicId(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(APPLE_MUSIC_URL_PATTERN);
  return match?.[1] ?? null;
}
