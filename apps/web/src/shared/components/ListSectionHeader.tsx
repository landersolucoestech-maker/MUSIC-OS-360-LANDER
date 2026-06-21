import type React from "react";

interface ListSectionHeaderProps {
  title: string;
  count: number;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function ListSectionHeader({ title, count, description, action, className = "" }: ListSectionHeaderProps) {
  const normalizedClassName = className.replace(/\b(?:px|pt|pl|pr)-\S+/g, "").trim();

  return (
    <div data-list-section-header="true" className={`mb-4 ${normalizedClassName}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {title}
            <span className="ml-2 text-xs font-normal text-muted-foreground">({count})</span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
