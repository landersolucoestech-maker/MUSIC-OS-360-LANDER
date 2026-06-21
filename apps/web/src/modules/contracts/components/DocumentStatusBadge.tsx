import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import type { DocumentStatus, SignerStatus } from "@/modules/contracts/types/document-types";
import { DOCUMENT_STATUS_LABEL, SIGNER_STATUS_LABEL } from "@/modules/contracts/types/document-types";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const STATUS_VARIANT: Record<DocumentStatus, BadgeVariant> = {
  draft:              "neutral",
  pending_signature:  "warning",
  partially_signed:   "info",
  signed:             "success",
  cancelled:          "danger",
  expired:            "danger",
};

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={className}
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

const SIGNER_VARIANT: Record<SignerStatus, BadgeVariant> = {
  pending:  "warning",
  signed:   "success",
  rejected: "danger",
  expired:  "danger",
};

export function SignerStatusBadge({ status, className }: SignerStatusBadgeProps) {
  return (
    <Badge
      variant={SIGNER_VARIANT[status]}
      className={className}
      data-testid={`badge-signer-status-${status}`}
    >
      {SIGNER_STATUS_LABEL[status]}
    </Badge>
  );
}
