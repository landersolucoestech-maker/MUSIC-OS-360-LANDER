import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  MOCK_KPIS, MOCK_REVENUE, MOCK_TENANTS, MOCK_SECURITY_EVENTS, MOCK_ADMIN_NOTIFICATIONS,
} from "../data/mockAdmin";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Building2,
  AlertCircle, CheckCircle2, Activity, Zap,
  CreditCard, ChevronRight, ArrowUpRight, ArrowDownRight,
  BarChart3,
} from "lucide-react";

/* ── Analytics data (merged from AdminAnalytics) ── */
const PLAN_DIST = [
  { plan: "Starter",    count: 45, color: "#6B7280" },
  { plan: "Growth",     count: 30, color: "#3B82F6" },
  { plan: "Pro",        count: 18, color: "#8B5CF6" },
  { plan: "Enterprise", count: 7,  color: "#F59E0B" },
];
const GROWTH_DATA = MOCK_REVENUE.map((r, i) => ({
  month: r.month,
  tenants: 45 + i * 8,
  users: 320 + i * 62,
  mrr: r.mrr,
}));

/* ─── helpers ─── */
function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function pctColor(n: number) {
  return n >= 0 ? "text-emerald-400" : "text-red-400";
}
function PctBadge({ value }: { value: number }) {
  return (
    <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", pctColor(value))}>
      {value >= 0
        ? <ArrowUpRight className="h-3 w-3" />
        : <ArrowDownRight className="h-3 w-3" />
      }
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ─── KPI Card ─── */
function KPICard({
  label, value, sub, trend, icon: Icon, iconBg, accent, href,
}: {
  label: string; value: string; sub?: string; trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; accent: string; href?: string;
}) {
  const inner = (
    <div className={cn(
      "group rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5 space-y-3 transition-all duration-200",
      href && "hover:border-blue-500/25 hover:bg-blue-500/[0.03] cursor-pointer",
    )}
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-4.5 w-4.5", accent)} />
        </div>
        {trend !== undefined && <PctBadge value={trend} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-[11.5px] text-white/40 mt-0.5">{label}</p>
        {sub && <p className="text-[10.5px] text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

/* ─── Custom Tooltip ─── */
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[hsl(222_47%_8%)] p-3 shadow-xl">
      <p className="text-[11px] text-white/50 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[12px] text-white/70">{p.name}:</span>
          <span className="text-[12px] font-semibold text-white">{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main ─── */
export default function AdminDashboard() {
  const kpis = MOCK_KPIS;
  const recentTenants = MOCK_TENANTS.slice(0, 5);
  const unresolvedEvents = MOCK_SECURITY_EVENTS.filter(e => !e.resolved);
  const unreadNotifs = MOCK_ADMIN_NOTIFICATIONS.filter(n => !n.read);

  const KPI_CARDS = [
    { label: "MRR",                value: fmtBRL(kpis.mrr),           sub: `ARR: ${fmtBRL(kpis.arr)}`,       trend: kpis.mrr_growth_pct, icon: DollarSign,  iconBg: "bg-blue-500/15",    accent: "text-blue-400",    href: "/admin/revenue" },
    { label: "Clientes Ativos",     value: fmt(kpis.active_tenants),   sub: `${kpis.trial_tenants} em trial`, trend: 14.2,               icon: Building2,   iconBg: "bg-emerald-500/15", accent: "text-emerald-400", href: "/admin/clients" },
    { label: "Usuários Ativos 30d", value: fmt(kpis.active_users_30d), sub: `${fmt(kpis.total_users)} total`, trend: 8.7,                icon: Users,       iconBg: "bg-cyan-500/15",   accent: "text-cyan-400",    href: "/admin/users" },
    { label: "Churn Rate",          value: `${kpis.churn_rate_pct}%`,  sub: "Últimos 30 dias",               trend: -0.3,               icon: TrendingDown,iconBg: "bg-red-500/15",     accent: "text-red-400" },
    { label: "Conv. Trial → Pago",  value: `${kpis.trial_conversion_pct}%`, sub: "Média histórica",          trend: 3.1,                icon: TrendingUp,  iconBg: "bg-emerald-500/15", accent: "text-emerald-400", href: "/admin/subscriptions" },
    { label: "LTV Médio",           value: fmtBRL(kpis.avg_ltv),       sub: `CAC: ${fmtBRL(kpis.avg_cac)}`, trend: 5.8,                icon: CreditCard,  iconBg: "bg-blue-500/15",    accent: "text-blue-400" },
    { label: "Tickets Abertos",     value: fmt(kpis.open_tickets),     sub: "Suporte ativo",                trend: -12.5,              icon: AlertCircle, iconBg: "bg-yellow-500/15",  accent: "text-yellow-400",  href: "/admin/support" },
    { label: "Uptime Sistema",      value: `${kpis.system_uptime_pct}%`,sub: "Últimos 90 dias",             trend: 0.02,               icon: Activity,    iconBg: "bg-emerald-500/15", accent: "text-emerald-400", href: "/admin/system" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard Executivo</h1>
            <p className="text-[12.5px] text-white/40 mt-0.5">
              Visão global da plataforma — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unresolvedEvents.length > 0 && (
              <Link to="/admin/security">
                <Badge className="gap-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] hover:bg-red-500/20">
                  <AlertCircle className="h-3 w-3" /> {unresolvedEvents.length} alertas
                </Badge>
              </Link>
            )}
            <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px]">
              <CheckCircle2 className="h-3 w-3" /> Sistema operacional
            </Badge>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-5">

          {/* MRR Evolution */}
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[13px] font-semibold text-white">Evolução MRR</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Receita recorrente mensal</p>
              </div>
              <Link to="/admin/revenue" className="flex items-center gap-1 text-[11.5px] text-blue-400 hover:text-blue-300 transition-colors">
                Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={MOCK_REVENUE}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="mrr" stroke="#3B82F6" strokeWidth={2} fill="url(#mrrGrad)" name="MRR" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* MRR Breakdown */}
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[13px] font-semibold text-white">Breakdown MRR</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Novo, expansão e churn</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MOCK_REVENUE.slice(-4)} barSize={10} barGap={4}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle" iconSize={6}
                  wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
                />
                <Bar dataKey="new_mrr"       name="Novo"     fill="#3B82F6" radius={[3,3,0,0]} />
                <Bar dataKey="expansion_mrr" name="Expansão" fill="#10B981" radius={[3,3,0,0]} />
                <Bar dataKey="churned_mrr"   name="Churn"    fill="#EF4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Analytics KPIs ── */}
        <div>
          <h2 className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-white/30" /> Analytics de Engajamento
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "DAU / MAU",      value: `${(MOCK_KPIS.dau / MOCK_KPIS.mau * 100).toFixed(1)}%`, icon: Activity,   color: "text-blue-400",    bg: "bg-blue-500/10" },
              { label: "Sessões / Dia",  value: MOCK_KPIS.sessions_today.toLocaleString("pt-BR"),         icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "NPS Score",      value: MOCK_KPIS.nps_score.toString(),                           icon: BarChart3,  color: "text-cyan-400",    bg: "bg-cyan-500/10" },
              { label: "Tenants Ativos", value: MOCK_KPIS.active_tenants.toString(),                      icon: Building2,  color: "text-white/50",    bg: "bg-white/5" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl mb-3", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Analytics Charts ── */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Crescimento de Tenants & Usuários */}
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
            <h2 className="text-[13px] font-semibold text-white mb-5">Crescimento de Tenants & Usuários</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={GROWTH_DATA}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                <Line type="monotone" dataKey="tenants" name="Tenants"  stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="users"   name="Usuários" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por Plano */}
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
            <h2 className="text-[13px] font-semibold text-white mb-4">Distribuição por Plano</h2>
            <div className="space-y-3">
              {PLAN_DIST.map((p) => {
                const total = PLAN_DIST.reduce((a, x) => a + x.count, 0);
                const pct   = (p.count / total * 100).toFixed(1);
                return (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium" style={{ color: p.color }}>{p.plan}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/35">{p.count} tenants</span>
                        <span className="text-[12px] font-semibold text-white/60">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-white/30" /> Por País
              </h3>
              <div className="space-y-2">
                {[
                  { country: "Brasil",   flag: "🇧🇷", count: MOCK_TENANTS.filter(t => t.country === "BR").length },
                  { country: "Portugal", flag: "🇵🇹", count: MOCK_TENANTS.filter(t => t.country === "PT").length },
                  { country: "EUA",      flag: "🇺🇸", count: MOCK_TENANTS.filter(t => t.country === "US").length },
                ].filter(c => c.count > 0).map((c) => (
                  <div key={c.country} className="flex items-center justify-between">
                    <span className="text-[12px] text-white/60 flex items-center gap-2">
                      <span>{c.flag}</span> {c.country}
                    </span>
                    <span className="text-[12px] font-semibold text-white/50">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Receita × Crescimento */}
        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
          <h2 className="text-[13px] font-semibold text-white mb-5">Receita × Crescimento</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={GROWTH_DATA}>
              <defs>
                <linearGradient id="mrrAlt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
              <Area  yAxisId="left"  type="monotone" dataKey="mrr"     name="MRR (R$)" stroke="#3B82F6" strokeWidth={2} fill="url(#mrrAlt)" dot={false} />
              <Line  yAxisId="right" type="monotone" dataKey="tenants" name="Tenants"  stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">

          {/* Recent tenants */}
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[13px] font-semibold text-white">Tenants Recentes</h2>
              <Link to="/admin/clients" className="text-[11.5px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {recentTenants.map((t) => {
                const statusColor = {
                  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  suspended: "text-red-400 bg-red-500/10 border-red-500/20",
                  trial: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                  cancelled: "text-white/30 bg-white/5 border-white/10",
                  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                }[t.status];
                const planColor = {
                  starter: "text-white/40",
                  growth: "text-blue-400",
                  pro: "text-purple-400",
                  enterprise: "text-amber-400",
                }[t.plan];
                return (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors" data-testid={`tenant-row-${t.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-blue-400/70" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white">{t.name}</p>
                        <p className="text-[11px] text-white/35">{t.users_count} usuários · {t.artists_count} artistas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={cn("text-[11px] font-semibold capitalize", planColor)}>{t.plan}</span>
                      <Badge variant="outline" className={cn("text-[10px] border h-5 px-1.5", statusColor)}>
                        {t.status === "active" ? "Ativo" : t.status === "suspended" ? "Suspenso" : t.status === "trial" ? "Trial" : t.status}
                      </Badge>
                      <span className="text-[12px] font-semibold text-white/70">{fmtBRL(t.mrr)}<span className="text-[10px] text-white/30">/mês</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notifications + Alerts */}
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[13px] font-semibold text-white">Alertas</h2>
              <Link to="/admin/notifications" className="text-[11.5px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {unreadNotifs.map((n) => {
                const svColor = {
                  error: "text-red-400", warning: "text-yellow-400",
                  info: "text-blue-400", success: "text-emerald-400",
                }[n.severity];
                const svBg = {
                  error: "bg-red-500/10", warning: "bg-yellow-500/10",
                  info: "bg-blue-500/10", success: "bg-emerald-500/10",
                }[n.severity];
                const SvIcon = {
                  error: AlertCircle, warning: AlertCircle,
                  info: Zap, success: CheckCircle2,
                }[n.severity];
                return (
                  <div key={n.id} className="flex gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors" data-testid={`notif-${n.id}`}>
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", svBg)}>
                      <SvIcon className={cn("h-3.5 w-3.5", svColor)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-white">{n.title}</p>
                      <p className="text-[11px] text-white/35 leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                );
              })}
              {unreadNotifs.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400/30 mx-auto mb-2" />
                  <p className="text-[12px] text-white/30">Nenhum alerta pendente</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
