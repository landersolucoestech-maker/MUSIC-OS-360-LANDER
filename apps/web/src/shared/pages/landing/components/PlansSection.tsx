import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { publicPlansService } from "@/shared/pages/landing/services/public-plans.service";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function PlansSection() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => publicPlansService.list(),
    staleTime: 5 * 60_000,
  });

  return (
    <section id="planos" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-primary">
            Planos
          </span>
          <h2 className="text-3xl font-bold">Planos que acompanham o momento da sua operação</h2>
          <p className="mt-3 text-muted-foreground">
            Escolha o plano ideal de acordo com a estrutura da sua empresa.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Nenhum plano disponível no momento.
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className="flex flex-col rounded-2xl border border-border p-8 shadow-sm"
                data-testid={`card-plan-${plan.slug}`}
              >
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mb-6 mt-3">
                  <span className="text-3xl font-bold tabular-nums">{brl(plan.amount)}</span>
                  <span className="text-sm text-muted-foreground">
                    /{plan.interval === "year" ? "ano" : "mês"}
                  </span>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {String(feat)}
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button variant="outline" className="w-full" data-testid={`button-plan-${plan.slug}`}>
                    Começar gratuitamente
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
