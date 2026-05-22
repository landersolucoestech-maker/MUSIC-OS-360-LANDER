import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

export interface AppNotification {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  title: string;
  body?: string | null;
  type?: string | null;
  entity?: string | null;
  entity_id?: string | null;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", tenant_id: "mock", user_id: null, title: "Onboarding iniciado: João Silva", body: "Artista contratado — 6 tarefas criadas", type: "artist:onboarding_started", entity: "artist", entity_id: "artist-001", read: false, metadata: {}, created_at: ago(5 * 60_000) },
  { id: "n2", tenant_id: "mock", user_id: null, title: "Invoice vencida: #INV-009", body: "R$2.200 em atraso há 3 dias", type: "invoice:overdue", entity: "invoice", entity_id: "inv-009", read: false, metadata: {}, created_at: ago(4 * 3_600_000) },
  { id: "n3", tenant_id: "mock", user_id: null, title: "Contrato vencendo em breve", body: "Contrato #2023-005 vence em 20 dias", type: "contract:expiring_soon", entity: "contract", entity_id: "contract-005", read: false, metadata: {}, created_at: ago(8 * 3_600_000) },
  { id: "n4", tenant_id: "mock", user_id: null, title: "Distribuição enviada", body: "Lançamento enviado às plataformas digitais", type: "release:distribution_sent", entity: "release", entity_id: "rel-001", read: true, metadata: {}, created_at: ago(12 * 3_600_000) },
  { id: "n5", tenant_id: "mock", user_id: null, title: "Contrato assinado", body: "Contrato 2024-001 assinado com sucesso", type: "contract:signed", entity: "contract", entity_id: "contract-001", read: true, metadata: {}, created_at: ago(24 * 3_600_000) },
];

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery<AppNotification[]>({
    queryKey: ["notifications-center"],
    queryFn: MOCK_MODE
      ? () => Promise.resolve(MOCK_NOTIFICATIONS)
      : () => api.get<AppNotification[]>("/notifications"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      MOCK_MODE
        ? Promise.resolve()
        : api.post<void>(`/notifications`, { id, read: true }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications-center"] }),
    onError: () => toast.error("Erro ao marcar notificação"),
  });

  const unreadCount = (query.data ?? []).filter((n) => !n.read).length;

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    markRead: markRead.mutate,
  };
}
