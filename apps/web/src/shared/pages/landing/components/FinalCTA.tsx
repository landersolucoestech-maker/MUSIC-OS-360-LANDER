import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

const CHECKS = ["Sem compromisso", "Implementação rápida", "Suporte especializado incluso"];

export function FinalCTA() {
  return (
    <section className="bg-landing-dark py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold leading-snug text-landing-foreground md:text-3xl">
              Pare de perder tempo com planilhas. Mensagens soltas e ferramentas desconectadas.
            </h2>
            <p className="mt-3 max-w-xl text-landing-foreground/70">
              Centralize sua gestão, tome decisões inteligentes e foque onde realmente importa: sua
              música e seus resultados.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-landing-foreground/70">
              {CHECKS.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link to="/signup">
              <Button size="lg" className="w-full gap-2" data-testid="button-cta-bottom">
                Começar gratuitamente <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="mailto:contato@musicos360.com?subject=Solicitar%20link%20de%20cadastro%20de%20artista">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/25 bg-transparent text-landing-foreground hover:bg-white/10 hover:text-landing-foreground"
              >
                Cadastro de artista
              </Button>
            </a>
            <a href="mailto:contato@musicos360.com?subject=Falar%20com%20consultor%20-%20MUSIC%20OS%20360">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/25 bg-transparent text-landing-foreground hover:bg-white/10 hover:text-landing-foreground"
              >
                Falar com consultor
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
