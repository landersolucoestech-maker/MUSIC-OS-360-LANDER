import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { MOCK_ADMIN_NOTIFICATIONS } from "../data/mockAdmin";
import type { AdminNotification } from "../types";
import {
  Bell, AlertCircle, AlertTriangle, Info, CheckCircle2,
  Clock, Zap, Check, Trash2,
} from "lucide-react";

type Severity = AdminNotification["severity"];

const SEV_CFG: Record<Severity, { icon: React.ComponentType<{className?:string}>; bg: string; color: string; label: string }> = {
  info:    { icon: Info,         bg: "bg-blue-500/10",    color: "text-blue-400",    label: "Info" },
  warning: { icon: AlertTriangle,bg: "bg-yellow-500/10",  color: "text-yellow-400",  label: "Aviso" },
  error:   { icon: AlertCircle,  bg: "bg-red-500/10",     color: "text-red-400",     label: "Erro" },
  success: { icon: CheckCircle2, bg: "bg-emerald-500/10", color: "text-emerald-400", label: "Sucesso" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState(MOCK_ADMIN_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const displayed = filter === "unread" ? notifs.filter(n => !n.read) : notifs;
  const unreadCnt = notifs.filter(n => !n.read).length;

  function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }
  function markAll() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }
  function dismiss(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Notificações</h1>
            <p className="text-[12.5px] text-white/40 mt-0.5">Central de alertas e comunicados</p>
          </div>
          {unreadCnt > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-white/10 text-white/50 hover:text-white"
              onClick={markAll}
              data-testid="btn-mark-all-read"
            >
              <Check className="h-3.5 w-3.5" /> Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {(["info","warning","error","success"] as Severity[]).map((sev) => {
            const cfg = SEV_CFG[sev];
            const SvIcon = cfg.icon;
            const count = notifs.filter(n => n.severity === sev).length;
            return (
              <div key={sev} className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-4">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl mb-3", cfg.bg)}>
                  <SvIcon className={cn("h-4 w-4", cfg.color)} />
                </div>
                <p className="text-xl font-bold text-white">{count}</p>
                <p className="text-[11px] text-white/35 mt-0.5">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {(["all","unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                filter === f
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
              )}
              data-testid={`filter-${f}`}
            >
              {f === "all" ? "Todas" : `Não lidas (${unreadCnt})`}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {displayed.length === 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] py-16 flex flex-col items-center gap-3">
              <Bell className="h-8 w-8 text-white/15" />
              <p className="text-[13px] text-white/30">Nenhuma notificação</p>
            </div>
          )}
          {displayed.map((n) => {
            const cfg = SEV_CFG[n.severity];
            const NIcon = cfg.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  "group rounded-2xl border bg-[hsl(222_47%_6%)] p-5 transition-all",
                  n.read ? "border-white/[0.05] opacity-70" : "border-white/[0.08]",
                )}
                data-testid={`notif-${n.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", cfg.bg)}>
                    <NIcon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-white">{n.title}</p>
                      <Badge variant="outline" className={cn("text-[10px] border shrink-0", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </Badge>
                      {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-[12.5px] text-white/50 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-white/25">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(n.created_at)}</span>
                      {n.tenant_name && <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{n.tenant_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-emerald-400 transition-colors"
                        title="Marcar como lida"
                        data-testid={`mark-read-${n.id}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(n.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                      title="Dispensar"
                      data-testid={`dismiss-${n.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
