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

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}
