/**
 * modules/ai/hooks/useAIAnalytics.ts
 *
 * Hook para consumir dados de analytics de uso de IA por tenant.
 *
 * Expõe:
 *  — usage:       AITenantUsage  (totais, por skill, por provider)
 *  — costSummary: resumo de custo por dia
 *  — recentEntries: últimas execuções (para tabela de auditoria)
 *  — refresh():   re-lê do AIAnalytics
 */

import { useState, useEffect, useCallback } from "react";
import { getAIAnalytics } from "../analytics/AIAnalytics";
import type { AITenantUsage, AIAnalyticsEntry } from "../domain/ai.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseAIAnalyticsOptions {
  tenantId:   string;
  days?:      number;
  fromDate?:  string;
  toDate?:    string;
  autoRefreshMs?: number;
}

interface UseAIAnalyticsState {
  usage:          AITenantUsage | null;
  costSummary:    { totalCost: number; totalTokens: number; byDay: Record<string, number>; days: number } | null;
  recentEntries:  AIAnalyticsEntry[];
  isLoading:      boolean;
  error:          string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAIAnalytics(options: UseAIAnalyticsOptions) {
  const { tenantId, days = 30, fromDate, toDate, autoRefreshMs } = options;

  const analytics = getAIAnalytics();

  const [state, setState] = useState<UseAIAnalyticsState>({
    usage:         null,
    costSummary:   null,
    recentEntries: [],
    isLoading:     true,
    error:         null,
  });

  const load = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const usage         = analytics.getTenantUsage(tenantId, fromDate, toDate);
      const costSummary   = analytics.getCostSummary(tenantId, days);
      const recentEntries = analytics.getRecentEntries(tenantId, 50);

      setState({
        usage,
        costSummary,
        recentEntries,
        isLoading: false,
        error:     null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Erro ao carregar analytics.",
      }));
    }
  }, [tenantId, days, fromDate, toDate, analytics]);

  // Carga inicial
  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh opcional
  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const id = setInterval(load, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, load]);

  return {
    usage:         state.usage,
    costSummary:   state.costSummary,
    recentEntries: state.recentEntries,
    isLoading:     state.isLoading,
    error:         state.error,
    refresh:       load,
  };
}

// ─── Hook simplificado para custo do mês ─────────────────────────────────────

export function useAIMonthCost(tenantId: string) {
  const { costSummary, isLoading } = useAIAnalytics({ tenantId, days: 30 });
  return {
    totalCostUsd: costSummary?.totalCost ?? 0,
    totalTokens:  costSummary?.totalTokens ?? 0,
    isLoading,
  };
}

