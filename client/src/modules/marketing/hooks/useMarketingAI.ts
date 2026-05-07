import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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
  type: ContentType;
  artistName: string;
  genre?: string;
  context?: string;
  platform?: string;
  tone?: string;
  language?: string;
}

interface GenerateContentResponse {
  content: string;
  type: string;
  artistName: string;
  generatedAt: string;
}

const TYPE_LABELS: Record<ContentType, string> = {
  post: "post para redes sociais",
  caption: "legenda",
  bio: "bio artística",
  "press-release": "press-release",
  email: "e-mail de divulgação",
  ad: "copy de anúncio",
  lancamento: "texto de lançamento",
  engajamento: "conteúdo de engajamento",
  branding: "narrativa de marca",
};

function buildPrompt(params: GenerateContentParams): string {
  const typeLabel = TYPE_LABELS[params.type] ?? params.type;
  const lines = [
    `Crie um ${typeLabel} para o artista "${params.artistName}".`,
  ];
  if (params.genre) lines.push(`Gênero musical: ${params.genre}.`);
  if (params.platform) lines.push(`Plataforma: ${params.platform}.`);
  if (params.tone) lines.push(`Tom: ${params.tone}.`);
  if (params.context) lines.push(`Contexto adicional: ${params.context}.`);
  lines.push("Seja criativo, autêntico e adequado ao mercado musical brasileiro.");
  return lines.join(" ");
}

export function useMarketingAI() {
  const generateContent = useMutation({
    mutationFn: async (
      params: GenerateContentParams,
    ): Promise<GenerateContentResponse> => {
      const prompt = buildPrompt(params);
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: params.type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? `Erro ${res.status}`);
      }
      const data = await res.json();
      return {
        content: data.content,
        type: params.type,
        artistName: params.artistName,
        generatedAt: new Date().toISOString(),
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
