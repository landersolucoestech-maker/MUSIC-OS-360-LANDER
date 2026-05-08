import { useState, useCallback } from "react";
import {
  MOCK_TICKETS, MOCK_MESSAGES, MOCK_CHAT_ROOMS,
  MOCK_CHAT_MESSAGES, MOCK_REQUESTS,
} from "../data/mockSupport";
import type {
  SupportTicket, SupportMessage, ChatRoom, ChatMessage, SupportRequest,
  TicketStatus, TicketPriority, TicketCategory,
} from "../types";

const LS_KEY_TICKETS = "musicos360_support_tickets";
const LS_KEY_MESSAGES = "musicos360_support_messages";
const LS_KEY_CHATS = "musicos360_support_chats";
const LS_KEY_CHAT_MSGS = "musicos360_support_chat_messages";
const LS_KEY_REQUESTS = "musicos360_support_requests";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    load(LS_KEY_TICKETS, MOCK_TICKETS)
  );

  const addTicket = useCallback((data: Omit<SupportTicket, "id" | "ticket_number" | "created_at" | "updated_at" | "tenant_id">) => {
    const next: SupportTicket = {
      ...data,
      id: `tkt-${Date.now()}`,
      tenant_id: "tenant-001",
      ticket_number: `TKT-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTickets((prev) => {
      const updated = [next, ...prev];
      save(LS_KEY_TICKETS, updated);
      return updated;
    });
    return next;
  }, []);

  const updateTicket = useCallback((id: string, changes: Partial<SupportTicket>) => {
    setTickets((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, ...changes, updated_at: new Date().toISOString() } : t
      );
      save(LS_KEY_TICKETS, updated);
      return updated;
    });
  }, []);

  const deleteTicket = useCallback((id: string) => {
    setTickets((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      save(LS_KEY_TICKETS, updated);
      return updated;
    });
  }, []);

  return { tickets, addTicket, updateTicket, deleteTicket };
}

export function useTicketMessages(ticketId: string) {
  const [allMessages, setAllMessages] = useState<Record<string, SupportMessage[]>>(() =>
    load(LS_KEY_MESSAGES, MOCK_MESSAGES)
  );

  const messages = allMessages[ticketId] ?? [];

  const addMessage = useCallback((msg: Omit<SupportMessage, "id" | "created_at">) => {
    const next: SupportMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setAllMessages((prev) => {
      const updated = { ...prev, [ticketId]: [...(prev[ticketId] ?? []), next] };
      save(LS_KEY_MESSAGES, updated);
      return updated;
    });
  }, [ticketId]);

  return { messages, addMessage };
}

export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoom[]>(() =>
    load(LS_KEY_CHATS, MOCK_CHAT_ROOMS)
  );

  const markRead = useCallback((roomId: string) => {
    setRooms((prev) => {
      const updated = prev.map((r) => r.id === roomId ? { ...r, unread_count: 0 } : r);
      save(LS_KEY_CHATS, updated);
      return updated;
    });
  }, []);

  return { rooms, markRead };
}

export function useChatMessages(roomId: string) {
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(() =>
    load(LS_KEY_CHAT_MSGS, MOCK_CHAT_MESSAGES)
  );

  const messages = allMessages[roomId] ?? [];

  const sendMessage = useCallback((text: string) => {
    const next: ChatMessage = {
      id: `cm-${Date.now()}`,
      room_id: roomId,
      sender: "support",
      sender_name: "Suporte MUSIC OS 360",
      message: text,
      created_at: new Date().toISOString(),
      type: "text",
    };
    setAllMessages((prev) => {
      const updated = { ...prev, [roomId]: [...(prev[roomId] ?? []), next] };
      save(LS_KEY_CHAT_MSGS, updated);
      return updated;
    });
  }, [roomId]);

  return { messages, sendMessage };
}

export function useRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>(() =>
    load(LS_KEY_REQUESTS, MOCK_REQUESTS)
  );

  const addRequest = useCallback((data: Omit<SupportRequest, "id" | "created_at" | "updated_at" | "tenant_id" | "votes" | "status">) => {
    const next: SupportRequest = {
      ...data,
      id: `req-${Date.now()}`,
      tenant_id: "tenant-001",
      status: "pending",
      votes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRequests((prev) => {
      const updated = [next, ...prev];
      save(LS_KEY_REQUESTS, updated);
      return updated;
    });
  }, []);

  const upvote = useCallback((id: string) => {
    setRequests((prev) => {
      const updated = prev.map((r) => r.id === id ? { ...r, votes: r.votes + 1 } : r);
      save(LS_KEY_REQUESTS, updated);
      return updated;
    });
  }, []);

  return { requests, addRequest, upvote };
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_customer: "Aguardando Cliente",
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
