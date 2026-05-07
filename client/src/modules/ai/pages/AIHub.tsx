import React, { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Sparkles, Loader2, Copy, Check, TrendingUp, BarChart2,
  Lightbulb, Users, DollarSign, Target, Brain, RefreshCw,
  Megaphone, FileText, User, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAI } from "@/shared/hooks/useAI";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useTransacoes } from "@/modules/financeiro/hooks/useTransacoes";
import { useCampanhas } from "@/modules/marketing/hooks/useCampanhas";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/format-utils";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleCopy} title="Copiar">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function AIResultCard({ title, content, onRegenerate, isLoading }: {
  title: string; content: string; onRegenerate: () => void; isLoading: boolean;
}) {
  if (!content && !isLoading) return null;
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {content && <CopyButton text={content} />}
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRegenerate} disabled={isLoading} title="Regenerar">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando com IA...
          </div>
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  buildPrompt: (ctx: BusinessContext) => string;
}

interface BusinessContext {
  totalArtistas: number;
  artistasAtivos: number;
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  campanhasAtivas: number;
  topArtistas: string[];
  generos: string[];
}

const QUICK_CARDS: QuickCard[] = [
  {
    id: "insights",
    icon: TrendingUp,
    title: "Insights Operacionais",
    description: "Análise das métricas do negócio com recomendações acionáveis",
    color: "text-primary",
    buildPrompt: (ctx) =>
      `Você é um analista de negócios especializado na indústria fonográfica brasileira. ` +
      `Com base nos dados desta gravadora: ${ctx.totalArtistas} artistas cadastrados (${ctx.artistasAtivos} ativos), ` +
      `faturamento mensal de ${formatCurrency(ctx.totalReceitas)}, custos de ${formatCurrency(ctx.totalDespesas)}, ` +
      `saldo de ${formatCurrency(ctx.saldo)}, ${ctx.campanhasAtivas} campanhas ativas. ` +
      `Gêneros: ${ctx.generos.slice(0, 5).join(", ")}. ` +
      `Gere 5 insights operacionais concisos e acionáveis. Numere cada insight. Seja específico.`,
  },
  {
    id: "summary",
    icon: FileText,
    title: "Resumo Executivo",
    description: "Visão consolidada e inteligente do estado atual do negócio",
    color: "text-success",
    buildPrompt: (ctx) =>
      `Crie um resumo executivo conciso (máximo 200 palavras) para uma gravadora brasileira com estes dados: ` +
      `${ctx.totalArtistas} artistas (${ctx.artistasAtivos} ativos), gêneros principais: ${ctx.generos.slice(0, 3).join(", ")}, ` +
      `receita mensal ${formatCurrency(ctx.totalReceitas)}, despesas ${formatCurrency(ctx.totalDespesas)}, ` +
      `${ctx.campanhasAtivas} campanhas de marketing ativas. ` +
      `Estruture em: Situação Atual, Pontos Fortes, Atenção Necessária. Tom profissional.`,
  },
  {
    id: "strategy",
    icon: Target,
    title: "Sugestões Estratégicas",
    description: "Recomendações de alto impacto para os próximos 30 dias",
    color: "text-warning",
    buildPrompt: (ctx) =>
      `Você é um consultor estratégico de label musical. Com base em: ${ctx.totalArtistas} artistas, ` +
      `${ctx.artistasAtivos} ativos, saldo ${formatCurrency(ctx.saldo)}, ${ctx.campanhasAtivas} campanhas ativas, ` +
      `gêneros: ${ctx.generos.slice(0, 4).join(", ")}. ` +
      `Sugira 5 ações estratégicas prioritárias para os próximos 30 dias. ` +
      `Para cada ação: o que fazer, por que importa, como executar. Numere cada item.`,
  },
  {
    id: "marketing",
    icon: Megaphone,
    title: "Plano de Marketing",
    description: "Diretrizes de marketing baseadas no portfólio atual",
    color: "text-[#E1306C]",
    buildPrompt: (ctx) =>
      `Crie um plano de marketing de 30 dias para uma gravadora com ${ctx.totalArtistas} artistas nos gêneros ` +
      `${ctx.generos.slice(0, 4).join(", ")}, com ${ctx.campanhasAtivas} campanhas ativas e budget mensal estimado de ` +
      `${formatCurrency(Math.abs(ctx.totalDespesas) * 0.2)}. ` +
      `Inclua: canais prioritários, tipo de conteúdo, frequência de publicações e KPIs a monitorar.`,
  },
];

function ContextBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center px-3 py-2 bg-muted/50 rounded-lg">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold font-mono">{value}</span>
    </div>
  );
}

export default function AIHub() {
  const { generate } = useAI();
  const { artistas } = useArtistas();
  const { transacoes } = useTransacoes();
  const { campanhas } = useCampanhas();

  const [activeTab, setActiveTab] = useState("insights");
  const [results, setResults] = useState<Record<string, string>>({});
  const [loadingCards, setLoadingCards] = useState<Record<string, boolean>>({});

  const [selectedArtista, setSelectedArtista] = useState("");
  const [profileResult, setProfileResult] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [customPrompt, setCustomPrompt] = useState("");
  const [customResult, setCustomResult] = useState("");
  const [customLoading, setCustomLoading] = useState(false);

  const now = new Date();
  const monthTx = transacoes.filter(t => {
    const d = new Date(t.data + "T12:00:00");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const ctx: BusinessContext = {
    totalArtistas: artistas.length,
    artistasAtivos: artistas.filter(a => a.status === "contratado").length,
    totalReceitas: monthTx.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0),
    totalDespesas: monthTx.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
    saldo: monthTx.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0) -
           monthTx.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
    campanhasAtivas: campanhas.filter(c => c.status === "ativa").length,
    topArtistas: artistas.slice(0, 5).map(a => a.nome_artistico),
    generos: [...new Set(artistas.map(a => a.genero_musical).filter(Boolean))],
  };

  const handleGenerate = async (card: QuickCard) => {
    setLoadingCards(p => ({ ...p, [card.id]: true }));
    try {
      const result = await generate.mutateAsync({ prompt: card.buildPrompt(ctx), type: "insights" });
      setResults(p => ({ ...p, [card.id]: result.content }));
    } catch {
      // handled by hook
    } finally {
      setLoadingCards(p => ({ ...p, [card.id]: false }));
    }
  };

  const handleProfileAnalysis = async () => {
    const artista = artistas.find(a => a.id === selectedArtista);
    if (!artista) { toast.warning("Selecione um artista"); return; }
    setProfileLoading(true);
    try {
      const prompt =
        `Analise o perfil artístico de "${artista.nome_artistico}" ` +
        `(gênero: ${artista.genero_musical || "não informado"}, tipo: ${artista.tipo || "solo"}, ` +
        `status: ${artista.status || "ativo"}). ` +
        `Crie uma análise estruturada com: ` +
        `1. Posicionamento de Mercado, 2. Pontos Fortes, 3. Áreas de Desenvolvimento, ` +
        `4. Oportunidades no Mercado Brasileiro, 5. Recomendações de Carreira. ` +
        `Seja específico, prático e voltado para a indústria fonográfica brasileira.`;
      const result = await generate.mutateAsync({ prompt, type: "profile" });
      setProfileResult(result.content);
    } catch {
      // handled
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCustom = async () => {
    if (!customPrompt.trim()) { toast.warning("Digite uma pergunta ou pedido."); return; }
    setCustomLoading(true);
    try {
      const result = await generate.mutateAsync({ prompt: customPrompt, type: "insights" });
      setCustomResult(result.content);
    } catch {
      // handled
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <MainLayout
      title="IA Assistente"
      description="Inteligência operacional e sugestões estratégicas para sua gravadora"
      actions={
        <Badge variant="outline" className="text-xs gap-1.5 text-primary border-primary/30">
          <Brain className="h-3 w-3" />
          Replit AI — gpt-5-mini
        </Badge>
      }
    >
      <div className="space-y-5">
        <Card className="border-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Contexto do negócio (este mês)</p>
            <div className="flex flex-wrap gap-2">
              <ContextBadge label="Artistas" value={String(ctx.totalArtistas)} />
              <ContextBadge label="Ativos" value={String(ctx.artistasAtivos)} />
              <ContextBadge label="Receita" value={formatCurrency(ctx.totalReceitas)} />
              <ContextBadge label="Despesas" value={formatCurrency(ctx.totalDespesas)} />
              <ContextBadge label="Saldo" value={formatCurrency(ctx.saldo)} />
              <ContextBadge label="Campanhas" value={String(ctx.campanhasAtivas)} />
              <ContextBadge label="Gêneros" value={ctx.generos.slice(0, 3).join(", ") || "—"} />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="insights" className="gap-1.5 text-xs"><TrendingUp className="h-3.5 w-3.5" />Análises</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" />Perfil Artístico</TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5 text-xs"><Brain className="h-3.5 w-3.5" />Consulta Livre</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {QUICK_CARDS.map(card => (
                <Card key={card.id} className="border-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 shrink-0", card.color)}>
                        <card.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{card.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {results[card.id] ? (
                      <AIResultCard
                        title={card.title}
                        content={results[card.id]}
                        onRegenerate={() => handleGenerate(card)}
                        isLoading={loadingCards[card.id] ?? false}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs"
                        disabled={loadingCards[card.id]}
                        onClick={() => handleGenerate(card)}
                        data-testid={`button-generate-${card.id}`}
                      >
                        {loadingCards[card.id] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        )}
                        {loadingCards[card.id] ? "Gerando..." : "Gerar com IA"}
                        {!loadingCards[card.id] && <ChevronRight className="h-3 w-3 ml-auto" />}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Análise de Perfil Artístico
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione um artista para gerar uma análise estratégica completa com posicionamento, pontos fortes e recomendações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedArtista} onValueChange={setSelectedArtista}>
                    <SelectTrigger className="flex-1 h-9 text-sm bg-card border-border" data-testid="select-artista-profile">
                      <SelectValue placeholder="Selecione um artista..." />
                    </SelectTrigger>
                    <SelectContent>
                      {artistas.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome_artistico}
                          {a.genero_musical && (
                            <span className="text-muted-foreground ml-1 text-xs">— {a.genero_musical}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={!selectedArtista || profileLoading}
                    onClick={handleProfileAnalysis}
                    data-testid="button-generate-profile"
                  >
                    {profileLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {profileLoading ? "Analisando..." : "Analisar"}
                  </Button>
                </div>

                {profileResult && (
                  <AIResultCard
                    title={`Análise: ${artistas.find(a => a.id === selectedArtista)?.nome_artistico ?? ""}`}
                    content={profileResult}
                    onRegenerate={handleProfileAnalysis}
                    isLoading={profileLoading}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Consulta Livre
                </CardTitle>
                <CardDescription className="text-xs">
                  Faça qualquer pergunta sobre o negócio, estratégia musical, contratos, marketing ou operações da gravadora.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    "Como melhorar o engajamento dos artistas no TikTok?",
                    "Quais são as melhores práticas de distribuição digital em 2025?",
                    "Como estruturar um contrato de co-edição?",
                    "Estratégias para lançar um artista novo no mercado sertanejo",
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setCustomPrompt(suggestion)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                      data-testid={`suggestion-${suggestion.slice(0, 20)}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Ex: Como posicionar um artista de funk no mercado paulistano? Que estratégias funcionam para artistas independentes?"
                  rows={4}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  className="text-sm resize-none"
                  data-testid="textarea-custom-prompt"
                />
                <Button
                  className="w-full gap-2"
                  disabled={!customPrompt.trim() || customLoading}
                  onClick={handleCustom}
                  data-testid="button-custom-generate"
                >
                  {customLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {customLoading ? "Consultando IA..." : "Consultar IA"}
                </Button>
                {customResult && (
                  <AIResultCard
                    title="Resposta da IA"
                    content={customResult}
                    onRegenerate={handleCustom}
                    isLoading={customLoading}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
