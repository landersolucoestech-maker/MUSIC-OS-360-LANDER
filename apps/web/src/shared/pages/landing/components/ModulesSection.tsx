import { MODULES } from "../data";
import { ModuleCard } from "./ModuleCard";
import { TrustBar } from "./TrustBar";

export function ModulesSection() {
  return (
    <section id="modulos" className="bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-primary">
            Vantagens inteligentes
          </span>
          <h2 className="text-3xl font-bold">Tudo que sua empresa musical precisa</h2>
          <p className="mt-3 text-muted-foreground">
            Módulos integrados que simplificam rotinas, conectam pessoas, controles e resultados em
            um só lugar. Mais controle, organização e resultados.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <ModuleCard key={m.title} icon={m.icon} title={m.title} desc={m.desc} />
          ))}
        </div>

        <TrustBar />
      </div>
    </section>
  );
}
