/**
 * Mock analytics data — read-only, somente métricas simuladas.
 * Nenhuma chamada real de API é feita. Dados para demonstração.
 */

export interface MonthlyPoint {
  mes: string; // "Jan", "Fev", ...
  value: number;
}

// ─── Spotify ────────────────────────────────────────────────────────────────

export interface SpotifyArtistMetrics {
  artistaId: string;
  nome: string;
  genero: string;
  followers: number;
  monthlyListeners: number;
  popularityScore: number; // 0–100
  streamsMes: number;
  topTracks: { titulo: string; streams: number; album: string }[];
  evolution: MonthlyPoint[]; // monthly listeners últimos 6 meses
}

export const SPOTIFY_MOCK: SpotifyArtistMetrics[] = [
  {
    artistaId: "art-001",
    nome: "Vitória Lunar",
    genero: "Pop",
    followers: 284_500,
    monthlyListeners: 1_240_000,
    popularityScore: 72,
    streamsMes: 3_810_000,
    topTracks: [
      { titulo: "Noite de Luz", streams: 1_420_000, album: "EP Lunar" },
      { titulo: "Verão Infinito", streams: 890_000, album: "EP Lunar" },
      { titulo: "Brilha", streams: 620_000, album: "Single 2025" },
      { titulo: "Mar de Estrelas", streams: 480_000, album: "Single 2025" },
      { titulo: "Tempo Livre", streams: 400_000, album: "Single 2024" },
    ],
    evolution: [
      { mes: "Dez", value: 820_000 },
      { mes: "Jan", value: 910_000 },
      { mes: "Fev", value: 980_000 },
      { mes: "Mar", value: 1_060_000 },
      { mes: "Abr", value: 1_150_000 },
      { mes: "Mai", value: 1_240_000 },
    ],
  },
  {
    artistaId: "art-002",
    nome: "Grupo Raiz Nordestina",
    genero: "Forró",
    followers: 187_200,
    monthlyListeners: 762_000,
    popularityScore: 58,
    streamsMes: 2_140_000,
    topTracks: [
      { titulo: "Beira do Rio", streams: 980_000, album: "Raízes Vivas" },
      { titulo: "Chuva de Verão", streams: 540_000, album: "Raízes Vivas" },
      { titulo: "Forró na Veia", streams: 370_000, album: "Ao Vivo 2024" },
      { titulo: "Nordeste Bonito", streams: 150_000, album: "Single 2025" },
      { titulo: "Sanfoneiro", streams: 100_000, album: "Ao Vivo 2024" },
    ],
    evolution: [
      { mes: "Dez", value: 580_000 },
      { mes: "Jan", value: 610_000 },
      { mes: "Fev", value: 640_000 },
      { mes: "Mar", value: 690_000 },
      { mes: "Abr", value: 730_000 },
      { mes: "Mai", value: 762_000 },
    ],
  },
  {
    artistaId: "art-003",
    nome: "DJ Marcus Flow",
    genero: "Eletrônico",
    followers: 95_800,
    monthlyListeners: 430_000,
    popularityScore: 49,
    streamsMes: 1_280_000,
    topTracks: [
      { titulo: "Frequência 440", streams: 620_000, album: "BPM" },
      { titulo: "Drop Zone", streams: 310_000, album: "BPM" },
      { titulo: "Noite Elétrica", streams: 200_000, album: "Single 2025" },
      { titulo: "Bass Horizon", streams: 100_000, album: "Single 2024" },
      { titulo: "Hypnose", streams: 50_000, album: "Single 2024" },
    ],
    evolution: [
      { mes: "Dez", value: 310_000 },
      { mes: "Jan", value: 340_000 },
      { mes: "Fev", value: 370_000 },
      { mes: "Mar", value: 395_000 },
      { mes: "Abr", value: 415_000 },
      { mes: "Mai", value: 430_000 },
    ],
  },
  {
    artistaId: "art-004",
    nome: "Ana Beatriz Santos",
    genero: "Sertanejo",
    followers: 412_700,
    monthlyListeners: 1_890_000,
    popularityScore: 81,
    streamsMes: 5_640_000,
    topTracks: [
      { titulo: "Saudade de Mim", streams: 2_100_000, album: "Alma Sertaneja" },
      { titulo: "Longe de Você", streams: 1_380_000, album: "Alma Sertaneja" },
      { titulo: "Apaixonada", streams: 890_000, album: "Single 2025" },
      { titulo: "Beijo Errado", streams: 760_000, album: "Single 2025" },
      { titulo: "Coração Partido", streams: 510_000, album: "EP 2024" },
    ],
    evolution: [
      { mes: "Dez", value: 1_420_000 },
      { mes: "Jan", value: 1_550_000 },
      { mes: "Fev", value: 1_670_000 },
      { mes: "Mar", value: 1_750_000 },
      { mes: "Abr", value: 1_820_000 },
      { mes: "Mai", value: 1_890_000 },
    ],
  },
];

export const SPOTIFY_TOTALS = {
  totalFollowers: SPOTIFY_MOCK.reduce((s, a) => s + a.followers, 0),
  totalMonthlyListeners: SPOTIFY_MOCK.reduce((s, a) => s + a.monthlyListeners, 0),
  totalStreamsMes: SPOTIFY_MOCK.reduce((s, a) => s + a.streamsMes, 0),
  artistasAtivos: SPOTIFY_MOCK.length,
};

// ─── YouTube ─────────────────────────────────────────────────────────────────

export interface YouTubeArtistMetrics {
  artistaId: string;
  nome: string;
  channelId: string;
  subscribers: number;
  totalViews: number;
  videosPublicados: number;
  watchHoursMes: number;
  viewsMes: number;
  topVideos: { titulo: string; views: number; duracao: string }[];
  evolution: MonthlyPoint[]; // views mensais
}

export const YOUTUBE_MOCK: YouTubeArtistMetrics[] = [
  {
    artistaId: "art-001",
    nome: "Vitória Lunar",
    channelId: "UCvitorialunar",
    subscribers: 142_000,
    totalViews: 8_400_000,
    videosPublicados: 47,
    watchHoursMes: 38_200,
    viewsMes: 620_000,
    topVideos: [
      { titulo: "Noite de Luz (Clipe Oficial)", views: 3_200_000, duracao: "3:55" },
      { titulo: "Verão Infinito (Lyric Video)", views: 1_800_000, duracao: "3:30" },
      { titulo: "Vitória Lunar - Ao Vivo no Lolla", views: 980_000, duracao: "28:14" },
      { titulo: "Brilha (Clipe Oficial)", views: 760_000, duracao: "4:10" },
      { titulo: "Making Of — EP Lunar", views: 430_000, duracao: "12:40" },
    ],
    evolution: [
      { mes: "Dez", value: 380_000 },
      { mes: "Jan", value: 430_000 },
      { mes: "Fev", value: 490_000 },
      { mes: "Mar", value: 540_000 },
      { mes: "Abr", value: 590_000 },
      { mes: "Mai", value: 620_000 },
    ],
  },
  {
    artistaId: "art-002",
    nome: "Grupo Raiz Nordestina",
    channelId: "UCraiznordestina",
    subscribers: 318_000,
    totalViews: 24_700_000,
    videosPublicados: 124,
    watchHoursMes: 92_000,
    viewsMes: 1_840_000,
    topVideos: [
      { titulo: "Beira do Rio (Forró Pé de Serra)", views: 9_800_000, duracao: "4:20" },
      { titulo: "Chuva de Verão - Ao Vivo Recife 2024", views: 4_200_000, duracao: "6:10" },
      { titulo: "Raiz Nordestina — Especial São João 2024", views: 3_100_000, duracao: "52:00" },
      { titulo: "Forró na Veia (Lyric Video)", views: 1_700_000, duracao: "3:45" },
      { titulo: "Nordeste Bonito (Clipe Oficial)", views: 950_000, duracao: "3:58" },
    ],
    evolution: [
      { mes: "Dez", value: 1_200_000 },
      { mes: "Jan", value: 1_350_000 },
      { mes: "Fev", value: 1_480_000 },
      { mes: "Mar", value: 1_620_000 },
      { mes: "Abr", value: 1_740_000 },
      { mes: "Mai", value: 1_840_000 },
    ],
  },
  {
    artistaId: "art-003",
    nome: "DJ Marcus Flow",
    channelId: "UCmarcusflow",
    subscribers: 68_400,
    totalViews: 4_100_000,
    videosPublicados: 38,
    watchHoursMes: 18_600,
    viewsMes: 290_000,
    topVideos: [
      { titulo: "Drop Zone (Set Completo)", views: 1_900_000, duracao: "58:00" },
      { titulo: "Frequência 440 (Visualizer)", views: 780_000, duracao: "5:30" },
      { titulo: "Marcus Flow @ Club Madame SP", views: 640_000, duracao: "1:12:00" },
      { titulo: "Noite Elétrica (Lyric Video)", views: 420_000, duracao: "4:50" },
      { titulo: "Bass Horizon MV", views: 360_000, duracao: "4:00" },
    ],
    evolution: [
      { mes: "Dez", value: 180_000 },
      { mes: "Jan", value: 200_000 },
      { mes: "Fev", value: 230_000 },
      { mes: "Mar", value: 255_000 },
      { mes: "Abr", value: 274_000 },
      { mes: "Mai", value: 290_000 },
    ],
  },
  {
    artistaId: "art-004",
    nome: "Ana Beatriz Santos",
    channelId: "UCanabeatsantos",
    subscribers: 520_000,
    totalViews: 38_900_000,
    videosPublicados: 86,
    watchHoursMes: 154_000,
    viewsMes: 2_960_000,
    topVideos: [
      { titulo: "Saudade de Mim (Clipe Oficial)", views: 14_200_000, duracao: "4:05" },
      { titulo: "Longe de Você (Ao Vivo Arena)", views: 7_800_000, duracao: "5:20" },
      { titulo: "Apaixonada (Clipe Oficial)", views: 4_900_000, duracao: "3:55" },
      { titulo: "Ana Beatriz — DVD Completo 2024", views: 3_200_000, duracao: "1:48:00" },
      { titulo: "Beijo Errado (Lyric Video)", views: 2_100_000, duracao: "3:40" },
    ],
    evolution: [
      { mes: "Dez", value: 2_100_000 },
      { mes: "Jan", value: 2_300_000 },
      { mes: "Fev", value: 2_520_000 },
      { mes: "Mar", value: 2_700_000 },
      { mes: "Abr", value: 2_840_000 },
      { mes: "Mai", value: 2_960_000 },
    ],
  },
];

export const YOUTUBE_TOTALS = {
  totalSubscribers: YOUTUBE_MOCK.reduce((s, a) => s + a.subscribers, 0),
  totalViewsMes: YOUTUBE_MOCK.reduce((s, a) => s + a.viewsMes, 0),
  totalWatchHoursMes: YOUTUBE_MOCK.reduce((s, a) => s + a.watchHoursMes, 0),
  artistasAtivos: YOUTUBE_MOCK.length,
};

// ─── Deezer ──────────────────────────────────────────────────────────────────

export interface DeezerArtistMetrics {
  artistaId: string;
  nome: string;
  fans: number;
  albums: number;
  streamsMes: number;
  topAlbums: { titulo: string; fans: number; ano: string }[];
  evolution: MonthlyPoint[]; // fans
}

export const DEEZER_MOCK: DeezerArtistMetrics[] = [
  {
    artistaId: "art-001",
    nome: "Vitória Lunar",
    fans: 89_200,
    albums: 3,
    streamsMes: 410_000,
    topAlbums: [
      { titulo: "EP Lunar", fans: 54_000, ano: "2025" },
      { titulo: "Single — Brilha", fans: 21_000, ano: "2025" },
      { titulo: "Single — Tempo Livre", fans: 14_200, ano: "2024" },
    ],
    evolution: [
      { mes: "Dez", value: 62_000 },
      { mes: "Jan", value: 70_000 },
      { mes: "Fev", value: 76_000 },
      { mes: "Mar", value: 81_000 },
      { mes: "Abr", value: 86_000 },
      { mes: "Mai", value: 89_200 },
    ],
  },
  {
    artistaId: "art-002",
    nome: "Grupo Raiz Nordestina",
    fans: 134_500,
    albums: 6,
    streamsMes: 780_000,
    topAlbums: [
      { titulo: "Raízes Vivas", fans: 78_000, ano: "2024" },
      { titulo: "Ao Vivo 2024", fans: 34_000, ano: "2024" },
      { titulo: "Nordeste Puro", fans: 22_500, ano: "2023" },
    ],
    evolution: [
      { mes: "Dez", value: 98_000 },
      { mes: "Jan", value: 108_000 },
      { mes: "Fev", value: 116_000 },
      { mes: "Mar", value: 124_000 },
      { mes: "Abr", value: 130_000 },
      { mes: "Mai", value: 134_500 },
    ],
  },
  {
    artistaId: "art-004",
    nome: "Ana Beatriz Santos",
    fans: 210_000,
    albums: 5,
    streamsMes: 1_120_000,
    topAlbums: [
      { titulo: "Alma Sertaneja", fans: 130_000, ano: "2025" },
      { titulo: "EP 2024", fans: 52_000, ano: "2024" },
      { titulo: "Inicio", fans: 28_000, ano: "2023" },
    ],
    evolution: [
      { mes: "Dez", value: 160_000 },
      { mes: "Jan", value: 175_000 },
      { mes: "Fev", value: 188_000 },
      { mes: "Mar", value: 198_000 },
      { mes: "Abr", value: 205_000 },
      { mes: "Mai", value: 210_000 },
    ],
  },
];

export const DEEZER_TOTALS = {
  totalFans: DEEZER_MOCK.reduce((s, a) => s + a.fans, 0),
  totalStreamsMes: DEEZER_MOCK.reduce((s, a) => s + a.streamsMes, 0),
  artistasAtivos: DEEZER_MOCK.length,
};

// ─── Apple Music ──────────────────────────────────────────────────────────────

export interface AppleArtistMetrics {
  artistaId: string;
  nome: string;
  monthlyListeners: number;
  shazams: number;
  topCidades: { cidade: string; pais: string; ouvintes: number }[];
  topTracks: { titulo: string; posicaoChart?: number }[];
  evolution: MonthlyPoint[];
}

export const APPLE_MOCK: AppleArtistMetrics[] = [
  {
    artistaId: "art-001",
    nome: "Vitória Lunar",
    monthlyListeners: 720_000,
    shazams: 48_200,
    topCidades: [
      { cidade: "São Paulo", pais: "BR", ouvintes: 180_000 },
      { cidade: "Rio de Janeiro", pais: "BR", ouvintes: 95_000 },
      { cidade: "Belo Horizonte", pais: "BR", ouvintes: 61_000 },
      { cidade: "Lisboa", pais: "PT", ouvintes: 42_000 },
      { cidade: "Porto", pais: "PT", ouvintes: 28_000 },
    ],
    topTracks: [
      { titulo: "Noite de Luz", posicaoChart: 12 },
      { titulo: "Verão Infinito" },
      { titulo: "Brilha", posicaoChart: 48 },
    ],
    evolution: [
      { mes: "Dez", value: 490_000 },
      { mes: "Jan", value: 550_000 },
      { mes: "Fev", value: 610_000 },
      { mes: "Mar", value: 660_000 },
      { mes: "Abr", value: 695_000 },
      { mes: "Mai", value: 720_000 },
    ],
  },
  {
    artistaId: "art-004",
    nome: "Ana Beatriz Santos",
    monthlyListeners: 1_340_000,
    shazams: 124_000,
    topCidades: [
      { cidade: "São Paulo", pais: "BR", ouvintes: 340_000 },
      { cidade: "Goiânia", pais: "BR", ouvintes: 180_000 },
      { cidade: "Brasília", pais: "BR", ouvintes: 148_000 },
      { cidade: "Campo Grande", pais: "BR", ouvintes: 95_000 },
      { cidade: "Curitiba", pais: "BR", ouvintes: 82_000 },
    ],
    topTracks: [
      { titulo: "Saudade de Mim", posicaoChart: 3 },
      { titulo: "Longe de Você", posicaoChart: 11 },
      { titulo: "Apaixonada", posicaoChart: 28 },
    ],
    evolution: [
      { mes: "Dez", value: 980_000 },
      { mes: "Jan", value: 1_080_000 },
      { mes: "Fev", value: 1_170_000 },
      { mes: "Mar", value: 1_250_000 },
      { mes: "Abr", value: 1_300_000 },
      { mes: "Mai", value: 1_340_000 },
    ],
  },
  {
    artistaId: "art-002",
    nome: "Grupo Raiz Nordestina",
    monthlyListeners: 420_000,
    shazams: 32_800,
    topCidades: [
      { cidade: "Recife", pais: "BR", ouvintes: 98_000 },
      { cidade: "Fortaleza", pais: "BR", ouvintes: 82_000 },
      { cidade: "Salvador", pais: "BR", ouvintes: 60_000 },
      { cidade: "Natal", pais: "BR", ouvintes: 45_000 },
      { cidade: "São Paulo", pais: "BR", ouvintes: 40_000 },
    ],
    topTracks: [
      { titulo: "Beira do Rio", posicaoChart: 8 },
      { titulo: "Chuva de Verão" },
      { titulo: "Forró na Veia" },
    ],
    evolution: [
      { mes: "Dez", value: 310_000 },
      { mes: "Jan", value: 345_000 },
      { mes: "Fev", value: 370_000 },
      { mes: "Mar", value: 390_000 },
      { mes: "Abr", value: 408_000 },
      { mes: "Mai", value: 420_000 },
    ],
  },
];

export const APPLE_TOTALS = {
  totalListeners: APPLE_MOCK.reduce((s, a) => s + a.monthlyListeners, 0),
  totalShazams: APPLE_MOCK.reduce((s, a) => s + a.shazams, 0),
  artistasAtivos: APPLE_MOCK.length,
};

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

export interface MetaAdsCampaign {
  nome: string;
  artista: string;
  objetivo: string;
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number; // %
  spend: number; // R$
  resultados: number;
  custoResultado: number; // R$
  status: "ativa" | "encerrada" | "pausada";
}

export const META_ADS_MOCK = {
  mes: { impressoes: 4_820_000, alcance: 2_190_000, cliques: 148_600, ctr: 3.08, spend: 24_800, resultados: 12_400, cpm: 5.14 },
  evolution: [
    { mes: "Dez", value: 2_900_000 },
    { mes: "Jan", value: 3_200_000 },
    { mes: "Fev", value: 3_600_000 },
    { mes: "Mar", value: 4_100_000 },
    { mes: "Abr", value: 4_500_000 },
    { mes: "Mai", value: 4_820_000 },
  ],
  campanhas: [
    { nome: "Lançamento EP Lunar — Alcance SP/RJ", artista: "Vitória Lunar", objetivo: "Alcance", impressoes: 1_240_000, alcance: 620_000, cliques: 38_400, ctr: 3.10, spend: 7_200, resultados: 3_800, custoResultado: 1.89, status: "ativa" },
    { nome: "Saudade de Mim — Vídeo Views Nac.", artista: "Ana Beatriz Santos", objetivo: "Visualizações de vídeo", impressoes: 2_100_000, alcance: 980_000, cliques: 62_000, ctr: 2.95, spend: 9_600, resultados: 5_200, custoResultado: 1.85, status: "ativa" },
    { nome: "Marcus Flow — Shows Set/Out", artista: "DJ Marcus Flow", objetivo: "Conversões", impressoes: 680_000, alcance: 310_000, cliques: 21_400, ctr: 3.15, spend: 4_800, resultados: 980, custoResultado: 4.90, status: "pausada" },
    { nome: "Raiz Nordestina — São João Digital", artista: "Grupo Raiz Nordestina", objetivo: "Engajamento", impressoes: 800_000, alcance: 280_000, cliques: 26_800, ctr: 3.35, spend: 3_200, resultados: 2_420, custoResultado: 1.32, status: "encerrada" },
  ] as MetaAdsCampaign[],
};

// ─── Instagram Ads ────────────────────────────────────────────────────────────

export interface InstagramAdsCampaign {
  nome: string;
  tipo: "Stories" | "Reels" | "Feed" | "Explorar";
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number;
  spend: number;
  resultados: number;
  custoResultado: number;
  status: "ativa" | "encerrada" | "pausada";
}

export const INSTAGRAM_ADS_MOCK = {
  mes: { impressoes: 2_640_000, alcance: 1_180_000, cliques: 82_400, ctr: 3.12, spend: 13_200, resultados: 7_100 },
  evolution: [
    { mes: "Dez", value: 1_400_000 },
    { mes: "Jan", value: 1_620_000 },
    { mes: "Fev", value: 1_840_000 },
    { mes: "Mar", value: 2_100_000 },
    { mes: "Abr", value: 2_380_000 },
    { mes: "Mai", value: 2_640_000 },
  ],
  campanhas: [
    { nome: "Ana Beatriz Santos — Reels Lançamento", tipo: "Reels",    impressoes: 1_020_000, alcance: 480_000, cliques: 34_200, ctr: 3.35, spend: 5_400, resultados: 3_200, custoResultado: 1.69, status: "ativa"    },
    { nome: "Vitória Lunar — Stories EP Lunar",      tipo: "Stories",  impressoes: 840_000,   alcance: 390_000, cliques: 26_800, ctr: 3.19, spend: 4_200, resultados: 2_400, custoResultado: 1.75, status: "ativa"    },
    { nome: "Raiz Nordestina — Feed Forró",          tipo: "Feed",     impressoes: 520_000,   alcance: 210_000, cliques: 14_600, ctr: 2.81, spend: 2_400, resultados: 1_100, custoResultado: 2.18, status: "pausada"  },
    { nome: "MusicOS 360 — Explorar Brand",          tipo: "Explorar", impressoes: 260_000,   alcance: 100_000, cliques: 6_800,  ctr: 2.62, spend: 1_200, resultados: 400,   custoResultado: 3.00, status: "encerrada" },
  ] as InstagramAdsCampaign[],
};

// ─── Facebook Ads ──────────────────────────────────────────────────────────────

export interface FacebookAdsCampaign {
  nome: string;
  tipo: "Feed" | "Marketplace" | "Messenger" | "Vídeo";
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number;
  spend: number;
  resultados: number;
  custoResultado: number;
  status: "ativa" | "encerrada" | "pausada";
}

export const FACEBOOK_ADS_MOCK = {
  mes: { impressoes: 2_180_000, alcance: 1_010_000, cliques: 66_200, ctr: 3.04, spend: 11_600, resultados: 5_300 },
  evolution: [
    { mes: "Dez", value: 1_200_000 },
    { mes: "Jan", value: 1_360_000 },
    { mes: "Fev", value: 1_540_000 },
    { mes: "Mar", value: 1_760_000 },
    { mes: "Abr", value: 1_980_000 },
    { mes: "Mai", value: 2_180_000 },
  ],
  campanhas: [
    { nome: "Saudade de Mim — Vídeo Feed Nac.",       tipo: "Vídeo",      impressoes: 920_000,   alcance: 420_000, cliques: 29_400, ctr: 3.20, spend: 5_200, resultados: 2_400, custoResultado: 2.17, status: "ativa"    },
    { nome: "Vitória Lunar — Alcance SP/RJ/MG",       tipo: "Feed",       impressoes: 740_000,   alcance: 340_000, cliques: 21_800, ctr: 2.95, spend: 3_600, resultados: 1_700, custoResultado: 2.12, status: "ativa"    },
    { nome: "Shows Marcus Flow — Marketplace",         tipo: "Marketplace", impressoes: 320_000, alcance: 148_000, cliques: 10_400, ctr: 3.25, spend: 1_800, resultados: 780,   custoResultado: 2.31, status: "pausada"  },
    { nome: "MusicOS 360 — Messenger Remarketing",    tipo: "Messenger",  impressoes: 200_000,   alcance: 102_000, cliques: 4_600,  ctr: 2.30, spend: 1_000, resultados: 420,   custoResultado: 2.38, status: "ativa"    },
  ] as FacebookAdsCampaign[],
};

// ─── YouTube Ads ───────────────────────────────────────────────────────────────

export interface YouTubeAdsCampaign {
  nome: string;
  tipo: "Pre-roll" | "Bumper" | "Discovery" | "Masthead";
  impressoes: number;
  cliques: number;
  ctr: number;
  spend: number;
  views: number;
  vtr: number;
  status: "ativa" | "encerrada" | "pausada";
}

export const YOUTUBE_ADS_MOCK = {
  mes: { impressoes: 3_420_000, cliques: 94_800, ctr: 2.77, spend: 38_400, views: 1_840_000, vtr: 53.8 },
  evolution: [
    { mes: "Dez", value: 1_800_000 },
    { mes: "Jan", value: 2_100_000 },
    { mes: "Fev", value: 2_400_000 },
    { mes: "Mar", value: 2_800_000 },
    { mes: "Abr", value: 3_100_000 },
    { mes: "Mai", value: 3_420_000 },
  ],
  campanhas: [
    { nome: "Ana Beatriz Santos — Pre-roll Nac.",     tipo: "Pre-roll",  impressoes: 1_400_000, cliques: 38_200, ctr: 2.73, spend: 16_200, views: 820_000,  vtr: 58.6, status: "ativa"    },
    { nome: "Vitória Lunar — Discovery EP Lunar",     tipo: "Discovery", impressoes: 980_000,   cliques: 28_600, ctr: 2.92, spend: 11_800, views: 540_000,  vtr: 55.1, status: "ativa"    },
    { nome: "Raiz Nordestina — Bumper Forró",         tipo: "Bumper",    impressoes: 760_000,   cliques: 18_400, ctr: 2.42, spend: 7_400,  views: 380_000,  vtr: 50.0, status: "pausada"  },
    { nome: "MusicOS 360 — Masthead Festival",        tipo: "Masthead",  impressoes: 280_000,   cliques: 9_600,  ctr: 3.43, spend: 3_000,  views: 100_000,  vtr: 35.7, status: "encerrada" },
  ] as YouTubeAdsCampaign[],
};

// ─── TikTok Ads ────────────────────────────────────────────────────────────────

export interface TikTokAdsCampaign {
  nome: string;
  tipo: "In-feed" | "TopView" | "Brand Takeover" | "Spark";
  impressoes: number;
  cliques: number;
  ctr: number;
  spend: number;
  plays: number;
  engajamento: number;
  status: "ativa" | "encerrada" | "pausada";
}

export const TIKTOK_ADS_MOCK = {
  mes: { impressoes: 4_100_000, cliques: 142_000, ctr: 3.46, spend: 22_600, plays: 2_640_000, engajamento: 5.8 },
  evolution: [
    { mes: "Dez", value: 2_200_000 },
    { mes: "Jan", value: 2_600_000 },
    { mes: "Fev", value: 3_000_000 },
    { mes: "Mar", value: 3_400_000 },
    { mes: "Abr", value: 3_800_000 },
    { mes: "Mai", value: 4_100_000 },
  ],
  campanhas: [
    { nome: "Ana Beatriz Santos — In-feed Viral",    tipo: "In-feed",       impressoes: 1_800_000, cliques: 68_400, ctr: 3.80, spend: 9_800,  plays: 1_240_000, engajamento: 7.2, status: "ativa"    },
    { nome: "Vitória Lunar — TopView EP Lunar",      tipo: "TopView",       impressoes: 1_100_000, cliques: 42_200, ctr: 3.84, spend: 7_200,  plays: 820_000,   engajamento: 6.8, status: "ativa"    },
    { nome: "Marcus Flow — Spark BPM",               tipo: "Spark",         impressoes: 820_000,   cliques: 22_400, ctr: 2.73, spend: 3_800,  plays: 460_000,   engajamento: 4.1, status: "pausada"  },
    { nome: "MusicOS 360 — Brand Takeover Festival", tipo: "Brand Takeover", impressoes: 380_000,  cliques: 9_000,  ctr: 2.37, spend: 1_800,  plays: 120_000,   engajamento: 3.2, status: "encerrada" },
  ] as TikTokAdsCampaign[],
};

// ─── Google Ads ───────────────────────────────────────────────────────────────

export interface GoogleAdsCampaign {
  nome: string;
  tipo: string;
  impressoes: number;
  cliques: number;
  ctr: number;
  cpc: number; // R$
  spend: number; // R$
  conversoes: number;
  custoConversao: number;
  status: "ativa" | "encerrada" | "pausada";
}

export const GOOGLE_ADS_MOCK = {
  mes: { impressoes: 2_140_000, cliques: 68_200, ctr: 3.19, cpc: 0.98, spend: 66_800, conversoes: 4_820, custoConversao: 13.86 },
  evolution: [
    { mes: "Dez", value: 1_200_000 },
    { mes: "Jan", value: 1_400_000 },
    { mes: "Fev", value: 1_620_000 },
    { mes: "Mar", value: 1_840_000 },
    { mes: "Abr", value: 2_000_000 },
    { mes: "Mai", value: 2_140_000 },
  ],
  campanhas: [
    { nome: "Vitória Lunar — Search Brand", tipo: "Search", impressoes: 420_000, cliques: 18_400, ctr: 4.38, cpc: 0.72, spend: 13_200, conversoes: 1_840, custoConversao: 7.17, status: "ativa" },
    { nome: "Ana Beatriz Santos — YouTube Pre-Roll", tipo: "Vídeo", impressoes: 980_000, cliques: 24_200, ctr: 2.47, cpc: 0.89, spend: 21_600, conversoes: 1_420, custoConversao: 15.21, status: "ativa" },
    { nome: "Shows MusicOS 360 — Display Nac.", tipo: "Display", impressoes: 540_000, cliques: 14_800, ctr: 2.74, cpc: 1.14, spend: 16_900, conversoes: 820, custoConversao: 20.61, status: "ativa" },
    { nome: "Raiz Nordestina — Search Nordeste", tipo: "Search", impressoes: 200_000, cliques: 10_800, ctr: 5.40, cpc: 1.40, spend: 15_100, conversoes: 740, custoConversao: 20.41, status: "pausada" },
  ] as GoogleAdsCampaign[],
};

// ─── Instagram ────────────────────────────────────────────────────────────────

export interface InstagramArtistMetrics {
  artistaId: string;
  nome: string;
  followers: number;
  seguindo: number;
  posts: number;
  reelsMes: number;
  alcanceMes: number;
  impressoesMes: number;
  engagementRate: number; // %
  topPosts: { descricao: string; tipo: "foto" | "reel" | "carrossel"; curtidas: number; comentarios: number; alcance: number }[];
  evolution: MonthlyPoint[]; // followers
}

export const INSTAGRAM_MOCK: InstagramArtistMetrics[] = [
  {
    artistaId: "art-001",
    nome: "Vitória Lunar",
    followers: 198_400,
    seguindo: 412,
    posts: 284,
    reelsMes: 12,
    alcanceMes: 1_840_000,
    impressoesMes: 2_620_000,
    engagementRate: 4.82,
    topPosts: [
      { descricao: "Bastidores do clipe Noite de Luz 🌙✨", tipo: "reel", curtidas: 48_200, comentarios: 1_840, alcance: 380_000 },
      { descricao: "Show no Lollapalooza — obrigada SP! 💛", tipo: "foto", curtidas: 32_100, comentarios: 920, alcance: 220_000 },
      { descricao: "EP LUNAR JÁ DISPONÍVEL 🚀", tipo: "carrossel", curtidas: 28_400, comentarios: 1_100, alcance: 195_000 },
    ],
    evolution: [
      { mes: "Dez", value: 142_000 },
      { mes: "Jan", value: 158_000 },
      { mes: "Fev", value: 170_000 },
      { mes: "Mar", value: 181_000 },
      { mes: "Abr", value: 191_000 },
      { mes: "Mai", value: 198_400 },
    ],
  },
  {
    artistaId: "art-002",
    nome: "Grupo Raiz Nordestina",
    followers: 312_600,
    seguindo: 980,
    posts: 610,
    reelsMes: 8,
    alcanceMes: 2_100_000,
    impressoesMes: 3_400_000,
    engagementRate: 3.14,
    topPosts: [
      { descricao: "São João chegou! Festa em Recife 🎉", tipo: "reel", curtidas: 62_000, comentarios: 2_400, alcance: 490_000 },
      { descricao: "Novo clipe Beira do Rio 🌊", tipo: "carrossel", curtidas: 41_200, comentarios: 1_600, alcance: 320_000 },
      { descricao: "Obrigado Fortaleza! Que noite inesquecível 🙌", tipo: "foto", curtidas: 29_800, comentarios: 980, alcance: 198_000 },
    ],
    evolution: [
      { mes: "Dez", value: 240_000 },
      { mes: "Jan", value: 262_000 },
      { mes: "Fev", value: 278_000 },
      { mes: "Mar", value: 292_000 },
      { mes: "Abr", value: 304_000 },
      { mes: "Mai", value: 312_600 },
    ],
  },
  {
    artistaId: "art-003",
    nome: "DJ Marcus Flow",
    followers: 84_200,
    seguindo: 1_240,
    posts: 198,
    reelsMes: 20,
    alcanceMes: 680_000,
    impressoesMes: 1_100_000,
    engagementRate: 6.21,
    topPosts: [
      { descricao: "Set completo no Club Madame SP 🎧🔥", tipo: "reel", curtidas: 18_400, comentarios: 940, alcance: 142_000 },
      { descricao: "Frequência 440 — disponível em todas as plataformas 🎵", tipo: "carrossel", curtidas: 12_800, comentarios: 620, alcance: 98_000 },
      { descricao: "Noite elétrica em BH! 💥", tipo: "foto", curtidas: 9_400, comentarios: 380, alcance: 72_000 },
    ],
    evolution: [
      { mes: "Dez", value: 62_000 },
      { mes: "Jan", value: 68_000 },
      { mes: "Fev", value: 73_000 },
      { mes: "Mar", value: 77_000 },
      { mes: "Abr", value: 81_000 },
      { mes: "Mai", value: 84_200 },
    ],
  },
  {
    artistaId: "art-004",
    nome: "Ana Beatriz Santos",
    followers: 482_100,
    seguindo: 620,
    posts: 420,
    reelsMes: 18,
    alcanceMes: 4_200_000,
    impressoesMes: 6_800_000,
    engagementRate: 5.48,
    topPosts: [
      { descricao: "SAUDADE DE MIM — clipe completo no YouTube! 💔🎬", tipo: "reel", curtidas: 124_000, comentarios: 4_800, alcance: 890_000 },
      { descricao: "Arena Goiânia lotada! Amor demais 💛", tipo: "carrossel", curtidas: 88_200, comentarios: 3_200, alcance: 620_000 },
      { descricao: "Gravando o DVD — bastidores exclusivos 🎥", tipo: "reel", curtidas: 72_000, comentarios: 2_600, alcance: 540_000 },
    ],
    evolution: [
      { mes: "Dez", value: 348_000 },
      { mes: "Jan", value: 382_000 },
      { mes: "Fev", value: 412_000 },
      { mes: "Mar", value: 440_000 },
      { mes: "Abr", value: 463_000 },
      { mes: "Mai", value: 482_100 },
    ],
  },
];

export const INSTAGRAM_TOTALS = {
  totalFollowers: INSTAGRAM_MOCK.reduce((s, a) => s + a.followers, 0),
  totalAlcanceMes: INSTAGRAM_MOCK.reduce((s, a) => s + a.alcanceMes, 0),
  avgEngagement: Number((INSTAGRAM_MOCK.reduce((s, a) => s + a.engagementRate, 0) / INSTAGRAM_MOCK.length).toFixed(2)),
  artistasAtivos: INSTAGRAM_MOCK.length,
};

// ─── TikTok ───────────────────────────────────────────────────────────────────

export interface TikTokArtistMetrics {
  artistaId: string;
  nome: string;
  followers: number;
  seguindo: number;
  curtidas: number;
  videosMes: number;
  viewsMes: number;
  engagementRate: number;
  topVideos: { descricao: string; views: number; curtidas: number; comentarios: number; compartilhamentos: number }[];
  evolution: MonthlyPoint[];
}

export const TIKTOK_MOCK: TikTokArtistMetrics[] = [
  {
    artistaId: "art-001",
    nome: "Vitória Lunar",
    followers: 412_800,
    seguindo: 124,
    curtidas: 8_200_000,
    videosMes: 18,
    viewsMes: 6_400_000,
    engagementRate: 7.82,
    topVideos: [
      { descricao: "Noite de Luz — versão acústica 🌙", views: 1_840_000, curtidas: 248_000, comentarios: 8_400, compartilhamentos: 32_000 },
      { descricao: "Bastidores do clipe no RJ 🎬", views: 980_000, curtidas: 124_000, comentarios: 4_200, compartilhamentos: 18_600 },
      { descricao: "Dueto viral com fã em SP ✨", views: 740_000, curtidas: 98_000, comentarios: 3_800, compartilhamentos: 14_200 },
    ],
    evolution: [
      { mes: "Dez", value: 2_400_000 },
      { mes: "Jan", value: 3_200_000 },
      { mes: "Fev", value: 4_100_000 },
      { mes: "Mar", value: 5_000_000 },
      { mes: "Abr", value: 5_800_000 },
      { mes: "Mai", value: 6_400_000 },
    ],
  },
  {
    artistaId: "art-002",
    nome: "Grupo Raiz Nordestina",
    followers: 284_200,
    seguindo: 380,
    curtidas: 5_600_000,
    videosMes: 12,
    viewsMes: 3_800_000,
    engagementRate: 6.14,
    topVideos: [
      { descricao: "Forró pé de serra ao vivo 🎸", views: 1_200_000, curtidas: 168_000, comentarios: 6_200, compartilhamentos: 28_400 },
      { descricao: "Beira do Rio — clipe completo 🌊", views: 840_000, curtidas: 112_000, comentarios: 3_600, compartilhamentos: 19_800 },
      { descricao: "São João em Recife 🎉", views: 620_000, curtidas: 82_000, comentarios: 2_800, compartilhamentos: 12_600 },
    ],
    evolution: [
      { mes: "Dez", value: 1_800_000 },
      { mes: "Jan", value: 2_200_000 },
      { mes: "Fev", value: 2_700_000 },
      { mes: "Mar", value: 3_100_000 },
      { mes: "Abr", value: 3_500_000 },
      { mes: "Mai", value: 3_800_000 },
    ],
  },
  {
    artistaId: "art-003",
    nome: "DJ Marcus Flow",
    followers: 186_400,
    seguindo: 840,
    curtidas: 3_200_000,
    videosMes: 24,
    viewsMes: 4_200_000,
    engagementRate: 9.48,
    topVideos: [
      { descricao: "Transição épica no Club Madame 🎧🔥", views: 1_600_000, curtidas: 248_000, comentarios: 9_800, compartilhamentos: 42_000 },
      { descricao: "Frequência 440 — preview exclusivo", views: 980_000, curtidas: 148_000, comentarios: 4_200, compartilhamentos: 22_000 },
      { descricao: "Set completo ao vivo BH 🔊", views: 720_000, curtidas: 98_000, comentarios: 3_400, compartilhamentos: 16_800 },
    ],
    evolution: [
      { mes: "Dez", value: 1_400_000 },
      { mes: "Jan", value: 1_900_000 },
      { mes: "Fev", value: 2_600_000 },
      { mes: "Mar", value: 3_200_000 },
      { mes: "Abr", value: 3_800_000 },
      { mes: "Mai", value: 4_200_000 },
    ],
  },
];

export const TIKTOK_TOTALS = {
  totalFollowers: TIKTOK_MOCK.reduce((s, a) => s + a.followers, 0),
  totalViewsMes: TIKTOK_MOCK.reduce((s, a) => s + a.viewsMes, 0),
  avgEngagement: Number((TIKTOK_MOCK.reduce((s, a) => s + a.engagementRate, 0) / TIKTOK_MOCK.length).toFixed(2)),
  artistasAtivos: TIKTOK_MOCK.length,
};

// ─── Spotify Ads ─────────────────────────────────────────────────────────────

export interface SpotifyAdsCampaign {
  nome: string;
  tipo: "Podcast" | "Music" | "Branded" | "Playlist";
  impressoes: number;
  cliques: number;
  ctr: number;
  spend: number;
  streams: number;
  status: "ativa" | "pausada";
}

export const SPOTIFY_ADS_MOCK = {
  mes: { impressoes: 1_820_000, cliques: 54_600, ctr: 3.0, spend: 28_400, streams: 41_200 },
  evolution: [
    { mes: "Dez", value: 820_000 },
    { mes: "Jan", value: 980_000 },
    { mes: "Fev", value: 1_140_000 },
    { mes: "Mar", value: 1_380_000 },
    { mes: "Abr", value: 1_620_000 },
    { mes: "Mai", value: 1_820_000 },
  ],
  campanhas: [
    { nome: "Ana Beatriz Santos — Lançamento Saudade de Mim", tipo: "Music",   impressoes: 680_000, cliques: 22_400, ctr: 3.29, spend: 10_800, streams: 18_200, status: "ativa"   },
    { nome: "Vitória Lunar — EP Lunar Playlist Pitch",        tipo: "Playlist", impressoes: 520_000, cliques: 16_800, ctr: 3.23, spend: 8_400,  streams: 12_600, status: "ativa"   },
    { nome: "Grupo Raiz Nordestina — Podcast Cultura BR",     tipo: "Podcast",  impressoes: 380_000, cliques: 10_200, ctr: 2.68, spend: 6_200,  streams: 7_400,  status: "ativa"   },
    { nome: "DJ Marcus Flow — Branded Audio BPM",             tipo: "Branded",  impressoes: 240_000, cliques: 5_200,  ctr: 2.17, spend: 3_000,  streams: 3_000,  status: "pausada" },
  ] as SpotifyAdsCampaign[],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}
