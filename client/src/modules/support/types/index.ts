export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory =
  | "financeiro"
  | "analytics"
  | "distribuicao"
  | "contratos"
  | "artistas"
  | "projetos"
  | "usuarios"
  | "permissoes"
  | "integracoes"
  | "outro";

export type SystemStatusLevel = "operational" | "degraded" | "maintenance" | "offline";

export interface SupportTicket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  created_by: string;
  assigned_to?: string;
  sla_deadline: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  tags?: string[];
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  sender_role: "user" | "support" | "system";
  message: string;
  attachments?: string[];
  internal_note: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  tenant_id: string;
  participant_name: string;
  participant_avatar?: string;
  participant_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: "active" | "resolved" | "queued";
  online: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender: "user" | "support";
  sender_name: string;
  message: string;
  created_at: string;
  type: "text" | "file" | "image";
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  article_count: number;
  color: string;
}

export interface KnowledgeArticle {
  id: string;
  tenant_id: string;
  category_id: string;
  category_name: string;
  title: string;
  summary: string;
  content: string;
  views: number;
  helpful_count: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  read_time: number;
}

export interface SystemService {
  id: string;
  name: string;
  description: string;
  status: SystemStatusLevel;
  uptime: number;
  latency?: number;
  last_incident?: string;
}

export interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  services: string[];
  created_at: string;
  resolved_at?: string;
  updates: { message: string; created_at: string }[];
}

export interface SupportRequest {
  id: string;
  tenant_id: string;
  type: "feature" | "bug" | "question" | "billing" | "integration";
  title: string;
  description: string;
  status: "pending" | "in_review" | "approved" | "rejected" | "done";
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  votes: number;
}
