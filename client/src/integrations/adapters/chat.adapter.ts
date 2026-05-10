/**
 * integrations/adapters/chat.adapter.ts
 *
 * Adapter de comunicação interna (MusicChat).
 * Selecciona MockChatProvider (standalone) ou RealtimeChatProvider (produção).
 *
 * REGRA: o frontend NUNCA gere conexões WebSocket directamente sem passar por este adapter.
 *
 * Uso:
 *   import { chatAdapter } from "@/integrations/adapters/chat.adapter";
 *   const channels = await chatAdapter.listChannels();
 *   const unsub    = chatAdapter.subscribe(channelId, handler);
 */

import type { IChatProvider } from "@/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockChatProvider } from "@/integrations/providers";

function resolveChatProvider(): IChatProvider {
  if (MOCK_MODE) return mockChatProvider;

  // PRODUÇÃO: RealtimeChatProvider via WebSocket / SSE:
  //   WS  /ws/chat?tenant_id=...&token=...
  //   REST /api/chat/channels, /api/chat/messages
  //   O token de auth é gerido pelo AuthProvider (Clerk) — nunca exposto aqui.
  // import { BackendChatProvider } from "@/integrations/providers/backend/backend-chat.provider";
  // return new BackendChatProvider();
  return mockChatProvider;
}

export const chatAdapter: IChatProvider = resolveChatProvider();
