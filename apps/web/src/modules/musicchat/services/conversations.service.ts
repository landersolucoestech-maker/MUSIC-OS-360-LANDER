/**
 * services/conversations.service.ts
 *
 * MusicChat Inbox (decisão de produto 2026-08-22): client real para o
 * backend já existente `/conversations` (ConversationsController/Service,
 * apps/api/src/modules/conversations). Mapeia a entidade real
 * (tenant/status/channel/metadata) para o modelo de UI já existente em
 * shared/pages/MusicChat.tsx (SupportConversation/SupportMessage) — esse
 * componente já estava pronto, só faltava este serviço.
 *
 * Campos sem fonte real no backend (unread count, SLA/prazo, CRM
 * summary além de contact_id, protocolo de mensagem individual) recebem
 * um default neutro e documentado — nunca um valor fabricado/variável.
 */
import { api } from "@/shared/lib/api-client";
import type { ChatAttachmentData } from "@/shared/components/ChatAttachment";

export type BackendConversationStatus = "open" | "pending" | "closed" | "spam";
export type BackendConversationChannel =
  | "internal" | "email" | "whatsapp" | "telegram" | "instagram" | "sms" | "discord" | "facebook" | "tiktok" | "custom";
export type BackendSenderType = "user" | "contact" | "system" | "ai";

interface RawConversation {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  subject: string;
  status: BackendConversationStatus;
  channel: BackendConversationChannel;
  assigned_to: string | null;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RawMessage {
  id: string;
  conversation_id: string;
  body: string;
  sender_id: string;
  sender_type: BackendSenderType;
  attachments: unknown[];
  metadata: Record<string, unknown> & { delivery_status?: "sent" | "failed" | "internal_only"; delivery_error?: string };
  created_at: string;
}

// ── Tipos do modelo de UI já existente (shared/pages/MusicChat.tsx) ──────────
type SupportChannel = "whatsapp" | "instagram" | "facebook" | "tiktok" | "site" | "custom";
type SupportStatus = "nova" | "aguardando_atendimento" | "em_atendimento" | "aguardando_cliente" | "resolvida" | "arquivada";
type DeadlineState = "on_track" | "at_risk" | "overdue";

export interface SupportConversation {
  id: string;
  customer: string;
  handle: string;
  phone: string;
  instagram: string;
  email: string;
  originLabel: string;
  channel: SupportChannel;
  queue: string;
  sector: string;
  status: SupportStatus;
  assignee: string;
  protocol: string;
  sla: number;
  remainingTimeLabel: string;
  deadlineState: DeadlineState;
  tags: string[];
  assunto?: string;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  lastReplyAt: string;
  unread: number;
  value: string;
  crmSummary: { existingCustomer: boolean; lead: string; openDeal: string; stage: string };
  auditTrail: string[];
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  sender: "customer" | "agent" | "system";
  author: string;
  body: string;
  time: string;
  attachments?: ChatAttachmentData[];
  /** Estado real de entrega calculado pelo backend (dispatchOutbound) — nunca fabricado no
   *  frontend. Ausente para mensagens que não passam por despacho externo (ex.: do cliente). */
  deliveryStatus?: "sent" | "failed" | "internal_only";
  deliveryError?: string;
}

const CHANNEL_TO_SUPPORT: Record<BackendConversationChannel, SupportChannel> = {
  whatsapp: "whatsapp",
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
  internal: "custom",
  email: "custom",
  telegram: "custom",
  sms: "custom",
  discord: "custom",
  custom: "custom",
};

const CHANNEL_ORIGIN_LABEL: Record<BackendConversationChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  internal: "Interno",
  email: "E-mail",
  telegram: "Telegram",
  sms: "SMS",
  discord: "Discord",
  custom: "Site",
};

const STATUS_TO_SUPPORT: Record<BackendConversationStatus, SupportStatus> = {
  open: "em_atendimento",
  pending: "aguardando_atendimento",
  closed: "resolvida",
  spam: "arquivada",
};

const SUPPORT_TO_STATUS: Record<SupportStatus, BackendConversationStatus> = {
  nova: "open",
  aguardando_atendimento: "pending",
  em_atendimento: "open",
  aguardando_cliente: "pending",
  resolvida: "closed",
  arquivada: "spam",
};

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function protocolFromId(id: string): string {
  return id.replace(/-/g, "").slice(-8).toUpperCase();
}

function mapConversation(raw: RawConversation): SupportConversation {
  const meta = raw.metadata ?? {};
  const serviceStatus = str(meta["service_status"]) as SupportStatus | "";
  const tags = Array.isArray(meta["tags"]) ? (meta["tags"] as unknown[]).filter((t): t is string => typeof t === "string") : [];

  return {
    id: raw.id,
    customer: str(meta["customer"], raw.subject) || "Sem nome",
    handle: str(meta["phone"]) || str(meta["external_contact_id"]) || str(meta["instagram"]) || str(meta["email"]),
    phone: str(meta["phone"]) || (raw.channel === "whatsapp" ? str(meta["external_contact_id"]) : ""),
    instagram: str(meta["instagram"]),
    email: str(meta["email"]),
    originLabel: CHANNEL_ORIGIN_LABEL[raw.channel],
    channel: CHANNEL_TO_SUPPORT[raw.channel],
    queue: str(meta["queue_id"] ?? meta["queue"]),
    sector: str(meta["sector_id"] ?? meta["sector"]),
    status: serviceStatus || STATUS_TO_SUPPORT[raw.status],
    assignee: raw.assigned_to ?? "Sem responsável",
    protocol: protocolFromId(raw.id),
    // Sem SLA real configurado para conversations no backend (diferente de
    // support_tickets, que tem sla_deadline real) — default neutro fixo,
    // nunca uma contagem fabricada. sla_state existe só como filtro de
    // query, nunca escrito por nenhum fluxo real.
    sla: 100,
    remainingTimeLabel: "",
    deadlineState: "on_track",
    tags,
    assunto: raw.channel === "custom" ? str(meta["assunto"]) || undefined : undefined,
    lastMessage: "",
    lastMessageAt: formatTime(raw.last_message_at),
    createdAt: formatTime(raw.created_at),
    lastReplyAt: formatTime(raw.last_message_at ?? raw.created_at),
    // Sem coluna/contador de não-lidas no backend — nunca fabricar.
    unread: 0,
    value: "",
    crmSummary: {
      existingCustomer: Boolean(raw.contact_id),
      lead: raw.contact_id ? "Vinculado" : "",
      openDeal: "",
      stage: "",
    },
    auditTrail: [],
    updated_at: raw.updated_at,
  };
}

function mapMessage(raw: RawMessage): SupportMessage {
  const sender: SupportMessage["sender"] =
    raw.sender_type === "contact" ? "customer" : raw.sender_type === "system" || raw.sender_type === "ai" ? "system" : "agent";
  const attachments = Array.isArray(raw.attachments) && raw.attachments.length > 0
    ? (raw.attachments as ChatAttachmentData[])
    : undefined;

  return {
    id: raw.id,
    sender,
    author: sender === "customer" ? "Cliente" : sender === "system" ? "Sistema" : raw.sender_id,
    body: raw.body,
    time: formatTime(raw.created_at),
    attachments,
    deliveryStatus: raw.metadata?.delivery_status,
    deliveryError: raw.metadata?.delivery_error,
  };
}

export interface ConversationUpdatePayload {
  status?: BackendConversationStatus;
  subject?: string;
  channel?: BackendConversationChannel;
  assigned_to?: string;
  metadata?: Record<string, unknown>;
  service_status?: SupportStatus;
  tags?: string[];
  expectedUpdatedAt?: string;
}

export const musicChatConversationsService = {
  /** Cria conversa nova. WhatsApp é o único canal com entrega externa real (ver
   *  dispatchOutbound) — metadata.phone é obrigatório para esse canal funcionar de fato.
   *  idempotencyKey: passe a MESMA chave em um retry explícito da mesma tentativa (ex.: o
   *  usuário clicando de novo após um erro de rede) para que o backend devolva o resultado
   *  já criado em vez de criar uma segunda conversa — gerar uma chave nova a cada chamada
   *  só protege contra reenvio automático interno, não contra retry manual do usuário. */
  async create(
    input: { subject: string; channel: BackendConversationChannel; phone?: string; customer?: string },
    idempotencyKey: string = crypto.randomUUID(),
  ): Promise<SupportConversation> {
    const raw = await api.post<RawConversation>(
      "/conversations",
      {
        subject: input.subject,
        channel: input.channel,
        metadata: { phone: input.phone, customer: input.customer },
      },
      { headers: { "X-Idempotency-Key": idempotencyKey } },
    );
    return mapConversation(raw);
  },

  async list(): Promise<SupportConversation[]> {
    // api.get() já desembrulha o envelope {data,timestamp} do TransformInterceptor;
    // como o controller retorna {data: [...], meta} diretamente (sem novo wrap,
    // ver TransformInterceptor: objeto que já tem `data` é preservado), o valor
    // aqui já É o array — reler `.data` duplicava o unwrap e resultava em undefined
    // (mesmo padrão documentado em clientsService.list()).
    const rows = await api.get<RawConversation[]>("/conversations?limit=200");
    return rows.map(mapConversation);
  },

  async messages(conversationId: string): Promise<SupportMessage[]> {
    const rows = await api.get<RawMessage[]>(`/conversations/${conversationId}/messages?limit=200`);
    return rows.map(mapMessage);
  },

  /** Busca uma única conversa — usado para atualizar/inserir localmente em resposta a um
   *  evento realtime específico, em vez de refazer list() inteiro a cada evento. */
  async get(conversationId: string): Promise<SupportConversation> {
    const raw = await api.get<RawConversation>(`/conversations/${conversationId}`);
    return mapConversation(raw);
  },

  async update(conversationId: string, patch: ConversationUpdatePayload): Promise<SupportConversation> {
    const raw = await api.patch<RawConversation>(`/conversations/${conversationId}`, patch);
    return mapConversation(raw);
  },

  async close(conversationId: string, reason = "Finalizado pelo agente via MusicChat"): Promise<SupportConversation> {
    const raw = await api.patch<RawConversation>(`/conversations/${conversationId}/close`, { reason });
    return mapConversation(raw);
  },

  /** "Arquivar" no MusicChat mapeia para o soft-delete real do backend. */
  async archive(conversationId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}`);
  },

  async reopen(conversationId: string, reason?: string): Promise<SupportConversation> {
    const raw = await api.patch<RawConversation>(`/conversations/${conversationId}/reopen`, { reason });
    return mapConversation(raw);
  },

  async sendMessage(
    conversationId: string,
    body: string,
    attachments: ChatAttachmentData[] = [],
    idempotencyKey: string = crypto.randomUUID(),
  ): Promise<SupportMessage> {
    // X-Idempotency-Key: protege contra reenvio duplicado em nível de rede (timeout + retry),
    // além do guard de UI (isSending) em MusicChat.tsx — mesmo padrão já usado por
    // transactions/invoices/contracts/etc. (IdempotencyInterceptor no backend). Passe a mesma
    // chave ao reenviar o MESMO conteúdo; conteúdo editado é outra tentativa e precisa de
    // chave nova (ver attemptRef em MusicChat.tsx/NewConversationDialog.tsx).
    const raw = await api.post<RawMessage>(
      `/conversations/${conversationId}/messages`,
      { body, attachments },
      { headers: { "X-Idempotency-Key": idempotencyKey } },
    );
    return mapMessage(raw);
  },

  async addNote(conversationId: string, body: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/notes`, { body });
  },
};
