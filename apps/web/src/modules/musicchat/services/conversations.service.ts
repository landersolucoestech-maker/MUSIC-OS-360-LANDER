import { api } from "@/shared/lib/api-client";
import type { ChatAttachmentData } from "@/shared/components/ChatAttachment";

export type MusicChatChannel = "whatsapp" | "instagram" | "facebook" | "tiktok" | "site" | "custom";
export type MusicChatStatus = "nova" | "aguardando_atendimento" | "em_atendimento" | "aguardando_cliente" | "resolvida" | "arquivada";
export type MusicChatDeadlineState = "on_track" | "at_risk" | "overdue";

export interface MusicChatConversation {
  id: string;
  customer: string;
  handle: string;
  phone: string;
  instagram: string;
  email: string;
  originLabel: string;
  channel: MusicChatChannel;
  queue: string;
  sector: string;
  status: MusicChatStatus;
  assignee: string;
  protocol: string;
  sla: number;
  remainingTimeLabel: string;
  deadlineState: MusicChatDeadlineState;
  tags: string[];
  assunto?: string;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  lastReplyAt: string;
  unread: number;
  value: string;
  crmSummary: {
    existingCustomer: boolean;
    lead: string;
    openDeal: string;
    stage: string;
  };
  auditTrail: string[];
  /** Concorrência otimista (Task M) — reenviar como expectedUpdatedAt no update/transfer. */
  updated_at: string;
}

export interface MusicChatMessage {
  id: string;
  sender: "customer" | "agent" | "system";
  author: string;
  body: string;
  time: string;
  attachments?: ChatAttachmentData[];
}

interface ApiConversation {
  id: string;
  contact_id: string | null;
  subject: string;
  status: "open" | "pending" | "closed" | "spam";
  channel: string;
  assigned_to: string | null;
  last_message_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ApiMessage {
  id: string;
  body: string;
  sender_id: string;
  sender_type: "user" | "contact" | "system" | "ai";
  attachments: ChatAttachmentData[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function mapChannel(channel: string): MusicChatChannel {
  if (["whatsapp", "instagram", "facebook", "tiktok", "custom"].includes(channel)) return channel as MusicChatChannel;
  return channel === "email" ? "site" : "custom";
}

function mapStatus(row: ApiConversation, metadata: Record<string, unknown>): MusicChatStatus {
  const serviceStatus = text(metadata.service_status);
  if (["nova", "aguardando_atendimento", "em_atendimento", "aguardando_cliente", "resolvida", "arquivada"].includes(serviceStatus)) {
    return serviceStatus as MusicChatStatus;
  }
  if (row.status === "closed") return "resolvida";
  if (row.status === "pending") return "aguardando_cliente";
  return "em_atendimento";
}

function mapConversation(row: ApiConversation): MusicChatConversation {
  const metadata = object(row.metadata);
  const contact = object(metadata.contact);
  const crm = object(metadata.crm_summary);
  const sla = Number(metadata.sla_percent ?? 100);
  const deadline = text(metadata.sla_state, "on_track") as MusicChatDeadlineState;
  return {
    id: row.id,
    customer: text(contact.name ?? metadata.customer_name, row.subject || "Conversa sem nome"),
    handle: text(contact.handle ?? metadata.handle, "—"),
    phone: text(contact.phone ?? metadata.phone, "—"),
    instagram: text(contact.instagram ?? metadata.instagram, "—"),
    email: text(contact.email ?? metadata.email, "—"),
    originLabel: text(metadata.origin_label, row.channel),
    channel: mapChannel(row.channel),
    queue: text(metadata.queue_name ?? metadata.queue_id, "Sem fila"),
    sector: text(metadata.sector_name ?? metadata.sector_id, "Sem setor"),
    status: mapStatus(row, metadata),
    assignee: text(metadata.assignee_name, row.assigned_to ?? "Sem responsável"),
    protocol: text(metadata.protocol, row.id.slice(0, 8).toUpperCase()),
    sla: Number.isFinite(sla) ? Math.max(0, Math.min(100, sla)) : 100,
    remainingTimeLabel: text(metadata.remaining_time_label, "Prazo não definido"),
    deadlineState: ["on_track", "at_risk", "overdue"].includes(deadline) ? deadline : "on_track",
    tags: stringList(metadata.tags),
    assunto: text(metadata.assunto) || undefined,
    lastMessage: text(metadata.last_message, row.subject),
    lastMessageAt: formatTime(row.last_message_at ?? row.updated_at),
    createdAt: formatDate(row.created_at),
    lastReplyAt: formatDate(row.last_message_at ?? row.updated_at),
    unread: Number(metadata.unread_count ?? 0) || 0,
    value: text(metadata.value, "—"),
    crmSummary: {
      existingCustomer: Boolean(crm.existing_customer ?? row.contact_id),
      lead: text(crm.lead, "—"),
      openDeal: text(crm.open_deal, "—"),
      stage: text(crm.stage, "—"),
    },
    auditTrail: stringList(metadata.audit_trail),
    updated_at: row.updated_at,
  };
}

function mapMessage(row: ApiMessage): MusicChatMessage {
  const metadata = object(row.metadata);
  return {
    id: row.id,
    sender: row.sender_type === "contact" ? "customer" : row.sender_type === "system" || row.sender_type === "ai" ? "system" : "agent",
    author: text(metadata.author_name, row.sender_type === "contact" ? "Contato" : row.sender_type === "system" ? "Sistema" : "Equipe"),
    body: row.body,
    time: formatTime(row.created_at),
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

export const musicChatConversationsService = {
  async list(): Promise<MusicChatConversation[]> {
    const result = await api.get<ApiConversation[]>("/conversations?limit=200");
    return result.map(mapConversation);
  },

  async messages(conversationId: string): Promise<MusicChatMessage[]> {
    const result = await api.get<ApiMessage[]>(`/conversations/${conversationId}/messages?limit=200`);
    return result.map(mapMessage);
  },

  async sendMessage(conversationId: string, body: string, attachments: ChatAttachmentData[]): Promise<MusicChatMessage> {
    const result = await api.post<ApiMessage>(`/conversations/${conversationId}/messages`, { body, attachments });
    return mapMessage(result);
  },

  async addNote(conversationId: string, body: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/notes`, { body });
  },

  async update(conversationId: string, payload: Record<string, unknown>): Promise<MusicChatConversation> {
    return mapConversation(await api.patch<ApiConversation>(`/conversations/${conversationId}`, payload));
  },

  async transfer(conversationId: string, assigneeId: string): Promise<MusicChatConversation> {
    return mapConversation(await api.patch<ApiConversation>(`/conversations/${conversationId}/transfer`, { assignee_id: assigneeId }));
  },

  async close(conversationId: string): Promise<MusicChatConversation> {
    return mapConversation(await api.patch<ApiConversation>(`/conversations/${conversationId}/close`, { reason: "Finalizada no MusicChat", service_status: "resolvida" }));
  },

  async reopen(conversationId: string): Promise<MusicChatConversation> {
    return mapConversation(await api.patch<ApiConversation>(`/conversations/${conversationId}/reopen`, { reason: "Reaberta no MusicChat" }));
  },

  async archive(conversationId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}`);
  },
};
