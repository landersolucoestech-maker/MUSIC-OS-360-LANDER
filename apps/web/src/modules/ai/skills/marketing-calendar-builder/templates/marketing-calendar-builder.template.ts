/**
 * skills/marketing-calendar-builder/templates/marketing-calendar-builder.template.ts
 *
 * Referências de cadência por frequência e de abordagem por plataforma.
 * Guia para enriquecer o calendário — não substitui a saída do modelo.
 */

import type { MarketingFrequency, MarketingPlatform } from "@music-os-360/ai-skills";

export interface MarketingFrequencyTemplate {
  frequency: MarketingFrequency;
  label: string;
  postsPerWeek: string;
  strideDays: number;
}

export const MARKETING_FREQUENCY_TEMPLATES: MarketingFrequencyTemplate[] = [
  { frequency: "low",       label: "Baixa",     postsPerWeek: "~2",        strideDays: 4 },
  { frequency: "medium",    label: "Média",     postsPerWeek: "~3–4",      strideDays: 2 },
  { frequency: "high",      label: "Alta",      postsPerWeek: "~7 (diário)", strideDays: 1 },
  { frequency: "intensive", label: "Intensiva", postsPerWeek: "~14 (2/dia)", strideDays: 1 },
];

export function getMarketingFrequencyTemplate(frequency: MarketingFrequency): MarketingFrequencyTemplate | undefined {
  return MARKETING_FREQUENCY_TEMPLATES.find((t) => t.frequency === frequency);
}

/** Abordagem/cadência sugerida por plataforma. */
export const MARKETING_PLATFORM_HINTS: Record<MarketingPlatform, string> = {
  instagram: "Feed + Reels + Stories; visual forte, 9:16 nos Reels.",
  tiktok:    "Vídeo curto 9:16, tendências e áudios em alta, primeiros 2s decisivos.",
  youtube:   "16:9 para vídeos longos; usar comunidade e estreias.",
  shorts:    "9:16 vertical, ganchos rápidos, alta frequência.",
  spotify:   "Canvas, pre-save, pitch editorial e atualização de perfil.",
  facebook:  "Comunidades e eventos; reaproveitar conteúdo do Instagram.",
  x:         "Texto curto, tempo real, threads e interação.",
  linkedin:  "Tom profissional/B2B; bastidores de carreira e parcerias.",
  website:   "Hub central: EPK, datas, links e captura de e-mail.",
  email:     "Relacionamento direto; pré-save, novidades e CTA claro.",
  whatsapp:  "Lista/Comunidade para avisos diretos e exclusivos.",
  other:     "Adaptar abordagem ao canal e ao objetivo da campanha.",
};
