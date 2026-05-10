/**
 * modules/ai/providers/ClaudeProvider.ts
 *
 * Provider Anthropic Claude (claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus).
 *
 * MOCK_MODE: devolve respostas simuladas.
 * PRODUÇÃO:  chama /api/ai/generate (proxy server-side com ANTHROPIC_API_KEY).
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

const CLAUDE_MODELS: AIModel[] = [
  {
    id: "claude-3-5-sonnet",
    provider: "claude",
    label: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    costPerInputToken:  0.000003,
    costPerOutputToken: 0.000015,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
  {
    id: "claude-3-5-haiku",
    provider: "claude",
    label: "Claude 3.5 Haiku",
    contextWindow: 200000,
    costPerInputToken:  0.0000008,
    costPerOutputToken: 0.000004,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
  {
    id: "claude-3-opus",
    provider: "claude",
    label: "Claude 3 Opus",
    contextWindow: 200000,
    costPerInputToken:  0.000015,
    costPerOutputToken: 0.000075,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    preparado: true,
  },
];

// ─── Mock response ────────────────────────────────────────────────────────────

function buildMockContent(request: AIRequest): string {
  const ctx = request.context;
  const artist = ctx.artistName ?? "Artista";
  const platform = ctx.platform ?? "redes sociais";
  const tone = ctx.tone ?? "autêntico";

  const templates: Record<string, string> = {
    "social-content": `✨ [Claude 3.5 Sonnet — MOCK]\n\n"${artist}" para ${platform} — ${tone}:\n\nA música não é apenas som; é uma experiência que transforma. Hoje partilhamos mais um capítulo desta jornada criativa. Cada nota conta uma história que ressoa além das palavras.\n\n🎶 #MusicOS360 #${artist.replace(/\s/g, "")} #MúsicaBrasileira`,
    "copywriting": `[Claude 3.5 Sonnet — MOCK]\n\n**Headline:** "${artist} — Onde a Alma Encontra o Ritmo"\n\n**Subheadline:** Uma voz que transcende fronteiras e conecta gerações.\n\n**Body:** A arte de ${artist} não é apenas música — é um movimento. Cada álbum é um capítulo. Cada show é uma comunhão.\n\n**CTA Principal:** "Acompanhe a Jornada →"`,
    "launch-strategy": `[Claude 3.5 Sonnet — MOCK]\n\n## Estratégia de Lançamento — ${artist}\n\n### ORB Framework:\n\n**Owned:** Email list + blog de bastidores\n**Rented:** Instagram + TikTok (2 plataformas)\n**Borrowed:** 3 podcasts musicais + 1 playlist curada\n\n### Timeline 21 dias:\n- D-21 a D-14: Teaser phase\n- D-7: Pre-save activo\n- D-0: Launch day com live\n- D+7: Momentum content`,
    default: `[Claude 3.5 Sonnet — MOCK]\n\nConteúdo criativo para: ${artist}\nEstilo: ${tone}\nPlataforma: ${platform}\n\nConfigure VITE_USE_MOCK=false + ANTHROPIC_API_KEY no servidor para activar Claude real.`,
  };

  return templates[request.skill] ?? templates.default;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class ClaudeProvider implements IAIProvider {
  readonly name: AIProviderName = "claude";
  readonly supportedModels: AIModel[] = CLAUDE_MODELS;

  async generate(request: AIRequest): Promise<AIResponse> {
    const startMs = Date.now();

    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));
      const content = buildMockContent(request);
      const inputTokens  = Math.floor(request.prompt.length / 4);
      const outputTokens = Math.floor(content.length / 4);
      const model: AIModelId = (request.model ?? "claude-3-5-haiku") as AIModelId;
      const modelDef = CLAUDE_MODELS.find((m) => m.id === model) ?? CLAUDE_MODELS[1];
      return {
        requestId:   request.requestId,
        content,
        model,
        provider:    "claude",
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
        provider:    "claude",
        model:       request.model ?? "claude-3-5-haiku",
        prompt:      request.prompt,
        skill:       request.skill,
        maxTokens:   request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new AIError(
        res.status === 429 ? "RATE_LIMIT_EXCEEDED" : "PROVIDER_UNAVAILABLE",
        err.error ?? `Claude HTTP ${res.status}`,
        "claude",
        res.status === 429,
      );
    }

    const data = await res.json();
    return {
      requestId:   request.requestId,
      content:     data.content,
      model:       (data.model ?? request.model ?? "claude-3-5-haiku") as AIModelId,
      provider:    "claude",
      skill:       request.skill,
      inputTokens:  data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      totalTokens:  (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
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
        await new Promise((r) => setTimeout(r, 35));
        onChunk({ requestId: request.requestId, delta: (i === 0 ? "" : " ") + words[i], done: i === words.length - 1 });
      }
      return full;
    }
    return this.generate(request);
  }

  async embeddings(_req: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    throw new AIError(
      "PROVIDER_UNAVAILABLE",
      "Claude não suporta embeddings nativos — use OpenAI para embeddings.",
      "claude",
    );
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (MOCK_MODE) {
      return { provider: "claude", available: true, latencyMs: 60, checkedAt: new Date().toISOString() };
    }
    const start = Date.now();
    try {
      const res = await fetch("/api/ai/health?provider=claude");
      return {
        provider: "claude",
        available: res.ok,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return { provider: "claude", available: false, errorMessage: "Unreachable", checkedAt: new Date().toISOString() };
    }
  }
}
