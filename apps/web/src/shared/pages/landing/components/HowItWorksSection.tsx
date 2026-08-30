import { ArrowRight } from "lucide-react";
import { HOW_IT_WORKS } from "../data";
import { StepCard } from "./StepCard";

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-primary">
            Como funciona
          </span>
          <h2 className="text-3xl font-bold">Um fluxo simples para uma gestão completa</h2>
        </div>

        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="flex flex-1 items-center gap-3">
              <div className="flex-1">
                <StepCard index={i + 1} title={step.title} desc={step.desc} />
              </div>
              {i < HOW_IT_WORKS.length - 1 && (
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 lg:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          Do planejamento à performance. Menos retrabalho, mais resultados para sua empresa e sua
          música.
        </p>
      </div>
    </section>
  );
}
