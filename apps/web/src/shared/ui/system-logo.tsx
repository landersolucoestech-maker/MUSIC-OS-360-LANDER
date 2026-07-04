import { cn } from "@/shared/lib/utils";

interface SystemLogoProps {
  collapsed?: boolean;
  subtitle?: string;
  tone?: "light" | "default";
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export function SystemLogo({
  collapsed = false,
  subtitle,
  tone = "light",
  className,
  markClassName,
  textClassName,
}: SystemLogoProps) {
  const isLight = tone === "light";

  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center select-none",
        collapsed ? "justify-center" : "gap-2.5",
        className,
      )}
      aria-label="MUSIC OS 360"
    >
      <svg
        viewBox="0 0 155 125"
        className={cn(
          "h-8 w-auto shrink-0",
          isLight ? "text-white" : "text-primary",
          markClassName,
        )}
        fill="currentColor"
        role="img"
        aria-hidden={collapsed ? undefined : true}
        aria-label={collapsed ? "MUSIC OS 360" : undefined}
      >
        <rect x="0" y="51" width="13" height="30" rx="6" />
        <rect x="21" y="35" width="15" height="62" rx="7" />
        <rect x="44" y="21" width="17" height="90" rx="8" />
        <rect x="69" y="7" width="20" height="118" rx="10" />
        <rect x="97" y="29" width="16" height="74" rx="8" />
        <rect x="121" y="45" width="14" height="42" rx="7" />
        <rect x="143" y="55" width="12" height="22" rx="6" />
      </svg>

      {!collapsed && (
        <span className={cn("min-w-0", textClassName)}>
          <span
            className={cn(
              "block whitespace-nowrap text-[12px] font-black leading-none tracking-[0.04em]",
              isLight ? "text-white" : "text-sidebar-foreground",
            )}
          >
            MUSIC OS 360
          </span>
          {subtitle && (
            <span
              className={cn(
                "mt-1.5 block truncate text-[8px] font-semibold leading-none tracking-[0.12em]",
                isLight ? "text-white/55" : "text-sidebar-foreground/45",
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
