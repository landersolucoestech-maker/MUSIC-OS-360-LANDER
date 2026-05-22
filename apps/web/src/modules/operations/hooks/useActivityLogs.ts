import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface ActivityLogEntry {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  user_id?: string | null;
  user_name?: string | null;
  user_avatar_url?: string | null;
  created_at: string;
}

const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

const MOCK_LOGS: ActivityLogEntry[] = [
  { id: "l1", tenant_id: "mock", entity_type: "artist", entity_id: "artist-001", action: "onboarding_started", description: "Onboarding iniciado para João Silva", metadata: { artistId: "artist-001", nomeArtistico: "João Silva" }, user_id: "user-1", user_name: "Admin", user_avatar_url: null, created_at: ago(5 * 60_000) },
  { id: "l2", tenant_id: "mock", entity_type: "contract", entity_id: "contract-001", action: "signed", description: "Contrato assinado — 2024-001", metadata: { value: 24000 }, user_id: "user-1", user_name: "Admin", user_avatar_url: null, created_at: ago(18 * 60_000) },
  { id: "l3", tenant_id: "mock", entity_type: "transaction", entity_id: "tx-001", action: "paid", description: "Transação R$4.800 baixada/paga", metadata: { valor: 4800 }, user_id: "user-2", user_name: "Financeiro", user_avatar_url: null, created_at: ago(35 * 60_000) },
  { id: "l4", tenant_id: "mock", entity_type: "artist", entity_id: "artist-002", action: "status_changed", description: "Status alterado para contratado", metadata: { oldStatus: "negociando", newStatus: "contratado" }, user_id: "user-1", user_name: "Admin", user_avatar_url: null, created_at: ago(2 * 3_600_000) },
  { id: "l5", tenant_id: "mock", entity_type: "release", entity_id: "rel-001", action: "distributor.status_updated", description: "Distribuição enviada para DSPs", metadata: { providerId: "mock-distributor", status: "pending" }, user_id: null, user_name: "Sistema", user_avatar_url: null, created_at: ago(3 * 3_600_000) },
  { id: "l6", tenant_id: "mock", entity_type: "invoice", entity_id: "inv-009", action: "overdue", description: "Invoice #INV-009 vencida", metadata: { valor: 2200, dueDate: ago(3 * 86_400_000) }, user_id: null, user_name: "Sistema", user_avatar_url: null, created_at: ago(4 * 3_600_000) },
  { id: "l7", tenant_id: "mock", entity_type: "artist", entity_id: "artist-001", action: "distribution_setup_requested", description: "Setup de distribuição solicitado", metadata: {}, user_id: "system", user_name: "Sistema", user_avatar_url: null, created_at: ago(6 * 3_600_000) },
  { id: "l8", tenant_id: "mock", entity_type: "contract", entity_id: "contract-003", action: "expiring_soon", description: "Contrato vence em 20 dias", metadata: { daysLeft: 20 }, user_id: null, user_name: "Sistema", user_avatar_url: null, created_at: ago(8 * 3_600_000) },
  { id: "l9", tenant_id: "mock", entity_type: "work", entity_id: "work-001", action: "society.status_updated", description: "Obras enviadas à sociedade ECAD", metadata: { providerId: "mock-society", workIds: ["work-001"] }, user_id: null, user_name: "Sistema", user_avatar_url: null, created_at: ago(12 * 3_600_000) },
  { id: "l10", tenant_id: "mock", entity_type: "artist", entity_id: "artist-003", action: "created", description: "Artista cadastrado", metadata: { nome: "Trio Banda" }, user_id: "user-1", user_name: "Admin", user_avatar_url: null, created_at: ago(24 * 3_600_000) },
];

export interface ActivityLogsFilters {
  entity_type?: string;
  limit?: number;
  offset?: number;
}

export function useActivityLogs(filters?: ActivityLogsFilters) {
  const limit = filters?.limit ?? 50;

  const { data, isLoading, error, refetch } = useQuery<ActivityLogEntry[]>({
    queryKey: ["activity-logs", filters],
    queryFn: MOCK_MODE
      ? () => Promise.resolve(MOCK_LOGS)
      : () => {
          const p = new URLSearchParams();
          p.set("limit", String(limit));
          if (filters?.entity_type) p.set("entity_type", filters.entity_type);
          if (filters?.offset) p.set("offset", String(filters.offset));
          return api.get<ActivityLogEntry[]>(`/activity-logs?${p.toString()}`);
        },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return { logs: data ?? [], isLoading, error, refetch };
}
