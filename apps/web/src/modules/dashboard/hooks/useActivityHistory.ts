/**
 * modules/dashboard/hooks/useActivityHistory.ts
 *
 * Carrega o histórico de atividades persistido (audit-logs) para popular
 * a Activity Feed do Dashboard antes/depois de eventos em tempo real.
 *
 * Em MOCK_MODE usa o audit log em memória mantido pelo storage layer.
 * Em HTTP mode chama GET /api/v1/audit-logs?limit=N.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { storage } from "@/shared/lib/storage";
import { MOCK_MODE } from "@/shared/lib/env";

export interface AuditLogRow {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  created_at: string;
}

async function fetchHistory(limit: number): Promise<AuditLogRow[]> {
  if (MOCK_MODE) {
    const local = await storage.getAuditLog({ limit });
    // mockStorage retorna AuditEntry — converte para formato compatível.
    return local.map((e) => ({
      id:         e.id,
      tenant_id:  e.org_id ?? null,
      user_id:    e.user_id,
      action:     e.action,
      entity:     e.entity,
      entity_id:  e.entity_id,
      before:     (e.before as Record<string, unknown> | null) ?? null,
      after:      (e.after  as Record<string, unknown> | null) ?? null,
      created_at: e.timestamp,
    }));
  }
  return api.get<AuditLogRow[]>(`/audit-logs?limit=${limit}`);
}

export function useActivityHistory(limit = 30) {
  return useQuery<AuditLogRow[]>({
    queryKey: ["activity-history", limit],
    queryFn:  () => fetchHistory(limit),
    staleTime:        30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

