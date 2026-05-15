/**
 * modules/ai/domain/ai.types.ts
 *
 * Fonte única de verdade para todos os tipos do módulo AI.
 * NÃO importar providers directamente aqui.
 */

// ─── Provider ────────────────────────────────────────────────────────────────

export type AIProviderName =
  | "openai"
  | "claude"
  | "gemini"
  | "perplexity"
  | "mock";

export type AIModelId =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-3.5-turbo"
  | "claude-3-5-sonnet"
  | "claude-3-5-haiku"
  | "claude-3-opus"
  | "gemini-1-5-pro"
  | "gemini-1-5-flash"
  | "llama-3.1-sonar-large"
  | "mock";

export interface AIModel {
  id: AIModelId;
  provider: AIProviderName;
  label: string;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  preparado: boolean;
}

// ─── Skill ───────────────────────────────────────────────────────────────────

export type AISkillName =
  | "social-content"
  | "copywriting"
  | "launch-strategy"
  | "paid-ads"
  | "analytics-tracking"
  | "onboarding-cro";

export interface AISkillMetadata {
  name: AISkillName;
  version: string;
  description: string;
  preferredProvider: AIProviderName;
  preferredModel: AIModelId;
  fallbackModel: AIModelId;
  maxTokens: number;
  temperature: number;
}

// ─── Request / Response ───────────────────────────────────────────────────────

export interface AIRequestContext {
  tenantId: string;
  userId?: string;
  artistName?: string;
  genre?: string;
  platform?: string;
  tone?: string;
  language?: string;
  extraContext?: string;
}

export interface AIRequest {
  requestId: string;
  skill: AISkillName;
  prompt: string;
  context: AIRequestContext;
  model?: AIModelId;
  provider?: AIProviderName;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  createdAt: string;
}

export interface AIResponse {
  requestId: string;
  content: string;
  model: AIModelId;
  provider: AIProviderName;
  skill: AISkillName;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
  createdAt: string;
}

// ─── Job / Queue ──────────────────────────────────────────────────────────────

export type AIJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "cancelled";

export interface AIJob {
  jobId: string;
  request: AIRequest;
  status: AIJobStatus;
  attempts: number;
  maxAttempts: number;
  response?: AIResponse;
  error?: string;
  enqueuedAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AIAnalyticsEntry {
  entryId: string;
  tenantId: string;
  userId?: string;
  skill: AISkillName;
  provider: AIProviderName;
  model: AIModelId;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: "success" | "failure";
  retries: number;
  errorMessage?: string;
  createdAt: string;
}

export interface AITenantUsage {
  tenantId: string;
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  successRate: number;
  avgLatencyMs: number;
  bySkill: Record<AISkillName, { requests: number; tokens: number; costUsd: number }>;
  byProvider: Record<AIProviderName, { requests: number; tokens: number; costUsd: number }>;
  period: { from: string; to: string };
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export type AIErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMIT_EXCEEDED"
  | "TOKEN_LIMIT_EXCEEDED"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_FAILED"
  | "SKILL_NOT_FOUND"
  | "TIMEOUT"
  | "UNKNOWN";

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly provider?: AIProviderName,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AIError";
  }
}

// ─── Orchestrator Config ──────────────────────────────────────────────────────

export interface AIOrchestatorConfig {
  defaultProvider: AIProviderName;
  fallbackProviders: AIProviderName[];
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  maxCostPerRequestUsd: number;
  enableAnalytics: boolean;
  enableMemory: boolean;
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export interface AIMemoryEntry {
  key: string;
  tenantId: string;
  content: string;
  skill?: AISkillName;
  createdAt: string;
  expiresAt?: string;
}

// ─── Content generation helpers ───────────────────────────────────────────────

export type ContentType =
  | "post"
  | "caption"
  | "bio"
  | "press-release"
  | "email"
  | "ad"
  | "lancamento"
  | "engajamento"
  | "branding"
  | "launch-plan"
  | "campaign-brief"
  | "copywriting";

export interface GenerateContentInput {
  type: ContentType;
  artistName: string;
  genre?: string;
  context?: string;
  platform?: string;
  tone?: string;
  language?: string;
  tenantId?: string;
  model?: AIModelId;
  provider?: AIProviderName;
}

export interface GenerateContentOutput {
  content: string;
  type: ContentType;
  artistName: string;
  skill: AISkillName;
  provider: AIProviderName;
  model: AIModelId;
  tokens: number;
  costUsd: number;
  generatedAt: string;
}
