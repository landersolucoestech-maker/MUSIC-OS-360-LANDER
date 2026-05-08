import { AdminLayout } from "../layouts/AdminLayout";
import { cn } from "@/shared/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { MOCK_REVENUE, MOCK_KPIS, MOCK_PLANS } from "../data/mockAdmin";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

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
          <span className="text-[12px] font-semibold text-white">{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminRevenue() {
  const last = MOCK_REVENUE[MOCK_REVENUE.length - 1];
  const prev = MOCK_REVENUE[MOCK_REVENUE.length - 2];
  const mrrGrowth = ((last.mrr - prev.mrr) / prev.mrr * 100).toFixed(1);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Receita</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Análise financeira e MRR</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "MRR Atual",    value: fmtBRL(MOCK_KPIS.mrr),     icon: DollarSign,   color: "text-blue-400",    bg: "bg-blue-500/10",    trend: `+${mrrGrowth}%` },
            { label: "ARR",          value: fmtBRL(MOCK_KPIS.arr),     icon: TrendingUp,   color: "text-emerald-400", bg: "bg-emerald-500/10", trend: `+${mrrGrowth}%` },
            { label: "Novo MRR",     value: fmtBRL(last.new_mrr),      icon: ArrowUpRight, color: "text-cyan-400",    bg: "bg-cyan-500/10" },
            { label: "Churn MRR",    value: fmtBRL(last.churned_mrr),  icon: TrendingDown, color: "text-red-400",     bg: "bg-red-500/10" },
          ].map(({ label, value, icon: Icon, color, bg, trend }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                {trend && <span className="text-[11px] font-semibold text-emerald-400">{trend}</span>}
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* MRR Trend */}
        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
          <h2 className="text-[13px] font-semibold text-white mb-5">Evolução MRR — Últimos 7 meses</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={MOCK_REVENUE}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="mrr" stroke="#3B82F6" strokeWidth={2.5} fill="url(#revGrad)" name="MRR" dot={{ fill: "#3B82F6", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown + Plans */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
            <h2 className="text-[13px] font-semibold text-white mb-5">Breakdown MRR</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MOCK_REVENUE} barSize={10} barGap={4}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                <Bar dataKey="new_mrr"       name="Novo"     fill="#3B82F6" radius={[3,3,0,0]} />
                <Bar dataKey="expansion_mrr" name="Expansão" fill="#10B981" radius={[3,3,0,0]} />
                <Bar dataKey="churned_mrr"   name="Churn"    fill="#EF4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5">
            <h2 className="text-[13px] font-semibold text-white mb-4">MRR por Plano</h2>
            <div className="space-y-3">
              {MOCK_PLANS.map((plan) => {
                const totalMrr = MOCK_PLANS.reduce((a, p) => a + p.mrr, 0);
                const pct = totalMrr > 0 ? (plan.mrr / totalMrr * 100) : 0;
                return (
                  <div key={plan.id} data-testid={`plan-rev-${plan.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-white/70">{plan.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-white/35">{plan.active_subscribers} clientes</span>
                        <span className="text-[12.5px] font-semibold text-white/80">{fmtBRL(plan.mrr)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: plan.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
