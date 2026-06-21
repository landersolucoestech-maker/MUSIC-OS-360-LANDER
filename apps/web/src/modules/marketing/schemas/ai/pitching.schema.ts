import type { AiGeneratedResult } from "../../types/marketing.types";

export function validatePitchingOutput(value: AiGeneratedResult) {
  return Boolean(value.summary && Array.isArray(value.pitchSuggestions));
}
