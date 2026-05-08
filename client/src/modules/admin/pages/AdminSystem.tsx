import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { MOCK_SYSTEM_METRICS } from "../data/mockAdmin";
import type { SystemHealth, SystemService } from "../types";
import { Server, CheckCircle2, AlertTriangle, XCircle, Clock, Zap, Activity } from "lucide-react";

const SERVICE_LABEL: Record<SystemService, string> = {
  api: "API REST", database: "Banco de Dados", auth: "Autenticação",
  storage: "Storage", realtime: "Realtime", queue: "Filas",
  email: "E-mail", webhooks: "Webhooks",
};
const HEALTH_CFG: Record<SystemHealth, { label: string; color: string; bg: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  healthy:  { label: "Operacional", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-500", icon: CheckCircle2 },
  degraded: { label: "Degradado",   color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  dot: "bg-yellow-400", icon: AlertTriangle },
  critical: { label: "Crítico",     color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",  dot: "bg-orange-500", icon: AlertTriangle },
  down:     { label: "Offline",     color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         dot: "bg-red-500",    icon: XCircle },
};

function UptimeBar({ uptime }: { uptime: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 30 }, (_, i) => {
        const ok = Math.random() * 100 < uptime || i < 25;
        return (
          <div
            key={i}
            className={cn("h-5 flex-1 rounded-sm", ok ? "bg-emerald-500/60" : "bg-red-500/60")}
          />
        );
      })}
    </div>
  );
}

export default function AdminSystem() {
  const allOk = MOCK_SYSTEM_METRICS.every(m => m.health === "healthy");
  const avgUptime = (MOCK_SYSTEM_METRICS.reduce((a, m) => a + m.uptime_pct, 0) / MOCK_SYSTEM_METRICS.length).toFixed(2);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Sistema</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Status dos serviços e infraestrutura</p>
        </div>

        {/* Overall status */}
        <div className={cn(
          "rounded-2xl border p-6 flex items-center gap-4",
          allOk ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-yellow-500/20 bg-yellow-500/[0.05]",
        )}>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", allOk ? "bg-emerald-500/20" : "bg-yellow-500/20")}>
            {allOk
              ? <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              : <AlertTriangle className="h-6 w-6 text-yellow-400" />
            }
          </div>
          <div>
            <h2 className={cn("text-lg font-bold", allOk ? "text-emerald-400" : "text-yellow-400")}>
              {allOk ? "Todos os sistemas operacionais" : "Degradação detectada"}
            </h2>
            <p className="text-[12.5px] text-white/40 mt-0.5">
              Uptime médio {avgUptime}% · Atualizado: {new Date().toLocaleTimeString("pt-BR")}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Serviços",       value: MOCK_SYSTEM_METRICS.length,                     icon: Server,   color: "text-white/50",    bg: "bg-white/5" },
            { label: "Operacionais",   value: MOCK_SYSTEM_METRICS.filter(m=>m.health==="healthy").length,  icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Com Problemas",  value: MOCK_SYSTEM_METRICS.filter(m=>m.health!=="healthy").length, icon: AlertTriangle, color: "text-yellow-400",  bg: "bg-yellow-500/10" },
            { label: "Uptime Médio",   value: `${avgUptime}%`,                                icon: Activity, color: "text-blue-400",    bg: "bg-blue-500/10" },
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

        {/* Services */}
        <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-[13px] font-semibold text-white">Serviços</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {MOCK_SYSTEM_METRICS.map((m) => {
              const cfg = HEALTH_CFG[m.health];
              const HIcon = cfg.icon;
              return (
                <div key={m.service} className="p-5" data-testid={`service-${m.service}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <div>
                        <p className="text-[13px] font-medium text-white">{SERVICE_LABEL[m.service]}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10.5px] text-white/30">{m.uptime_pct}% uptime</span>
                          <span className="text-[10.5px] text-white/20">{m.latency_ms}ms</span>
                          <span className="text-[10.5px] text-white/20">{m.requests_per_min.toLocaleString("pt-BR")} req/min</span>
                          <span className="text-[10.5px] text-white/20">err: {m.error_rate_pct}%</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10.5px] border gap-1", cfg.bg, cfg.color)}>
                      <HIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9.5px] text-white/20 mb-1">
                      <span>90 dias atrás</span>
                      <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5" />Hoje</span>
                    </div>
                    <UptimeBar uptime={m.uptime_pct} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
