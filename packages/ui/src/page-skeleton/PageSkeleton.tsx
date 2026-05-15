export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-8 w-16 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-md border overflow-hidden">
        <div className="h-12 bg-muted/50 animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex h-12 items-center gap-4 px-4 border-b">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
