import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { useTickets } from "../hooks/useSupport";
import { MOCK_SYSTEM_SERVICES } from "../data/mockSupport";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Ticket, CheckCircle2, Clock, AlertTriangle, Activity,
  TrendingUp, ChevronRight, Plus, BookOpen, MessagesSquare,
  Inbox, Server, Zap,
} from "lucide-react";
import type { TicketStatus, TicketPriority } from "../types";

/* ── helpers ── */
const PRIORITY_DOT: Record<TicketPriority, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  medium:   "bg-yellow-400",
  low:      "bg-green-500",
};
const STATUS_COLOR: Record<TicketStatus, string> = {
  open:             "bg-blue-500/10 text-blue-400 border-blue-500/30",
  in_progress:      "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  waiting_customer: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  resolved:         "bg-green-500/10 text-green-400 border-green-500/30",
  closed:           "bg-muted text-muted-foreground border-border",
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Aberto", in_progress: "Em Andamento",
  waiting_customer: "Aguardando", resolved: "Resolvido", closed: "Fechado",
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

/* ticket volume trend — last 7 days */
const TREND_DATA = (() => {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return days.map((day, i) => ({
    day,
    abertos:   3 + Math.floor(Math.sin(i) * 2 + Math.random() * 3),
    resolvidos: 2 + Math.floor(Math.cos(i) * 1.5 + Math.random() * 2),
  }));
})();

/* quick-action card */
function QuickCard({
  icon: Icon, label, desc, href, iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; desc: string; href: string; iconBg: string;
}) {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3",
        "hover:border-primary/30 hover:bg-primary/[0.02] transition-all group",
      )}
      data-testid={`quick-${label}`}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground group-hover:text-primary transition-colors">
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

/* KPI card */
function KpiCard({
  icon: Icon, label, value, sub, iconBg, iconColor, trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; sub?: string;
  iconBg: string; iconColor: string; trend?: { up: boolean; val: string };
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        {trend && (
          <span className={cn("text-[11px] font-medium", trend.up ? "text-green-400" : "text-red-400")}>
            {trend.up ? "↑" : "↓"} {trend.val}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[12px] font-medium text-foreground/70 mt-0.5">{label}</p>
      {sub && <p className="text-[10.5px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SupportDashboard() {
  const { tickets, addTicket } = useTickets();
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ subject: "", priority: "medium" as TicketPriority, description: "" });

  const open       = tickets.filter(t => t.status === "open").length;
  const inProgress = tickets.filter(t => t.status === "in_progress").length;
  const waiting    = tickets.filter(t => t.status === "waiting_customer").length;
  const resolved7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return tickets.filter(t => t.status === "resolved" && new Date(t.updated_at).getTime() > cutoff).length;
  }, [tickets]);

  const avgSLA = "94.2%";
  const avgResp = "2h 18m";

  const systemOk = MOCK_SYSTEM_SERVICES.filter(s => s.status === "operational").length;
  const systemTotal = MOCK_SYSTEM_SERVICES.length;

  const recentActivity = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6),
    [tickets]
  );

  function handleCreate() {
    if (!newForm.subject.trim()) return;
    addTicket({ subject: newForm.subject, description: newForm.description, category: "outro", priority: newForm.priority, created_by: "Você" });
    setShowNew(false);
    setNewForm({ subject: "", priority: "medium", description: "" });
  }

  return (
    <MainLayout
      title="Central de Suporte"
      description="Como podemos ajudar hoje?"
      actions={
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowNew(true)} data-testid="button-novo-ticket">
          <Plus className="h-3.5 w-3.5" /> Novo Ticket
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KpiCard icon={Ticket}       label="Abertos"        value={open}          sub={`${inProgress} em andamento`} iconBg="bg-blue-500/10"   iconColor="text-blue-400"   trend={{ up: false, val: "3" }} />
          <KpiCard icon={CheckCircle2} label="Resolvidos 7d"  value={resolved7d}    sub="últimos 7 dias"               iconBg="bg-green-500/10"  iconColor="text-green-400"  trend={{ up: true,  val: "12%" }} />
          <KpiCard icon={Clock}        label="SLA Cumprido"   value={avgSLA}        sub="média geral"                  iconBg="bg-primary/10"    iconColor="text-primary"    trend={{ up: true,  val: "2%" }} />
          <KpiCard icon={Zap}          label="Tempo Resposta" value={avgResp}       sub="média primária"               iconBg="bg-yellow-500/10" iconColor="text-yellow-400" trend={{ up: true,  val: "8%" }} />
          <KpiCard icon={AlertTriangle}label="Aguardando"     value={waiting}       sub="resposta do cliente"          iconBg="bg-orange-500/10" iconColor="text-orange-400" />
          <KpiCard icon={Server}       label="Sistema"        value={`${systemOk}/${systemTotal}`} sub="serviços ok" iconBg="bg-emerald-500/10" iconColor="text-emerald-400" trend={{ up: true,  val: "99.7%" }} />
        </div>

        {/* ── Main 2-col ── */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">

          {/* Trend chart */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <p className="text-[13px] font-semibold text-foreground">Volume de Tickets</p>
                <p className="text-[11px] text-muted-foreground">Últimos 7 dias</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Abertos</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Resolvidos</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={TREND_DATA} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOpen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="abertos"   stroke="#3B82F6" fill="url(#gradOpen)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="resolvidos" stroke="#22C55E" fill="url(#gradRes)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick actions */}
          <div className="space-y-3">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Acesso Rápido</p>
            <QuickCard icon={Ticket}        label="Meus Tickets"        desc={`${tickets.length} ticket(s) · ${open} aberto(s)`}  href="/support/tickets"  iconBg="bg-blue-500/10 text-blue-400" />
            <QuickCard icon={MessagesSquare} label="Chat ao Vivo"        desc="Atendimento em tempo real"                            href="/support/chat"      iconBg="bg-green-500/10 text-green-400" />
            <QuickCard icon={BookOpen}      label="Base de Conhecimento" desc="Artigos e guias de uso"                               href="/support/knowledge" iconBg="bg-primary/10 text-primary" />
            <QuickCard icon={Activity}      label="Status do Sistema"    desc={`${systemOk} de ${systemTotal} serviços operacionais`} href="/support/status"   iconBg="bg-emerald-500/10 text-emerald-400" />
            <QuickCard icon={Inbox}         label="Solicitações"         desc="Features e melhorias"                                 href="/support/requests" iconBg="bg-purple-500/10 text-purple-400" />
          </div>
        </div>

        {/* ── Activity feed ── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-semibold text-foreground">Atividade Recente</span>
            </div>
            <Link to="/support/tickets" className="text-[11.5px] text-primary hover:underline flex items-center gap-0.5">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/60">
            {recentActivity.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/support/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                data-testid={`activity-${ticket.id}`}
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[ticket.priority])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10.5px] font-mono text-muted-foreground/60">{ticket.ticket_number}</span>
                    <Badge variant="outline" className={cn("text-[9.5px] h-4 px-1.5 border", STATUS_COLOR[ticket.status])}>
                      {STATUS_LABEL[ticket.status]}
                    </Badge>
                  </div>
                  <p className="text-[12.5px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {ticket.subject}
                  </p>
                </div>
                <span className="text-[10.5px] text-muted-foreground/50 shrink-0">{formatRelative(ticket.updated_at)}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* ── New ticket mini-modal ── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] font-semibold text-foreground">Novo Ticket de Suporte</p>
            <input
              className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
              placeholder="Assunto *"
              value={newForm.subject}
              onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
              data-testid="input-quick-ticket-subject"
            />
            <textarea
              className="w-full rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
              placeholder="Descreva o problema..."
              rows={3}
              value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              data-testid="textarea-quick-ticket-desc"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newForm.subject.trim()} data-testid="button-quick-ticket-submit">
                Criar Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
