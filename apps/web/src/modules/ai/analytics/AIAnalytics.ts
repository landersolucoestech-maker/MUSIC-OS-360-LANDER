/**
 * modules/ai/analytics/AIAnalytics.ts
 *
 * Rastreio completo de execuções de IA:
 *  — tokens de entrada/saída
 *  — custo em USD por provider/modelo
 *  — tenant isolation
 *  — skill utilizada
 *  — latência
 *  — falhas e retries
 *
 * MOCK_MODE: persiste em localStorage (chave: musicos360_ai_analytics)
 * PRODUÇÃO:  enviar para /api/ai/analytics (servidor persiste em DB)
 *
 * Todos os dados são isolados por tenantId.
 */

import type {
  AIAnalyticsEntry,
  AITenantUsage,
  AISkillName,
  AIProviderName,
  AIModelId,
} from "../domain/ai.types";
import { MOCK_MODE } from "@/shared/lib/env";

const STORAGE_KEY = "musicos360_ai_analytics";
const MAX_ENTRIES = 1000;

// ─── Input para record ────────────────────────────────────────────────────────

export interface RecordAIExecutionParams {
  tenantId:     string;
  userId?:      string;
  skill:        AISkillName;
  provider:     AIProviderName;
  model:        AIModelId;
  inputTokens:  number;
  outputTokens: number;
  totalTokens:  number;
  costUsd:      number;
  latencyMs:    number;
  status:       "success" | "failure";
  retries:      number;
  errorMessage?: string;
}

// ─── AIAnalytics ──────────────────────────────────────────────────────────────

export class AIAnalytics {
  private entries: AIAnalyticsEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // ── Record ────────────────────────────────────────────────────────────────

  record(params: RecordAIExecutionParams): AIAnalyticsEntry {
    const entry: AIAnalyticsEntry = {
      entryId:      `ae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId:     params.tenantId,
      userId:       params.userId,
      skill:        params.skill,
      provider:     params.provider,
      model:        params.model,
      inputTokens:  params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens:  params.totalTokens,
      costUsd:      params.costUsd,
      latencyMs:    params.latencyMs,
      status:       params.status,
      retries:      params.retries,
      errorMessage: params.errorMessage,
      createdAt:    new Date().toISOString(),
    };

    this.entries.push(entry);

    // Garbage collect
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }

    this.persistToStorage();

    // Em produção: enviar para servidor de forma assíncrona (fire-and-forget)
    if (!MOCK_MODE) {
      void this.sendToServer(entry);
    }

    return entry;
  }

  // ── Tenant usage report ───────────────────────────────────────────────────

  getTenantUsage(tenantId: string, fromDate?: string, toDate?: string): AITenantUsage {
    const from = fromDate ? new Date(fromDate) : new Date(0);
    const to   = toDate   ? new Date(toDate)   : new Date();

    const tenantEntries = this.entries.filter((e) => {
      const date = new Date(e.createdAt);
      return e.tenantId === tenantId && date >= from && date <= to;
    });

    const successEntries = tenantEntries.filter((e) => e.status === "success");
    const successRate    = tenantEntries.length > 0
      ? successEntries.length / tenantEntries.length
      : 0;

    const avgLatency = successEntries.length > 0
      ? successEntries.reduce((sum, e) => sum + e.latencyMs, 0) / successEntries.length
      : 0;

    const bySkill: AITenantUsage["bySkill"] = {} as AITenantUsage["bySkill"];
    const byProvider: AITenantUsage["byProvider"] = {} as AITenantUsage["byProvider"];

    for (const entry of tenantEntries) {
      // By skill
      if (!bySkill[entry.skill]) {
        bySkill[entry.skill] = { requests: 0, tokens: 0, costUsd: 0 };
      }
      bySkill[entry.skill].requests++;
      bySkill[entry.skill].tokens  += entry.totalTokens;
      bySkill[entry.skill].costUsd += entry.costUsd;

      // By provider
      if (!byProvider[entry.provider]) {
        byProvider[entry.provider] = { requests: 0, tokens: 0, costUsd: 0 };
      }
      byProvider[entry.provider].requests++;
      byProvider[entry.provider].tokens  += entry.totalTokens;
      byProvider[entry.provider].costUsd += entry.costUsd;
    }

    return {
      tenantId,
      totalRequests: tenantEntries.length,
      totalTokens:   tenantEntries.reduce((sum, e) => sum + e.totalTokens, 0),
      totalCostUsd:  tenantEntries.reduce((sum, e) => sum + e.costUsd, 0),
      successRate,
      avgLatencyMs:  Math.round(avgLatency),
      bySkill,
      byProvider,
      period: {
        from: from.toISOString(),
        to:   to.toISOString(),
      },
    };
  }

  // ── Recent entries ────────────────────────────────────────────────────────

  getRecentEntries(tenantId?: string, limit = 50): AIAnalyticsEntry[] {
    const filtered = tenantId
      ? this.entries.filter((e) => e.tenantId === tenantId)
      : this.entries;
    return filtered.slice(-limit).reverse();
  }

  // ── Cost summary ──────────────────────────────────────────────────────────

  getCostSummary(tenantId: string, days = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const relevant = this.entries.filter(
      (e) => e.tenantId === tenantId && new Date(e.createdAt) >= from,
    );

    const totalCost  = relevant.reduce((sum, e) => sum + e.costUsd, 0);
    const totalTokens = relevant.reduce((sum, e) => sum + e.totalTokens, 0);

    const byDay: Record<string, number> = {};
    for (const entry of relevant) {
      const day = entry.createdAt.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + entry.costUsd;
    }

    return { totalCost, totalTokens, byDay, days };
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw) as AIAnalyticsEntry[];
      }
    } catch {
      this.entries = [];
    }
  }

  private persistToStorage(): void {
    try {
      const toStore = this.entries.slice(-MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // localStorage pode estar cheio — não bloquear
    }
  }

  private async sendToServer(entry: AIAnalyticsEntry): Promise<void> {
    try {
      await fetch("/api/v1/ai/analytics", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(entry),
      });
    } catch {
      // Fire-and-forget: falha silenciosa
    }
  }

  // ── Clear (para testes) ───────────────────────────────────────────────────

  clearForTenant(tenantId: string): void {
    this.entries = this.entries.filter((e) => e.tenantId !== tenantId);
    this.persistToStorage();
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _analyticsInstance: AIAnalytics | null = null;

export function getAIAnalytics(): AIAnalytics {
  if (!_analyticsInstance) {
    _analyticsInstance = new AIAnalytics();
  }
  return _analyticsInstance;
}
