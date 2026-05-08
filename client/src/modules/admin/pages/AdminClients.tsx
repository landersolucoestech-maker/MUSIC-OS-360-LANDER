import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { MOCK_TENANTS, MOCK_SUBSCRIPTIONS } from "../data/mockAdmin";
import type { AdminTenant, TenantStatus, PlanTier } from "../types";
import {
  Building2, Search, Users, DollarSign,
  MoreHorizontal, Eye, Power, PowerOff, ArrowUpCircle,
  RefreshCw, ExternalLink, Calendar, CreditCard, Pencil, Trash2,
} from "lucide-react";

const STATUS_STYLE: Record<TenantStatus, string> = {
  active:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  suspended: "text-red-400 bg-red-500/10 border-red-500/20",
  trial:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
  cancelled: "text-white/30 bg-white/5 border-white/10",
  pending:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};
const STATUS_LABEL: Record<TenantStatus, string> = {
  active: "Ativo", suspended: "Suspenso", trial: "Trial",
  cancelled: "Cancelado", pending: "Pendente",
};
const PLAN_COLOR: Record<PlanTier, string> = {
  starter:    "text-white/50",
  growth:     "text-blue-400",
  pro:        "text-purple-400",
  enterprise: "text-amber-400",
};

function fmt(n: number) { return n.toLocaleString("pt-BR"); }
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function StorageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-blue-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-white/35">{pct.toFixed(0)}%</span>
    </div>
  );
}

const CYCLE_LABEL: Record<string, string> = { monthly: "Mensal", annual: "Anual" };

/* index subscriptions by tenant_id for O(1) lookup */
const subByTenant = Object.fromEntries(MOCK_SUBSCRIPTIONS.map(s => [s.tenant_id, s]));

export default function AdminClients() {
  const [tenants, setTenants] = useState(MOCK_TENANTS);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [planFilter, setPlan]       = useState("all");
  const [selected, setSelected]     = useState<AdminTenant | null>(null);

  const filtered = tenants.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (planFilter !== "all" && t.plan !== planFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.owner_email.toLowerCase().includes(q) || t.slug.includes(q);
    }
    return true;
  });

  function toggleStatus(id: string) {
    setTenants(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === "active" ? "suspended" : "active" } : t
    ));
  }

  const stats = {
    active: tenants.filter(t => t.status === "active").length,
    trial:  tenants.filter(t => t.status === "trial").length,
    susp:   tenants.filter(t => t.status === "suspended").length,
    mrr:    tenants.reduce((a, t) => a + t.mrr, 0),
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Gestão global de tenants</p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Tenants Ativos",  value: fmt(stats.active), icon: Building2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Em Trial",        value: fmt(stats.trial),  icon: RefreshCw,  color: "text-blue-400",    bg: "bg-blue-500/10" },
            { label: "Suspensos",       value: fmt(stats.susp),   icon: PowerOff,   color: "text-red-400",     bg: "bg-red-500/10" },
            { label: "MRR Total",       value: fmtBRL(stats.mrr), icon: DollarSign, color: "text-white/70",    bg: "bg-white/5" },
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

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input
              placeholder="Buscar por nome, email ou slug..."
              className="pl-9 h-8 text-xs bg-white/[0.03] border-white/[0.07] text-white placeholder:text-white/25 focus:border-blue-500/40"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-tenants"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs w-36 bg-white/[0.03] border-white/[0.07] text-white/60" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlan}>
            <SelectTrigger className="h-8 text-xs w-36 bg-white/[0.03] border-white/[0.07] text-white/60" data-testid="select-plan">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Tenant", "Plano", "Status", "Usuários", "Storage", "MRR", "Ciclo", "Próxima Cobrança", "Método", "Desde", ""].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((t) => {
                const sub = subByTenant[t.id];
                return (
                  <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors" data-testid={`tenant-${t.id}`}>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-[13px] font-medium text-white">{t.name}</p>
                        <p className="text-[11px] text-white/35 mt-0.5">{t.owner_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-[12px] font-semibold capitalize", PLAN_COLOR[t.plan])}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className={cn("text-[10.5px] border", STATUS_STYLE[t.status])}>
                        {STATUS_LABEL[t.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-white/25" />
                        <span className="text-[12.5px] text-white/60">{t.users_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StorageBar used={t.storage_used_mb} limit={t.storage_limit_mb} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-semibold text-white/80">
                        {t.mrr > 0 ? fmtBRL(t.mrr) : <span className="text-white/25">—</span>}
                      </span>
                    </td>
                    {/* Ciclo */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-[12px] text-white/50">
                        {sub ? CYCLE_LABEL[sub.billing_cycle] ?? sub.billing_cycle : <span className="text-white/20">—</span>}
                      </span>
                    </td>
                    {/* Próxima Cobrança */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {sub?.next_payment_at ? (
                        <div className="flex items-center gap-1 text-[11.5px] text-white/45">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {fmtDate(sub.next_payment_at)}
                        </div>
                      ) : (
                        <span className="text-[12px] text-white/20">—</span>
                      )}
                    </td>
                    {/* Método */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {sub?.payment_method && sub.payment_method !== "—" ? (
                        <div className="flex items-center gap-1.5 text-[11.5px] text-white/45">
                          <CreditCard className="h-3 w-3 shrink-0 text-white/25" />
                          <span className="truncate max-w-[130px]">{sub.payment_method}</span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-white/20">—</span>
                      )}
                    </td>
                    {/* Desde */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px] text-white/35">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(t.created_at)}
                      </div>
                    </td>
                    {/* Ações — dropdown */}
                    <td className="px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                            data-testid={`actions-${t.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-40 bg-[hsl(222_47%_6%)] border-white/[0.08] text-white/80"
                        >
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer hover:bg-white/[0.06] focus:bg-white/[0.06]"
                            onClick={() => setSelected(t)}
                            data-testid={`view-${t.id}`}
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-400" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer hover:bg-white/[0.06] focus:bg-white/[0.06]"
                            data-testid={`edit-${t.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5 text-white/40" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                            data-testid={`delete-${t.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-lg bg-[hsl(222_47%_6%)] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-blue-400" />
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Plano", value: selected.plan, accent: PLAN_COLOR[selected.plan] },
                  { label: "Status", value: STATUS_LABEL[selected.status], accent: "" },
                  { label: "Usuários", value: fmt(selected.users_count), accent: "" },
                  { label: "Artistas", value: fmt(selected.artists_count), accent: "" },
                  { label: "MRR", value: fmtBRL(selected.mrr), accent: "text-white/80" },
                  { label: "País", value: selected.country, accent: "" },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
                    <p className="text-[10.5px] text-white/30 mb-1">{label}</p>
                    <p className={cn("text-[13px] font-semibold capitalize", accent || "text-white/70")}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs border-white/10 text-white/60 hover:text-white" onClick={() => setSelected(null)}>
                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Workspace
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs border-white/10 text-white/60 hover:text-white" onClick={() => setSelected(null)}>
                  <ArrowUpCircle className="h-3.5 w-3.5" /> Alterar Plano
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs border-white/10 text-white/60 hover:text-white" onClick={() => { toggleStatus(selected.id); setSelected(null); }}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
