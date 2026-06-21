import type { AiGeneratedResult } from "../../types/marketing.types";

export function validateIdeaGenerationOutput(value: AiGeneratedResult) {
  return Boolean(value.summary && Array.isArray(value.contentIdeas));
}
