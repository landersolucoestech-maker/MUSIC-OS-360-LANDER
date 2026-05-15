import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export type AIGenerateType =
  | "bio"
  | "descricao"
  | "copy"
  | "briefing"
  | "insights"
  | "summary"
  | "strategy"
  | "profile"
  | "post"
  | "caption"
  | "press-release"
  | "email"
  | "ad";

export interface AIGenerateParams {
  prompt: string;
  type: AIGenerateType;
}

export interface AIGenerateResult {
  content: string;
}

async function callAI(params: AIGenerateParams): Promise<AIGenerateResult> {
  const res = await fetch("/api/v1/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  return res.json();
}

export function useAI() {
  const generate = useMutation({
    mutationFn: callAI,
    onError: (error: Error) => {
      toast.error(`IA: ${error.message}`);
    },
  });

  return {
    generate,
    isGenerating: generate.isPending,
    callAI,
  };
}
