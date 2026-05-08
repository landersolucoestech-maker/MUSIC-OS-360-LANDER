import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { MOCK_ADMIN_NOTIFICATIONS } from "../data/mockAdmin";
import {
  LayoutDashboard, Building2, CreditCard, DollarSign, Tag,
  Users, Shield, ScrollText, Zap, Server, Bell, HeadphonesIcon,
  Settings, BarChart3, LogOut, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Info, AlertTriangle, ExternalLink,
  Music2,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Clientes",        href: "/admin/clients",   icon: Building2 },
  { label: "Assinaturas",     href: "/admin/subscriptions", icon: CreditCard },
  { label: "Planos",          href: "/admin/plans",     icon: Tag },
  { label: "Receita",         href: "/admin/revenue",   icon: DollarSign },
  { label: "Analytics",       href: "/admin/analytics", icon: BarChart3 },
  { label: "Segurança",       href: "/admin/security",  icon: Shield },
  { label: "Logs & Auditoria",href: "/admin/audit",     icon: ScrollText },
  { label: "Integrações",     href: "/admin/integrations", icon: Zap },
  { label: "Sistema",         href: "/admin/system",    icon: Server },
  { label: "Notificações",    href: "/admin/notifications", icon: Bell },
  { label: "Support Hub",     href: "/admin/support",   icon: HeadphonesIcon },
  { label: "Configurações",   href: "/admin/settings",  icon: Settings },
];

const SEVERITY_ICON = {
  info:    <Info className="h-3.5 w-3.5 text-blue-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />,
  error:   <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const unread = MOCK_ADMIN_NOTIFICATIONS.filter(n => !n.read).length;

  const active = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={cn(
        "flex flex-col border-r border-white/[0.06] bg-[hsl(222_47%_4%)] transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60",
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
                <Music2 className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">MUSIC OS 360</p>
                <p className="text-[9px] text-blue-400 mt-0.5 font-medium uppercase tracking-wider">Super Admin</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 mx-auto">
              <Music2 className="h-4 w-4 text-blue-400" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-white/30 hover:text-white/70 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = active(href);
            return (
              <Link
                key={href}
                to={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]",
                  collapsed && "justify-center px-2",
                )}
                data-testid={`admin-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="p-4 text-white/30 hover:text-white/70 transition-colors flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Back to app */}
        {!collapsed && (
          <div className="p-3 border-t border-white/[0.06]">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-[11.5px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
              data-testid="admin-back-to-app"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voltar ao app
            </button>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[hsl(222_47%_4%)] shrink-0">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="text-[9.5px] h-5 px-2 border-blue-500/30 text-blue-400 bg-blue-500/10 font-semibold tracking-wider"
            >
              SUPER ADMIN
            </Badge>
            <span className="text-[12px] text-white/30">Painel Global</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                  data-testid="admin-notifications-btn"
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-[12px] font-semibold">Notificações</p>
                </div>
                {MOCK_ADMIN_NOTIFICATIONS.slice(0, 4).map((n) => (
                  <DropdownMenuItem key={n.id} className="gap-2 py-2.5 cursor-pointer">
                    {SEVERITY_ICON[n.severity]}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>
                    </div>
                    {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin/notifications" className="text-[12px] text-blue-400 justify-center">
                    Ver todas
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/[0.04] transition-colors"
                  data-testid="admin-profile-btn"
                >
                  <div className="h-7 w-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-blue-400">SA</span>
                  </div>
                  <span className="text-[12px] text-white/60">Super Admin</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/")}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" /> Voltar ao App
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400" onClick={() => navigate("/auth")}>
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
