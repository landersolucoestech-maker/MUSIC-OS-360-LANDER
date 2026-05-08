import { AdminLayout } from "../layouts/AdminLayout";
import { cn } from "@/shared/lib/utils";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { MOCK_REVENUE, MOCK_KPIS, MOCK_TENANTS } from "../data/mockAdmin";
import { BarChart3, TrendingUp, Users, Building2, Activity } from "lucide-react";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function ChartTip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[hsl(222_47%_8%)] p-3 shadow-xl">
      <p className="text-[11px] text-white/50 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[11.5px] text-white/60">{p.name}:</span>
          <span className="text-[12px] font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

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

export default function AdminAnalytics() {
  const byCountry = [
    { country: "Brasil", count: MOCK_TENANTS.filter(t => t.country === "BR").length, flag: "🇧🇷" },
    { country: "Portugal", count: MOCK_TENANTS.filter(t => t.country === "PT").length, flag: "🇵🇹" },
    { country: "EUA", count: MOCK_TENANTS.filter(t => t.country === "US").length, flag: "🇺🇸" },
  ].filter(c => c.count > 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Métricas de crescimento e engajamento</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "DAU / MAU",       value: `${(MOCK_KPIS.dau / MOCK_KPIS.mau * 100).toFixed(1)}%`, icon: Activity,   color: "text-blue-400",    bg: "bg-blue-500/10" },
            { label: "Sessões / Dia",   value: MOCK_KPIS.sessions_today.toLocaleString("pt-BR"),        icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "NPS Score",       value: MOCK_KPIS.nps_score.toString(),                          icon: BarChart3,  color: "text-cyan-400",    bg: "bg-cyan-500/10" },
            { label: "Tenants Ativos",  value: MOCK_KPIS.active_tenants.toString(),                     icon: Building2,  color: "text-white/50",    bg: "bg-white/5" },
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

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
            <h2 className="text-[13px] font-semibold text-white mb-5">Crescimento de Tenants & Usuários</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={GROWTH_DATA}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                <Line type="monotone" dataKey="tenants" name="Tenants" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="users"   name="Usuários" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

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
                {byCountry.map((c) => (
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

        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
          <h2 className="text-[13px] font-semibold text-white mb-5">Receita × Crescimento</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={GROWTH_DATA}>
              <defs>
                <linearGradient id="mrrA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
              <Area yAxisId="left"  type="monotone" dataKey="mrr"     name="MRR (R$)" stroke="#3B82F6" strokeWidth={2} fill="url(#mrrA)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="tenants" name="Tenants"  stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}
