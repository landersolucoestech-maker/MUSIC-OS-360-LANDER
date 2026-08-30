import type { LucideIcon } from "lucide-react";

interface AudienceCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export function AudienceCard({ icon: Icon, title, desc }: AudienceCardProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm font-semibold">{title}</span>
      <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
