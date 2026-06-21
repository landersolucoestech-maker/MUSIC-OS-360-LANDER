import { Badge } from "@/shared/ui/badge";
import type { SigningPlatform } from "@/modules/contracts/types/contracts.types";

interface SigningPlatformBadgeProps {
  platform: SigningPlatform | null | undefined;
  className?: string;
}

const PLATFORM_LABEL: Record<SigningPlatform, string> = {
  autentique: "Autentique",
  clicksign: "Clicksign",
  docusign: "DocuSign",
};

export function SigningPlatformBadge({ platform, className }: SigningPlatformBadgeProps) {
  if (!platform) return null;

  const label = PLATFORM_LABEL[platform];
  if (!label) return null;

  // Identidade de plataforma colapsa no variant neutro (sem cores de marca).
  return (
    <Badge
      variant="neutral"
      className={className}
      data-testid={`badge-signing-platform-${platform}`}
    >
      {label}
    </Badge>
  );
}

export { PLATFORM_LABEL };
