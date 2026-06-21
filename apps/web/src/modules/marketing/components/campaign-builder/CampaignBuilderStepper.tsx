import { cn } from "@/shared/lib/utils";

const STEPS = [
  "Objetivo",
  "Resultado",
  "Dados",
  "Público",
  "Plataformas",
  "Posicionamentos",
  "Criativos",
  "Orçamento",
  "Revisao",
];

export function CampaignBuilderStepper({ step }: { step: number }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {STEPS.map((label, index) => {
        const active = step === index + 1;
        const done = step > index + 1;
        return (
          <div key={label} className={cn("min-w-[104px] rounded-md border px-3 py-2 text-xs", active ? "border-primary bg-primary/10 text-primary" : done ? "border-emerald-500/30 text-emerald-500" : "border-border text-muted-foreground")}>
            <span className="font-semibold">{index + 1}. </span>{label}
          </div>
        );
      })}
    </div>
  );
}
