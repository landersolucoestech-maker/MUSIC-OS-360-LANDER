/**
 * modules/ai/providers/OpenAIProvider.ts
 *
 * Provider OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5-turbo).
 *
 * MOCK_MODE: devolve respostas simuladas sem chamada real à API.
 * PRODUÇÃO:  chama /api/ai/generate (proxy server-side que usa OPENAI_API_KEY).
 *
 * Nunca expor chaves de API no frontend. O servidor é o único que conhece as chaves.
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

// ─── Modelos suportados ───────────────────────────────────────────────────────

const OPENAI_MODELS: AIModel[] = [
  {
    id: "gpt-4o",
    provider: "openai",
    label: "GPT-4o",
    contextWindow: 128000,
    costPerInputToken:  0.000005,
    costPerOutputToken: 0.000015,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o Mini",
    contextWindow: 128000,
    costPerInputToken:  0.00000015,
    costPerOutputToken: 0.0000006,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
  {
    id: "gpt-3.5-turbo",
    provider: "openai",
    label: "GPT-3.5 Turbo",
    contextWindow: 16385,
    costPerInputToken:  0.0000005,
    costPerOutputToken: 0.0000015,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
];

// ─── Mock response generator ──────────────────────────────────────────────────

function buildMockContent(request: AIRequest): string {
  const ctx = request.context;
  const artist = ctx.artistName ?? "Artista";
  const platform = ctx.platform ?? "redes sociais";
  const tone = ctx.tone ?? "inspirador";

  const templates: Record<string, string> = {
    "social-content": `🎵 [OpenAI GPT-4o — MOCK]\n\nConteúdo para ${artist} no ${platform}.\n\nTom: ${tone}.\n\nUse este espaço para criar posts autênticos que conectam com sua audiência. Mostre bastidores, conquistas e a jornada musical. #MusicOS360 #${artist.replace(/\s/g, "")}`,
    "copywriting": `[OpenAI GPT-4o — MOCK]\n\nHeadline: "${artist} — A Voz que Move Gerações"\n\nSubheadline: Descubra a história por trás da música que emociona.\n\nCTA: "Ouça Agora →"`,
    "launch-strategy": `[OpenAI GPT-4o — MOCK]\n\nEstratégia de lançamento para ${artist}:\n\n**Fase 1 — Teaser (7 dias antes):**\nPublicar snippet de 15s no Instagram Stories e TikTok.\n\n**Fase 2 — Pre-save (3 dias antes):**\nActivar link de pre-save com incentivo exclusivo.\n\n**Fase 3 — Launch Day:**\nLive de estreia + posts simultâneos em todas as plataformas.\n\n**KPIs:** 10K streams na primeira semana.`,
    default: `[OpenAI GPT-4o — MOCK]\n\nConteúdo gerado para: ${artist}\nPlataforma: ${platform}\nTom: ${tone}\n\nEste é um conteúdo simulado. Configure VITE_USE_MOCK=false e forneça OPENAI_API_KEY no servidor para activar respostas reais.`,
  };

  return templates[request.skill] ?? templates.default;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class OpenAIProvider implements IAIProvider {
  readonly name: AIProviderName = "openai";
  readonly supportedModels: AIModel[] = OPENAI_MODELS;

  async generate(request: AIRequest): Promise<AIResponse> {
    const startMs = Date.now();

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
      const content = buildMockContent(request);
      const inputTokens  = Math.floor(request.prompt.length / 4);
      const outputTokens = Math.floor(content.length / 4);
      const model: AIModelId = (request.model ?? "gpt-4o-mini") as AIModelId;
      const modelDef = OPENAI_MODELS.find((m) => m.id === model) ?? OPENAI_MODELS[1];
      return {
        requestId:   request.requestId,
        content,
        model,
        provider:    "openai",
        skill:       request.skill,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs:   Date.now() - startMs,
        costUsd:     inputTokens * modelDef.costPerInputToken + outputTokens * modelDef.costPerOutputToken,
        createdAt:   new Date().toISOString(),
      };
    }

    // Produção: proxy via server (nunca expõe API key no frontend)
    const res = await fetch("/api/v1/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model:    request.model ?? "gpt-4o-mini",
        prompt:   request.prompt,
        skill:    request.skill,
        maxTokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new AIError(
        res.status === 429 ? "RATE_LIMIT_EXCEEDED" : "PROVIDER_UNAVAILABLE",
        err.error ?? `OpenAI HTTP ${res.status}`,
        "openai",
        res.status === 429,
      );
    }

    const data = await res.json();
    return {
      requestId:   request.requestId,
      content:     data.content,
      model:       (data.model ?? request.model ?? "gpt-4o-mini") as AIModelId,
      provider:    "openai",
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
        await new Promise((r) => setTimeout(r, 40));
        onChunk({ requestId: request.requestId, delta: (i === 0 ? "" : " ") + words[i], done: i === words.length - 1 });
      }
      return full;
    }
    // Produção: implementar SSE/streaming real
    return this.generate(request);
  }

  async embeddings(req: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    if (MOCK_MODE) {
      const texts = Array.isArray(req.text) ? req.text : [req.text];
      return {
        embeddings: texts.map(() => Array.from({ length: 1536 }, () => Math.random() - 0.5)),
        model: "gpt-4o-mini",
        provider: "openai",
        tokens: texts.join(" ").length / 4,
      };
    }
    throw new AIError("PROVIDER_UNAVAILABLE", "Embeddings reais requerem servidor proxy", "openai");
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (MOCK_MODE) {
      return { provider: "openai", available: true, latencyMs: 50, checkedAt: new Date().toISOString() };
    }
    const start = Date.now();
    try {
      const res = await fetch("/api/v1/ai/health?provider=openai");
      return {
        provider: "openai",
        available: res.ok,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return { provider: "openai", available: false, errorMessage: "Unreachable", checkedAt: new Date().toISOString() };
    }
  }
}

