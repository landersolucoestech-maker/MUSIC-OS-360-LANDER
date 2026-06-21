import type { TrackDiagnosis } from "../../services/musicIntelligenceEngine";

export function validateTrackDiagnosis(value: TrackDiagnosis) {
  return Boolean(value.genre && value.mood && Array.isArray(value.missingData));
}
