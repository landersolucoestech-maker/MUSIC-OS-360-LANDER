export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketStatus = SupportTicketStatus;
export type TicketPriority = SupportPriority;
export type TicketCategory =
  | 'financeiro'
  | 'analytics'
  | 'distribuicao'
  | 'contratos'
  | 'artistas'
  | 'projetos'
  | 'usuarios'
  | 'permissoes'
  | 'integracoes'
  | 'outro';

export type SystemStatusLevel = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance' | 'offline';

export interface SupportTicket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  category: string;
  created_by: string;
  assigned_to?: string;
  sla_deadline?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  tags?: string[];
}

export interface SupportMessage {
  id: string;
  tenant_id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'user' | 'support' | 'admin';
  message: string;
  internal_note: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  tenant_id: string;
  participant_name: string;
  participant_email: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  status: 'active' | 'resolved';
  online: boolean;
}

export interface ChatMessage {
  id: string;
  tenant_id: string;
  room_id: string;
  sender: 'user' | 'support';
  sender_name: string;
  message: string;
  created_at: string;
  type: 'text' | 'image' | 'file';
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
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  uptime: number;
  latency: number;
  last_incident?: string;
}

export interface IncidentUpdate {
  message: string;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  services: string[];
  created_at: string;
  resolved_at?: string;
  updates: IncidentUpdate[];
}

export interface SupportRequest {
  id: string;
  tenant_id: string;
  type: 'feature' | 'bug' | 'question' | 'billing' | 'integration';
  title: string;
  description: string;
  status: 'pending' | 'in_review' | 'approved' | 'done' | 'rejected';
  priority: SupportPriority;
  created_at: string;
  updated_at: string;
  votes: number;
}
