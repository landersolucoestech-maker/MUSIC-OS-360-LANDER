import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Music, BarChart3, FileText, Users, Globe, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

const FEATURES = [
  {
    icon: Music,
    title: "Catálogo Musical",
    desc: "Gestão completa de obras, fonogramas, shares e licenças. ISRC/ISWC automáticos.",
  },
  {
    icon: BarChart3,
    title: "Financeiro Operacional",
    desc: "Controle completo de entradas, saídas, OFX, categorização e P&L por artista e projeto.",
  },
  {
    icon: FileText,
    title: "Contratos",
    desc: "Templates inteligentes, assinatura digital integrada, alertas de vencimento.",
  },
  {
    icon: Users,
    title: "CRM 360°",
    desc: "Artistas, clientes, contatos e leads num único lugar. Funil visual com Kanban.",
  },
  {
    icon: Globe,
    title: "Marketing & Mídia",
    desc: "Campanhas, briefings, conteúdos e tarefas. Métricas de Spotify, YouTube e Meta.",
  },
  {
    icon: Shield,
    title: "Proteção & ECAD",
    desc: "Monitoramento de uso, takedowns automatizados, relatórios ECAD e ABRAMUS.",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "R$ 297",
    period: "/mês",
    desc: "Para gravadoras e editoras em crescimento.",
    features: ["Até 50 artistas", "Catálogo ilimitado", "Contabilidade integrada", "CRM básico", "Suporte por e-mail"],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 697",
    period: "/mês",
    desc: "Para labels consolidadas e distribuidoras.",
    features: [
      "Artistas ilimitados",
      "Todos os módulos",
      "Integrações (ECAD, ABRAMUS, Meta)",
      "Relatórios avançados",
      "Suporte prioritário",
      "Auditoria completa",
    ],
    cta: "Falar com vendas",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    desc: "Para grandes publishers e distribuidoras globais.",
    features: [
      "Multi-tenant personalizado",
      "SSO / SAML",
      "SLA dedicado",
      "Onboarding assistido",
      "API privada",
    ],
    cta: "Agendar demo",
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Music className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">MUSIC OS 360</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" data-testid="button-cta-nav">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <Badge variant="secondary" className="mb-6">Plataforma 360° para a indústria musical</Badge>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Gerencie toda a sua<br />
          <span className="text-primary">operação musical</span><br />
          em um só lugar
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          MUSIC OS 360 centraliza catálogo, financeiro, contratos, CRM e marketing
          para gravadoras, editoras e distribuidoras que querem operar com escala.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="gap-2" data-testid="button-cta-hero">
              Começar gratuitamente <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">Ver demonstração</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">Sem cartão de crédito • 14 dias grátis • Cancele quando quiser</p>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/40 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Tudo que sua label precisa</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Módulos integrados que conversam entre si — do cadastro do artista à gestão financeira completa.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-background rounded-xl border p-6 hover:shadow-md transition-shadow"
                data-testid={`card-feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Planos e preços</h2>
            <p className="text-muted-foreground">Escolha o plano ideal para o tamanho da sua operação.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 flex flex-col ${plan.highlighted ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}
                data-testid={`card-pricing-${plan.name.toLowerCase()}`}
              >
                {plan.highlighted && (
                  <Badge className="self-start mb-4">Mais popular</Badge>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para escalar sua operação?</h2>
          <p className="opacity-90 mb-8">
            Junte-se a labels e distribuidoras que já centralizaram sua gestão no MUSIC OS 360.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-bottom">
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            <span className="font-medium text-foreground">MUSIC OS 360</span>
            <span>— Todos os direitos reservados</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
