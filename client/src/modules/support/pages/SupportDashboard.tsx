import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { useTickets, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "../hooks/useSupport";
import { MOCK_KNOWLEDGE_ARTICLES } from "../data/mockSupport";
import type { TicketStatus, TicketPriority } from "../types";
import {
  Plus, BookOpen, Ticket, Search,
  ChevronDown, ChevronRight, ChevronUp,
} from "lucide-react";

/* ─── helpers ─── */

const STATUS_COLOR: Record<TicketStatus, string> = {
  open:             "bg-blue-500 text-white",
  in_progress:      "bg-yellow-500 text-black",
  waiting_customer: "bg-orange-500 text-white",
  resolved:         "bg-green-500 text-white",
  closed:           "bg-muted text-muted-foreground",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "BAIXA", medium: "MÉDIA", high: "ALTA", critical: "CRÍTICA",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-green-400", medium: "text-yellow-400",
  high: "text-orange-400", critical: "text-red-500",
};

type TabKey = "all" | "open" | "waiting_customer" | "closed";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all",              label: "Todos"      },
  { key: "open",             label: "Aberto"     },
  { key: "waiting_customer", label: "Aguardando" },
  { key: "closed",           label: "Fechado"    },
];

function formatRelative(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* ─── Hero card ─── */
function ActionCard({
  icon: Icon, label, desc, onClick, href, iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; desc: string;
  onClick?: () => void; href?: string;
  iconColor: string;
}) {
  const cls = cn(
    "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card p-8",
    "hover:border-primary/40 hover:bg-primary/[0.03] transition-all duration-200 group cursor-pointer text-center",
  );

  const inner = (
    <>
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", iconColor)}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
          {label}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </>
  );

  if (onClick) return <button className={cls} onClick={onClick} data-testid={`action-${label}`}>{inner}</button>;
  return <Link to={href!} className={cls} data-testid={`action-${label}`}>{inner}</Link>;
}

/* ─── FAQ Accordion Item ─── */
function FaqItem({ article }: { article: typeof MOCK_KNOWLEDGE_ARTICLES[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        className="w-full flex items-center justify-between py-3.5 px-1 text-left group"
        onClick={() => setOpen((p) => !p)}
        data-testid={`faq-${article.id}`}
      >
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
            {article.title}
          </p>
          <div className="mt-1">
            <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {article.category_name}
            </span>
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>
      {open && (
        <div className="px-1 pb-4">
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">{article.summary}</p>
          <Link
            to="/support/knowledge"
            className="inline-flex items-center gap-1 mt-2 text-[11.5px] text-primary hover:underline font-medium"
          >
            Ver artigo completo <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function SupportDashboard() {
  const { tickets, addTicket } = useTickets();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [kbSearch, setKbSearch]   = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    priority: "medium" as TicketPriority,
    description: "",
  });

  const countByTab: Record<TabKey, number> = {
    all:              tickets.length,
    open:             tickets.filter(t => t.status === "open").length,
    waiting_customer: tickets.filter(t => t.status === "waiting_customer").length,
    closed:           tickets.filter(t => t.status === "closed").length,
  };

  const filteredTickets = activeTab === "all"
    ? tickets
    : tickets.filter(t => t.status === activeTab);

  const kbArticles = MOCK_KNOWLEDGE_ARTICLES.filter((a) => {
    if (!kbSearch) return true;
    const q = kbSearch.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
  });

  function handleSubmitTicket() {
    if (!form.subject.trim()) return;
    addTicket({
      subject: form.subject,
      description: form.description,
      category: "outro",
      priority: form.priority,
      created_by: "Usuário Atual",
    });
    setShowModal(false);
    setForm({ subject: "", priority: "medium", description: "" });
  }

  return (
    <MainLayout
      title="Central de Suporte"
      description="Encontre ajuda, gerencie tickets e acompanhe o status"
    >
      <div className="space-y-6 animate-fade-in">

        {/* Three hero action cards */}
        <div className="grid grid-cols-3 gap-4">
          <ActionCard
            icon={Plus}
            label="Novo Ticket"
            desc="Precisa de ajuda? Abra um novo ticket de suporte"
            onClick={() => setShowModal(true)}
            iconColor="bg-primary/10 text-primary"
          />
          <ActionCard
            icon={BookOpen}
            label="Base de Conhecimento"
            desc="Encontre respostas rápidas nas perguntas frequentes"
            href="/support/knowledge"
            iconColor="bg-green-500/10 text-green-400"
          />
          <ActionCard
            icon={Ticket}
            label="Meus Tickets"
            desc={`${tickets.length} ticket(s) · ${countByTab.open} aberto(s)`}
            href="/support/tickets"
            iconColor="bg-orange-500/10 text-orange-400"
          />
        </div>

        {/* Two-column body */}
        <div className="grid lg:grid-cols-[1fr_420px] gap-5">

          {/* Knowledge Base */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-semibold text-foreground">Base de Conhecimento</span>
            </div>
            <div className="px-5 py-3 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar na base de conhecimento..."
                  className="pl-9 h-8 text-xs bg-muted/40 border-transparent focus:border-border"
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  data-testid="input-kb-search"
                />
              </div>
            </div>
            <div className="divide-y divide-border/60 px-5">
              {kbArticles.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[13px] text-muted-foreground">Nenhum artigo encontrado</p>
                </div>
              ) : (
                kbArticles.map((article) => <FaqItem key={article.id} article={article} />)
              )}
            </div>
            <div className="px-5 py-3 border-t border-border/60">
              <Link
                to="/support/knowledge"
                className="flex items-center justify-center gap-1.5 text-[12px] text-primary hover:underline font-medium"
              >
                Ver todos os artigos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Meus Tickets */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-semibold text-foreground">Meus Tickets</span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/60 px-4">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors -mb-px",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  data-testid={`tab-${tab.key}`}
                >
                  {tab.label}
                  <span className={cn(
                    "text-[10px] px-1 rounded-full min-w-4 text-center",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {countByTab[tab.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Ticket list */}
            <div className="divide-y divide-border/60 overflow-y-auto" style={{ maxHeight: "440px" }}>
              {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Ticket className="h-8 w-8 text-muted-foreground/20 mb-2" />
                  <p className="text-[13px] text-muted-foreground">Nenhum ticket nesta categoria</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/support/tickets/${ticket.id}`}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                    data-testid={`row-ticket-${ticket.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10.5px] font-mono text-muted-foreground/70">
                          {ticket.ticket_number}
                        </span>
                        <Badge className={cn("text-[9.5px] h-4 px-1.5 rounded-full font-medium", STATUS_COLOR[ticket.status])}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                      </div>
                      <p className="text-[12.5px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {ticket.description.slice(0, 60)}…
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className={cn("text-[10.5px] font-bold tracking-wide", PRIORITY_COLOR[ticket.priority])}>
                        {PRIORITY_LABEL[ticket.priority]}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatRelative(ticket.updated_at)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-border/60">
              <Link
                to="/support/tickets"
                className="flex items-center justify-center gap-1.5 text-[12px] text-primary hover:underline font-medium"
              >
                Ver todos os tickets <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Novo Ticket Modal ─── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md" data-testid="modal-novo-ticket">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Novo Ticket de Suporte</DialogTitle>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Descreva seu problema ou dúvida e nossa equipe entrará em contato.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Assunto</Label>
              <Input
                placeholder="Resumo do problema"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="text-sm h-9"
                data-testid="input-ticket-subject"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}
              >
                <SelectTrigger className="h-9 text-sm" data-testid="select-ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Descrição</Label>
              <Textarea
                placeholder="Descreva detalhadamente seu problema..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-sm resize-none"
                rows={4}
                data-testid="textarea-ticket-description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModal(false)}
              data-testid="button-cancel-ticket"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitTicket}
              disabled={!form.subject.trim()}
              data-testid="button-submit-ticket"
            >
              Enviar Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
