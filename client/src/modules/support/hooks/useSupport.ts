import { useState, useCallback } from "react";
import { useTenant } from "@/app/providers/TenantContext";
import {
  MOCK_TICKETS, MOCK_MESSAGES, MOCK_CHAT_ROOMS,
  MOCK_CHAT_MESSAGES, MOCK_REQUESTS,
} from "../data/mockSupport";
import type {
  SupportTicket, SupportMessage, ChatRoom, ChatMessage, SupportRequest,
  TicketStatus, TicketPriority, TicketCategory,
} from "../types";

function lsKey(base: string, tenantId: string) {
  return `musicos360_${base}_${tenantId}`;
}

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
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    load(lsKey("support_tickets", tenantId), MOCK_TICKETS).filter(
      (t) => t.tenant_id === tenantId || t.tenant_id === "tenant-001"
    )
  );

  const addTicket = useCallback(
    (data: Pick<SupportTicket, "subject" | "description" | "category" | "priority" | "created_by">) => {
      const sla = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const next: SupportTicket = {
        id: `tkt-${Date.now()}`,
        tenant_id: tenantId,
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
        save(lsKey("support_tickets", tenantId), updated);
        return updated;
      });
      return next;
    },
    [tenantId]
  );

  const updateTicket = useCallback((id: string, changes: Partial<SupportTicket>) => {
    setTickets((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, ...changes, updated_at: new Date().toISOString() } : t
      );
      save(lsKey("support_tickets", tenantId), updated);
      return updated;
    });
  }, [tenantId]);

  return { tickets, addTicket, updateTicket };
}

/* ── Ticket messages ── */

export function useTicketMessages(ticketId: string) {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [allMessages, setAllMessages] = useState<Record<string, SupportMessage[]>>(() =>
    load(lsKey("support_messages", tenantId), MOCK_MESSAGES)
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
        save(lsKey("support_messages", tenantId), updated);
        return updated;
      });
    },
    [ticketId, tenantId]
  );

  return { messages, addMessage };
}

/* ── Chat rooms ── */

export function useChatRooms() {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [rooms, setRooms] = useState<ChatRoom[]>(() =>
    load(lsKey("support_chats", tenantId), MOCK_CHAT_ROOMS)
  );

  const markRead = useCallback((roomId: string) => {
    setRooms((prev) => {
      const updated = prev.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r
      );
      save(lsKey("support_chats", tenantId), updated);
      return updated;
    });
  }, [tenantId]);

  return { rooms, markRead };
}

/* ── Chat messages ── */

export function useChatMessages(roomId: string) {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(() =>
    load(lsKey("support_chat_messages", tenantId), MOCK_CHAT_MESSAGES)
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
        save(lsKey("support_chat_messages", tenantId), updated);
        return updated;
      });
    },
    [roomId, tenantId]
  );

  return { messages, sendMessage };
}

/* ── Requests ── */

export function useRequests() {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [requests, setRequests] = useState<SupportRequest[]>(() =>
    load(lsKey("support_requests", tenantId), MOCK_REQUESTS)
  );

  const addRequest = useCallback(
    (data: Pick<SupportRequest, "title" | "description" | "type" | "priority">) => {
      const next: SupportRequest = {
        id: `req-${Date.now()}`,
        tenant_id: tenantId,
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
        save(lsKey("support_requests", tenantId), updated);
        return updated;
      });
    },
    [tenantId]
  );

  const upvote = useCallback((id: string) => {
    setRequests((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, votes: r.votes + 1 } : r
      );
      save(lsKey("support_requests", tenantId), updated);
      return updated;
    });
  }, [tenantId]);

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
