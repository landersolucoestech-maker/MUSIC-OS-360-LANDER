import { useState } from "react";
import { Link } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/app/providers/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import {
  Bell,
  HelpCircle,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CheckCheck,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/app/providers/ThemeContext";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  tenant_owner: "Super Admin",
  admin: "Administrador",
  manager: "Gerente",
  editor: "Editor",
  viewer: "Visualizador",
};

const MOCK_NOTIFICATIONS = [
  { id: 1, title: "Novo contrato assinado", body: "Contrato com João Silva", time: "2h atrás", read: false },
  { id: 2, title: "Lançamento publicado", body: "Álbum 'Nova Era' publicado", time: "4h atrás", read: false },
  { id: 3, title: "Pagamento recebido", body: "R$ 12.400,00 creditado", time: "6h atrás", read: false },
];

function TopbarUserMenu() {
  const { user, signOut } = useAuth();

  const userFullName = (user?.user_metadata?.full_name as string) || "Usuário";
  const userEmail = user?.email ?? "";
  const userRole = (user?.user_metadata?.role as string) || (user as Record<string, unknown>)?.role as string || "";
  const roleLabel = ROLE_LABEL[userRole] || "Usuário";
  const userInitials = userFullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="button-topbar-user-menu"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5",
            "text-foreground/80 transition-colors duration-100",
            "hover:bg-accent hover:text-foreground",
            "border border-transparent hover:border-border/50",
            "focus:outline-none",
          )}
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-[12.5px] font-semibold leading-none text-foreground">
              {userFullName}
            </p>
            <p className="text-[10.5px] text-muted-foreground leading-none mt-[3px]">
              {roleLabel}
            </p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0 hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <p className="text-[12.5px] font-semibold">{userFullName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
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
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      data-testid="button-topbar-theme-toggle"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function NotificationsPopover() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-topbar-notifications"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-[13px] font-semibold">Notificações</p>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors",
                !n.read && "bg-primary/[0.04]",
              )}
            >
              {!n.read && (
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              )}
              {n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium leading-none">{n.title}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                <p className="text-[10.5px] text-muted-foreground/60 mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
        {notifications.length === 0 && (
          <p className="text-[12px] text-muted-foreground text-center py-6">
            Nenhuma notificação
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function MainLayout({
  children,
  title,
  description,
  actions,
  noPadding = false,
}: MainLayoutProps) {

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">

        {/* ── Global Topbar ──────────────────────────────────────────────── */}
        <header className={cn(
          "flex h-[52px] items-center gap-3 shrink-0 px-4",
          "border-b border-border/70",
          "bg-background/95 backdrop-blur-sm",
          "sticky top-0 z-[200]",
        )}>
          {/* Left: page title/description */}
          <div className="flex-1 min-w-0 flex items-center">
            {(title || description) ? (
              <div className="min-w-0 flex flex-col justify-center">
                {title && (
                  <h1 className="text-[13.5px] font-semibold tracking-tight text-foreground leading-none">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-[11.5px] text-muted-foreground leading-none mt-1 truncate">
                    {description}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* Right: actions + notifications + help + user */}
          <div className="flex items-center gap-1 shrink-0">
            {actions && (
              <>
                <div className="flex items-center gap-2 mr-2">{actions}</div>
                <div className="w-px h-5 bg-border/60 mx-1" />
              </>
            )}

            <ThemeToggleButton />

            <NotificationsPopover />

            <Link to="/suporte">
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-topbar-help"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Suporte"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </Link>

            <div className="w-px h-5 bg-border/60 mx-1" />

            <TopbarUserMenu />
          </div>
        </header>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main className={cn(
          "flex-1 overflow-y-auto",
          !noPadding && "px-5 py-5 md:px-6 md:py-6",
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
