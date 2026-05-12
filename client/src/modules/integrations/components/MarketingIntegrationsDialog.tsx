/**
 * modules/integrations/components/MarketingIntegrationsDialog.tsx
 *
 * Modal unificado de Integrações de Marketing Digital — contas corporativas.
 *
 * ARQUITECTURA CORRECTA (sem separação por tabs):
 *   Métricas Corporativas  — contas analytics oficiais da empresa
 *   Tráfego Pago           — plataformas de anúncios da empresa
 *   Website & Outros       — formulários públicos, landing pages, API directa
 *
 * Plataformas de ARTISTAS (Instagram, TikTok, Spotify, YouTube, Deezer,
 * Apple Music, SoundCloud) funcionam AUTOMATICAMENTE via links do cadastro
 * do artista. NÃO existem aqui como integração manual.
 *
 * Todas as secções coexistem num único ecrã rolável, sem separação desnecessária.
 */

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/shared/ui/dialog";
import { Button }    from "@/shared/ui/button";
import { Badge }     from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import {
  CheckCircle2, Link2, Loader2, LogOut, Info,
  Globe, Zap, BarChart3, ChevronDown, ChevronUp,
  Copy, ExternalLink, Music2,
} from "lucide-react";
import {
  SiInstagram, SiTiktok, SiYoutube, SiSpotify,
  SiMeta, SiGoogleads, SiApplemusic, SiSoundcloud,
} from "react-icons/si";
import { cn } from "@/shared/lib/utils";
import { useMarketingOAuth } from "@/modules/integrations/hooks/useMarketingOAuth";
import type { MarketingPlatformId } from "@/shared/integrations/contracts/marketing.contract";

// ─── Definição de plataformas ─────────────────────────────────────────────────

interface PlatformDef {
  id: MarketingPlatformId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  scopes: string[];
  description: string;
}

const CORPORATE_METRICS: PlatformDef[] = [
  {
    id: "corp_instagram",
    label: "Instagram Business", sublabel: "Conta oficial da empresa",
    icon: SiInstagram, color: "#E1306C",
    scopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list"],
    description: "Métricas da conta corporativa: alcance, impressões, seguidores, reels, stories e top posts.",
  },
  {
    id: "corp_tiktok",
    label: "TikTok Business", sublabel: "Conta oficial da empresa",
    icon: SiTiktok, color: "#010101",
    scopes: ["user.info.basic", "video.list", "research.adlib.basic"],
    description: "Analytics da conta TikTok corporativa: views, seguidores, engajamento e conteúdos em destaque.",
  },
  {
    id: "corp_youtube",
    label: "YouTube Studio", sublabel: "Canal oficial da empresa",
    icon: SiYoutube, color: "#FF0000",
    scopes: ["youtube.readonly", "yt-analytics.readonly", "yt-analytics-monetary.readonly"],
    description: "Dados do canal corporativo: inscritos, watch time, impressões, CTR e vídeos mais vistos.",
  },
  {
    id: "corp_spotify",
    label: "Spotify for Artists", sublabel: "Perfil oficial da empresa",
    icon: SiSpotify, color: "#1DB954",
    scopes: ["user-read-private", "user-read-email", "streaming"],
    description: "Métricas do perfil corporativo no Spotify: streams, ouvintes mensais e crescimento de seguidores.",
  },
];

const PAID_ADS: PlatformDef[] = [
  {
    id: "meta_ads",
    label: "Meta Ads", sublabel: "Facebook + Instagram Ads",
    icon: SiMeta, color: "#0866FF",
    scopes: ["ads_management", "ads_read", "business_management", "leads_retrieval"],
    description: "Gerencie campanhas no Facebook e Instagram. Alcance, cliques, conversões e ROAS em tempo real.",
  },
  {
    id: "google_ads",
    label: "Google Ads", sublabel: "Search, Display, YouTube",
    icon: SiGoogleads, color: "#34A853",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    description: "Campanhas de pesquisa, display e YouTube Ads. Métricas de impressões, CTR e custo por conversão.",
  },
  {
    id: "tiktok_ads",
    label: "TikTok Ads Manager", sublabel: "TopView, Spark Ads, In-Feed",
    icon: SiTiktok, color: "#010101",
    scopes: ["advertiser_id", "campaign.list", "ad_report.list"],
    description: "Campanhas de vídeo no TikTok. Ideal para lançamentos, challenges e conteúdo viral.",
  },
  {
    id: "spotify_ads",
    label: "Spotify Ad Studio", sublabel: "Áudio e display",
    icon: SiSpotify, color: "#1DB954",
    scopes: ["ads:read", "ads:write", "analytics:read"],
    description: "Anúncios de áudio e display no Spotify. Segmentação por gênero musical, humor e hábitos.",
  },
  {
    id: "youtube_ads",
    label: "YouTube Ads", sublabel: "TrueView, Bumper, Discovery",
    icon: SiYoutube, color: "#FF0000",
    scopes: ["https://www.googleapis.com/auth/adwords", "https://www.googleapis.com/auth/youtube"],
    description: "Anúncios em vídeo no YouTube. Promoção de clipes, playlists e conteúdo do canal.",
  },
  {
    id: "deezer_ads",
    label: "Deezer Ad Manager", sublabel: "Áudio e banner",
    icon: Music2, color: "#A238FF",
    scopes: ["basic_access", "ads_management"],
    description: "Anúncios de áudio e banner no Deezer. Ouvintes segmentados por playlist e gênero.",
  },
  {
    id: "apple_music_ads",
    label: "Apple Music Ads", sublabel: "App Store Search Ads",
    icon: SiApplemusic, color: "#555555",
    scopes: ["ads:read", "ads:write"],
    description: "Anúncios no Apple Music e App Store. Segmentação de fãs no ecossistema Apple.",
  },
  {
    id: "soundcloud_ads",
    label: "SoundCloud Ads", sublabel: "Áudio e display indie",
    icon: SiSoundcloud, color: "#FF5500",
    scopes: ["basic", "ads_management"],
    description: "Anúncios no SoundCloud. Plataforma ideal para atingir audiências indie e underground.",
  },
];

// ─── Card de plataforma ───────────────────────────────────────────────────────

function PlatformCard({
  platform, isConnected, connection, onConnect, onDisconnect,
}: {
  platform: PlatformDef;
  isConnected: boolean;
  connection: ReturnType<ReturnType<typeof useMarketingOAuth>["getConnection"]>;
  onConnect:  (id: MarketingPlatformId, scopes: string[]) => Promise<void>;
  onDisconnect: (id: MarketingPlatformId) => void;
}) {
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = platform.icon;

  async function handleConnect() {
    setLoading(true);
    try {
      await onConnect(platform.id, platform.scopes);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      isConnected
        ? "border-border/60 bg-muted/20"
        : "border-border/40 bg-background hover:border-border/70",
    )}>
      {/* Linha principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${platform.color}18` }}
        >
          <Icon className="h-4 w-4" style={{ color: platform.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground leading-tight">{platform.label}</span>
            {isConnected && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              >
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Conectado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {isConnected && connection?.accountName ? connection.accountName : platform.sublabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
            data-testid={`btn-expand-${platform.id}`}
            aria-label="Detalhes"
          >
            {expanded
              ? <ChevronUp   className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />
            }
          </button>

          {isConnected ? (
            <Button
              size="sm" variant="ghost"
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8"
              onClick={() => onDisconnect(platform.id)}
              data-testid={`btn-disconnect-${platform.id}`}
            >
              <LogOut className="h-3 w-3 mr-1" /> Desconectar
            </Button>
          ) : (
            <Button
              size="sm" variant="outline"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={handleConnect}
              disabled={loading}
              data-testid={`btn-connect-${platform.id}`}
            >
              {loading
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Conectando…</>
                : <><Link2   className="h-3 w-3" /> Conectar</>
              }
            </Button>
          )}
        </div>
      </div>

      {/* Painel expandido */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border/30">
          <p className="text-xs text-muted-foreground mt-3 mb-3 leading-relaxed">
            {platform.description}
          </p>

          {isConnected && connection ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Conta",        value: connection.accountName },
                { label: "ID",           value: connection.accountId   },
                { label: "Conectado em", value: connection.connectedAt ? new Date(connection.connectedAt).toLocaleDateString("pt-BR") : "—" },
                { label: "Expira em",    value: connection.expiresAt   ? new Date(connection.expiresAt).toLocaleDateString("pt-BR")   : "—" },
              ].map(row => (
                <div key={row.label} className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground mb-0.5">{row.label}</p>
                  <p className="font-mono font-medium text-foreground truncate">{row.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Scopes solicitados:</p>
              <div className="flex flex-wrap gap-1">
                {platform.scopes.map(s => (
                  <code
                    key={s}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 font-mono text-muted-foreground"
                  >
                    {s}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Secção Website & Outros ──────────────────────────────────────────────────

function WebsiteSection() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const PUBLIC_FORM_URL = "https://app.musicos360.com.br/captacao/formulario";

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      className="shrink-0 p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
      onClick={() => copy(text, id)}
      data-testid={`btn-copy-${id}`}
    >
      {copiedKey === id
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        : <Copy         className="h-3.5 w-3.5" />
      }
    </button>
  );

  return (
    <div className="rounded-xl border border-border/40 bg-background">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
          <Globe className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Website & Landing Pages</p>
          <p className="text-xs text-muted-foreground">Formulários, embed e API directa</p>
        </div>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Activo</Badge>
      </div>

      <div className="px-4 pb-4 border-t border-border/30 space-y-4 pt-3">

        {/* URL do formulário público */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">URL do formulário público</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] font-mono bg-muted/60 px-2.5 py-1.5 rounded-lg text-muted-foreground truncate">
              {PUBLIC_FORM_URL}
            </code>
            <CopyBtn text={PUBLIC_FORM_URL} id="url" />
            <button
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
              onClick={() => window.open(PUBLIC_FORM_URL, "_blank")}
              data-testid="btn-open-form"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Embed iFrame */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Embed iFrame para landing pages</p>
          <div className="relative">
            <code className="block text-[10px] font-mono bg-muted/60 px-2.5 py-2 rounded-lg text-muted-foreground leading-relaxed pr-8">
              {`<iframe src="${PUBLIC_FORM_URL}" width="100%" height="480" frameborder="0"></iframe>`}
            </code>
            <button
              className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
              onClick={() => copy(
                `<iframe src="${PUBLIC_FORM_URL}" width="100%" height="480" frameborder="0"></iframe>`,
                "iframe"
              )}
              data-testid="btn-copy-iframe"
            >
              {copiedKey === "iframe"
                ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                : <Copy         className="h-3 w-3" />
              }
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">API Key (Webhook & integração directa)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] font-mono bg-muted/60 px-2.5 py-1.5 rounded-lg text-muted-foreground">
              mk_live_••••••••••••••••
            </code>
            <CopyBtn text="mk_live_real_key_here" id="api" />
          </div>
        </div>

        <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-primary/5 border border-primary/15">
          <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Leads captados chegam automaticamente ao módulo{" "}
            <strong className="text-foreground/70">CRM → Leads</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Header de secção ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle, count, total,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle: string;
  count: number; total: number;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-foreground/5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {count}/{total}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Dialog principal ─────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarketingIntegrationsDialog({ open, onOpenChange }: Props) {
  const {
    isConnected, getConnection, connect, disconnect, connectedCountByCategory,
  } = useMarketingOAuth();

  const metricsConnected = connectedCountByCategory("corporate_metrics");
  const adsConnected     = connectedCountByCategory("paid_ads");
  const totalConnected   = metricsConnected + adsConnected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 sticky top-0 bg-background z-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-bold leading-tight">
                Integrações de Marketing Digital
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Contas corporativas da empresa — métricas e tráfego pago num único ecossistema operacional.{" "}
                <span className="text-foreground/70">
                  Plataformas dos artistas são configuradas automaticamente via cadastro de cada artista.
                </span>
              </DialogDescription>
              {totalConnected > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {totalConnected} plataforma{totalConnected !== 1 ? "s" : ""} conectada{totalConnected !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── Corpo — uma única vista rolável ──────────────────────────── */}
        <div className="px-6 py-5 space-y-8">

          {/* ── 1. Métricas Corporativas ──────────────────────────────── */}
          <section>
            <SectionHeader
              icon={BarChart3}
              title="Métricas Corporativas"
              subtitle="Contas analytics oficiais da empresa (label, publisher, distribuidora)"
              count={metricsConnected}
              total={CORPORATE_METRICS.length}
            />
            <div className="space-y-2">
              {CORPORATE_METRICS.map(platform => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  isConnected={isConnected(platform.id)}
                  connection={getConnection(platform.id)}
                  onConnect={connect}
                  onDisconnect={disconnect}
                />
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/30">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground/70">Atenção:</strong> Estas são as contas corporativas da empresa.
                Para métricas de artistas individuais, aceda ao cadastro de cada artista em{" "}
                <strong className="text-foreground/70">Artistas</strong>.
              </p>
            </div>
          </section>

          <Separator className="opacity-40" />

          {/* ── 2. Tráfego Pago ──────────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={Zap}
              title="Tráfego Pago"
              subtitle="Plataformas de anúncios — campanhas, ROAS, conversões e performance"
              count={adsConnected}
              total={PAID_ADS.length}
            />
            <div className="space-y-2">
              {PAID_ADS.map(platform => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  isConnected={isConnected(platform.id)}
                  connection={getConnection(platform.id)}
                  onConnect={connect}
                  onDisconnect={disconnect}
                />
              ))}
            </div>
          </section>

          <Separator className="opacity-40" />

          {/* ── 3. Website & Outros ──────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={Globe}
              title="Website & Outros"
              subtitle="Formulários públicos, landing pages externas, sistemas de conversão e API directa"
              count={1}
              total={1}
            />
            <WebsiteSection />
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}
