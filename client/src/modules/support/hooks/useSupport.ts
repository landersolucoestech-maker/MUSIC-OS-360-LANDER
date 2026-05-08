import { useState, useCallback } from "react";
import {
  MOCK_TICKETS, MOCK_MESSAGES, MOCK_CHAT_ROOMS,
  MOCK_CHAT_MESSAGES, MOCK_REQUESTS,
} from "../data/mockSupport";
import type {
  SupportTicket, SupportMessage, ChatRoom, ChatMessage, SupportRequest,
  TicketStatus, TicketPriority, TicketCategory,
} from "../types";

const LS_KEY_TICKETS   = "musicos360_support_tickets";
const LS_KEY_MESSAGES  = "musicos360_support_messages";
const LS_KEY_CHATS     = "musicos360_support_chats";
const LS_KEY_CHAT_MSGS = "musicos360_support_chat_messages";
const LS_KEY_REQUESTS  = "musicos360_support_requests";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ── Tickets ── */

export function useTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    load(LS_KEY_TICKETS, MOCK_TICKETS)
  );

  const addTicket = useCallback(
    (data: Pick<SupportTicket, "subject" | "description" | "category" | "priority" | "created_by">) => {
      const sla = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const next: SupportTicket = {
        id: `tkt-${Date.now()}`,
        tenant_id: "tenant-001",
        ticket_number: `TKT-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: "open",
        created_by: data.created_by,
        sla_deadline: sla,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTickets((prev) => {
        const updated = [next, ...prev];
        save(LS_KEY_TICKETS, updated);
        return updated;
      });
      return next;
    },
    []
  );

  const updateTicket = useCallback((id: string, changes: Partial<SupportTicket>) => {
    setTickets((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, ...changes, updated_at: new Date().toISOString() } : t
      );
      save(LS_KEY_TICKETS, updated);
      return updated;
    });
  }, []);

  return { tickets, addTicket, updateTicket };
}

/* ── Ticket messages ── */

export function useTicketMessages(ticketId: string) {
  const [allMessages, setAllMessages] = useState<Record<string, SupportMessage[]>>(() =>
    load(LS_KEY_MESSAGES, MOCK_MESSAGES)
  );

  const messages = allMessages[ticketId] ?? [];

  const addMessage = useCallback(
    (text: string, role: "user" | "support" = "support") => {
      const next: SupportMessage = {
        id: `msg-${Date.now()}`,
        ticket_id: ticketId,
        sender_id: role === "support" ? "support-000" : "user-000",
        sender_name: role === "support" ? "Equipe de Suporte" : "Você",
        sender_role: role,
        message: text,
        internal_note: false,
        created_at: new Date().toISOString(),
      };
      setAllMessages((prev) => {
        const updated = { ...prev, [ticketId]: [...(prev[ticketId] ?? []), next] };
        save(LS_KEY_MESSAGES, updated);
        return updated;
      });
    },
    [ticketId]
  );

  return { messages, addMessage };
}

/* ── Chat rooms ── */

export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoom[]>(() =>
    load(LS_KEY_CHATS, MOCK_CHAT_ROOMS)
  );

  const markRead = useCallback((roomId: string) => {
    setRooms((prev) => {
      const updated = prev.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r
      );
      save(LS_KEY_CHATS, updated);
      return updated;
    });
  }, []);

  return { rooms, markRead };
}

/* ── Chat messages ── */

export function useChatMessages(roomId: string) {
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(() =>
    load(LS_KEY_CHAT_MSGS, MOCK_CHAT_MESSAGES)
  );

  const messages = allMessages[roomId] ?? [];

  const sendMessage = useCallback(
    (text: string, senderRole: "user" | "support" = "support") => {
      const next: ChatMessage = {
        id: `cm-${Date.now()}`,
        room_id: roomId,
        sender: senderRole,
        sender_name: senderRole === "support" ? "Suporte MUSIC OS 360" : "Cliente",
        message: text,
        created_at: new Date().toISOString(),
        type: "text",
      };
      setAllMessages((prev) => {
        const updated = { ...prev, [roomId]: [...(prev[roomId] ?? []), next] };
        save(LS_KEY_CHAT_MSGS, updated);
        return updated;
      });
    },
    [roomId]
  );

  return { messages, sendMessage };
}

/* ── Requests ── */

export function useRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>(() =>
    load(LS_KEY_REQUESTS, MOCK_REQUESTS)
  );

  const addRequest = useCallback(
    (data: Pick<SupportRequest, "title" | "description" | "type" | "priority">) => {
      const next: SupportRequest = {
        id: `req-${Date.now()}`,
        tenant_id: "tenant-001",
        type: data.type,
        title: data.title,
        description: data.description,
        status: "pending",
        priority: data.priority,
        votes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setRequests((prev) => {
        const updated = [next, ...prev];
        save(LS_KEY_REQUESTS, updated);
        return updated;
      });
    },
    []
  );

  const upvote = useCallback((id: string) => {
    setRequests((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, votes: r.votes + 1 } : r
      );
      save(LS_KEY_REQUESTS, updated);
      return updated;
    });
  }, []);

  return { requests, addRequest, upvote };
}

/* ── Label maps ── */

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_customer: "Aguardando",
  resolved: "Resolvido",
  closed: "Fechado",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  financeiro: "Financeiro",
  analytics: "Analytics",
  distribuicao: "Distribuição",
  contratos: "Contratos",
  artistas: "Artistas",
  projetos: "Projetos",
  usuarios: "Usuários",
  permissoes: "Permissões",
  integracoes: "Integrações",
  outro: "Outro",
};

export const REQUEST_STATUS_LABELS: Record<SupportRequest["status"], string> = {
  pending: "Pendente",
  in_review: "Em Análise",
  approved: "Aprovado",
  rejected: "Recusado",
  done: "Concluído",
};

export const REQUEST_TYPE_LABELS: Record<SupportRequest["type"], string> = {
  feature: "Feature",
  bug: "Bug",
  question: "Pergunta",
  billing: "Cobrança",
  integration: "Integração",
};
