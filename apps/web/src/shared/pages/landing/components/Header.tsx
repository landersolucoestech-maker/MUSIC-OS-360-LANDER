import { useState } from "react";
import { Link } from "react-router-dom";
import { Music, Menu, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { NAV_LINKS } from "../data";
import { useContactModalStore } from "../store/contact-modal.store";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openContactModal = useContactModalStore((s) => s.openModal);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-landing-dark">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6" aria-label="Principal">
        <Link to="/landing" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Music className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-landing-foreground">MUSIC OS 360</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-landing-foreground/70 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-landing-foreground">{l.label}</a>
          ))}
          <button type="button" onClick={openContactModal} className="transition-colors hover:text-landing-foreground">Contato</button>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-landing-foreground hover:bg-white/10 hover:text-landing-foreground">Entrar</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" data-testid="button-cta-nav">Começar grátis</Button>
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-landing-foreground/80 hover:bg-white/10 md:hidden"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-landing-dark px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="text-landing-foreground/70 hover:text-landing-foreground"
              >
                {l.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => { setMobileOpen(false); openContactModal(); }}
              className="text-left text-landing-foreground/70 hover:text-landing-foreground"
            >
              Contato
            </button>
            <div className="mt-2 flex flex-col gap-2">
              <Link to="/login">
                <Button variant="outline" className="w-full border-white/30 bg-transparent text-landing-foreground hover:bg-white/10">Entrar</Button>
              </Link>
              <Link to="/signup">
                <Button className="w-full">Começar grátis</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
