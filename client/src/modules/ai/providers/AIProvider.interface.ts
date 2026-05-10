/**
 * modules/ai/providers/AIProvider.interface.ts
 *
 * Contrato base para todos os providers de IA.
 * Nenhum componente React deve importar providers directamente —
 * devem usar sempre o AIOrchestrator.
 */

import type {
  AIProviderName,
  AIModelId,
  AIModel,
  AIRequest,
  AIResponse,
} from "../domain/ai.types";

// ─── Streaming chunk ──────────────────────────────────────────────────────────

export interface AIStreamChunk {
  requestId: string;
  delta: string;
  done: boolean;
  totalTokensSoFar?: number;
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

export interface AIEmbeddingRequest {
  text: string | string[];
  model?: AIModelId;
  tenantId: string;
}

export interface AIEmbeddingResponse {
  embeddings: number[][];
  model: AIModelId;
  provider: AIProviderName;
  tokens: number;
}

// ─── Provider health ──────────────────────────────────────────────────────────

export interface AIProviderHealth {
  provider: AIProviderName;
  available: boolean;
  latencyMs?: number;
  errorMessage?: string;
  checkedAt: string;
}

// ─── Core interface ───────────────────────────────────────────────────────────

export interface IAIProvider {
  readonly name: AIProviderName;
  readonly supportedModels: AIModel[];

  /**
   * Gera uma resposta completa (não streaming).
   * Lança AIError em caso de falha.
   */
  generate(request: AIRequest): Promise<AIResponse>;

  /**
   * Gera resposta em modo streaming.
   * Cada chunk é emitido via callback onChunk.
   * Resolve com a resposta completa no final.
   */
  stream(
    request: AIRequest,
    onChunk: (chunk: AIStreamChunk) => void,
  ): Promise<AIResponse>;

  /**
   * Gera embeddings para busca semântica / memória.
   */
  embeddings(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse>;

  /**
   * Verifica saúde do provider (disponibilidade, latência).
   */
  healthCheck(): Promise<AIProviderHealth>;
}

// ─── Provider factory type ────────────────────────────────────────────────────

export type AIProviderFactory = () => IAIProvider;
