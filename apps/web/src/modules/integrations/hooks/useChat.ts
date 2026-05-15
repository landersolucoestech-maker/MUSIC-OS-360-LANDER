/**
 * integrations/hooks/useChat.ts
 *
 * Hook stub para integração MusicChat (mensagens internas da plataforma).
 *
 * ESTADO ACTUAL: standalone — mensagens simuladas com MOCK_DATA em /chat.
 * MIGRAÇÃO FUTURA:
 *   1. Backend WebSocket (Socket.io) ou servidor SSE
 *   2. Persistência em base de dados multi-tenant (isolamento por tenant_id)
 *   3. Notificações push via Web Push API
 *   4. Upload de ficheiros via R2 (usar useR2 para attachments)
 *
 * Rota MusicChat: /chat
 * Contrato: @/shared/integrations/contracts/chat.contract → IChatProvider
 */

import { useQuery } from "@tanstack/react-query";
import type { IntegrationRuntimeStatus } from "@/shared/integrations/types";
import { disabledIntegration } from "@/shared/lib/disabled-integration";

// ─── Tipos específicos do MusicChat ──────────────────────────────────────────

export interface ChatStatus extends IntegrationRuntimeStatus {
  integration_id: "musicroomchat";
  websocket_url?: string | null;
  push_notifications_enabled: boolean;
  max_channels_per_tenant: number;
}

// ─── Hook de status ───────────────────────────────────────────────────────────

export function useChatStatus() {
  return useQuery<ChatStatus>({
    queryKey: ["integrations", "musicroomchat", "status"],
    queryFn: async (): Promise<ChatStatus> => ({
      integration_id: "musicroomchat",
      status: "disabled",
      connected: false,
      websocket_url: null,
      push_notifications_enabled: false,
      max_channels_per_tenant: 0,
      last_error: null,
      last_checked_at: new Date().toISOString(),
    }),
    staleTime: Infinity,
  });
}

// ─── Stubs desabilitados ──────────────────────────────────────────────────────

/**
 * MIGRAÇÃO FUTURA: conectar ao WebSocket/SSE do MusicChat backend.
 * Em modo standalone: dados do localStorage substituem o canal real.
 */
export function useChatChannel() {
  return {
    messages: [],
    isLoading: false,
    sendMessage: (_text: string) => disabledIntegration("MusicChat"),
    sendAttachment: (_file: File) => disabledIntegration("MusicChat"),
  };
}

/**
 * MIGRAÇÃO FUTURA: listar canais disponíveis para o tenant.
 */
export function useChatChannels() {
  return {
    data: null,
    isLoading: false,
    createChannel: (_name: string) => disabledIntegration("MusicChat"),
  };
}

/**
 * MIGRAÇÃO FUTURA: subscrever notificações push via Web Push API.
 */
export function useChatNotifications() {
  return {
    unread_count: 0,
    isSubscribed: false,
    subscribe: () => disabledIntegration("MusicChat"),
    unsubscribe: () => disabledIntegration("MusicChat"),
  };
}
