import { MainLayout } from "@/shared/components/MainLayout";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { MOCK_SYSTEM_SERVICES, MOCK_INCIDENTS } from "../data/mockSupport";
import type { ServiceStatus } from "../types";
import {
  CheckCircle2, AlertTriangle, XCircle, Clock,
  Activity, Shield, Wifi, Server, RefreshCw,
} from "lucide-react";

const STATUS_CONFIG: Record<ServiceStatus, {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  dot: string;
}> = {
  operational: {
    label: "Operacional",
    color: "text-green-400 border-green-500/30 bg-green-500/10",
    icon: CheckCircle2,
    dot: "bg-green-500",
  },
  degraded: {
    label: "Degradado",
    color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    icon: AlertTriangle,
    dot: "bg-yellow-400",
  },
  partial_outage: {
    label: "Interrupção Parcial",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    icon: AlertTriangle,
    dot: "bg-orange-400",
  },
  major_outage: {
    label: "Interrupção Total",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
    icon: XCircle,
    dot: "bg-red-500",
  },
};

const INCIDENT_STATUS_COLOR: Record<string, string> = {
  investigating: "text-red-400 border-red-500/30 bg-red-500/10",
  identified: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  monitoring: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  resolved: "text-green-400 border-green-500/30 bg-green-500/10",
};

const INCIDENT_STATUS_LABEL: Record<string, string> = {
  investigating: "Investigando",
  identified: "Identificado",
  monitoring: "Monitorando",
  resolved: "Resolvido",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function UptimeBar({ uptime, status }: { uptime: number; status: ServiceStatus }) {
  // generate 30 simulated daily bars based on uptime percentage
  const bars: ServiceStatus[] = Array.from({ length: 30 }, (_, i) => {
    const r = Math.random() * 100;
    if (uptime >= 99.9) return i < 29 ? "operational" : status;
    if (uptime >= 99) return r < (100 - uptime) * 10 ? "degraded" : "operational";
    return r < (100 - uptime) * 5 ? "degraded" : "operational";
  });
  bars[29] = status;
  return (
    <div className="flex gap-0.5">
      {bars.map((s, i) => (
        <div
          key={i}
          className={cn(
            "h-5 flex-1 rounded-sm",
            s === "operational" ? "bg-green-500/70"
              : s === "degraded" ? "bg-yellow-400/70"
              : s === "partial_outage" ? "bg-orange-400/70"
              : "bg-red-500/70",
          )}
          title={STATUS_CONFIG[s].label}
        />
      ))}
    </div>
  );
}

export default function SupportStatus() {
  const allOperational = MOCK_SYSTEM_SERVICES.every((s) => s.status === "operational");
  const hasIncident = MOCK_SYSTEM_SERVICES.some((s) => s.status !== "operational");
  const openIncidents = MOCK_INCIDENTS.filter((i) => i.status !== "resolved");

  const overallStatus = allOperational
    ? "all_good"
    : hasIncident
    ? "incident"
    : "all_good";

  const avgUptime = (
    MOCK_SYSTEM_SERVICES.reduce((s, srv) => s + srv.uptime, 0) /
    MOCK_SYSTEM_SERVICES.length
  ).toFixed(2);

  return (
    <MainLayout title="Status do Sistema" description="Monitoramento de serviços em tempo real">
      <div className="space-y-8 animate-fade-in">

        {/* ── Overall Status ── */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-7",
          overallStatus === "all_good"
            ? "border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent"
            : "border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent",
        )}>
          <div className="flex items-center gap-4">
            {overallStatus === "all_good" ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20">
                <CheckCircle2 className="h-7 w-7 text-green-400" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20">
                <AlertTriangle className="h-7 w-7 text-orange-400" />
              </div>
            )}
            <div>
              <h2 className={cn(
                "text-xl font-bold",
                overallStatus === "all_good" ? "text-green-400" : "text-orange-400",
              )}>
                {overallStatus === "all_good"
                  ? "Todos os sistemas operacionais"
                  : "Incidente em andamento"}
              </h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Uptime médio {avgUptime}% · Última atualização: {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Uptime Médio", value: `${avgUptime}%`,
              icon: Activity, color: "text-green-400", bg: "bg-green-500/10",
            },
            {
              label: "Serviços Ativos", value: MOCK_SYSTEM_SERVICES.filter(s => s.status === "operational").length,
              icon: Server, color: "text-blue-400", bg: "bg-blue-500/10",
            },
            {
              label: "Incidentes Abertos", value: openIncidents.length,
              icon: AlertTriangle, color: openIncidents.length > 0 ? "text-orange-400" : "text-green-400",
              bg: openIncidents.length > 0 ? "bg-orange-500/10" : "bg-green-500/10",
            },
            {
              label: "SLA Garantido", value: "99.9%",
              icon: Shield, color: "text-primary", bg: "bg-primary/10",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl mb-3", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Services ── */}
        <div>
          <h2 className="text-[13px] font-semibold text-foreground mb-3">Serviços</h2>
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="divide-y divide-border/60">
              {MOCK_SYSTEM_SERVICES.map((service) => {
                const config = STATUS_CONFIG[service.status];
                const Icon = config.icon;
                return (
                  <div
                    key={service.id}
                    className="p-5"
                    data-testid={`service-${service.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-2 w-2 rounded-full animate-pulse", config.dot)} />
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{service.name}</p>
                          <p className="text-[11px] text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11.5px] text-muted-foreground tabular-nums">
                          {service.uptime}% uptime
                        </span>
                        <Badge variant="outline" className={cn("text-[10.5px] border gap-1", config.color)}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    {/* Uptime bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 mb-1">
                        <span>90 dias atrás</span>
                        <span className="flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          Hoje
                        </span>
                      </div>
                      <UptimeBar uptime={service.uptime} status={service.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Incidents ── */}
        <div>
          <h2 className="text-[13px] font-semibold text-foreground mb-3">
            Histórico de Incidentes
          </h2>
          {MOCK_INCIDENTS.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Nenhum incidente nos últimos 90 dias</p>
            </div>
          ) : (
            <div className="space-y-3">
              {MOCK_INCIDENTS.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-2xl border border-border/60 bg-card p-5"
                  data-testid={`incident-${incident.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{incident.title}</p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5">{incident.description}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10.5px] border shrink-0", INCIDENT_STATUS_COLOR[incident.status])}>
                      {INCIDENT_STATUS_LABEL[incident.status]}
                    </Badge>
                  </div>
                  {incident.updates.length > 0 && (
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      {incident.updates.map((update, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5" />
                            {i < incident.updates.length - 1 && (
                              <div className="w-px flex-1 bg-border/60 mt-1" />
                            )}
                          </div>
                          <div className="pb-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge variant="outline" className={cn("text-[9px] h-4 px-1 border", INCIDENT_STATUS_COLOR[update.status])}>
                                {INCIDENT_STATUS_LABEL[update.status]}
                              </Badge>
                              <span className="text-[10.5px] text-muted-foreground/60">
                                {formatDate(update.timestamp)}
                              </span>
                            </div>
                            <p className="text-[12px] text-muted-foreground">{update.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    Início: {formatDate(incident.started_at)}
                    {incident.resolved_at && ` · Resolvido: ${formatDate(incident.resolved_at)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Atualizações automáticas</p>
              <p className="text-[12px] text-muted-foreground">
                Esta página é atualizada automaticamente. Receba notificações por e-mail em caso de incidentes.
              </p>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
