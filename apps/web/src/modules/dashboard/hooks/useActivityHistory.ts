/**
 * modules/dashboard/hooks/useActivityHistory.ts
 *
 * Carrega o histórico de atividades persistido (audit-logs) para popular
 * a Activity Feed do Dashboard antes/depois de eventos em tempo real.
 *
 * Em HTTP mode chama GET /api/v1/audit-logs?limit=N.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { storage } from "@/shared/lib/storage";

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

