import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/shared/ui/sheet";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import {
  useTickets, useTicketMessages,
  TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_CATEGORY_LABELS,
} from "../hooks/useSupport";
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from "../types";
import {
  Plus, Search, Ticket,
  Clock, AlertCircle, CheckCircle2,
  Send, User, Shield, Tag, Calendar, ExternalLink,
  ChevronDown,
} from "lucide-react";

/* ── colours ── */
const STATUS_COLOR: Record<TicketStatus, string> = {
  open:             "border-blue-500/30 text-blue-400 bg-blue-500/10",
  in_progress:      "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  waiting_customer: "border-orange-500/30 text-orange-400 bg-orange-500/10",
  resolved:         "border-green-500/30 text-green-400 bg-green-500/10",
  closed:           "border-border text-muted-foreground bg-muted/40",
};
const PRIORITY_DOT: Record<TicketPriority, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  medium:   "bg-yellow-400",
  low:      "bg-green-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function formatShort(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/* ── Drawer panel ── */
function TicketDrawer({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const { updateTicket }   = useTickets();
  const { messages, addMessage } = useTicketMessages(ticket.id);
  const [reply, setReply]  = useState("");
  const bottomRef          = useRef<HTMLDivElement>(null);

  function handleSend() {
    if (!reply.trim()) return;
    addMessage(reply.trim(), "support");
    setReply("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-[520px] sm:w-[580px] p-0 flex flex-col bg-card border-l border-border/60">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
            <span className="font-mono">{ticket.ticket_number}</span>
            <span>·</span>
            <Badge variant="outline" className={cn("text-[9.5px] h-4 px-1.5 border", STATUS_COLOR[ticket.status])}>
              {TICKET_STATUS_LABELS[ticket.status]}
            </Badge>
          </div>
          <SheetTitle className="text-[14px] font-semibold text-left leading-snug">
            {ticket.subject}
          </SheetTitle>

          {/* Controls row */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Select value={ticket.status} onValueChange={(v) => updateTicket(ticket.id, { status: v as TicketStatus })}>
              <SelectTrigger className="h-7 text-xs w-36" data-testid="select-drawer-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TICKET_STATUS_LABELS) as [TicketStatus, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ticket.priority} onValueChange={(v) => updateTicket(ticket.id, { priority: v as TicketPriority })}>
              <SelectTrigger className="h-7 text-xs w-32" data-testid="select-drawer-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ticket.status !== "resolved" && ticket.status !== "closed" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10"
                onClick={() => updateTicket(ticket.id, { status: "resolved" })}
                data-testid="button-drawer-resolve"
              >
                <CheckCircle2 className="h-3 w-3" /> Resolver
              </Button>
            )}
            <Link to={`/support/tickets/${ticket.id}`} className="ml-auto">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground">
                <ExternalLink className="h-3 w-3" /> Abrir completo
              </Button>
            </Link>
          </div>
        </SheetHeader>

        {/* Description */}
        <div className="px-5 py-3 border-b border-border/60 shrink-0">
          <p className="text-[12px] text-muted-foreground leading-relaxed">{ticket.description}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-[10.5px] text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.created_by}</span>
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{TICKET_CATEGORY_LABELS[ticket.category]}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatShort(ticket.created_at)}</span>
            {ticket.assigned_to && (
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{ticket.assigned_to}</span>
            )}
            {ticket.sla_deadline && (
              <span className="flex items-center gap-1 text-orange-400">
                <Clock className="h-3 w-3" /> SLA {formatShort(ticket.sla_deadline)}
              </span>
            )}
          </div>
        </div>

        {/* Thread */}
        <ScrollArea className="flex-1 px-5 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-[12.5px] text-muted-foreground">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isSupport = msg.sender_role === "support";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-xl border p-3",
                      isSupport
                        ? "border-primary/20 bg-primary/5 ml-4"
                        : "border-border/60 bg-muted/30 mr-4",
                    )}
                    data-testid={`drawer-msg-${msg.id}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {isSupport
                          ? <Shield className="h-3 w-3 text-primary" />
                          : <User className="h-3 w-3 text-muted-foreground" />
                        }
                        <span className="text-[11.5px] font-semibold text-foreground">{msg.sender_name}</span>
                        {isSupport && (
                          <Badge variant="outline" className="text-[8.5px] h-3.5 px-1 border-primary/30 text-primary">
                            Suporte
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatShort(msg.created_at)}</span>
                    </div>
                    <p className="text-[12px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Reply */}
        {ticket.status !== "closed" && (
          <div className="px-5 py-3 border-t border-border/60 shrink-0">
            <Textarea
              placeholder="Escreva uma resposta..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              className="text-sm resize-none mb-2"
              data-testid="textarea-drawer-reply"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-muted-foreground">Ctrl+Enter para enviar</span>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleSend}
                disabled={!reply.trim()}
                data-testid="button-drawer-send"
              >
                <Send className="h-3 w-3" /> Enviar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ── Page ── */
const PAGE_SIZE = 8;

export default function SupportTickets() {
  const { tickets, addTicket } = useTickets();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showModal, setShowModal]     = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [page, setPage]               = useState(1);

  const [form, setForm] = useState({
    subject: "", description: "", category: "outro" as TicketCategory, priority: "medium" as TicketPriority,
  });

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase())
      && !t.ticket_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visible   = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = visible.length < filtered.length;

  const loadMore  = useCallback(() => setPage((p) => p + 1), []);

  function handleCreate() {
    if (!form.subject.trim()) return;
    addTicket({ subject: form.subject, description: form.description, category: form.category, priority: form.priority, created_by: "Usuário Atual" });
    setShowModal(false);
    setForm({ subject: "", description: "", category: "outro", priority: "medium" });
  }

  return (
    <MainLayout
      title="Tickets"
      description="Gerencie chamados de suporte"
      actions={
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowModal(true)} data-testid="button-novo-ticket">
          <Plus className="h-3.5 w-3.5" /> Novo Ticket
        </Button>
      }
    >
      <div className="space-y-5 animate-fade-in">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por assunto ou número..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              data-testid="input-search-tickets"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-40" data-testid="select-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.entries(TICKET_STATUS_LABELS) as [TicketStatus, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-40" data-testid="select-priority-filter"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {(Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Abertos",    count: tickets.filter(t => t.status === "open").length,       icon: Ticket,       color: "text-blue-400" },
            { label: "Andamento",  count: tickets.filter(t => t.status === "in_progress").length, icon: Clock,        color: "text-yellow-400" },
            { label: "Aguardando", count: tickets.filter(t => t.status === "waiting_customer").length, icon: AlertCircle, color: "text-orange-400" },
            { label: "Resolvidos", count: tickets.filter(t => t.status === "resolved").length,    icon: CheckCircle2, color: "text-green-400" },
          ].map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border/60 bg-card p-3 text-center">
              <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-[10.5px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Ticket list */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Ticket className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-[13px] font-medium text-muted-foreground">Nenhum ticket encontrado</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/60">
                {visible.map((ticket) => (
                  <button
                    key={ticket.id}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group text-left"
                    onClick={() => setActiveTicket(ticket)}
                    data-testid={`row-ticket-${ticket.id}`}
                  >
                    <div className={cn("h-2 w-2 rounded-full shrink-0 mt-0.5", PRIORITY_DOT[ticket.priority])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", STATUS_COLOR[ticket.status])}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border border-border/60 text-muted-foreground">
                          {TICKET_PRIORITY_LABELS[ticket.priority]}
                        </Badge>
                      </div>
                      <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {TICKET_CATEGORY_LABELS[ticket.category]} · {ticket.created_by} · {formatDate(ticket.updated_at)}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground/30 -rotate-90 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>

              {/* Infinite scroll — load more */}
              {hasMore && (
                <div className="px-5 py-4 border-t border-border/60 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={loadMore}
                    data-testid="button-load-more"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Carregar mais ({filtered.length - visible.length} restantes)
                  </Button>
                </div>
              )}
              {!hasMore && filtered.length > PAGE_SIZE && (
                <div className="px-5 py-3 border-t border-border/60 text-center">
                  <p className="text-[11px] text-muted-foreground">{filtered.length} tickets exibidos</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drawer */}
      {activeTicket && (
        <TicketDrawer ticket={activeTicket} onClose={() => setActiveTicket(null)} />
      )}

      {/* Create modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Novo Ticket de Suporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Assunto *</Label>
              <Input
                placeholder="Descreva brevemente o problema..."
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="text-sm"
                data-testid="input-ticket-subject"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TicketCategory })}>
                  <SelectTrigger className="text-xs h-8" data-testid="select-ticket-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TICKET_CATEGORY_LABELS) as [TicketCategory, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
                  <SelectTrigger className="text-xs h-8" data-testid="select-ticket-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="Descreva o problema em detalhes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-sm resize-none"
                rows={4}
                data-testid="textarea-ticket-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.subject.trim()} data-testid="button-submit-ticket">
              Criar Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
