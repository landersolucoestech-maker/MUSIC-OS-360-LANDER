import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import {
  useTickets,
  TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_CATEGORY_LABELS,
} from "../hooks/useSupport";
import type { TicketStatus, TicketPriority, TicketCategory } from "../types";
import {
  Plus, Search, ChevronRight, Ticket,
  Clock, AlertCircle, CheckCircle2,
} from "lucide-react";

const STATUS_COLOR: Record<TicketStatus, string> = {
  open: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  in_progress: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  waiting_customer: "border-orange-500/30 text-orange-400 bg-orange-500/10",
  resolved: "border-green-500/30 text-green-400 bg-green-500/10",
  closed: "border-border text-muted-foreground bg-muted/40",
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  critical: "border-red-500/30 text-red-400 bg-red-500/10",
  high: "border-orange-500/30 text-orange-400 bg-orange-500/10",
  medium: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  low: "border-green-500/30 text-green-400 bg-green-500/10",
};

const PRIORITY_DOT: Record<TicketPriority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-green-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function SupportTickets() {
  const { tickets, addTicket } = useTickets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "outro" as TicketCategory,
    priority: "medium" as TicketPriority,
  });

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase())
      && !t.ticket_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleCreate() {
    if (!form.subject.trim()) return;
    addTicket({
      subject: form.subject,
      description: form.description,
      category: form.category,
      priority: form.priority,
      created_by: "Usuário Atual",
    });
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
      <div className="space-y-6 animate-fade-in">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por assunto ou número..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-tickets"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.entries(TICKET_STATUS_LABELS) as [TicketStatus, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs w-40" data-testid="select-priority-filter">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {(Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Abertos", count: tickets.filter(t => t.status === "open").length, icon: Ticket, color: "text-blue-400" },
            { label: "Em Andamento", count: tickets.filter(t => t.status === "in_progress").length, icon: Clock, color: "text-yellow-400" },
            { label: "Aguardando", count: tickets.filter(t => t.status === "waiting_customer").length, icon: AlertCircle, color: "text-orange-400" },
            { label: "Resolvidos", count: tickets.filter(t => t.status === "resolved").length, icon: CheckCircle2, color: "text-green-400" },
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
              <p className="text-[12px] text-muted-foreground/60 mt-1">Tente ajustar os filtros</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/support/tickets/${ticket.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group"
                  data-testid={`row-ticket-${ticket.id}`}
                >
                  <div className={cn("h-2 w-2 rounded-full shrink-0 mt-0.5", PRIORITY_DOT[ticket.priority])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", STATUS_COLOR[ticket.status])}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", PRIORITY_COLOR[ticket.priority])}>
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

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
                  <SelectTrigger className="text-xs h-8" data-testid="select-ticket-category">
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger className="text-xs h-8" data-testid="select-ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
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
