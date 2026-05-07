import { AppSidebar } from "./AppSidebar";
import { cn } from "@/shared/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Remove the default page padding — use for full-bleed content */
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
        {/* Topbar */}
        {(title || actions) && (
          <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-6 shrink-0 sticky top-0 z-[200]">
            <div className="min-w-0">
              {title && (
                <h1 className="text-base font-semibold tracking-tight text-foreground leading-tight truncate">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-xs text-muted-foreground leading-tight truncate mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 shrink-0">{actions}</div>
            )}
          </header>
        )}

        {/* Content */}
        <main className={cn(
          "flex-1 overflow-y-auto",
          !noPadding && "px-4 py-6 md:px-6"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
