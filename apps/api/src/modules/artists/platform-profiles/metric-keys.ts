/**
 * platform-profiles/metric-keys.ts
 *
 * Registro central e tipado de toda métrica de plataforma persistida como
 * série histórica (Fase 2 — Time-Series Foundation). O snapshot store e a
 * API de histórico importam daqui — nenhum outro lugar deve espalhar
 * strings de métrica arbitrárias.
 */

export const METRIC_KEYS = {
  SPOTIFY_MONTHLY_LISTENERS: 'spotify.monthly_listeners',
  YOUTUBE_SUBSCRIBERS: 'youtube.subscribers',
  YOUTUBE_VIEWS: 'youtube.total_views',
  YOUTUBE_VIDEOS: 'youtube.total_videos',
  DEEZER_FANS: 'deezer.fans',
  SOUNDCLOUD_FOLLOWERS: 'soundcloud.followers',
  INSTAGRAM_FOLLOWERS: 'instagram.followers',
  TIKTOK_FOLLOWERS: 'tiktok.followers',
  APPLE_MUSIC_PLAYLIST_COUNT: 'apple-music.playlist_count',
} as const;

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];

/** Unidade explícita por métrica — nenhuma é intercambiável com outra (followers != listeners != views). */
export const METRIC_UNIT: Record<MetricKey, 'count'> = {
  [METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS]: 'count',
  [METRIC_KEYS.YOUTUBE_SUBSCRIBERS]: 'count',
  [METRIC_KEYS.YOUTUBE_VIEWS]: 'count',
  [METRIC_KEYS.YOUTUBE_VIDEOS]: 'count',
  [METRIC_KEYS.DEEZER_FANS]: 'count',
  [METRIC_KEYS.SOUNDCLOUD_FOLLOWERS]: 'count',
  [METRIC_KEYS.INSTAGRAM_FOLLOWERS]: 'count',
  [METRIC_KEYS.TIKTOK_FOLLOWERS]: 'count',
  [METRIC_KEYS.APPLE_MUSIC_PLAYLIST_COUNT]: 'count',
};

export function isMetricKey(value: string): value is MetricKey {
  return (Object.values(METRIC_KEYS) as string[]).includes(value);
}

/**
 * Métrica primária (a mesma exibida no card de plataforma da UI) por
 * plataforma — reaproveitada pelos engines de Fase 3 (Career Stage/
 * Benchmark) para ler o valor atual de `SocialPlatformProfileSnapshot` sem
 * duplicar o mapeamento. Sem entrada de type string genérica: usar a chave
 * exata de `SocialPlatform` (social-platform-sync.types.ts) evita string
 * solta — replicada aqui como literal em vez de importada para não criar
 * dependência circular com esse arquivo.
 */
export const PRIMARY_METRIC_BY_PLATFORM: Record<
  'spotify' | 'youtube' | 'deezer' | 'soundcloud' | 'instagram' | 'tiktok' | 'apple-music',
  MetricKey
> = {
  spotify: METRIC_KEYS.SPOTIFY_MONTHLY_LISTENERS,
  youtube: METRIC_KEYS.YOUTUBE_SUBSCRIBERS,
  deezer: METRIC_KEYS.DEEZER_FANS,
  soundcloud: METRIC_KEYS.SOUNDCLOUD_FOLLOWERS,
  instagram: METRIC_KEYS.INSTAGRAM_FOLLOWERS,
  tiktok: METRIC_KEYS.TIKTOK_FOLLOWERS,
  'apple-music': METRIC_KEYS.APPLE_MUSIC_PLAYLIST_COUNT,
};

/** Extrai o valor atual da métrica primária de um snapshot de perfil (mesma regra do frontend: nunca fabrica 0). */
export function primaryMetricValue(platform: keyof typeof PRIMARY_METRIC_BY_PLATFORM, snapshot: {
  followers: number | null;
  subscribers: number | null;
  monthly_listeners: number | null;
  raw_payload: Record<string, unknown>;
}): number | null {
  switch (platform) {
    case 'spotify': return snapshot.monthly_listeners;
    case 'youtube': return snapshot.subscribers;
    case 'deezer': case 'soundcloud': case 'instagram': case 'tiktok': return snapshot.followers;
    case 'apple-music': {
      const v = snapshot.raw_payload?.['playlist_count'];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
  }
}
