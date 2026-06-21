import type { TrackAudioAnalysis } from "../../services/musicIntelligenceEngine";

export function validateAudioAnalysis(value: TrackAudioAnalysis) {
  return Boolean(value.status && value.provider && Array.isArray(value.missingData));
}
