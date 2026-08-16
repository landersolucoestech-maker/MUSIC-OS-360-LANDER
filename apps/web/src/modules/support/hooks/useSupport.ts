import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTenant } from "@/app/providers/TenantContext";
import { api } from "@/shared/lib/api-client";
import { handleConcurrencyConflict } from "@/shared/hooks/useConcurrencyConflict";
import type {
  SupportTicket, SupportMessage, ChatRoom, ChatMessage, SupportRequest,
  KnowledgeArticle,
  TicketStatus, TicketPriority, TicketCategory,
} from "../types";

/**
 * Suporte — tickets usam o backend real (/support-tickets).
 *
 * Chat interno, base de conhecimento e requests NÃO possuem endpoint real:
 * estes hooks reportam o estado verdadeiro (vazio) e toda mutação falha
 * explicitamente. É proibido simular o backend em localStorage.
 */

const SUPPORT_BACKEND_UNAVAILABLE =
  "Este recurso de Suporte ainda não possui endpoint real no backend — operação indisponível.";

function supportUnavailable(): void {
  toast.error(SUPPORT_BACKEND_UNAVAILABLE);
}

/* ── Tickets (backend real) ── */

// Referência estável — ver shared/hooks/useDataQuery.ts para o motivo.
const EMPTY_TICKETS: SupportTicket[] = [];

export function useTickets() {
  const { tenant } = useTenant();
  const tenantId   = tenant.id;
  const queryClient = useQueryClient();

  const { data: tickets = EMPTY_TICKETS, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["support_tickets", tenantId],
    queryFn: async (): Promise<SupportTicket[]> =>
      api.get<SupportTicket[]>("/support-tickets?limit=200"),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: async (data: Pick<SupportTicket, "subject" | "description" | "category" | "priority" | "created_by">) =>
      api.post<SupportTicket>("/support-tickets", {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support_tickets", tenantId] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, changes, expectedUpdatedAt }: { id: string; changes: Partial<SupportTicket>; expectedUpdatedAt?: string }) =>
      api.patch<SupportTicket>(`/support-tickets/${id}`, { ...changes, expectedUpdatedAt }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support_tickets", tenantId] }),
    onError: (error: unknown) => {
      if (handleConcurrencyConflict(error, "ticket")) return;
      toast.error("Erro ao atualizar ticket. Tente novamente.");
    },
  });

  const addTicket = useCallback(
    (data: Pick<SupportTicket, "subject" | "description" | "category" | "priority" | "created_by">) => {
      addMutation.mutate(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantId],
  );

  const updateTicket = useCallback(
    (id: string, changes: Partial<SupportTicket>, expectedUpdatedAt?: string) => {
      updateMutation.mutate({ id, changes, expectedUpdatedAt });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantId],
  );

  return { tickets, isLoading, addTicket, updateTicket };
}

/* ── Ticket messages (sem endpoint real) ── */

export function useTicketMessages(_ticketId: string) {
  const messages: SupportMessage[] = [];
  const addMessage = useCallback(
    (_text: string, _role: "user" | "support" = "support") => supportUnavailable(),
    [],
  );
  return { messages, addMessage };
}

/* ── Chat rooms (sem endpoint real) ── */

export function useChatRooms() {
  const rooms: ChatRoom[] = [];
  const markRead = useCallback((_roomId: string) => supportUnavailable(), []);
  return { rooms, markRead };
}

/* ── Chat messages (sem endpoint real) ── */

export function useChatMessages(_roomId: string) {
  const messages: ChatMessage[] = [];
  const sendMessage = useCallback(
    (_text: string, _senderRole: "user" | "support" = "support") => supportUnavailable(),
    [],
  );
  return { messages, sendMessage };
}

/* ── Knowledge articles (sem endpoint real) ── */

export function useKnowledgeArticles() {
  const articles: KnowledgeArticle[] = [];
  const unavailable = useCallback((..._args: unknown[]) => supportUnavailable(), []);
  return {
    articles,
    incrementViews:  unavailable as (id: string) => void,
    createArticle:   unavailable as (data: Partial<KnowledgeArticle> & Pick<KnowledgeArticle, "title" | "category_id" | "category_name" | "content">) => void,
    updateArticle:   unavailable as (id: string, data: Partial<KnowledgeArticle>) => void,
    removeArticle:   unavailable as (id: string) => void,
    togglePublished: unavailable as (id: string) => void,
    moveArticle:     unavailable as (id: string, direction: "up" | "down") => void,
  };
}

/* ── Requests (sem endpoint real) ── */

export function useRequests() {
  const requests: SupportRequest[] = [];
  const addRequest = useCallback(
    (_data: Pick<SupportRequest, "title" | "description" | "type" | "priority">) => supportUnavailable(),
    [],
  );
  const upvote = useCallback((_id: string) => supportUnavailable(), []);
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
