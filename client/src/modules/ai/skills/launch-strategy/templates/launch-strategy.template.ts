/**
 * skills/launch-strategy/templates/launch-strategy.template.ts
 * Templates de estratégia de lançamento por tipo.
 */

import type { LaunchType } from "../contracts/launch-strategy.contracts";

export interface LaunchTemplate {
  launchType: LaunchType;
  recommendedPhases: string[];
  keyTactics: string[];
  orbRecommendations: {
    owned: string[];
    rented: string[];
    borrowed: string[];
  };
  timeline: string;
  kpis: string[];
}

export const LAUNCH_TEMPLATES: LaunchTemplate[] = [
  {
    launchType: "single",
    recommendedPhases: ["beta", "early-access", "full"],
    timeline: "3-4 semanas",
    keyTactics: [
      "Teaser de 15s no Instagram Stories e TikTok (7 dias antes)",
      "Pre-save link com incentivo exclusivo (3 dias antes)",
      "Live de estreia no Instagram no dia do lançamento",
      "Posts simultâneos em todas as plataformas no dia D",
      "Email para lista de fãs com acesso antecipado",
    ],
    orbRecommendations: {
      owned:    ["Email list", "Blog/site do artista"],
      rented:   ["Instagram", "TikTok", "YouTube Shorts"],
      borrowed: ["Playlist curadoria", "Podcast musical", "Features com outros artistas"],
    },
    kpis: [
      "Streams na primeira semana (target: 10K)",
      "Pre-saves antes do lançamento",
      "Crescimento de seguidores no período",
      "Taxa de conversão email → stream",
    ],
  },
  {
    launchType: "album",
    recommendedPhases: ["alpha", "beta", "early-access", "full"],
    timeline: "6-8 semanas",
    keyTactics: [
      "Lançar 2-3 singles antes do álbum para momentum",
      "Campanha de pré-venda com bundle exclusivo",
      "Listening party virtual ou presencial",
      "Press release para imprensa especializada",
      "Tour announcement junto ao álbum",
    ],
    orbRecommendations: {
      owned:    ["Email list", "Blog com bastidores", "Discord/comunidade"],
      rented:   ["Instagram", "TikTok", "YouTube", "Spotify"],
      borrowed: ["Rádios online", "Podcasts musicais", "Influencers do nicho", "Playlists editoriais"],
    },
    kpis: [
      "Streams na primeira semana",
      "Vendas digitais e físicas",
      "Saves no Spotify",
      "Cobertura de imprensa (número de features)",
      "Crescimento de email list",
    ],
  },
  {
    launchType: "product-hunt",
    recommendedPhases: ["beta", "early-access", "full"],
    timeline: "4-6 semanas",
    keyTactics: [
      "Construir relações com makers influentes 30 dias antes",
      "Optimizar listing: tagline convincente + demo video",
      "Criar lista de supporters comprometidos",
      "Tratar o dia de lançamento como evento full-day",
      "Responder cada comentário em tempo real",
      "Direcionar tráfego para capturar email signups",
    ],
    orbRecommendations: {
      owned:    ["Email list", "Site com demo interactivo"],
      rented:   ["Twitter/X", "LinkedIn"],
      borrowed: ["Product Hunt community", "Newsletters tech/music"],
    },
    kpis: [
      "Posição no ranking (Product of the Day)",
      "Votos totais",
      "Novos signups no dia",
      "Tráfego referral do PH",
    ],
  },
  {
    launchType: "ep",
    recommendedPhases: ["beta", "early-access", "full"],
    timeline: "4-5 semanas",
    keyTactics: [
      "1 single de teaser 2 semanas antes",
      "Campanha de pre-save",
      "Storytelling visual do processo criativo",
      "Playlist temática do EP",
    ],
    orbRecommendations: {
      owned:    ["Email list", "Stories exclusivos para subscribers"],
      rented:   ["Instagram", "TikTok"],
      borrowed: ["Blogs musicais", "Playlists independentes"],
    },
    kpis: [
      "Streams agregados do EP",
      "Taxa de save por faixa",
      "Crescimento de ouvintes mensais",
    ],
  },
];

export function getLaunchTemplate(launchType: LaunchType): LaunchTemplate | undefined {
  return LAUNCH_TEMPLATES.find((t) => t.launchType === launchType);
}
