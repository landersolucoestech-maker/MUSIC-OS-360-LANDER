import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { useTickets } from "../hooks/useSupport";
import {
  Ticket, MessagesSquare, BookOpen, ServerCrash,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, Plus, Zap, Activity,
  HeadphonesIcon, ChevronRight,
} from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  open: "text-blue-400",
  in_progress: "text-yellow-400",
  waiting_customer: "text-orange-400",
  resolved: "text-green-400",
  closed: "text-muted-foreground",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-green-500",
};

function KPICard({
  label, value, sub, icon: Icon, trend, color = "blue",
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "yellow" | "red";
}) {
  const glowMap = {
    blue: "shadow-blue-500/10",
    green: "shadow-green-500/10",
    yellow: "shadow-yellow-500/10",
    red: "shadow-red-500/10",
  };
  const iconBg = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
  };
  return (
    <div className={cn(
      "rounded-2xl border border-border/60 bg-card p-5",
      "shadow-lg", glowMap[color],
      "hover:border-border transition-colors duration-200",
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconBg[color])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {trend && (
          <span className={cn(
            "text-[11px] font-medium px-1.5 py-0.5 rounded-full",
            trend.value >= 0
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          )}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, description, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; href: string; description: string; color: string;
}) {
  return (
    <Link to={href} className={cn(
      "group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4",
      "hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-200 cursor-pointer",
    )}>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <p className="text-[11.5px] text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </Link>
  );
}

export default function SupportDashboard() {
  const { tickets } = useTickets();

  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const critical = tickets.filter((t) => t.priority === "critical" && t.status !== "closed" && t.status !== "resolved").length;

  const recent = [...tickets]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <MainLayout
      title="Support Hub"
      description="Central operacional de suporte"
      actions={
        <Link to="/support/tickets">
          <Button size="sm" className="h-8 text-xs gap-1.5" data-testid="button-novo-ticket">
            <Plus className="h-3.5 w-3.5" />
            Novo Ticket
          </Button>
        </Link>
      }
    >
      <div className="space-y-8 animate-fade-in">

        {/* ── Hero ── */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border border-primary/20",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
          "p-7",
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <HeadphonesIcon className="h-5 w-5 text-primary" />
              <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                Central de Suporte
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Como podemos ajudar hoje?
            </h1>
            <p className="text-[13.5px] text-muted-foreground max-w-lg">
              Gerencie tickets, acompanhe o status do sistema e acesse a base de conhecimento — tudo em um único lugar.
            </p>
            {critical > 0 && (
              <div className="mt-4 flex items-center gap-2 text-[12.5px] font-medium text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {critical} ticket{critical > 1 ? "s críticos requerem" : " crítico requer"} atenção imediata
              </div>
            )}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Tickets Abertos" value={open}
            sub="aguardando ação"
            icon={Ticket} color="blue"
            trend={{ value: -12, label: "vs semana anterior" }}
          />
          <KPICard
            label="Em Andamento" value={inProgress}
            sub="em atendimento"
            icon={Activity} color="yellow"
          />
          <KPICard
            label="Resolvidos" value={resolved}
            sub="últimos 30 dias"
            icon={CheckCircle2} color="green"
            trend={{ value: 8, label: "vs mês anterior" }}
          />
          <KPICard
            label="SLA Médio" value="4.2h"
            sub="tempo de resposta"
            icon={Clock} color={critical > 0 ? "red" : "blue"}
          />
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-[13px] font-semibold text-foreground mb-3">Acesso Rápido</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickAction
              icon={Ticket} label="Tickets"
              description={`${open} aberto${open !== 1 ? "s" : ""} aguardando`}
              href="/support/tickets"
              color="bg-blue-500/10 text-blue-400"
            />
            <QuickAction
              icon={MessagesSquare} label="Chat ao Vivo"
              description="Atendimento em tempo real"
              href="/support/chat"
              color="bg-green-500/10 text-green-400"
            />
            <QuickAction
              icon={BookOpen} label="Base de Conhecimento"
              description="Artigos e tutoriais"
              href="/support/knowledge"
              color="bg-purple-500/10 text-purple-400"
            />
            <QuickAction
              icon={ServerCrash} label="Status do Sistema"
              description="Uptime e incidentes"
              href="/support/status"
              color="bg-orange-500/10 text-orange-400"
            />
            <QuickAction
              icon={TrendingUp} label="Solicitações"
              description="Features e melhorias"
              href="/support/requests"
              color="bg-cyan-500/10 text-cyan-400"
            />
            <QuickAction
              icon={Zap} label="Novo Ticket"
              description="Abrir chamado de suporte"
              href="/support/tickets"
              color="bg-primary/10 text-primary"
            />
          </div>
        </div>

        {/* ── Recent Tickets ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-foreground">Tickets Recentes</h2>
            <Link to="/support/tickets">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Ticket className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-[13px] text-muted-foreground">Nenhum ticket encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recent.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/support/tickets/${ticket.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                    data-testid={`row-ticket-${ticket.id}`}
                  >
                    <div className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[ticket.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {ticket.ticket_number} · {ticket.category} · {ticket.created_by}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10.5px] shrink-0", STATUS_COLOR[ticket.status])}
                    >
                      {ticket.status === "open" ? "Aberto"
                        : ticket.status === "in_progress" ? "Em Andamento"
                        : ticket.status === "waiting_customer" ? "Aguardando"
                        : ticket.status === "resolved" ? "Resolvido"
                        : "Fechado"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
