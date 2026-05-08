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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
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
  children?: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Artistas", href: "/artistas", icon: Users },
  { title: "Projetos", href: "/projetos", icon: FolderKanban },
  {
    title: "Catálogo",
    icon: Music,
    children: [
      { title: "Obras & Fonogramas", href: "/registro-musicas", icon: Music },
      { title: "Monitoramento", href: "/monitoramento", icon: Radio },
      { title: "Licenciamento", href: "/licenciamento", icon: Shield },
      { title: "Takedowns", href: "/takedowns", icon: AlertTriangle },
    ],
  },
  {
    title: "Lançamentos",
    icon: Radio,
    children: [
      { title: "Distribuição", href: "/lancamentos", icon: Upload },
      { title: "Gestão de Shares", href: "/gestao-shares", icon: Share2 },
    ],
  },
  { title: "Contratos", href: "/contratos", icon: FileText },
  {
    title: "Financeiro",
    icon: DollarSign,
    children: [
      { title: "Transações", href: "/accounting", icon: DollarSign },
      { title: "Fluxo de Caixa", href: "/accounting/fluxo", icon: TrendingUp },
      {
        title: "Conciliação",
        href: "/accounting/conciliacao",
        icon: CheckCircle2,
      },
      { title: "Relatórios", href: "/accounting/relatorios", icon: BarChart },
      {
        title: "Contabilidade",
        href: "/accounting/contabilidade",
        icon: Calculator,
      },
      { title: "Nota Fiscal", href: "/accounting/nota-fiscal", icon: Receipt },
    ],
  },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Inventário", href: "/inventario", icon: Package },
  { title: "MusicChat", href: "/chat", icon: MessageCircle },
  { title: "CRM", href: "/crm", icon: Contact },
  { title: "Leads", href: "/leads", icon: UserPlus },
  { title: "Recursos Humanos", href: "/rh", icon: Briefcase },
  { title: "Analytics", href: "/analytics", icon: Activity },
  {
    title: "Marketing",
    icon: Megaphone,
    children: [
      { title: "Visão Geral", href: "/marketing/visao-geral", icon: Eye },
      { title: "Campanhas", href: "/marketing/campanhas", icon: Target },
      {
        title: "Calendário de Conteúdo",
        href: "/marketing/calendario",
        icon: CalendarDays,
      },
      { title: "Métricas", href: "/marketing/metricas", icon: TrendingUp },
      { title: "Briefing", href: "/marketing/briefing", icon: FileEdit },
      { title: "Tarefas", href: "/marketing/tarefas", icon: ListChecks },
      { title: "IA Criativa", href: "/marketing/ia-criativa", icon: Sparkles },
    ],
  },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { tenant } = useTenant();
  const { isAdmin } = useIsAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const location = useLocation();

  const adminItems: NavItem[] = useMemo(
    () =>
      isAdmin
        ? [{ title: "Auditoria", href: "/auditoria", icon: ClipboardCheck }]
        : [],
    [isAdmin],
  );

  const userFullName = (user?.user_metadata?.full_name as string) || "Usuário";
  const userEmail = user?.email ?? "";
  const userInitials =
    userFullName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const toggleMenu = (title: string) =>
    setOpenMenus((prev) => (prev.includes(title) ? [] : [title]));

  const isActive = (href: string) => location.pathname === href;
  const isChildActive = (children?: NavItem["children"]) =>
    children?.some((c) => location.pathname === c.href);

  // ── Nav item renderer ──────────────────────────────────────────────────────

  const renderNavItem = (item: NavItem) => {
    if (item.children) {
      const isOpen = openMenus.includes(item.title);
      const hasActive = isChildActive(item.children);

      return (
        <Collapsible
          key={item.title}
          open={isOpen}
          onOpenChange={() => toggleMenu(item.title)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-[5px]",
                "text-[12.5px] font-medium transition-colors duration-100",
                "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                hasActive && "text-sidebar-foreground/90",
              )}
            >
              <item.icon
                className={cn(
                  "h-[15px] w-[15px] shrink-0",
                  hasActive ? "text-sidebar-primary" : "opacity-60",
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 opacity-40 transition-transform duration-150",
                      isOpen && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>
          </CollapsibleTrigger>

          {!collapsed && (
            <CollapsibleContent className="mt-0.5 space-y-px">
              <div className="ml-[23px] border-l border-sidebar-border/70 pl-2.5 space-y-px">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    to={child.href}
                    className={cn(
                      "flex items-center gap-2 rounded-[5px] px-2 py-[5px]",
                      "text-[12px] transition-colors duration-100",
                      isActive(child.href)
                        ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                        : "text-sidebar-foreground/55 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                    )}
                  >
                    <child.icon
                      className={cn(
                        "h-[13px] w-[13px] shrink-0",
                        isActive(child.href)
                          ? "text-sidebar-primary"
                          : "opacity-50",
                      )}
                    />
                    <span>{child.title}</span>
                    {isActive(child.href) && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      );
    }

    const active = isActive(item.href!);
    return (
      <Link
        key={item.href}
        to={item.href!}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-[5px]",
          "text-[12.5px] font-medium transition-colors duration-100",
          active
            ? "bg-sidebar-accent text-sidebar-primary font-semibold"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
        )}
        data-testid={`nav-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <item.icon
          className={cn(
            "h-[15px] w-[15px] shrink-0",
            active ? "text-sidebar-primary" : "opacity-55",
          )}
        />
        {!collapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary shrink-0" />
            )}
          </>
        )}
      </Link>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col bg-sidebar",
        "border-r border-sidebar-border",
        "transition-[width] duration-200 ease-out shrink-0",
        collapsed ? "w-[52px]" : "w-[232px]",
      )}
    >
      {/* ── Brand header ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border px-3",
          collapsed
            ? "h-[52px] justify-center"
            : "h-[64px] justify-between gap-2",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex items-center justify-center rounded-md bg-primary text-primary-foreground",
              "font-bold text-[12px] shrink-0 select-none h-7 w-7",
            )}
          >
            M
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold leading-none tracking-tight text-sidebar-foreground">
                MUSIC OS 360
              </p>
              <p className="text-[9px] font-medium text-sidebar-foreground/40 uppercase tracking-[0.09em] leading-none mt-[3px]">
                ERP OPERACIONAL MUSICAL
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle data-testid="button-theme-toggle" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="h-7 w-7 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
            className="h-7 w-7 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            data-testid="button-sidebar-expand"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ── Tenant block ──────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-2.5 pt-1.5 pb-2 border-b border-sidebar-border">
          <p className="text-[8.5px] font-semibold text-sidebar-foreground/30 uppercase tracking-[0.14em] px-1 pb-1"></p>
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5",
              "bg-sidebar-accent/50 border border-sidebar-border/60",
              "cursor-default select-none",
            )}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 border border-primary/15 shrink-0">
              <Building2 className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-semibold text-sidebar-foreground leading-none truncate">
                {tenant.name}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em]",
                    "px-1 py-px rounded-sm",
                    tenant.plan === "enterprise"
                      ? "bg-primary/12 text-primary"
                      : tenant.plan === "professional"
                        ? "bg-violet-500/12 text-violet-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <CheckCircle2 className="h-2 w-2" />
                  {PLAN_LABEL[tenant.plan]}
                </span>
              </div>
            </div>
            <ChevronsUpDown className="h-3 w-3 text-sidebar-foreground/25 shrink-0" />
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-px">
        {NAV_ITEMS.map(renderNavItem)}
        {adminItems.length > 0 && (
          <>
            <div className="my-2 mx-1 border-t border-sidebar-border/60" />
            {adminItems.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* ── User menu ─────────────────────────────────────────────────────── */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
                "text-sidebar-foreground/60 transition-colors duration-100",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center",
              )}
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage
                  src={(user?.user_metadata?.avatar_url as string) || ""}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold border border-primary/15">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-[12px] font-medium truncate leading-none text-sidebar-foreground">
                    {userFullName}
                  </p>
                  <p className="text-[10.5px] text-sidebar-foreground/38 truncate leading-none mt-0.5">
                    {userEmail}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <div className="px-2 py-2">
              <p className="text-[12.5px] font-semibold">{userFullName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/perfil" className="cursor-pointer text-sm">
                <User className="h-3.5 w-3.5 mr-2 opacity-60" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/configuracoes" className="cursor-pointer text-sm">
                <Settings className="h-3.5 w-3.5 mr-2 opacity-60" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive cursor-pointer focus:text-destructive text-sm"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
