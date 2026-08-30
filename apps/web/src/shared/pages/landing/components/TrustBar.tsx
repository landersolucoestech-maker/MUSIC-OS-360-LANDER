import { TRUST_BAR } from "../data";

export function TrustBar() {
  return (
    <div className="mt-10 grid gap-6 rounded-xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST_BAR.map((item) => (
        <div key={item.title} className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <item.icon className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
