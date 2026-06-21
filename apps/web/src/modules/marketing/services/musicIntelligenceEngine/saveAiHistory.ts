import type { AiGenerationPayload } from "../../types/marketing.types";

export function buildAiHistorySnapshot(payload: AiGenerationPayload) {
  const { audioFile: _audioFile, ...snapshot } = payload;
  return snapshot;
}
