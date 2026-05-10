/**
 * modules/ai/providers/GeminiProvider.ts
 *
 * Provider Google Gemini (gemini-1-5-pro, gemini-1-5-flash).
 * PREPARADO para produção — integração real via /api/ai/generate?provider=gemini.
 * MOCK_MODE: respostas simuladas.
 */

import { MOCK_MODE } from "@/shared/lib/env";
import type {
  AIModel,
  AIModelId,
  AIProviderName,
  AIRequest,
  AIResponse,
} from "../domain/ai.types";
import { AIError } from "../domain/ai.types";
import type {
  IAIProvider,
  AIStreamChunk,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  AIProviderHealth,
} from "./AIProvider.interface";

// ─── Modelos ──────────────────────────────────────────────────────────────────

const GEMINI_MODELS: AIModel[] = [
  {
    id: "gemini-1-5-pro",
    provider: "gemini",
    label: "Gemini 1.5 Pro",
    contextWindow: 2000000,
    costPerInputToken:  0.00000125,
    costPerOutputToken: 0.000005,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
  {
    id: "gemini-1-5-flash",
    provider: "gemini",
    label: "Gemini 1.5 Flash",
    contextWindow: 1000000,
    costPerInputToken:  0.000000075,
    costPerOutputToken: 0.0000003,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
];

function buildMockContent(request: AIRequest): string {
  const artist = request.context.artistName ?? "Artista";
  return `[Gemini 1.5 Pro — MOCK]\n\nConteúdo para ${artist} via Google Gemini.\nHabilidade: ${request.skill}\n\nConfigure GEMINI_API_KEY no servidor para activar Gemini real.`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class GeminiProvider implements IAIProvider {
  readonly name: AIProviderName = "gemini";
  readonly supportedModels: AIModel[] = GEMINI_MODELS;

  async generate(request: AIRequest): Promise<AIResponse> {
    const startMs = Date.now();

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 600));
      const content = buildMockContent(request);
      const inputTokens  = Math.floor(request.prompt.length / 4);
      const outputTokens = Math.floor(content.length / 4);
      const model: AIModelId = "gemini-1-5-flash";
      const modelDef = GEMINI_MODELS[1];
      return {
        requestId:   request.requestId,
        content,
        model,
        provider:    "gemini",
        skill:       request.skill,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs:   Date.now() - startMs,
        costUsd:     inputTokens * modelDef.costPerInputToken + outputTokens * modelDef.costPerOutputToken,
        createdAt:   new Date().toISOString(),
      };
    }

    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider:    "gemini",
        model:       request.model ?? "gemini-1-5-flash",
        prompt:      request.prompt,
        skill:       request.skill,
        maxTokens:   request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new AIError("PROVIDER_UNAVAILABLE", err.error ?? `Gemini HTTP ${res.status}`, "gemini", res.status === 429);
    }

    const data = await res.json();
    return {
      requestId:   request.requestId,
      content:     data.content,
      model:       (data.model ?? "gemini-1-5-flash") as AIModelId,
      provider:    "gemini",
      skill:       request.skill,
      inputTokens:  data.usage?.promptTokenCount ?? 0,
      outputTokens: data.usage?.candidatesTokenCount ?? 0,
      totalTokens:  data.usage?.totalTokenCount ?? 0,
      latencyMs:   Date.now() - startMs,
      costUsd:     data.costUsd ?? 0,
      createdAt:   new Date().toISOString(),
    };
  }

  async stream(
    request: AIRequest,
    onChunk: (chunk: AIStreamChunk) => void,
  ): Promise<AIResponse> {
    if (MOCK_MODE) {
      const full = await this.generate(request);
      const words = full.content.split(" ");
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 30));
        onChunk({ requestId: request.requestId, delta: (i === 0 ? "" : " ") + words[i], done: i === words.length - 1 });
      }
      return full;
    }
    return this.generate(request);
  }

  async embeddings(req: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    if (MOCK_MODE) {
      const texts = Array.isArray(req.text) ? req.text : [req.text];
      return {
        embeddings: texts.map(() => Array.from({ length: 768 }, () => Math.random() - 0.5)),
        model: "gemini-1-5-flash",
        provider: "gemini",
        tokens: texts.join(" ").length / 4,
      };
    }
    throw new AIError("PROVIDER_UNAVAILABLE", "Gemini embeddings requerem servidor proxy", "gemini");
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (MOCK_MODE) {
      return { provider: "gemini", available: true, latencyMs: 45, checkedAt: new Date().toISOString() };
    }
    const start = Date.now();
    try {
      const res = await fetch("/api/ai/health?provider=gemini");
      return { provider: "gemini", available: res.ok, latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    } catch {
      return { provider: "gemini", available: false, errorMessage: "Unreachable", checkedAt: new Date().toISOString() };
    }
  }
}
