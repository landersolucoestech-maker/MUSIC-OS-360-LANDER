import type { AiGenerationPayload } from "../../types/marketing.types";

export function validateAiGenerationPayload(payload: AiGenerationPayload) {
  return Boolean(payload.kind && payload.targetType && payload.targetName);
}
