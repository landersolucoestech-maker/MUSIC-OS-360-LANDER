import type { DSPStream, DSPRevenue, PlatformAnalytics, DSPPlaylist, TikTokAnalytics, AudienceData } from "../types";

export const MOCK_DSP_STREAMS: DSPStream[] = [
  { id: "ds-001", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", plataforma: "spotify", streams: 842300, saves: 31200, skip_rate: 0.12, completion_rate: 0.78, periodo: "2026-03", pais: "BR", revenue_usd: 2948.05 },
  { id: "ds-002", obra_titulo: "Beira do Rio", artista: "Grupo Raiz Nordestina", isrc: "BRMSC2500002", plataforma: "spotify", streams: 521000, saves: 18700, skip_rate: 0.09, completion_rate: 0.82, periodo: "2026-03", pais: "BR", revenue_usd: 1823.50 },
  { id: "ds-003", obra_titulo: "Amor de Interior", artista: "Ana Beatriz Santos", isrc: "BRMSC2500004", plataforma: "apple_music", streams: 312000, saves: 22100, skip_rate: 0.07, completion_rate: 0.85, periodo: "2026-03", pais: "BR", revenue_usd: 1872.00 },
  { id: "ds-004", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", plataforma: "youtube_music", streams: 1200000, saves: 8900, skip_rate: 0.21, completion_rate: 0.61, periodo: "2026-03", pais: "BR", revenue_usd: 1080.00 },
  { id: "ds-005", obra_titulo: "Frequência 440", artista: "DJ Marcus Flow", isrc: "BRMSC2500003", plataforma: "beatport", streams: 45000, saves: 3200, skip_rate: 0.05, completion_rate: 0.91, periodo: "2026-03", pais: "BR", revenue_usd: 675.00 },
  { id: "ds-006", obra_titulo: "Suíte Brasileira nº 1", artista: "Trio Bossa Moderna", isrc: "BRMSC2500005", plataforma: "tidal", streams: 87400, saves: 12300, skip_rate: 0.06, completion_rate: 0.89, periodo: "2026-03", pais: "BR", revenue_usd: 1223.60 },
  { id: "ds-007", obra_titulo: "Cidade Mágica", artista: "Vitória Lunar", isrc: "BRMSC2500006", plataforma: "deezer", streams: 198000, saves: 7600, skip_rate: 0.14, completion_rate: 0.72, periodo: "2026-03", pais: "PT", revenue_usd: 594.00 },
  { id: "ds-008", obra_titulo: "Trap do Norte", artista: "Pedro Breaks", isrc: "BRMSC2500008", plataforma: "spotify", streams: 634000, saves: 41200, skip_rate: 0.11, completion_rate: 0.75, periodo: "2026-03", pais: "BR", revenue_usd: 2219.00 },
];

export const MOCK_DSP_REVENUE: DSPRevenue[] = [
  { id: "rev-001", plataforma: "spotify", periodo: "2026-03", streams: 2341200, revenue_usd: 8197.20, revenue_brl: 40986.00, royalty_rate: 0.0035, status: "pendente" },
  { id: "rev-002", plataforma: "apple_music", periodo: "2026-03", streams: 312000, revenue_usd: 1872.00, revenue_brl: 9360.00, royalty_rate: 0.0060, status: "pendente" },
  { id: "rev-003", plataforma: "youtube_music", periodo: "2026-03", streams: 1200000, revenue_usd: 1080.00, revenue_brl: 5400.00, royalty_rate: 0.0009, status: "pendente" },
  { id: "rev-004", plataforma: "beatport", periodo: "2026-03", streams: 45000, revenue_usd: 675.00, revenue_brl: 3375.00, royalty_rate: 0.0150, status: "pago" },
  { id: "rev-005", plataforma: "tidal", periodo: "2026-03", streams: 87400, revenue_usd: 1223.60, revenue_brl: 6118.00, royalty_rate: 0.0140, status: "pago" },
  { id: "rev-006", plataforma: "deezer", periodo: "2026-03", streams: 198000, revenue_usd: 594.00, revenue_brl: 2970.00, royalty_rate: 0.0030, status: "pendente" },
  { id: "rev-007", plataforma: "spotify", periodo: "2026-02", streams: 2180000, revenue_usd: 7630.00, revenue_brl: 38150.00, royalty_rate: 0.0035, status: "pago" },
];

export const MOCK_PLATFORM_ANALYTICS: PlatformAnalytics[] = [
  { plataforma: "spotify", streams_total: 2341200, revenue_total_usd: 8197.20, monthly_listeners: 148700, saves: 91100, playlist_reach: 23, growth_pct: 12.4, top_markets: ["BR", "PT", "US"] },
  { plataforma: "apple_music", streams_total: 312000, revenue_total_usd: 1872.00, monthly_listeners: 41200, saves: 22100, playlist_reach: 8, growth_pct: 7.1, top_markets: ["BR", "US", "GB"] },
  { plataforma: "youtube_music", streams_total: 1200000, revenue_total_usd: 1080.00, monthly_listeners: 312000, saves: 8900, playlist_reach: 15, growth_pct: 18.9, top_markets: ["BR", "MX", "CO"] },
  { plataforma: "beatport", streams_total: 45000, revenue_total_usd: 675.00, monthly_listeners: 12300, saves: 3200, playlist_reach: 4, growth_pct: 5.2, top_markets: ["BR", "DE", "NL"] },
  { plataforma: "tidal", streams_total: 87400, revenue_total_usd: 1223.60, monthly_listeners: 21000, saves: 12300, playlist_reach: 6, growth_pct: 3.8, top_markets: ["BR", "US", "SE"] },
  { plataforma: "deezer", streams_total: 198000, revenue_total_usd: 594.00, monthly_listeners: 52100, saves: 7600, playlist_reach: 11, growth_pct: 9.6, top_markets: ["BR", "FR", "PT"] },
];

export const MOCK_PLAYLISTS: DSPPlaylist[] = [
  { id: "pl-001", nome: "Hot Hits Brasil", plataforma: "spotify", seguidores: 2400000, obras_incluidas: ["Noite de Luz"], editorial: true, data_inclusao: "2026-04-15", streams_gerados: 341200 },
  { id: "pl-002", nome: "Sertanejo Romântico", plataforma: "spotify", seguidores: 890000, obras_incluidas: ["Amor de Interior"], editorial: false, data_inclusao: "2026-03-20", streams_gerados: 124000 },
  { id: "pl-003", nome: "Forró Essencial", plataforma: "apple_music", seguidores: 310000, obras_incluidas: ["Beira do Rio", "Xote da Saudade"], editorial: true, data_inclusao: "2026-04-01", streams_gerados: 98700 },
  { id: "pl-004", nome: "Eletrônico BR", plataforma: "beatport", seguidores: 156000, obras_incluidas: ["Frequência 440"], editorial: false, data_inclusao: "2026-02-10", streams_gerados: 43000 },
  { id: "pl-005", nome: "Bossa & MPB Clássico", plataforma: "tidal", seguidores: 212000, obras_incluidas: ["Suíte Brasileira nº 1"], editorial: true, data_inclusao: "2026-03-05", streams_gerados: 67400 },
];

export const MOCK_TIKTOK_ANALYTICS: TikTokAnalytics[] = [
  { id: "tt-001", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", videos_criados: 4820, views_total: 18700000, likes_total: 2340000, shares_total: 198000, uso_comercial: false, crescimento_semanal_pct: 23.4, periodo: "2026-03" },
  { id: "tt-002", obra_titulo: "Trap do Norte", artista: "Pedro Breaks", isrc: "BRMSC2500008", videos_criados: 12300, views_total: 67400000, likes_total: 8900000, shares_total: 1200000, uso_comercial: true, crescimento_semanal_pct: 41.2, periodo: "2026-03" },
  { id: "tt-003", obra_titulo: "Frequência 440", artista: "DJ Marcus Flow", isrc: "BRMSC2500003", videos_criados: 3200, views_total: 9800000, likes_total: 1100000, shares_total: 87000, uso_comercial: false, crescimento_semanal_pct: 12.7, periodo: "2026-03" },
];

export const MOCK_AUDIENCE: AudienceData[] = [
  {
    plataforma: "spotify",
    paises: [
      { pais: "Brasil", codigo: "BR", streams: 1890000, pct: 80.7 },
      { pais: "Portugal", codigo: "PT", streams: 234000, pct: 10.0 },
      { pais: "Estados Unidos", codigo: "US", streams: 112000, pct: 4.8 },
      { pais: "México", codigo: "MX", streams: 56000, pct: 2.4 },
      { pais: "Outros", codigo: "XX", streams: 49200, pct: 2.1 },
    ],
    faixa_etaria: [
      { faixa: "18-24", pct: 31 },
      { faixa: "25-34", pct: 38 },
      { faixa: "35-44", pct: 19 },
      { faixa: "45+", pct: 12 },
    ],
    genero: { masculino: 44, feminino: 52, outro: 4 },
  },
];
