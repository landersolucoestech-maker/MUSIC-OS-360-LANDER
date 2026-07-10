import type {
  SupportTicket, SupportMessage, ChatRoom, ChatMessage,
  KnowledgeCategory, KnowledgeArticle, SystemService, Incident, SupportRequest,
} from "../types";

export const MOCK_TICKETS: SupportTicket[] = [];
export const MOCK_MESSAGES: Record<string, SupportMessage[]> = {};
export const MOCK_CHAT_ROOMS: ChatRoom[] = [];
export const MOCK_CHAT_MESSAGES: Record<string, ChatMessage[]> = {};
export const MOCK_KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [];
export const MOCK_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [];
export const MOCK_SYSTEM_SERVICES: SystemService[] = [];
export const MOCK_INCIDENTS: Incident[] = [];
export const MOCK_REQUESTS: SupportRequest[] = [];
