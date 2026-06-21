import type { AiGenerationPayload, AiGeneratedResult } from "../../types/marketing.types";
import { api } from "@/shared/lib/api-client";

export type AiProviderId = "api";

export type AiProvider = {
  id: AiProviderId;
  generate(payload: AiGenerationPayload): Promise<AiGeneratedResult>;
};

const apiProvider: AiProvider = {
  id: "api",
  async generate(payload) {
    const response = await api.post<{ content: string }>("/ai/generate", {
      type: `marketing:${payload.kind}`,
      jsonMode: true,
      prompt: [
        "Responda exclusivamente com JSON válido no formato AiGeneratedResult.",
        `Alvo: ${payload.targetName}`,
        `Tipo: ${payload.targetType}`,
        `Tarefa: ${payload.kind}`,
        `Prompt: ${payload.prompt}`,
        payload.lyricText ? `Letra: ${payload.lyricText}` : "",
        payload.audience ? `Público: ${payload.audience}` : "",
        payload.channels?.length ? `Canais: ${payload.channels.join(", ")}` : "",
      ].filter(Boolean).join("\n"),
    });
    const parsed = JSON.parse(response.content) as Partial<AiGeneratedResult>;
    const requiredArrays = [
      "strengths", "risks", "audience", "positioning", "contentIdeas",
      "campaignIdeas", "pitchSuggestions", "nextActions",
    ] as const;
    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.creativeDirection !== "string" ||
      requiredArrays.some((key) => !Array.isArray(parsed[key]))
    ) {
      throw new Error("[marketing] resposta inválida do provedor de IA");
    }
    return parsed as AiGeneratedResult;
  },
};

export function getAiProviderRouter() {
  return {
    primary: apiProvider,
    async generate(payload: AiGenerationPayload) {
      return apiProvider.generate(payload);
    },
  };
}
