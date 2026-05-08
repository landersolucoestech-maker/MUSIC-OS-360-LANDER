import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { MOCK_SECURITY_EVENTS } from "../data/mockAdmin";
import type { SecurityEventType } from "../types";
import {
  Shield, AlertTriangle, AlertCircle, Lock,
  Globe, CheckCircle2, Clock,
} from "lucide-react";

const TYPE_LABEL: Record<SecurityEventType, string> = {
  failed_login:    "Login Falho",
  mfa_bypass:      "Bypass MFA",
  suspicious_ip:   "IP Suspeito",
  brute_force:     "Força Bruta",
  token_abuse:     "Abuso de Token",
  account_locked:  "Conta Bloqueada",
};
const SEV_STYLE = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low:      "text-white/50 bg-white/5 border-white/10",
};
const SEV_LABEL = {
  critical: "Crítico", high: "Alto", medium: "Médio", low: "Baixo",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSecurity() {
  const [events, setEvents] = useState(MOCK_SECURITY_EVENTS);

  const unresolved = events.filter(e => !e.resolved);
  const critical   = events.filter(e => e.severity === "critical" || e.severity === "high").length;
  const blocked    = events.filter(e => e.type === "account_locked" || e.type === "brute_force").length;

  function resolve(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Segurança</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Monitoramento de eventos e ameaças</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Alertas Ativos",  value: unresolved.length, icon: AlertCircle, color: "text-red-400",    bg: "bg-red-500/10" },
            { label: "Alta Severidade", value: critical,           icon: AlertTriangle,color: "text-orange-400",bg: "bg-orange-500/10" },
            { label: "Contas Bloqueadas",value: blocked,           icon: Lock,        color: "text-yellow-400",bg: "bg-yellow-500/10" },
            { label: "Resolvidos",      value: events.filter(e=>e.resolved).length,
              icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
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

        <div className="space-y-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={cn(
                "rounded-2xl border bg-[hsl(222_47%_6%)] p-5",
                ev.resolved ? "border-white/[0.05] opacity-60" : "border-white/[0.07]",
              )}
              data-testid={`security-${ev.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5", SEV_STYLE[ev.severity].split(" ").slice(1).join(" "))}>
                    <Shield className={cn("h-4 w-4", SEV_STYLE[ev.severity].split(" ")[0])} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-white">{TYPE_LABEL[ev.type]}</span>
                      <Badge variant="outline" className={cn("text-[10px] border", SEV_STYLE[ev.severity])}>
                        {SEV_LABEL[ev.severity]}
                      </Badge>
                      {ev.resolved && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
                          Resolvido
                        </Badge>
                      )}
                    </div>
                    <p className="text-[12.5px] text-white/60">{ev.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-white/30">
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{ev.ip_address}</span>
                      {ev.user_email && <span>{ev.user_email}</span>}
                      {ev.tenant_name && <span>{ev.tenant_name}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(ev.created_at)}</span>
                    </div>
                  </div>
                </div>
                {!ev.resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs border-white/10 text-white/50 hover:text-emerald-400 hover:border-emerald-500/30"
                    onClick={() => resolve(ev.id)}
                    data-testid={`resolve-${ev.id}`}
                  >
                    Resolver
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
