import { Music } from "lucide-react";
import { useContactModalStore } from "../store/contact-modal.store";

const FOOTER_COLUMNS = [
  {
    title: "Plataforma",
    links: [
      { label: "Visão geral", href: "#modulos" },
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Planos", href: "#planos" },
    ],
  },
  {
    title: "Soluções",
    links: [
      { label: "Para quem é", href: "#publico" },
      { label: "Módulos", href: "#modulos" },
    ],
  },
  {
    title: "Empresa",
    links: [{ label: "Contato", href: "#", isContact: true }],
  },
];

export function Footer() {
  const openContactModal = useContactModalStore((s) => s.openModal);

  return (
    <footer className="bg-landing-darker py-14 text-landing-foreground/60">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="font-semibold text-landing-foreground">MUSIC OS 360</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              A plataforma completa para gestão musical que conecta processos, pessoas e resultados
              para artistas, gravadoras e empresas do setor.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-landing-foreground">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"isContact" in l && l.isContact ? (
                      <button type="button" onClick={openContactModal} className="transition-colors hover:text-landing-foreground">
                        {l.label}
                      </button>
                    ) : (
                      <a href={l.href} className="transition-colors hover:text-landing-foreground">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-xs sm:flex-row">
          <span>© {new Date().getFullYear()} MUSIC OS 360. Todos os direitos reservados.</span>
          <span>Transformando a indústria musical com tecnologia e dados para melhores decisões e mais resultados.</span>
        </div>
      </div>
    </footer>
  );
}
