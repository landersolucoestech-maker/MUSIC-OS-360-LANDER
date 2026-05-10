/**
 * modules/ai/index.ts
 *
 * Barrel raiz do módulo de IA enterprise.
 *
 * Arquitectura:
 *   domain/       — tipos globais
 *   providers/    — OpenAI, Claude, Gemini (stub), Perplexity (stub)
 *   orchestrators/ — routing, retries, fallback, cost
 *   skills/       — SkillEngine + 6 skills
 *   queues/       — AIJobQueue (in-memory / Redis-ready)
 *   workers/      — AIWorker (polling auto-start)
 *   analytics/    — AIAnalytics (tokens, custo, tenant)
 *   memory/       — TenantMemory (contexto persistente)
 *   application/  — UseCases (GenerateContent, GenerateCampaign, GenerateLaunchStrategy)
 *   hooks/        — useAI, useAIJob, useAIAnalytics
 */

// ── Domain ────────────────────────────────────────────────────────────────────
export * from "./domain";

// ── Providers ─────────────────────────────────────────────────────────────────
export { getAIProviders } from "./providers";

// ── Orchestrator ──────────────────────────────────────────────────────────────
export { getAIOrchestrator } from "./orchestrators";

// ── Skills ────────────────────────────────────────────────────────────────────
export { getSkillEngine, SkillEngine } from "./skills";

// ── Queue ─────────────────────────────────────────────────────────────────────
export { getAIJobQueue, AIJobQueue } from "./queues";

// ── Worker ────────────────────────────────────────────────────────────────────
export { getAIWorker, AIWorker } from "./workers";

// ── Analytics ─────────────────────────────────────────────────────────────────
export { getAIAnalytics, AIAnalytics } from "./analytics";
export type { RecordAIExecutionParams } from "./analytics";

// ── Memory ────────────────────────────────────────────────────────────────────
export { getTenantMemory, TenantMemory } from "./memory";
export type { TenantAIContext, TenantMemoryEntry } from "./memory";

// ── Application ───────────────────────────────────────────────────────────────
export {
  getGenerateContentUseCase,
  getGenerateCampaignUseCase,
  getGenerateLaunchStrategyUseCase,
} from "./application";
export type {
  GenerateContentInput,
  GenerateContentResult,
  GenerateCampaignInput,
  GenerateCampaignResult,
  GenerateLaunchStrategyInput,
  GenerateLaunchStrategyResult,
} from "./application";

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useAI, useAIJob, useAIJobs, useAIAnalytics, useAIMonthCost } from "./hooks";
