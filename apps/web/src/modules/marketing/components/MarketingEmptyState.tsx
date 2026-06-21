/**
 * Marketing empty state — thin wrapper over the shared EmptyState so all
 * marketing surfaces use the same look and call-to-action shape.
 */

import { EmptyState } from "@/shared/components/EmptyState";

interface MarketingEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function MarketingEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: MarketingEmptyStateProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined}
    />
  );
}
