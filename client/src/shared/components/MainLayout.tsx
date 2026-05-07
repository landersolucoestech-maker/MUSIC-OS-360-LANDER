import { AppSidebar } from "./AppSidebar";
import { cn } from "@/shared/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
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
        {/* ── Topbar ─────────────────────────────────────────────────────── */}
        {(title || actions) && (
          <header className={cn(
            "flex h-[52px] items-center justify-between gap-4 shrink-0",
            "border-b border-border/70 px-6",
            "bg-background/95 backdrop-blur-sm",
            "sticky top-0 z-[200]",
          )}>
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
            {actions && (
              <div className="flex items-center gap-2 shrink-0">{actions}</div>
            )}
          </header>
        )}

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
