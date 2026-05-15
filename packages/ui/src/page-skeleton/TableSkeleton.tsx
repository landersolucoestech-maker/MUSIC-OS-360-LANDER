interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 8 }: TableSkeletonProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex h-12 items-center gap-4 px-4 bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 flex-1 rounded bg-muted animate-pulse" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex h-12 items-center gap-4 px-4 border-t">
          {Array.from({ length: columns }).map((_, ci) => (
            <div key={ci} className="h-3 flex-1 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
