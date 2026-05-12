import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { DocumentStatus, SignerStatus } from "../../types";
import { DOCUMENT_STATUS_LABEL, SIGNER_STATUS_LABEL } from "../../types";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft:              "bg-muted text-muted-foreground border-border",
  pending_signature:  "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  partially_signed:   "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
  signed:             "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400",
  cancelled:          "bg-destructive/10 text-destructive border-destructive/30",
  expired:            "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400",
};

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10.5px] font-medium border", STATUS_STYLES[status], className)}
      data-testid={`badge-doc-status-${status}`}
    >
      {DOCUMENT_STATUS_LABEL[status]}
    </Badge>
  );
}

interface SignerStatusBadgeProps {
  status: SignerStatus;
  className?: string;
}

const SIGNER_STYLES: Record<SignerStatus, string> = {
  pending:  "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  signed:   "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  expired:  "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400",
};

export function SignerStatusBadge({ status, className }: SignerStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10.5px] font-medium border", SIGNER_STYLES[status], className)}
      data-testid={`badge-signer-status-${status}`}
    >
      {SIGNER_STATUS_LABEL[status]}
    </Badge>
  );
}
