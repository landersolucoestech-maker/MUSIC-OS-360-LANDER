import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DashboardMockup } from "./DashboardMockup";

export function Hero() {
  return (
    <section className="bg-landing-dark">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-2 lg:pb-24 lg:pt-24">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Plataforma completa para gestão musical
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-landing-foreground md:text-5xl">
            O sistema operacional para{" "}
            <span className="text-landing-accent">empresas musicais.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-landing-foreground/70">
            Centralize suas operações, organize seus dados e tome decisões inteligentes para
            impulsionar sua carreira e alcançar mais resultados em cada etapa da jornada musical.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="w-full gap-2 sm:w-auto" data-testid="button-cta-hero">
                Começar gratuitamente <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="mailto:contato@musicos360.com?subject=Solicitar%20link%20de%20cadastro%20de%20artista">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/25 bg-transparent text-landing-foreground hover:bg-white/10 hover:text-landing-foreground sm:w-auto"
              >
                Sou artista
              </Button>
            </a>
            <a href="#modulos">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/25 bg-transparent text-landing-foreground hover:bg-white/10 hover:text-landing-foreground sm:w-auto"
              >
                Ver recursos
              </Button>
            </a>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-landing-foreground/60">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            Ideal para artistas, gravadoras, managers e produtoras musicais.
          </p>
        </div>

        <DashboardMockup />
      </div>
    </section>
  );
}
