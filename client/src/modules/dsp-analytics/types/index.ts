/**
 * Tipos de domínio — DSP Analytics (Streaming Digital)
 * NÃO misturar com execução pública/ECAD.
 */

export type DSPPlatform =
  | "spotify"
  | "apple_music"
  | "youtube_music"
  | "tidal"
  | "deezer"
  | "beatport"
  | "amazon_music"
  | "tiktok";

export interface DSPStream {
  id: string;
  obra_titulo: string;
  artista: string;
  isrc: string;
  plataforma: DSPPlatform;
  streams: number;
  saves: number;
  skip_rate: number;
  completion_rate: number;
  periodo: string;
  pais: string;
  revenue_usd: number;
}

export interface DSPRevenue {
  id: string;
  plataforma: DSPPlatform;
  periodo: string;
  streams: number;
  revenue_usd: number;
  revenue_brl: number;
  royalty_rate: number;
  status: "pago" | "pendente" | "processando";
}

export interface PlatformAnalytics {
  plataforma: DSPPlatform;
  streams_total: number;
  revenue_total_usd: number;
  monthly_listeners: number;
  saves: number;
  playlist_reach: number;
  growth_pct: number;
  top_markets: string[];
}

export interface DSPPlaylist {
  id: string;
  nome: string;
  plataforma: DSPPlatform;
  seguidores: number;
  obras_incluidas: string[];
  editorial: boolean;
  data_inclusao: string;
  streams_gerados: number;
}

export interface TikTokAnalytics {
  id: string;
  obra_titulo: string;
  artista: string;
  isrc: string;
  videos_criados: number;
  views_total: number;
  likes_total: number;
  shares_total: number;
  uso_comercial: boolean;
  crescimento_semanal_pct: number;
  periodo: string;
}

export interface AudienceData {
  plataforma: DSPPlatform;
  paises: AudienceCountry[];
  faixa_etaria: AudienceAge[];
  genero: { masculino: number; feminino: number; outro: number };
}

export interface AudienceCountry {
  pais: string;
  codigo: string;
  streams: number;
  pct: number;
}

export interface AudienceAge {
  faixa: string;
  pct: number;
}
