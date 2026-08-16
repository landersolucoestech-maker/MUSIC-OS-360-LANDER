import { api } from "@/shared/lib/api-client";
import type {
  MusicChatAutomationEvent,
  MusicChatAutomationSettings,
  MusicChatInboundMessagePayload,
} from "../types/musicchat-automation.types";

const BASE = "/conversations/musicchat/automation";

export const musicChatAutomationService = {
  getSettings() {
    return api.get<MusicChatAutomationSettings>(`${BASE}/settings`);
  },

  updateSettings(payload: Partial<MusicChatAutomationSettings> & { expectedUpdatedAt?: string }) {
    return api.patch<MusicChatAutomationSettings>(`${BASE}/settings`, payload);
  },

  processInbound(payload: MusicChatInboundMessagePayload) {
    return api.post<{ conversation: unknown; action: string; option?: unknown }>(`${BASE}/inbound`, payload);
  },

  runEscalations(conversationId?: string) {
    return api.post<{ processed: number; notifications: unknown[] }>(`${BASE}/escalations/run`, { conversationId });
  },

  listEvents(conversationId?: string) {
    const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
    return api.get<MusicChatAutomationEvent[]>(`${BASE}/events${query}`);
  },
};
