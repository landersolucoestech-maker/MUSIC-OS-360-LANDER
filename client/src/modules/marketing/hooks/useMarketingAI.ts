/**
 * modules/marketing/hooks/useMarketingAI.ts
 *
 * Hook de geração de conteúdo de IA para o módulo de Marketing.
 *
 * REFACTORED (T-AI-29): substituído fetch("/api/ai/generate") por
 * AIOrchestrator do módulo ai/. O AIOrchestrator gere:
 *   — MOCK_MODE: respostas simuladas sem backend
 *   — Produção:  routing para OpenAI/Claude com retries e fallback
 *
 * INTERFACE PÚBLICA PRESERVADA — IACriativa.tsx não necessita alterações.
 *   generateContent.mutate(params) → GenerateContentResponse
 *   isGenerating → boolean
 */

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAIOrchestrator } from "@/modules/ai/orchestrators/AIOrchestrator";

// ─── Types (preservados para compatibilidade com IACriativa.tsx) ─────────────

export type ContentType =
  | "post"
  | "caption"
  | "bio"
  | "press-release"
  | "email"
  | "ad"
  | "lancamento"
  | "engajamento"
  | "branding";

interface GenerateContentParams {
  type:       ContentType;
  artistName: string;
  genre?:     string;
  context?:   string;
  platform?:  string;
  tone?:      string;
  language?:  string;
}

interface GenerateContentResponse {
  content:     string;
  type:        string;
  artistName:  string;
  generatedAt: string;
}

// ─── Mapeamento ContentType → AISkillName ─────────────────────────────────────

const CONTENT_TYPE_SKILL_MAP: Record<ContentType, "social-content" | "copywriting" | "paid-ads" | "launch-strategy"> = {
  post:            "social-content",
  caption:         "social-content",
  engajamento:     "social-content",
  bio:             "copywriting",
  "press-release": "copywriting",
  email:           "copywriting",
  branding:        "copywriting",
  ad:              "paid-ads",
  lancamento:      "launch-strategy",
};

const TYPE_LABELS: Record<ContentType, string> = {
  post:            "post para redes sociais",
  caption:         "legenda",
  bio:             "bio artística",
  "press-release": "press-release",
  email:           "e-mail de divulgação",
  ad:              "copy de anúncio",
  lancamento:      "texto de lançamento",
  engajamento:     "conteúdo de engajamento",
  branding:        "narrativa de marca",
};

// ─── Prompt builder (preservado para backwards compat) ────────────────────────

function buildPrompt(params: GenerateContentParams): string {
  const typeLabel = TYPE_LABELS[params.type] ?? params.type;
  const lines = [
    `Crie um ${typeLabel} para o artista "${params.artistName}".`,
  ];
  if (params.genre)    lines.push(`Gênero musical: ${params.genre}.`);
  if (params.platform) lines.push(`Plataforma: ${params.platform}.`);
  if (params.tone)     lines.push(`Tom: ${params.tone}.`);
  if (params.context)  lines.push(`Contexto adicional: ${params.context}.`);
  lines.push("Seja criativo, autêntico e adequado ao mercado musical brasileiro.");
  return lines.join(" ");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketingAI() {
  const orchestrator = getAIOrchestrator();

  const generateContent = useMutation({
    mutationFn: async (
      params: GenerateContentParams,
    ): Promise<GenerateContentResponse> => {
      const skill  = CONTENT_TYPE_SKILL_MAP[params.type] ?? "social-content";
      const prompt = buildPrompt(params);

      const response = await orchestrator.execute({
        skill,
        prompt,
        tenantId: "default",
        context: {
          artistName:   params.artistName,
          genre:        params.genre,
          platform:     params.platform,
          tone:         params.tone,
          language:     params.language ?? "pt-BR",
          extraContext: params.context,
        },
      });

      return {
        content:     response.content,
        type:        params.type,
        artistName:  params.artistName,
        generatedAt: response.createdAt,
      };
    },
    onError: (error: Error) => {
      toast.error(`IA: ${error.message}`);
    },
  });

  return {
    generateContent,
    isGenerating: generateContent.isPending,
  };
}
