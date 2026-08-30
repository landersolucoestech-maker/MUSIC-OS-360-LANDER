import { AUDIENCE } from "../data";
import { AudienceCard } from "./AudienceCard";

export function AudienceSection() {
  return (
    <section id="publico" className="bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-primary">
            Feito para impulsionar sua música
          </span>
          <h2 className="text-3xl font-bold">Para quem é o MUSIC OS 360</h2>
          <p className="mt-3 text-muted-foreground">
            Soluções completas para quem faz música, gerencia carreiras e transforma ideias em
            grandes conquistas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {AUDIENCE.map((a) => (
            <AudienceCard key={a.title} icon={a.icon} title={a.title} desc={a.desc} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          Mais do que gestão, é a estrutura que a sua carreira e o seu negócio precisam para crescer
          com consistência e velocidade no mercado musical.
        </p>
      </div>
    </section>
  );
}
