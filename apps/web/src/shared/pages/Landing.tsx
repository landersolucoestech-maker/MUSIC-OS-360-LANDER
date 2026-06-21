import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Music,
  Users,
  Library,
  Rocket,
  Share2,
  ListChecks,
  FileText,
  DollarSign,
  Megaphone,
  ShieldCheck,
  Calendar,
  Video,
  Contact,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  FolderKanban,
  FileSignature,
  Send,
  Wallet,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ADMIN_PLANS } from "@/modules/admin/data/admin-source";

// ─── Conteúdo estático (institucional) — não comercial/dinâmico ───────────────
// Módulos reais do produto (alinhados ao painel). Sem métricas/valores falsos.

const MODULES = [
  { icon: Users, title: "Gestão de Artistas", desc: "Cadastre artistas, perfis, contatos, documentos, responsáveis e informações operacionais." },
  { icon: Library, title: "Catálogo Musical", desc: "Organize obras, fonogramas, ISRC, ISWC, splits, compositores, intérpretes, editoras e licenças." },
  { icon: Rocket, title: "Lançamentos", desc: "Planeje lançamentos, acompanhe status, etapas, responsáveis, prazos e entregas." },
  { icon: Share2, title: "Distribuição Musical", desc: "Centralize o processo de distribuição digital através das integrações com distribuidoras parceiras, acompanhando metadados, entregas e status operacionais." },
  { icon: ListChecks, title: "Tarefas Operacionais", desc: "Distribua e conclua tarefas entre setores como produção musical, design, marketing, audiovisual, financeiro e administrativo." },
  { icon: FileText, title: "Contratos e Documentos", desc: "Gerencie contratos, documentos, vencimentos, assinaturas e histórico vinculado a artistas, obras e projetos." },
  { icon: DollarSign, title: "Financeiro Operacional", desc: "Controle entradas, saídas, contas a pagar, contas a receber, categorias, relatórios e movimentações." },
  { icon: Megaphone, title: "Marketing e Mídia", desc: "Organize campanhas, conteúdos, calendário de marketing, briefings, tarefas e ações de divulgação." },
  { icon: ShieldCheck, title: "Direitos Autorais e ECAD", desc: "Controle obras, dados autorais, monitoramento, relatórios, registros e informações de direitos." },
  { icon: Calendar, title: "Agenda", desc: "Organize compromissos como sessões, reuniões, entrevistas, gravações, ensaios, fotos e eventos." },
  { icon: Video, title: "Audiovisual", desc: "Acompanhe produções audiovisuais — clipes, teasers, reels, shorts e visualizers — com tarefas e aprovações." },
  { icon: Contact, title: "CRM", desc: "Acompanhe contatos estratégicos, leads comerciais, interações e relacionamento da operação." },
];

const HOW_IT_WORKS = [
  "Cadastre artistas e projetos",
  "Organize obras e fonogramas",
  "Vincule contratos e documentos",
  "Planeje o lançamento",
  "Distribua tarefas para os setores",
  "Centralize arquivos e entregas",
  "Acompanhe a distribuição musical integrada",
  "Controle financeiro, direitos e histórico",
];

const AUDIENCE = [
  { icon: Music, title: "Gravadoras" },
  { icon: Library, title: "Editoras Musicais" },
  { icon: Video, title: "Produtoras Musicais" },
  { icon: Users, title: "Escritórios Artísticos" },
  { icon: Rocket, title: "Gestão de Carreira" },
  { icon: Megaphone, title: "Agências de Marketing Musical" },
];

// Prévia neutra do produto (sem dados/métricas/gráficos falsos).
const PREVIEW_NAV = [
  { icon: FolderKanban, label: "Artistas" },
  { icon: Library, label: "Catálogo" },
  { icon: Rocket, label: "Lançamentos" },
  { icon: FileSignature, label: "Contratos" },
  { icon: Send, label: "Distribuição" },
  { icon: Wallet, label: "Financeiro" },
];

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Planos vêm da fonte do sistema (ADMIN_PLANS): mock em dev, vazio em produção.
  const plans = ADMIN_PLANS;
  // Destaque derivado de dado real (plano com mais assinantes ativos) — não fixo.
  const highlightedId = useMemo(() => {
    if (!plans.length) return null;
    return [...plans].sort((a, b) => b.active_subscribers - a.active_subscribers)[0]?.id ?? null;
  }, [plans]);

  const navLinks = [
    { href: "#modulos", label: "Módulos" },
    { href: "#como-funciona", label: "Como funciona" },
    { href: "#publico", label: "Público" },
    { href: "#planos", label: "Planos" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6" aria-label="Principal">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Music className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">MUSIC OS 360</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">{l.label}</a>
            ))}
            <a href="mailto:contato@musicos360.com" className="transition-colors hover:text-foreground">Contato</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/signup"><Button size="sm" data-testid="button-cta-nav">Começar grátis</Button></Link>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="border-t border-border bg-background px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">{l.label}</a>
              ))}
              <a href="mailto:contato@musicos360.com" className="text-muted-foreground hover:text-foreground">Contato</a>
              <div className="mt-2 flex flex-col gap-2">
                <Link to="/login"><Button variant="outline" className="w-full">Entrar</Button></Link>
                <Link to="/signup"><Button className="w-full">Começar grátis</Button></Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-2 lg:pb-24 lg:pt-24">
        <div>
          <Badge variant="info" className="mb-5">Plataforma operacional para a indústria musical</Badge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            O sistema operacional para{" "}
            <span className="text-primary">gravadoras, editoras e produtoras musicais</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Centralize artistas, obras, fonogramas, contratos, tarefas, financeiro, marketing,
            distribuição musical e lançamentos em uma única plataforma feita para a operação musical.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" className="w-full gap-2 sm:w-auto" data-testid="button-cta-hero">
                Começar gratuitamente <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Sou artista</Button>
            </Link>
            <a href="#modulos">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Ver demonstração</Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Sem cartão de crédito • Cancele quando quiser</p>
        </div>

        {/* Prévia neutra do sistema — chrome do app, sem dados/gráficos falsos */}
        <div className="relative" aria-hidden="true">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
              <span className="ml-3 text-xs text-muted-foreground">MUSIC OS 360 — Painel</span>
            </div>
            <div className="grid grid-cols-[160px_1fr]">
              <aside className="border-r border-border bg-muted/20 p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                    <Music className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-semibold">MUSIC OS 360</span>
                </div>
                <div className="space-y-1">
                  {PREVIEW_NAV.map((item, i) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${i === 0 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </aside>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-foreground/80" />
                  <div className="h-7 w-20 rounded-md bg-primary/80" />
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
                    <div className="h-2.5 w-16 rounded bg-muted-foreground/30" />
                    <div className="h-2.5 w-20 rounded bg-muted-foreground/30" />
                    <div className="ml-auto h-2.5 w-12 rounded bg-muted-foreground/30" />
                  </div>
                  {[0, 1, 2, 3, 4].map((r) => (
                    <div key={r} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
                      <div className="h-2.5 w-28 rounded bg-muted" />
                      <div className="h-2.5 w-16 rounded bg-muted" />
                      <div className="ml-auto h-5 w-14 rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Módulos ── */}
      <section id="modulos" className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Tudo que sua operação musical precisa</h2>
            <p className="mt-3 text-muted-foreground">
              Módulos integrados que conectam artistas, catálogo, contratos, tarefas, financeiro,
              marketing, distribuição musical e lançamentos.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                data-testid={`card-module-${m.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{m.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Como o MUSIC OS 360 organiza sua operação</h2>
            <p className="mt-3 text-muted-foreground">
              Um fluxo conectado para transformar projetos musicais em lançamentos organizados.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold tabular-nums text-primary">
                  {i + 1}
                </div>
                <p className="text-sm font-medium leading-relaxed text-foreground">{step}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
            A distribuição digital acontece através das integrações com distribuidoras parceiras conectadas.
          </p>
        </div>
      </section>

      {/* ── Público-alvo ── */}
      <section id="publico" className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Feito para quem vive a operação musical</h2>
            <p className="mt-3 text-muted-foreground">
              Empresas que operam artistas, catálogo, contratos, lançamentos e marketing no dia a dia.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <a.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos (dinâmicos) ── */}
      <section id="planos" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Planos que acompanham o momento da sua operação</h2>
            <p className="mt-3 text-muted-foreground">Escolha o plano ideal de acordo com a estrutura da sua empresa.</p>
          </div>

          {plans.length === 0 ? (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              Nenhum plano disponível no momento.
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const highlighted = plan.id === highlightedId;
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col rounded-2xl border p-8 ${highlighted ? "border-primary ring-1 ring-primary/20" : "border-border"}`}
                    data-testid={`card-plan-${plan.tier}`}
                  >
                    {highlighted && <Badge className="mb-4 self-start">Mais escolhido</Badge>}
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <div className="mb-6 mt-3">
                      <span className="text-3xl font-bold tabular-nums">{brl(plan.price_monthly)}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    <ul className="mb-8 flex-1 space-y-3">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link to="/signup">
                      <Button variant={highlighted ? "default" : "outline"} className="w-full" data-testid={`button-plan-${plan.tier}`}>
                        Começar gratuitamente
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Seção neutra (sem métricas falsas) ── */}
      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-lg text-muted-foreground">
            Criado para empresas musicais que precisam abandonar planilhas, mensagens soltas,
            pastas desconectadas e processos manuais.
          </p>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold">
            Pare de perder tempo com planilhas, mensagens soltas e ferramentas desconectadas.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl opacity-90">
            Centralize sua operação musical em uma plataforma feita para organizar artistas, catálogo,
            contratos, tarefas, financeiro, marketing, distribuição musical e lançamentos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto" data-testid="button-cta-bottom">
                Começar gratuitamente <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button size="lg" variant="outline" className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto">
                Cadastro de artista
              </Button>
            </Link>
            <a href="mailto:contato@musicos360.com?subject=Solicitar%20demonstração%20-%20MUSIC%20OS%20360">
              <Button size="lg" variant="outline" className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto">
                Solicitar demonstração
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="font-medium text-foreground">MUSIC OS 360</span>
            <span>© {new Date().getFullYear()} — Todos os direitos reservados</span>
          </div>
          <div className="flex gap-6">
            <a href="#modulos" className="transition-colors hover:text-foreground">Módulos</a>
            <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
            <a href="mailto:contato@musicos360.com" className="transition-colors hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
