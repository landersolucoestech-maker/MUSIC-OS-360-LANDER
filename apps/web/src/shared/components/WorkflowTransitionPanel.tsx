/**
 * WorkflowTransitionPanel.tsx
 *
 * Shared component that consumes `allowed_transitions` from API detail responses.
 * Renders a status badge + dropdown of available workflow transitions.
 *
 * Usage:
 *   <WorkflowTransitionPanel
 *     currentStatus="planejamento"
 *     allowedTransitions={release.allowed_transitions}
 *     onTransition={(to) => mutate({ status: to })}
 *     isLoading={isPending}
 *   />
 */

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ChevronDown, Loader2, GitBranch } from 'lucide-react';

export interface AllowedTransition {
  to: string;
  label?: string;
}

interface WorkflowTransitionPanelProps {
  currentStatus: string;
  allowedTransitions?: AllowedTransition[];
  onTransition: (toStatus: string) => void | Promise<void>;
  isLoading?: boolean;
  statusLabel?: string;
  className?: string;
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WorkflowTransitionPanel({
  currentStatus,
  allowedTransitions = [],
  onTransition,
  isLoading = false,
  statusLabel,
  className = '',
}: WorkflowTransitionPanelProps) {
  const [pending, setPending] = useState<string | null>(null);
  const hasTransitions = allowedTransitions.length > 0;

  async function handleTransition(to: string) {
    setPending(to);
    try {
      await onTransition(to);
    } finally {
      setPending(null);
    }
  }

  const displayStatus = statusLabel ?? formatStatus(currentStatus);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <GitBranch className="h-4 w-4 text-muted-foreground" />
      <Badge variant="secondary" className="text-xs font-mono uppercase tracking-wide">
        {displayStatus}
      </Badge>

      {hasTransitions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || pending !== null}
              className="h-7 gap-1 text-xs"
              data-testid="workflow-transition-trigger"
            >
              {(isLoading || pending !== null) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  Alterar Status
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Transições disponíveis
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allowedTransitions.map((t) => (
              <DropdownMenuItem
                key={t.to}
                disabled={pending === t.to}
                onClick={() => handleTransition(t.to)}
                data-testid={`workflow-transition-${t.to}`}
                className="gap-2 text-sm"
              >
                {pending === t.to && <Loader2 className="h-3 w-3 animate-spin" />}
                {t.label ?? formatStatus(t.to)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!hasTransitions && (
        <span className="text-xs text-muted-foreground">(estado final)</span>
      )}
    </div>
  );
}
