import type { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export function ModuleCard({ icon: Icon, title, desc }: ModuleCardProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
      data-testid={`card-module-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
