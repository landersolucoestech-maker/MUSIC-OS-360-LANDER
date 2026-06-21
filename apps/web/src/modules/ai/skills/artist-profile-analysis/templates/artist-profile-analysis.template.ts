/**
 * skills/artist-profile-analysis/templates/artist-profile-analysis.template.ts
 *
 * Referências de eixos de análise e checklist de diagnóstico artístico.
 * Guia para enriquecer a análise — não substitui a saída do modelo.
 */

export interface ArtistAnalysisDimension {
  dimension: string;
  label: string;
  guidingQuestions: string[];
}

export const ARTIST_ANALYSIS_DIMENSIONS: ArtistAnalysisDimension[] = [
  {
    dimension: "positioning",
    label: "Posicionamento",
    guidingQuestions: [
      "Como o artista se diferencia dentro do gênero?",
      "Qual a promessa central da marca artística?",
    ],
  },
  {
    dimension: "audience",
    label: "Público",
    guidingQuestions: [
      "Quem é o público-núcleo e onde ele está?",
      "Qual o potencial de expansão para públicos adjacentes?",
    ],
  },
  {
    dimension: "content",
    label: "Conteúdo",
    guidingQuestions: [
      "Há consistência de identidade entre os canais?",
      "O conteúdo sustenta a narrativa de marca?",
    ],
  },
  {
    dimension: "growth",
    label: "Crescimento",
    guidingQuestions: [
      "Quais alavancas de crescimento estão subutilizadas?",
      "Onde estão os maiores gargalos de conversão (ouvinte → fã)?",
    ],
  },
  {
    dimension: "monetization",
    label: "Monetização",
    guidingQuestions: [
      "Quais fontes de receita estão ativas e quais faltam?",
      "Há oportunidades de sync, shows, merch ou parcerias?",
    ],
  },
];

/** Faixas de referência para leitura de tamanho de base por plataforma (heurística). */
export const ARTIST_FOLLOWERS_TIERS: Array<{ tier: string; max: number; label: string }> = [
  { tier: "emerging",    max: 1_000,     label: "Emergente" },
  { tier: "developing",  max: 10_000,    label: "Em desenvolvimento" },
  { tier: "established", max: 100_000,   label: "Estabelecido" },
  { tier: "mainstream",  max: 1_000_000, label: "Mainstream" },
  { tier: "superstar",   max: Number.POSITIVE_INFINITY, label: "Superstar" },
];

export function getArtistFollowersTier(followers: number): string {
  const tier = ARTIST_FOLLOWERS_TIERS.find((t) => followers < t.max);
  return tier ? tier.label : "Indefinido";
}
