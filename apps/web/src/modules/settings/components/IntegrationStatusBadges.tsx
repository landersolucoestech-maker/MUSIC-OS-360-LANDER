import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

export type IntegrationConnectionStatus = "conectado" | "desconectado";

export type IntegrationNoticeVariant = "warning" | "info" | "destructive";

export interface IntegrationNotice {
  id: string;
  label: string;
  tooltip?: string;
  variant?: IntegrationNoticeVariant;
}

interface IntegrationStatusBadgesProps {
  status: IntegrationConnectionStatus;
  notices?: IntegrationNotice[];
  testIdPrefix?: string;
}

const noticeBadgeVariant: Record<IntegrationNoticeVariant, BadgeVariant> = {
  warning: "warning",
  info: "info",
  destructive: "danger",
};

export function IntegrationStatusBadges({
  status,
  notices,
  testIdPrefix,
}: IntegrationStatusBadgesProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {notices?.map((notice) => {
        const variant = notice.variant ?? "warning";
        const badge = (
          <Badge
            variant={noticeBadgeVariant[variant]}
            className="cursor-help"
            data-testid={
              testIdPrefix
                ? `${testIdPrefix}-notice-${notice.id}`
                : undefined
            }
          >
            {notice.label}
          </Badge>
        );

        if (!notice.tooltip) {
          return (
            <span key={notice.id} className="inline-flex">
              {badge}
            </span>
          );
        }

        return (
          <Tooltip key={notice.id}>
            <TooltipTrigger asChild>
              <span className="inline-flex">{badge}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {notice.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
      <Badge
        variant={status === "conectado" ? "success" : "neutral"}
        data-testid={
          testIdPrefix ? `${testIdPrefix}-status` : undefined
        }
      >
        {status === "conectado" ? "Conectado" : "Desconectado"}
      </Badge>
    </div>
  );
}
