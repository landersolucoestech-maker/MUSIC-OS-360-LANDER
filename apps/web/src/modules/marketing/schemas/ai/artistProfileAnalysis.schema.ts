import type { ArtistProfileContext } from "../../services/musicIntelligenceEngine";

export function validateArtistProfileContext(value: ArtistProfileContext) {
  return Boolean(value.artist.id && value.scores && value.actionPlan);
}

