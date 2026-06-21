import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/app/providers/TenantContext";
import { api } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";
import { isSafeKey } from "@/shared/lib/safe-object";
import {
  MOCK_TICKETS, MOCK_MESSAGES, MOCK_CHAT_ROOMS,
  MOCK_CHAT_MESSAGES, MOCK_REQUESTS, MOCK_KNOWLEDGE_ARTICLES,
} from "../data/mockSupport";

// Em produção, nenhum dado fictício é seeded em localStorage para evitar
// confundir o operador. Endpoints reais ainda não existem para chat/knowledge
// /requests/messages — retornam vazio até o backend ser implementado.
const SUPPORT_SEED_OK = MOCK_MODE;
import type {
  SupportTicket, SupportMessage, ChatRoom, ChatMessage, SupportRequest,
  KnowledgeArticle,
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
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["support_tickets", tenantId],
    queryFn: async (): Promise<SupportTicket[]> => {
      if (MOCK_MODE) {
        const stored = load<SupportTicket[]>(lsKey("support_tickets", tenantId), []);
        if (stored.length > 0) return stored;
        const seeded = MOCK_TICKETS.map((t) => ({ ...t, tenant_id: tenantId }));
        save(lsKey("support_tickets", tenantId), seeded);
        return seeded;
      }
      return api.get<SupportTicket[]>("/support-tickets?limit=200");
    },
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: async (data: Pick<SupportTicket, "subject" | "description" | "category" | "priority" | "created_by">) => {
      if (MOCK_MODE) {
        const sla = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const ticket: SupportTicket = {
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
        const current = load<SupportTicket[]>(lsKey("support_tickets", tenantId), []);
        save(lsKey("support_tickets", tenantId), [ticket, ...current]);
        return ticket;
      }
      return api.post<SupportTicket>("/support-tickets", {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support_tickets", tenantId] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<SupportTicket> }) => {
      if (MOCK_MODE) {
        const current = load<SupportTicket[]>(lsKey("support_tickets", tenantId), []);
        const updated = current.map((t) =>
          t.id === id ? { ...t, ...changes, updated_at: new Date().toISOString() } : t,
        );
        save(lsKey("support_tickets", tenantId), updated);
        return;
      }
      return api.patch<SupportTicket>(`/support-tickets/${id}`, changes);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support_tickets", tenantId] }),
  });

  const addTicket = useCallback(
    (data: Pick<SupportTicket, "subject" | "description" | "category" | "priority" | "created_by">) => {
      addMutation.mutate(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantId],
  );

  const updateTicket = useCallback(
    (id: string, changes: Partial<SupportTicket>) => {
      updateMutation.mutate({ id, changes });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantId],
  );

  return { tickets, isLoading, addTicket, updateTicket };
}

/* ── Ticket messages ── */

export function useTicketMessages(ticketId: string) {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [allMessages, setAllMessages] = useState<Record<string, SupportMessage[]>>(() => {
    const stored = load<Record<string, SupportMessage[]>>(lsKey("support_messages", tenantId), {});
    if (Object.keys(stored).length > 0) return stored;
    if (!SUPPORT_SEED_OK) return {}; // produção: sem seed fictício
    const seeded: Record<string, SupportMessage[]> = {};
    for (const [key, msgs] of Object.entries(MOCK_MESSAGES)) {
      seeded[key] = msgs.map((m) => ({ ...m, tenant_id: tenantId }));
    }
    save(lsKey("support_messages", tenantId), seeded);
    return seeded;
  });

  // Guard the user-controlled ticketId before using it as a dynamic object key
  // (prevents remote property injection / prototype pollution — CWE-915).
  const safeTicketId = isSafeKey(ticketId) ? ticketId : null;
  const messages = safeTicketId ? (allMessages[safeTicketId] ?? []) : [];

  const addMessage = useCallback(
    (text: string, role: "user" | "support" = "support") => {
      const next: SupportMessage = {
        id: `msg-${Date.now()}`,
        tenant_id: tenantId,
        ticket_id: ticketId,
        sender_id: role === "support" ? "support-000" : "user-000",
        sender_name: role === "support" ? "Equipe de Suporte" : "Você",
        sender_role: role,
        message: text,
        internal_note: false,
        created_at: new Date().toISOString(),
      };
      if (!safeTicketId) return; // invalid/injection key — deny, preserve state
      setAllMessages((prev) => {
        const updated = { ...prev, [safeTicketId]: [...(prev[safeTicketId] ?? []), next] };
        save(lsKey("support_messages", tenantId), updated);
        return updated;
      });
    },
    [safeTicketId, tenantId]
  );

  return { messages, addMessage };
}

/* ── Chat rooms ── */

export function useChatRooms() {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [rooms, setRooms] = useState<ChatRoom[]>(() => {
    const stored = load<ChatRoom[]>(lsKey("support_chats", tenantId), []);
    if (stored.length > 0) return stored;
    if (!SUPPORT_SEED_OK) return []; // produção: sem seed fictício
    const seeded = MOCK_CHAT_ROOMS.map((r) => ({ ...r, tenant_id: tenantId }));
    save(lsKey("support_chats", tenantId), seeded);
    return seeded;
  });

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

  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const stored = load<Record<string, ChatMessage[]>>(lsKey("support_chat_messages", tenantId), {});
    if (Object.keys(stored).length > 0) return stored;
    if (!SUPPORT_SEED_OK) return {}; // produção: sem seed fictício
    const seeded: Record<string, ChatMessage[]> = {};
    for (const [key, msgs] of Object.entries(MOCK_CHAT_MESSAGES)) {
      seeded[key] = msgs.map((m) => ({ ...m, tenant_id: tenantId }));
    }
    save(lsKey("support_chat_messages", tenantId), seeded);
    return seeded;
  });

  const messages = allMessages[roomId] ?? [];

  const sendMessage = useCallback(
    (text: string, senderRole: "user" | "support" = "support") => {
      const next: ChatMessage = {
        id: `cm-${Date.now()}`,
        tenant_id: tenantId,
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

/* ── Knowledge articles ── */

export function useKnowledgeArticles() {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [articles, setArticles] = useState<KnowledgeArticle[]>(() => {
    const stored = load<KnowledgeArticle[]>(lsKey("support_knowledge", tenantId), []);
    if (stored.length > 0) return stored;
    if (!SUPPORT_SEED_OK) return []; // produção: sem seed fictício
    const seeded = MOCK_KNOWLEDGE_ARTICLES.map((a) => ({ ...a, tenant_id: tenantId }));
    save(lsKey("support_knowledge", tenantId), seeded);
    return seeded;
  });

  const persist = useCallback(
    (updater: (prev: KnowledgeArticle[]) => KnowledgeArticle[]) => {
      setArticles((prev) => {
        const updated = updater(prev);
        save(lsKey("support_knowledge", tenantId), updated);
        return updated;
      });
    },
    [tenantId],
  );

  const incrementViews = useCallback(
    (id: string) => {
      persist((prev) => prev.map((a) => (a.id === id ? { ...a, views: a.views + 1 } : a)));
    },
    [persist],
  );

  const createArticle = useCallback(
    (data: Partial<KnowledgeArticle> & Pick<KnowledgeArticle, "title" | "category_id" | "category_name" | "content">) => {
      const now = new Date().toISOString();
      persist((prev) => {
        const maxOrder = prev.reduce((max, a) => Math.max(max, a.order ?? 0), 0);
        const next: KnowledgeArticle = {
          id: `kb-${Date.now()}`,
          tenant_id: tenantId,
          category_id: data.category_id,
          category_name: data.category_name,
          title: data.title,
          summary: data.summary ?? "",
          content: data.content,
          views: 0,
          helpful_count: 0,
          featured: data.featured ?? false,
          created_at: now,
          updated_at: now,
          read_time: data.read_time ?? Math.max(1, Math.round(data.content.split(/\s+/).length / 200)),
          type: data.type ?? "article",
          published: data.published ?? true,
          order: data.order ?? maxOrder + 1,
        };
        return [...prev, next];
      });
    },
    [persist, tenantId],
  );

  const updateArticle = useCallback(
    (id: string, data: Partial<KnowledgeArticle>) => {
      persist((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a)),
      );
    },
    [persist],
  );

  const removeArticle = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((a) => a.id !== id));
    },
    [persist],
  );

  const togglePublished = useCallback(
    (id: string) => {
      persist((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, published: !(a.published ?? true), updated_at: new Date().toISOString() }
            : a,
        ),
      );
    },
    [persist],
  );

  const moveArticle = useCallback(
    (id: string, direction: "up" | "down") => {
      persist((prev) => {
        const sorted = [...prev].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const index = sorted.findIndex((a) => a.id === id);
        if (index < 0) return prev;
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= sorted.length) return prev;
        const current = sorted[index];
        const other = sorted[swapWith];
        const currentOrder = current.order ?? index + 1;
        const otherOrder = other.order ?? swapWith + 1;
        return prev.map((a) => {
          if (a.id === current.id) return { ...a, order: otherOrder };
          if (a.id === other.id) return { ...a, order: currentOrder };
          return a;
        });
      });
    },
    [persist],
  );

  return {
    articles,
    incrementViews,
    createArticle,
    updateArticle,
    removeArticle,
    togglePublished,
    moveArticle,
  };
}

/* ── Requests ── */

export function useRequests() {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;

  const [requests, setRequests] = useState<SupportRequest[]>(() => {
    const stored = load<SupportRequest[]>(lsKey("support_requests", tenantId), []);
    if (stored.length > 0) return stored;
    if (!SUPPORT_SEED_OK) return []; // produção: sem seed fictício
    const seeded = MOCK_REQUESTS.map((r) => ({ ...r, tenant_id: tenantId }));
    save(lsKey("support_requests", tenantId), seeded);
    return seeded;
  });

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
  analytics: "Métricas",
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

