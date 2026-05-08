import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { MOCK_INTEGRATIONS } from "../data/mockAdmin";
import type { IntegrationStatus } from "../types";
import { Zap, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";

const STATUS_CFG: Record<IntegrationStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{className?:string}> }> = {
  active:   { label: "Ativo",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  inactive: { label: "Inativo",   color: "text-white/30",    bg: "bg-white/5 border-white/10",             icon: XCircle },
  error:    { label: "Erro",      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",        icon: AlertCircle },
  pending:  { label: "Pendente",  color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  icon: Clock },
};
const CAT_LABEL: Record<string, string> = {
  payment: "Pagamento", communication: "Comunicação", analytics: "Analytics",
  storage: "Storage", music: "Música", accounting: "Contabilidade",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminIntegrations() {
  const active  = MOCK_INTEGRATIONS.filter(i => i.status === "active").length;
  const error   = MOCK_INTEGRATIONS.filter(i => i.status === "error").length;
  const pending = MOCK_INTEGRATIONS.filter(i => i.status === "pending").length;

  const byCategory = MOCK_INTEGRATIONS.reduce<Record<string, typeof MOCK_INTEGRATIONS>>((acc, i) => {
    acc[i.category] = acc[i.category] ?? [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Integrações</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Conectores e serviços externos</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total",     value: MOCK_INTEGRATIONS.length, icon: Zap,          color: "text-white/50",    bg: "bg-white/5" },
            { label: "Ativos",    value: active,                   icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Com Erro",  value: error,                    icon: AlertCircle,  color: "text-red-400",     bg: "bg-red-500/10" },
            { label: "Pendentes", value: pending,                  icon: Clock,        color: "text-yellow-400",  bg: "bg-yellow-500/10" },
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

        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">
              {CAT_LABEL[cat] ?? cat}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((integration) => {
                const cfg = STATUS_CFG[integration.status];
                const SIcon = cfg.icon;
                return (
                  <div
                    key={integration.id}
                    className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5 space-y-3"
                    data-testid={`integration-${integration.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
                          <Zap className="h-4 w-4 text-white/30" />
                        </div>
                        <span className="text-[13px] font-semibold text-white">{integration.name}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-[10.5px] border gap-1", cfg.bg, cfg.color)}>
                        <SIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-[12px] text-white/40 leading-relaxed">{integration.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                      <span className="text-[11px] text-white/30">
                        {integration.tenants_using} tenants usando
                      </span>
                      <span className="text-[10.5px] text-white/20">
                        Sync: {fmtDate(integration.last_sync_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
