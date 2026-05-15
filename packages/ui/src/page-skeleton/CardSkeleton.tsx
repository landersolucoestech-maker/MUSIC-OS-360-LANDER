interface CardSkeletonProps {
  rows?: number;
}

export function CardSkeleton({ rows = 3 }: CardSkeletonProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 w-full rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}
