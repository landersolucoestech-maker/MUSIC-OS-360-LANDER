interface StepCardProps {
  index: number;
  title: string;
  desc: string;
}

export function StepCard({ index, title, desc }: StepCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold tabular-nums text-primary-foreground">
        {index}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
