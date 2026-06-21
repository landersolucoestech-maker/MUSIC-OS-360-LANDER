import type { TrackLyricsAnalysis } from "../../services/musicIntelligenceEngine";

export function validateLyricsAnalysis(value: TrackLyricsAnalysis) {
  return Boolean(value.status && value.provider && Array.isArray(value.keywords));
}
