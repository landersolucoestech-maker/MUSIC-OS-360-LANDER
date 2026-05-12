import { Badge } from "@/shared/ui/badge";
import type { SigningPlatform } from "@/modules/contracts/types/contracts.types";

interface SigningPlatformBadgeProps {
  platform: SigningPlatform | null | undefined;
  className?: string;
}

const PLATFORM_CONFIG: Record<SigningPlatform, { label: string; color: string }> = {
  autentique: {
    label: "Autentique",
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  },
  clicksign: {
    label: "Clicksign",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  docusign: {
    label: "DocuSign",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
};

export function SigningPlatformBadge({ platform, className }: SigningPlatformBadgeProps) {
  if (!platform) return null;

  const config = PLATFORM_CONFIG[platform];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium border ${config.color} ${className ?? ""}`}
      data-testid={`badge-signing-platform-${platform}`}
    >
      {config.label}
    </Badge>
  );
}

export { PLATFORM_CONFIG };
