import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Users,
  FileText,
  DollarSign,
  Upload,
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils";
import { useNotifications, type AppNotification } from "../hooks/useNotifications";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; category: string }> = {
  "artist:onboarding_started":   { icon: Users,          color: "text-primary bg-primary/10",         category: "Artista" },
  "artist:status_changed":       { icon: Users,          color: "text-primary bg-primary/10",         category: "Artista" },
  "contract:signed":             { icon: FileText,       color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",  category: "Contrato" },
  "contract:expiring_soon":      { icon: Clock,          color: "text-warning bg-warning/10",         category: "Contrato" },
  "invoice:overdue":             { icon: AlertTriangle,  color: "text-destructive bg-destructive/10", category: "Financeiro" },
  "release:distribution_sent":   { icon: Upload,         color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40", category: "Distribuição" },
  "payment:received":            { icon: DollarSign,     color: "text-success bg-success/10",         category: "Financeiro" },
};

function typeInfo(type?: string | null) {
  return TYPE_CONFIG[type ?? ""] ?? { icon: Bell, color: "text-muted-foreground bg-muted", category: "Sistema" };
}

function relTime(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ptBR }); } catch { return ""; }
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotifItem({ notif, onMarkRead }: { notif: AppNotification; onMarkRead: (id: string) => void }) {
  const { icon: Icon, color, category } = typeInfo(notif.type);

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors",
        !notif.read && "bg-primary/5 border-l-2 border-l-primary",
      )}
    >
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm", color)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", !notif.read ? "font-medium" : "text-muted-foreground")}>
            {notif.title}
          </p>
          <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0 mt-0.5">
            {relTime(notif.created_at)}
          </span>
        </div>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.body}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/20">
            {category}
          </Badge>
          {!notif.read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground ml-auto"
              onClick={() => onMarkRead(notif.id)}
            >
              Marcar como lida
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Notification Center ──────────────────────────────────────────────────────

const FILTERS = [
  { value: "all",    label: "Todas" },
  { value: "unread", label: "Não lidas" },
  { value: "artist", label: "Artistas" },
  { value: "contract", label: "Contratos" },
  { value: "financial", label: "Financeiro" },
];

export default function NotificationCenter() {
  const [filter, setFilter] = useState("all");
  const { notifications, isLoading, unreadCount, markRead } = useNotifications();

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    if (filter === "artist") return notifications.filter((n) => n.type?.startsWith("artist"));
    if (filter === "contract") return notifications.filter((n) => n.type?.startsWith("contract"));
    if (filter === "financial") return notifications.filter((n) => n.type?.startsWith("invoice") || n.type?.startsWith("payment"));
    return notifications;
  }, [notifications, filter]);

  const handleMarkAll = () => {
    notifications.filter((n) => !n.read).forEach((n) => markRead(n.id));
  };

  return (
    <MainLayout
      title="Central de Notificações"
      description="Alertas e atualizações do sistema"
      actions={
        unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={handleMarkAll} className="gap-1.5 h-8 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{notifications.length}</span> total
          </span>
          {unreadCount > 0 && (
            <span className="text-sm text-primary font-medium">
              <span className="font-mono">{unreadCount}</span> não lidas
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-muted/60 border border-border p-4 mb-4">
                <Bell className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">
                {filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tudo em dia!</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              {filtered.map((notif) => (
                <NotifItem key={notif.id} notif={notif} onMarkRead={markRead} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
