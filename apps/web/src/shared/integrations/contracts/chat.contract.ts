/**
 * shared/integrations/contracts/chat.contract.ts
 *
 * Contrato de comunicação interna — MusicChat.
 *
 * ESTADO ACTUAL: rota /chat existe; comunicação é mock (sem tempo real).
 * MIGRAÇÃO FUTURA: IChatProvider implementado via WebSocket / SSE ou
 *   serviço dedicado (ex.: Stream Chat, Supabase Realtime, Pusher).
 *
 * Entidades do MusicChat alinhadas com domínios do produto:
 *   - Canais por projecto, artista, departamento
 *   - Menções a entidades do sistema (obra, contrato, lançamento)
 *   - Notificações internas
 */

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type ChannelType =
  | "direct"        // DM entre dois utilizadores
  | "group"         // grupo ad-hoc
  | "project"       // canal associado a um Projecto
  | "artist"        // canal associado a um Artista
  | "department"    // canal de departamento (Marketing, RH, etc.)
  | "general";      // canal geral do tenant

export type MessageType =
  | "text"
  | "file"
  | "image"
  | "audio"
  | "entity_ref"    // referência a uma entidade do sistema
  | "notification"  // notificação gerada pelo sistema
  | "event";        // evento de canal (membro adicionado, etc.)

/**
 * Referência a uma entidade do domínio MUSIC OS 360.
 * Permite vincular mensagens a obras, contratos, lançamentos, etc.
 */
export interface EntityReference {
  entity_type:
    | "obra"
    | "fonograma"
    | "artista"
    | "contrato"
    | "lancamento"
    | "projeto"
    | "transacao"
    | "campanha";
  entity_id: string;
  entity_label: string;
  entity_url?: string;
}

export interface ChatAttachment {
  id: string;
  filename: string;
  url: string;
  content_type: string;
  size_bytes: number;
}

export interface ChatMember {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  role: "owner" | "admin" | "member";
  joined_at: string;
  last_seen_at?: string | null;
}

export interface ChatChannel {
  id: string;
  tenant_id: string;
  type: ChannelType;
  name: string;
  description?: string | null;
  /** ID da entidade vinculada (projecto, artista, etc.) */
  entity_id?: string | null;
  members: ChatMember[];
  unread_count: number;
  last_message?: ChatMessage | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string | null;
  type: MessageType;
  text?: string | null;
  attachments?: ChatAttachment[];
  entity_ref?: EntityReference | null;
  /** IDs de utilizadores mencionados com @ */
  mentions?: string[];
  /** Mensagem à qual esta responde (thread) */
  reply_to?: string | null;
  reactions?: Record<string, string[]>;  // emoji → user_ids
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  is_edited: boolean;
  is_deleted: boolean;
}

export interface SendMessageParams {
  channel_id: string;
  text?: string;
  type?: MessageType;
  attachments?: File[];
  entity_ref?: EntityReference;
  mentions?: string[];
  reply_to?: string;
}

export interface CreateChannelParams {
  type: ChannelType;
  name: string;
  description?: string;
  member_ids: string[];
  entity_id?: string;
}

export interface ChatNotification {
  id: string;
  type: "mention" | "reply" | "channel_invite" | "system";
  channel_id: string;
  message_id?: string;
  sender_id?: string;
  text: string;
  read: boolean;
  created_at: string;
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

/**
 * IChatProvider — contrato de comunicação interna.
 *
 * Implementações previstas:
 *   - MockChatProvider        (standalone — localStorage + MOCK_DATA)
 *   - RealtimeChatProvider    (produção — WebSocket ou SSE)
 */
export interface IChatProvider {
  // ── Canais ────────────────────────────────────────────────────────────────
  listChannels(): Promise<ChatChannel[]>;
  getChannel(channelId: string): Promise<ChatChannel>;
  createChannel(params: CreateChannelParams): Promise<ChatChannel>;
  archiveChannel(channelId: string): Promise<void>;
  addMember(channelId: string, userId: string): Promise<void>;
  removeMember(channelId: string, userId: string): Promise<void>;

  // ── Mensagens ─────────────────────────────────────────────────────────────
  listMessages(channelId: string, params?: { before?: string; limit?: number }): Promise<ChatMessage[]>;
  sendMessage(params: SendMessageParams): Promise<ChatMessage>;
  editMessage(messageId: string, text: string): Promise<ChatMessage>;
  deleteMessage(messageId: string): Promise<void>;

  // ── Reacções ──────────────────────────────────────────────────────────────
  addReaction(messageId: string, emoji: string): Promise<void>;
  removeReaction(messageId: string, emoji: string): Promise<void>;

  // ── Notificações ──────────────────────────────────────────────────────────
  listNotifications(): Promise<ChatNotification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  markChannelRead(channelId: string): Promise<void>;

  // ── Tempo real ────────────────────────────────────────────────────────────
  /** Subscreve a novos eventos num canal. Devolve função de unsubscribe. */
  subscribe(channelId: string, handler: (message: ChatMessage) => void): () => void;
}

