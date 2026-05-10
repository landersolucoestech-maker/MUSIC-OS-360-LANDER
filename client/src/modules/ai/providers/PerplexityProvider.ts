/**
 * modules/ai/providers/PerplexityProvider.ts
 *
 * Provider Perplexity (llama-3.1-sonar-large).
 * PREPARADO para produção — integração real via /api/ai/generate?provider=perplexity.
 * MOCK_MODE: respostas simuladas.
 *
 * Perplexity é especialmente útil para pesquisas com contexto web em tempo real.
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

const PERPLEXITY_MODELS: AIModel[] = [
  {
    id: "llama-3.1-sonar-large",
    provider: "perplexity",
    label: "Llama 3.1 Sonar Large (Perplexity)",
    contextWindow: 127072,
    costPerInputToken:  0.000001,
    costPerOutputToken: 0.000001,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    preparado: true,
  },
];

function buildMockContent(request: AIRequest): string {
  const artist = request.context.artistName ?? "Artista";
  return `[Perplexity Sonar — MOCK]\n\nAnálise para ${artist} via Perplexity (pesquisa com contexto web).\nHabilidade: ${request.skill}\n\nConfigure PERPLEXITY_API_KEY no servidor para activar Perplexity real.`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class PerplexityProvider implements IAIProvider {
  readonly name: AIProviderName = "perplexity";
  readonly supportedModels: AIModel[] = PERPLEXITY_MODELS;

  async generate(request: AIRequest): Promise<AIResponse> {
    const startMs = Date.now();

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 500));
      const content = buildMockContent(request);
      const inputTokens  = Math.floor(request.prompt.length / 4);
      const outputTokens = Math.floor(content.length / 4);
      const model: AIModelId = "llama-3.1-sonar-large";
      const modelDef = PERPLEXITY_MODELS[0];
      return {
        requestId:   request.requestId,
        content,
        model,
        provider:    "perplexity",
        skill:       request.skill,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs:   Date.now() - startMs,
        costUsd:     (inputTokens + outputTokens) * modelDef.costPerInputToken,
        createdAt:   new Date().toISOString(),
      };
    }

    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider:    "perplexity",
        model:       "llama-3.1-sonar-large",
        prompt:      request.prompt,
        skill:       request.skill,
        maxTokens:   request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new AIError("PROVIDER_UNAVAILABLE", err.error ?? `Perplexity HTTP ${res.status}`, "perplexity", res.status === 429);
    }

    const data = await res.json();
    return {
      requestId:   request.requestId,
      content:     data.content,
      model:       "llama-3.1-sonar-large",
      provider:    "perplexity",
      skill:       request.skill,
      inputTokens:  data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      totalTokens:  data.usage?.total_tokens ?? 0,
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

  async embeddings(_req: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    throw new AIError(
      "PROVIDER_UNAVAILABLE",
      "Perplexity não suporta embeddings — use OpenAI.",
      "perplexity",
    );
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (MOCK_MODE) {
      return { provider: "perplexity", available: true, latencyMs: 40, checkedAt: new Date().toISOString() };
    }
    const start = Date.now();
    try {
      const res = await fetch("/api/ai/health?provider=perplexity");
      return { provider: "perplexity", available: res.ok, latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    } catch {
      return { provider: "perplexity", available: false, errorMessage: "Unreachable", checkedAt: new Date().toISOString() };
    }
  }
}
