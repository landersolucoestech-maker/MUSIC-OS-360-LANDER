import type { IntelligenceSources } from "./types";

export function analyzeMarketingPerformanceContext(sources: IntelligenceSources) {
  return {
    bestContent: sources.contents.slice(0, 5).map((item) => `${item.title} · ${item.channel}`),
    bestCampaigns: sources.campaigns.slice(0, 5).map((item) => item.name),
    bestReleases: sources.releases.slice(0, 5).map((item) => item.titulo),
    diagnosis: [
      "Repetir formatos com maior clareza de canal e objetivo.",
      "Abandonar conteudos sem CTA ou sem vinculo com campanha/lancamento.",
      "Converter insights em tarefas operacionais para manter cadencia.",
    ],
  };
}

