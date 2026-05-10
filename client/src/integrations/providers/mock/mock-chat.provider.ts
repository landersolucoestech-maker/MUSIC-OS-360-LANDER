/**
 * integrations/providers/mock/mock-chat.provider.ts
 *
 * Implementação mock de IChatProvider (MusicChat).
 * Em modo standalone: localStorage + dados em memória.
 *
 * MIGRAÇÃO FUTURA: substituir por RealtimeChatProvider (WebSocket / SSE via backend).
 */

import type {
  IChatProvider,
  ChatChannel,
  ChatMessage,
  ChatNotification,
  SendMessageParams,
  CreateChannelParams,
} from "@/integrations/dto";

const _channels = new Map<string, ChatChannel>();
const _messages = new Map<string, ChatMessage[]>();
const _notifications: ChatNotification[] = [];
const _subscribers = new Map<string, Array<(m: ChatMessage) => void>>();

const MOCK_MEMBER = {
  user_id:      "mock-user-001",
  name:         "Demo User",
  avatar_url:   null,
  role:         "owner" as const,
  joined_at:    "2024-01-01T00:00:00.000Z",
  last_seen_at: new Date().toISOString(),
};

function seedChannels(): void {
  if (_channels.size > 0) return;

  const seed: Omit<ChatChannel, "last_message">[] = [
    { id: "ch_general", tenant_id: "mock-tenant-001", type: "general",    name: "# geral",           description: "Canal geral do time", entity_id: null, members: [MOCK_MEMBER], unread_count: 2, created_at: "2024-01-01T00:00:00.000Z", updated_at: new Date().toISOString(), is_archived: false },
    { id: "ch_releases", tenant_id: "mock-tenant-001", type: "department", name: "# lançamentos",     description: "Coordenação de lançamentos", entity_id: null, members: [MOCK_MEMBER], unread_count: 0, created_at: "2024-01-02T00:00:00.000Z", updated_at: new Date().toISOString(), is_archived: false },
    { id: "ch_marketing", tenant_id: "mock-tenant-001", type: "department", name: "# marketing",      description: "Campanhas e ads", entity_id: null, members: [MOCK_MEMBER], unread_count: 1, created_at: "2024-01-03T00:00:00.000Z", updated_at: new Date().toISOString(), is_archived: false },
  ];

  for (const ch of seed) _channels.set(ch.id, { ...ch, last_message: null });
}

function newMessage(params: SendMessageParams): ChatMessage {
  return {
    id:           `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    channel_id:   params.channel_id,
    sender_id:    "mock-user-001",
    sender_name:  "Demo User",
    sender_avatar: null,
    type:         params.type ?? "text",
    text:         params.text ?? null,
    attachments:  [],
    entity_ref:   params.entity_ref ?? null,
    mentions:     params.mentions ?? [],
    reply_to:     params.reply_to ?? null,
    reactions:    {},
    created_at:   new Date().toISOString(),
    updated_at:   null,
    deleted_at:   null,
    is_edited:    false,
    is_deleted:   false,
  };
}

export class MockChatProvider implements IChatProvider {
  constructor() { seedChannels(); }

  async listChannels(): Promise<ChatChannel[]> {
    return Array.from(_channels.values()).filter((c) => !c.is_archived);
  }

  async getChannel(channelId: string): Promise<ChatChannel> {
    const ch = _channels.get(channelId);
    if (!ch) throw new Error(`[MockChatProvider] canal não encontrado: ${channelId}`);
    return ch;
  }

  async createChannel(params: CreateChannelParams): Promise<ChatChannel> {
    const id = `ch_${Date.now()}`;
    const now = new Date().toISOString();
    const ch: ChatChannel = {
      id,
      tenant_id:    "mock-tenant-001",
      type:         params.type,
      name:         params.name,
      description:  params.description ?? null,
      entity_id:    params.entity_id ?? null,
      members:      [MOCK_MEMBER],
      unread_count: 0,
      last_message: null,
      created_at:   now,
      updated_at:   now,
      is_archived:  false,
    };
    _channels.set(id, ch);
    return ch;
  }

  async archiveChannel(channelId: string): Promise<void> {
    const ch = _channels.get(channelId);
    if (ch) { ch.is_archived = true; _channels.set(channelId, ch); }
  }

  async addMember(channelId: string, _userId: string): Promise<void> {
    console.info(`[MockChatProvider] addMember → ${channelId}`);
  }

  async removeMember(channelId: string, _userId: string): Promise<void> {
    console.info(`[MockChatProvider] removeMember → ${channelId}`);
  }

  async listMessages(
    channelId: string,
    params?: { before?: string; limit?: number }
  ): Promise<ChatMessage[]> {
    let msgs = _messages.get(channelId) ?? [];
    if (params?.before) {
      const idx = msgs.findIndex((m) => m.id === params.before);
      if (idx > 0) msgs = msgs.slice(0, idx);
    }
    const limit = params?.limit ?? 50;
    return msgs.slice(-limit);
  }

  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    const msg = newMessage(params);
    if (!_messages.has(params.channel_id)) _messages.set(params.channel_id, []);
    _messages.get(params.channel_id)!.push(msg);

    const ch = _channels.get(params.channel_id);
    if (ch) { ch.last_message = msg; ch.updated_at = msg.created_at; }

    (_subscribers.get(params.channel_id) ?? []).forEach((h) => h(msg));
    return msg;
  }

  async editMessage(messageId: string, text: string): Promise<ChatMessage> {
    for (const msgs of _messages.values()) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) { msg.text = text; msg.is_edited = true; msg.updated_at = new Date().toISOString(); return msg; }
    }
    throw new Error(`[MockChatProvider] mensagem não encontrada: ${messageId}`);
  }

  async deleteMessage(messageId: string): Promise<void> {
    for (const msgs of _messages.values()) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) { msg.is_deleted = true; msg.deleted_at = new Date().toISOString(); return; }
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    for (const msgs of _messages.values()) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
        if (!msg.reactions[emoji].includes("mock-user-001"))
          msg.reactions[emoji].push("mock-user-001");
        return;
      }
    }
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    for (const msgs of _messages.values()) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg?.reactions?.[emoji]) {
        msg.reactions[emoji] = msg.reactions[emoji].filter((u) => u !== "mock-user-001");
        return;
      }
    }
  }

  async listNotifications(): Promise<ChatNotification[]> {
    return _notifications.filter((n) => !n.read);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const n = _notifications.find((x) => x.id === notificationId);
    if (n) n.read = true;
  }

  async markChannelRead(channelId: string): Promise<void> {
    const ch = _channels.get(channelId);
    if (ch) { ch.unread_count = 0; _channels.set(channelId, ch); }
  }

  subscribe(
    channelId: string,
    handler: (message: ChatMessage) => void
  ): () => void {
    if (!_subscribers.has(channelId)) _subscribers.set(channelId, []);
    _subscribers.get(channelId)!.push(handler);
    return () => {
      const subs = _subscribers.get(channelId) ?? [];
      const idx  = subs.indexOf(handler);
      if (idx !== -1) subs.splice(idx, 1);
    };
  }
}

export const mockChatProvider = new MockChatProvider();
