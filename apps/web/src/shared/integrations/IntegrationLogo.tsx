import { cn } from "@/shared/lib/utils";
import {
  getIntegrationLogo,
  type IntegrationLogoId,
} from "./logos";

interface IntegrationLogoProps {
  id: IntegrationLogoId;
  className?: string;
  imageClassName?: string;
}

export function IntegrationLogo({
  id,
  className,
  imageClassName,
}: IntegrationLogoProps) {
  const logo = getIntegrationLogo(id);
  const BrandIcon = logo.icon;

  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/50",
        logo.backgroundClassName,
        className,
      )}
    >
      {logo.src ? (
        <img
          src={logo.src}
          alt={`Logo ${logo.name}`}
          className={cn("h-10 w-10 object-contain", imageClassName)}
        />
      ) : BrandIcon ? (
        <BrandIcon
          role="img"
          aria-label={`Logo ${logo.name}`}
          className={cn("h-7 w-7", logo.iconClassName, imageClassName)}
        />
      ) : null}
    </span>
  );
}
