import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthContext";
import { useTenant, PLAN_LABEL } from "@/app/providers/TenantContext";
import { useIsAdmin } from "@/shared/hooks/useIsAdmin";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Music,
  Radio,
  FileText,
  DollarSign,
  Calendar,
  Package,
  MessageCircle,
  Contact,
  Megaphone,
  ChevronDown,
  ListChecks,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Upload,
  Shield,
  AlertTriangle,
  UserPlus,
  Briefcase,
  Share2,
  Receipt,
  Calculator,
  Eye,
  Target,
  CalendarDays,
  TrendingUp,
  FileEdit,
  Sparkles,
  User,
  Settings,
  LogOut,
  ClipboardCheck,
  Building2,
  ChevronsUpDown,
  CheckCircle2,
  Activity,
  BarChart,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard",    href: "/",           icon: LayoutDashboard },
  { title: "Artistas",     href: "/artistas",  icon: Users },
  { title: "Projetos",     href: "/projetos",  icon: FolderKanban },
  {
    title: "Catálogo",
    icon: Music,
    children: [
      { title: "Obras & Fonogramas",   href: "/registro-musicas", icon: Music },
      { title: "Monitoramento",        href: "/monitoramento",    icon: Radio },
      { title: "Licenciamento",        href: "/licenciamento",    icon: Shield },
      { title: "Takedowns",            href: "/takedowns",        icon: AlertTriangle },
    ],
  },
  {
    title: "Lançamentos",
    icon: Radio,
    children: [
      { title: "Distribuição",         href: "/lancamentos",      icon: Upload },
      { title: "Gestão de Shares",     href: "/gestao-shares",    icon: Share2 },
    ],
  },
  { title: "Contratos",    href: "/contratos", icon: FileText },
  {
    title: "Financeiro",
    icon: DollarSign,
    children: [
      { title: "Transações",           href: "/financeiro",                  icon: DollarSign },
      { title: "Contabilidade",        href: "/contabilidade",               icon: Calculator },
      { title: "Nota Fiscal",          href: "/nota-fiscal",                 icon: Receipt },
    ],
  },
  { title: "Agenda",       href: "/agenda",    icon: Calendar },
  { title: "Inventário",   href: "/inventario",icon: Package },
  { title: "MusicChat",    href: "/chat",      icon: MessageCircle },
  {
    title: "CRM",
    icon: Contact,
    children: [
      { title: "Contatos",        href: "/crm",        icon: Users },
      { title: "Funil Comercial", href: "/crm/funil",  icon: TrendingUp },
    ],
  },
  { title: "Leads",        href: "/leads",     icon: UserPlus },
  { title: "Recursos Humanos", href: "/rh",    icon: Briefcase },
  {
    title: "Marketing",
    icon: Megaphone,
    children: [
      { title: "Visão Geral",          href: "/marketing/visao-geral",  icon: Eye },
      { title: "Campanhas",            href: "/marketing/campanhas",    icon: Target },
      { title: "Calendário de Conteúdo",href:"/marketing/calendario",  icon: CalendarDays },
      { title: "Métricas e Resultados",href: "/marketing/metricas",    icon: TrendingUp },
      { title: "Central de Briefing",  href: "/marketing/briefing",    icon: FileEdit },
      { title: "Tarefas",              href: "/marketing/tarefas",     icon: ListChecks },
      { title: "IA Criativa",          href: "/marketing/ia-criativa", icon: Sparkles },
    ],
  },
];

export function AppSidebar() {
  const { user, signOut }   = useAuth();
  const { tenant }          = useTenant();
  const { isAdmin }         = useIsAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const location = useLocation();

  const adminItems: NavItem[] = useMemo(
    () => isAdmin ? [{ title: "Auditoria", href: "/auditoria", icon: ClipboardCheck }] : [],
    [isAdmin],
  );

  const userFullName = (user?.user_metadata?.full_name as string) || "Usuário";
  const userEmail    = user?.email ?? "";
  const userInitials = userFullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const toggleMenu = (title: string) =>
    setOpenMenus(prev => prev.includes(title) ? [] : [title]);

  const isActive      = (href: string) => location.pathname === href;
  const isChildActive = (children?: NavItem["children"]) =>
    children?.some(c => location.pathname === c.href);

  // ─── Nav item renderer ────────────────────────────────────────────────────

  const renderNavItem = (item: NavItem) => {
    if (item.children) {
      const isOpen      = openMenus.includes(item.title);
      const hasActive   = isChildActive(item.children);

      return (
        <Collapsible key={item.title} open={isOpen} onOpenChange={() => toggleMenu(item.title)}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium",
                "text-sidebar-foreground/70 transition-colors duration-150",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                hasActive && "text-sidebar-primary"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.title}</span>
                  {isOpen
                    ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </>
              )}
            </button>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent className="ml-3 border-l border-sidebar-border pl-3 mt-0.5 space-y-0.5">
              {item.children.map(child => (
                <Link
                  key={child.href}
                  to={child.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors duration-150",
                    "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    isActive(child.href) &&
                      "bg-sidebar-accent text-sidebar-primary font-medium"
                  )}
                >
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{child.title}</span>
                </Link>
              ))}
            </CollapsibleContent>
          )}
        </Collapsible>
      );
    }

    return (
      <Link
        key={item.href}
        to={item.href!}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium",
          "text-sidebar-foreground/70 transition-colors duration-150",
          "hover:bg-sidebar-accent hover:text-sidebar-foreground",
          isActive(item.href!) &&
            "bg-sidebar-accent text-sidebar-primary font-semibold"
        )}
        data-testid={`nav-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1">{item.title}</span>}
      </Link>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar",
        "transition-all duration-300 ease-out shrink-0",
        collapsed ? "w-[56px]" : "w-[240px]"
      )}
    >
      {/* ── Brand header ────────────────────────────────────────────────── */}
      <div className={cn(
        "flex h-14 items-center border-b border-sidebar-border px-3",
        collapsed ? "justify-center" : "justify-between gap-2"
      )}>
        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
            "font-bold text-[13px] shrink-0 select-none",
            "h-8 w-8"
          )}>
            M
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight tracking-tight text-sidebar-foreground truncate">
                MUSIC OS 360
              </p>
              <p className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-widest leading-tight">
                ERP Operacional
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        {!collapsed && (
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle data-testid="button-theme-toggle" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              data-testid="button-sidebar-collapse"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            data-testid="button-sidebar-expand"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ── Tenant block ────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-sidebar-border">
          <div className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
            "bg-sidebar-accent/60 border border-sidebar-border",
            "cursor-default select-none"
          )}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20 shrink-0">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-semibold text-sidebar-foreground leading-tight truncate">
                {tenant.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider",
                  "px-1.5 py-0.5 rounded-sm",
                  tenant.plan === "enterprise"
                    ? "bg-primary/15 text-primary"
                    : tenant.plan === "professional"
                    ? "bg-violet-500/15 text-violet-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {PLAN_LABEL[tenant.plan]}
                </span>
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/30 shrink-0" />
          </div>
          <p className="text-[9.5px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 mt-2 px-1">
            Sistema Multi-Tenant
          </p>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map(renderNavItem)}
        {adminItems.length > 0 && (
          <>
            <div className="my-1.5 mx-1 border-t border-sidebar-border" />
            {adminItems.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* ── User menu ────────────────────────────────────────────────────── */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]",
                "text-sidebar-foreground/70 transition-colors duration-150",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={(user?.user_metadata?.avatar_url as string) || ""} />
                <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold border border-primary/20">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-[12.5px] font-medium truncate leading-tight text-sidebar-foreground">
                    {userFullName}
                  </p>
                  <p className="text-[11px] text-sidebar-foreground/40 truncate leading-tight">
                    {userEmail}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-medium">{userFullName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/perfil" className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/configuracoes" className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive cursor-pointer focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
