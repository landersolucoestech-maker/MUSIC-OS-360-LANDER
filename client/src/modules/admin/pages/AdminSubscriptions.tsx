import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { MOCK_SUBSCRIPTIONS } from "../data/mockAdmin";
import type { SubscriptionStatus, PlanTier } from "../types";
import {
  Search, CreditCard, TrendingUp, AlertCircle,
  CheckCircle2, Clock, Calendar,
} from "lucide-react";

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  active:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  trial:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
  past_due:  "text-red-400 bg-red-500/10 border-red-500/20",
  cancelled: "text-white/30 bg-white/5 border-white/10",
  paused:    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};
const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Ativo", trial: "Trial", past_due: "Inadimplente",
  cancelled: "Cancelado", paused: "Pausado",
};
const PLAN_COLOR: Record<PlanTier, string> = {
  starter: "text-white/50", growth: "text-blue-400",
  pro: "text-purple-400", enterprise: "text-amber-400",
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminSubscriptions() {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [planFilter, setPlan]     = useState("all");

  const filtered = MOCK_SUBSCRIPTIONS.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (planFilter !== "all" && s.plan !== planFilter) return false;
    if (search && !s.tenant_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mrr        = MOCK_SUBSCRIPTIONS.filter(s => s.status === "active").reduce((a, s) => a + s.mrr, 0);
  const activeCount = MOCK_SUBSCRIPTIONS.filter(s => s.status === "active").length;
  const pastDue    = MOCK_SUBSCRIPTIONS.filter(s => s.status === "past_due").length;
  const trialCount = MOCK_SUBSCRIPTIONS.filter(s => s.status === "trial").length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Assinaturas</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Gestão de planos e faturamento</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "MRR Ativo",    value: fmtBRL(mrr),           icon: TrendingUp,   color: "text-blue-400",    bg: "bg-blue-500/10" },
            { label: "Assinaturas",  value: activeCount,           icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Em Trial",     value: trialCount,            icon: Clock,        color: "text-blue-400",    bg: "bg-blue-500/10" },
            { label: "Inadimplentes",value: pastDue,               icon: AlertCircle,  color: "text-red-400",     bg: "bg-red-500/10" },
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

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input placeholder="Buscar tenant..." className="pl-9 h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white placeholder:text-white/25" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-subs" />
          </div>
          <Select value={statusFilter} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs w-40 bg-white/[0.03] border-white/[0.07] text-white/60" data-testid="select-sub-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="past_due">Inadimplente</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlan}>
            <SelectTrigger className="h-8 text-xs w-36 bg-white/[0.03] border-white/[0.07] text-white/60" data-testid="select-sub-plan">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Tenant", "Plano", "Status", "MRR", "Ciclo", "Próx. Cobrança", "Método", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors" data-testid={`sub-${s.id}`}>
                  <td className="px-4 py-3.5 text-[13px] font-medium text-white">{s.tenant_name}</td>
                  <td className="px-4 py-3.5">
                    <span className={cn("text-[12px] font-semibold capitalize", PLAN_COLOR[s.plan])}>{s.plan}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="outline" className={cn("text-[10.5px] border", STATUS_STYLE[s.status])}>
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[13px] font-semibold text-white/80">
                      {s.mrr > 0 ? fmtBRL(s.mrr) : <span className="text-white/25">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-white/50 capitalize">{s.billing_cycle === "monthly" ? "Mensal" : "Anual"}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-[11.5px] text-white/40">
                      <Calendar className="h-3 w-3" />
                      {s.next_payment_at ? fmtDate(s.next_payment_at) : <span className="text-white/20">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3 w-3 text-white/25" />
                      <span className="text-[11.5px] text-white/40">{s.payment_method}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
