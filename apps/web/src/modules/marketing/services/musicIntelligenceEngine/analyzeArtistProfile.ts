import type { ArtistProfileContext } from "./types";

export function buildArtistProfilePrompt(context: ArtistProfileContext) {
  return [
    `Executar diagnostico estrategico completo para ${context.artist.label}.`,
    `Scores iniciais: ${JSON.stringify(context.scores)}. Gargalo principal: ${context.bottleneck}.`,
    `Catalogo: ${context.catalog.totalReleases} lancamentos, ${context.catalog.totalTracks} faixas, frequencia ${context.catalog.frequency}.`,
    `Genero predominante: ${context.predominantGenre || "pendente"}. Subgeneros: ${context.subgenres.join(", ") || "pendentes"}. Mood: ${context.moods.join(", ") || "pendente"}.`,
    `Público/sinais: ${context.publicSignals.join(", ") || "sem sinais cadastrados"}.`,
    `Marketing: ${context.operations.campaigns.length} campanhas, ${context.operations.contents.length} conteudos, ${context.operations.pitchings.length} pitchings, ${context.operations.tasks.length} tarefas.`,
    "Retornar score geral, branding, catalogo, engajamento, consistencia, crescimento, estagio de carreira, gargalo, pontos fortes, pontos fracos, oportunidades, riscos, recomendacoes e plano 30/60/90 dias.",
  ].join("\n\n");
}

