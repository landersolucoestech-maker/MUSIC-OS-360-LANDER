/**
 * modules/integrations/components/MarketingIntegrationsDialog.tsx
 *
 * Modal unificado de Integrações de Marketing Digital.
 * Centraliza TODAS as integrações de marketing num único diálogo organizado
 * em 3 categorias:
 *
 *   📣  Tráfego Pago    → Meta Ads · Google Ads · TikTok Ads
 *   🎯  Captação Leads  → LinkedIn · Facebook Lead Ads · Website
 *   📊  Métricas        → YouTube Analytics · Instagram Insights · TikTok Analytics
 *
 * Cada plataforma OAuth tem fluxo de login real (mock): o utilizador/empresa
 * autentica a sua própria conta via OAuth 2.0 — nenhuma senha é armazenada.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import {
  CheckCircle2,
  Unplug,
  Plug,
  RefreshCw,
  ShieldCheck,
  Lock,
  Loader2,
  Globe,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Target,
  BarChart3,
} from "lucide-react";
import {
  SiFacebook,
  SiGoogleads,
  SiTiktok,
  SiLinkedin,
  SiYoutube,
  SiInstagram,
} from "react-icons/si";
import { toast } from "sonner";
import {
  useMarketingOAuth,
  type MarketingPlatformId,
} from "../hooks/useMarketingOAuth";
import type { MarketingCategory } from "@/shared/integrations/contracts/marketing.contract";

// ─── Configurações de cada plataforma ────────────────────────────────────────

interface PlatformConfig {
  id:           MarketingPlatformId;
  label:        string;
  category:     MarketingCategory;
  description:  string;
  color:        string;
  bgColor:      string;
  borderColor:  string;
  textColor:    string;
  Icon:         React.ComponentType<{ className?: string }>;
  scopes:       { key: string; label: string }[];
  webhookSupport?: boolean;
}

const PLATFORM_CONFIGS: Record<MarketingPlatformId, PlatformConfig> = {
  // ── Tráfego Pago ──────────────────────────────────────────────────────────
  meta_ads: {
    id:          "meta_ads",
    label:       "Meta Ads",
    category:    "paid_traffic",
    description: "Conecte o Meta Business Suite para gerir campanhas do Facebook e Instagram Ads, sincronizar métricas de performance e automatizar relatórios de mídia paga.",
    color:       "#1877F2",
    bgColor:     "bg-[#1877F2]/10",
    borderColor: "border-[#1877F2]/30",
    textColor:   "text-[#1877F2]",
    Icon:        SiFacebook,
    scopes: [
      { key: "ads_management",      label: "Gerir campanhas e conjuntos de anúncios" },
      { key: "ads_read",            label: "Ler métricas e performance de campanhas" },
      { key: "read_insights",       label: "Insights, relatórios e funil de conversão" },
      { key: "business_management", label: "Gerir conta Business e ativos" },
      { key: "pages_manage_ads",    label: "Anúncios em Páginas do Facebook" },
    ],
  },
  google_ads: {
    id:          "google_ads",
    label:       "Google Ads",
    category:    "paid_traffic",
    description: "Autentique a conta Google Ads para sincronizar campanhas Search, Display e YouTube, importar relatórios de conversão e gerir orçamentos directamente na plataforma.",
    color:       "#4285F4",
    bgColor:     "bg-[#4285F4]/10",
    borderColor: "border-[#4285F4]/30",
    textColor:   "text-[#4285F4]",
    Icon:        SiGoogleads,
    scopes: [
      { key: "adwords",             label: "Gerir campanhas do Google Ads" },
      { key: "analytics.readonly",  label: "Leitura de métricas Google Analytics" },
      { key: "display_video360",    label: "Campanhas Display & YouTube" },
      { key: "userinfo.email",      label: "Identificação da conta Google" },
      { key: "userinfo.profile",    label: "Dados de perfil da conta" },
    ],
  },
  tiktok_ads: {
    id:          "tiktok_ads",
    label:       "TikTok Ads",
    category:    "paid_traffic",
    description: "Faça login no TikTok Ads Manager para gerir campanhas, importar relatórios de desempenho, sincronizar dados de audiência e automatizar métricas de mídia paga.",
    color:       "#010101",
    bgColor:     "bg-neutral-950/10",
    borderColor: "border-neutral-800/40",
    textColor:   "text-neutral-900 dark:text-neutral-100",
    Icon:        SiTiktok,
    scopes: [
      { key: "campaign.read",       label: "Ler campanhas activas e pausadas" },
      { key: "campaign.update",     label: "Actualizar configurações de campanha" },
      { key: "ad.read",             label: "Ler anúncios e conjuntos de anúncios" },
      { key: "report.read",         label: "Relatórios de desempenho e funil" },
      { key: "advertiser.read",     label: "Dados da conta de anunciante" },
    ],
  },
  // ── Captação de Leads ─────────────────────────────────────────────────────
  linkedin: {
    id:          "linkedin",
    label:       "LinkedIn Ads",
    category:    "lead_capture",
    description: "Conecte o LinkedIn Campaign Manager para importar leads de Lead Gen Forms, sincronizar formulários de captação B2B e integrar leads directamente ao CRM.",
    color:       "#0A66C2",
    bgColor:     "bg-[#0A66C2]/10",
    borderColor: "border-[#0A66C2]/30",
    textColor:   "text-[#0A66C2]",
    Icon:        SiLinkedin,
    scopes: [
      { key: "r_leads",                  label: "Recuperar leads gerados por formulários" },
      { key: "r_ads",                    label: "Ler campanhas e anúncios activos" },
      { key: "r_organization_social",    label: "Dados sociais e seguidores da empresa" },
      { key: "rw_ads",                   label: "Gerir e actualizar anúncios" },
    ],
    webhookSupport: true,
  },
  facebook_leads: {
    id:          "facebook_leads",
    label:       "Facebook Lead Ads",
    category:    "lead_capture",
    description: "Conecte o Meta Business Suite para captar leads de formulários nativos do Facebook e Instagram, importando automaticamente para o CRM via webhooks de Lead Ads.",
    color:       "#1877F2",
    bgColor:     "bg-[#1877F2]/10",
    borderColor: "border-[#1877F2]/30",
    textColor:   "text-[#1877F2]",
    Icon:        SiFacebook,
    scopes: [
      { key: "leads_retrieval",          label: "Recuperar leads de formulários nativos" },
      { key: "ads_read",                 label: "Ler dados de campanhas de Lead Ads" },
      { key: "pages_read_engagement",    label: "Ver engajamento e formulários de página" },
      { key: "business_management",      label: "Gerir conta Business e permissões" },
    ],
    webhookSupport: true,
  },
  // ── Métricas & Analytics ──────────────────────────────────────────────────
  youtube_analytics: {
    id:          "youtube_analytics",
    label:       "YouTube Analytics",
    category:    "metrics",
    description: "Conecte o YouTube Studio para importar métricas de visualizações, tempo de exibição, crescimento de subscritores e performance de videoclipes directamente na plataforma.",
    color:       "#FF0000",
    bgColor:     "bg-[#FF0000]/10",
    borderColor: "border-[#FF0000]/30",
    textColor:   "text-[#FF0000]",
    Icon:        SiYoutube,
    scopes: [
      { key: "youtube.readonly",         label: "Acesso de leitura ao canal YouTube" },
      { key: "yt-analytics.readonly",    label: "Dados analíticos do canal" },
      { key: "yt-analytics-monetary.readonly", label: "Métricas de receita e monetização" },
      { key: "userinfo.email",           label: "Identificação da conta Google" },
    ],
  },
  instagram_insights: {
    id:          "instagram_insights",
    label:       "Instagram Insights",
    category:    "metrics",
    description: "Conecte o Instagram Business para importar métricas de alcance, engajamento, crescimento de seguidores, performance de Reels e Stories directamente na plataforma.",
    color:       "#833AB4",
    bgColor:     "bg-[#833AB4]/10",
    borderColor: "border-[#833AB4]/30",
    textColor:   "text-[#833AB4]",
    Icon:        SiInstagram,
    scopes: [
      { key: "instagram_basic",              label: "Acesso básico à conta Business" },
      { key: "instagram_manage_insights",    label: "Métricas de alcance e engajamento" },
      { key: "pages_read_engagement",        label: "Dados de engajamento de página" },
      { key: "instagram_content_publish",    label: "Leitura de conteúdo publicado" },
    ],
  },
  tiktok_analytics: {
    id:          "tiktok_analytics",
    label:       "TikTok Analytics",
    category:    "metrics",
    description: "Conecte o TikTok Creator para importar métricas de visualizações, seguidores, engajamento e performance de vídeos orgânicos directamente na plataforma de análise.",
    color:       "#010101",
    bgColor:     "bg-neutral-950/10",
    borderColor: "border-neutral-800/40",
    textColor:   "text-neutral-900 dark:text-neutral-100",
    Icon:        SiTiktok,
    scopes: [
      { key: "user.info.basic",     label: "Dados básicos da conta criador" },
      { key: "video.list",          label: "Lista de vídeos publicados" },
      { key: "research.adlib.basic","label": "Métricas de pesquisa e tendências" },
    ],
  },
};

const PAID_TRAFFIC_PLATFORMS: MarketingPlatformId[] = ["meta_ads", "google_ads", "tiktok_ads"];
const LEAD_CAPTURE_PLATFORMS: MarketingPlatformId[] = ["linkedin", "facebook_leads"];
const METRICS_PLATFORMS: MarketingPlatformId[]      = ["youtube_analytics", "instagram_insights", "tiktok_analytics"];

const EDGE_FUNCTION_BASE = "https://configure-seu-backend.example.com/functions/v1/lead-capture";

// ─── Sub-componentes ──────────────────────────────────────────────────────────

type OAuthState = "idle" | "authorizing" | "success";

interface MarketingOAuthDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  platform:     MarketingPlatformId;
  onSuccess:    (platform: MarketingPlatformId, scopes: string[]) => Promise<void>;
}

function MarketingOAuthDialog({
  open,
  onOpenChange,
  platform,
  onSuccess,
}: MarketingOAuthDialogProps) {
  const [state, setState] = useState<OAuthState>("idle");
  const cfg = PLATFORM_CONFIGS[platform];
  const { Icon } = cfg;

  const handleAuthorize = async () => {
    setState("authorizing");
    const scopes = cfg.scopes.map((s) => s.key);
    await onSuccess(platform, scopes);
    setState("success");
    setTimeout(() => {
      onOpenChange(false);
      setState("idle");
    }, 1500);
  };

  const handleClose = (val: boolean) => {
    if (state === "authorizing") return;
    if (!val) setState("idle");
    onOpenChange(val);
  };

  const successMessages: Record<MarketingCategory, string> = {
    paid_traffic:  "As campanhas desta plataforma já podem ser geridas e sincronizadas no MUSIC OS 360.",
    lead_capture:  "Os leads desta plataforma serão importados automaticamente para o CRM.",
    metrics:       "As métricas desta plataforma serão actualizadas automaticamente na plataforma.",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md"
        data-testid={`dialog-marketing-oauth-${platform}`}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bgColor} ${cfg.borderColor} border`}
            >
              <Icon className={`h-5 w-5 ${cfg.textColor}`} />
            </div>
            <div>
              <DialogTitle className="text-base leading-tight">
                Conectar {cfg.label}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Autorização OAuth 2.0 segura
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {state === "success" ? (
          <div
            className="flex flex-col items-center gap-3 py-6"
            data-testid={`state-success-${platform}`}
          >
            <CheckCircle2 className="h-12 w-12 text-success" />
            <p className="text-sm font-semibold text-success">
              Conta conectada com sucesso!
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {successMessages[cfg.category]}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cfg.description}
            </p>

            <div
              className={`rounded-lg border p-4 ${cfg.bgColor} ${cfg.borderColor} space-y-3`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className={`h-4 w-4 ${cfg.textColor}`} />
                <span className="text-xs font-semibold">
                  Permissões solicitadas
                </span>
              </div>
              <ul className="space-y-1.5">
                {cfg.scopes.map((scope) => (
                  <li
                    key={scope.key}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                    data-testid={`scope-${scope.key}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    {scope.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>
                Autenticação gerida pela {cfg.label} — MUSIC OS 360 nunca
                armazena a sua senha.
              </span>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
                disabled={state === "authorizing"}
                data-testid={`button-marketing-cancel-${platform}`}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                style={{ backgroundColor: cfg.color, borderColor: cfg.color }}
                onClick={handleAuthorize}
                disabled={state === "authorizing"}
                data-testid={`button-marketing-authorize-${platform}`}
              >
                {state === "authorizing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Autorizando...
                  </>
                ) : (
                  <>
                    <Icon className="h-4 w-4" />
                    Autorizar acesso
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <ShieldCheck className="h-3 w-3" />
                OAuth 2.0
              </Badge>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Lock className="h-3 w-3" />
                Token criptografado
              </Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface OAuthCardProps {
  platform:     MarketingPlatformId;
  isConnected:  boolean;
  accountName?: string;
  accountId?:   string;
  connectedAt?: string;
  onConnect:    () => void;
  onDisconnect: () => void;
}

function OAuthCard({
  platform,
  isConnected,
  accountName,
  accountId,
  connectedAt,
  onConnect,
  onDisconnect,
}: OAuthCardProps) {
  const cfg = PLATFORM_CONFIGS[platform];
  const { Icon } = cfg;

  if (isConnected) {
    return (
      <div
        className={`rounded-lg border p-4 ${cfg.bgColor} ${cfg.borderColor} space-y-3`}
        data-testid={`card-marketing-connected-${platform}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-success">
              Conta conectada
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            Ativo
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${cfg.textColor}`} />
            <span className="text-sm font-medium">{accountName}</span>
          </div>
          {accountId && (
            <p className="text-[11px] text-muted-foreground font-mono ml-5">
              ID: {accountId}
            </p>
          )}
          {connectedAt && (
            <p className="text-[11px] text-muted-foreground ml-5">
              Conectado em:{" "}
              {new Date(connectedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={onConnect}
            data-testid={`button-marketing-reconnect-${platform}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reconectar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDisconnect}
            data-testid={`button-marketing-disconnect-${platform}`}
          >
            <Unplug className="h-3.5 w-3.5" />
            Desconectar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-dashed border-muted-foreground/30 p-4 space-y-3 bg-muted/20"
      data-testid={`card-marketing-disconnected-${platform}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bgColor} ${cfg.borderColor} border`}
          >
            <Icon className={`h-3.5 w-3.5 ${cfg.textColor}`} />
          </div>
          <div>
            <p className="text-sm font-medium">{cfg.label}</p>
            <p className="text-[11px] text-muted-foreground">Não conectado</p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2 text-xs"
          style={{ backgroundColor: cfg.color }}
          onClick={onConnect}
          data-testid={`button-marketing-connect-${platform}`}
        >
          <Plug className="h-3.5 w-3.5" />
          Conectar via OAuth
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{cfg.description}</p>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={value}
          className="font-mono text-xs"
          data-testid={`input-copyfield-${label.toLowerCase().replace(/\s/g, "-")}`}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function WebhookAccordion({
  platform,
}: {
  platform: MarketingPlatformId;
}) {
  const [expanded, setExpanded] = useState(false);
  const url = `${EDGE_FUNCTION_BASE}?source=${platform}`;

  const steps: Record<string, string[]> = {
    linkedin: [
      "Acesse o LinkedIn Campaign Manager e selecione sua conta.",
      'Vá em Recursos da Conta > Integrações de Geração de Leads.',
      'Clique em "Adicionar integração" e selecione "Webhook genérico".',
      "Cole a Webhook URL e adicione o header de autenticação x-api-key.",
      "Associe formulários de Lead Gen Forms à integração criada.",
      "Publique e teste com o formulário de preview do Campaign Manager.",
    ],
    facebook_leads: [
      "Acesse o Meta Business Suite e selecione sua Página.",
      'Vá em Configurações > Integrações > Leads > Webhook de Leads.',
      'Clique em "Inscrever-se" e cole a Webhook URL abaixo.',
      "Configure o Verification Token igual ao seu x-api-key.",
      "Selecione os campos de lead a sincronizar (nome, email, telefone).",
      "Publique e teste com o formulário de preview do Ads Manager.",
    ],
  };

  const stepsForPlatform = steps[platform] ?? [];

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`button-toggle-webhook-${platform}`}
      >
        <span>Configuração alternativa via Webhook</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-xs text-muted-foreground">
            Se preferir não usar OAuth, configure manualmente um webhook no painel da plataforma para enviar leads ao endpoint abaixo.
          </p>
          <CopyField label="Webhook URL" value={url} />
          {stepsForPlatform.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold">Passos de configuração</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {stepsForPlatform.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className="h-5 w-5 flex-shrink-0 flex items-center justify-center text-[10px] rounded-full p-0"
                    >
                      {i + 1}
                    </Badge>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dialog principal ─────────────────────────────────────────────────────────

export type MarketingDialogTab = "paid_traffic" | "lead_capture" | "metrics";

interface MarketingIntegrationsDialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  initialTab?:   MarketingDialogTab;
}

export function MarketingIntegrationsDialog({
  open,
  onOpenChange,
  initialTab = "paid_traffic",
}: MarketingIntegrationsDialogProps) {
  const { connect, disconnect, getConnection, isConnected, connectedCountByCategory } =
    useMarketingOAuth();
  const [oauthDialog, setOauthDialog] = useState<MarketingPlatformId | null>(null);

  const publicFormUrl     = `${window.location.origin}/captar`;
  const embeddableSnippet = `<iframe src="${publicFormUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

  const handleConnectSuccess = async (
    platform: MarketingPlatformId,
    scopes: string[]
  ) => {
    await connect(platform, scopes);
    toast.success(
      `${PLATFORM_CONFIGS[platform].label} conectado com sucesso!`
    );
  };

  const handleDisconnect = (platform: MarketingPlatformId) => {
    disconnect(platform);
    toast.info(`${PLATFORM_CONFIGS[platform].label} desconectado.`);
  };

  const connectedPaid  = connectedCountByCategory("paid_traffic");
  const connectedLeads = connectedCountByCategory("lead_capture");
  const connectedMet   = connectedCountByCategory("metrics");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-marketing-integrations"
        >
          <DialogHeader>
            <DialogTitle
              className="text-lg"
              data-testid="text-marketing-integrations-title"
            >
              Integrações de Marketing Digital
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conecte as plataformas de tráfego pago, captação de leads e métricas à sua conta. Cada empresa autentica a sua própria conta via OAuth 2.0 — nenhuma senha é armazenada.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList
              className="grid w-full grid-cols-3"
              data-testid="tabs-marketing-integrations"
            >
              <TabsTrigger
                value="paid_traffic"
                className="gap-1.5 text-xs relative"
                data-testid="tab-paid-traffic"
              >
                <Megaphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tráfego Pago</span>
                {connectedPaid > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 min-w-4 flex items-center justify-center text-[9px] px-1 bg-success/20 text-success border-success/30"
                  >
                    {connectedPaid}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="lead_capture"
                className="gap-1.5 text-xs relative"
                data-testid="tab-lead-capture"
              >
                <Target className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Captação de Leads</span>
                {connectedLeads > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 min-w-4 flex items-center justify-center text-[9px] px-1 bg-success/20 text-success border-success/30"
                  >
                    {connectedLeads}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="metrics"
                className="gap-1.5 text-xs relative"
                data-testid="tab-metrics"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Métricas</span>
                {connectedMet > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 min-w-4 flex items-center justify-center text-[9px] px-1 bg-success/20 text-success border-success/30"
                  >
                    {connectedMet}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Tráfego Pago ─────────────────────────────────────────────── */}
            <TabsContent
              value="paid_traffic"
              className="space-y-3 mt-4"
              data-testid="content-paid-traffic"
            >
              <p className="text-xs text-muted-foreground">
                Autentique com a sua conta em cada plataforma de anúncios para sincronizar campanhas, métricas de performance, orçamentos e relatórios de conversão.
              </p>

              <div className="space-y-3">
                {PAID_TRAFFIC_PLATFORMS.map((p) => {
                  const conn = getConnection(p);
                  return (
                    <div key={p} className="space-y-2">
                      <OAuthCard
                        platform={p}
                        isConnected={isConnected(p)}
                        accountName={conn?.accountName}
                        accountId={conn?.accountId}
                        connectedAt={conn?.connectedAt}
                        onConnect={() => setOauthDialog(p)}
                        onDisconnect={() => handleDisconnect(p)}
                      />
                      {isConnected(p) && (
                        <Card className="border-success/20 bg-success/5">
                          <CardContent className="p-3">
                            <p className="text-xs text-success">
                              <strong>Sincronização ativa.</strong> Campanhas e métricas desta plataforma são importadas automaticamente via API OAuth — sem necessidade de tokens manuais.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── Captação de Leads ────────────────────────────────────────── */}
            <TabsContent
              value="lead_capture"
              className="space-y-3 mt-4"
              data-testid="content-lead-capture"
            >
              <p className="text-xs text-muted-foreground">
                Conecte as plataformas de captação para importar leads directamente para o CRM. Suporta OAuth (recomendado) ou configuração manual via webhook.
              </p>

              <div className="space-y-3">
                {LEAD_CAPTURE_PLATFORMS.map((p) => {
                  const conn = getConnection(p);
                  const cfg  = PLATFORM_CONFIGS[p];
                  return (
                    <div key={p} className="space-y-2">
                      <OAuthCard
                        platform={p}
                        isConnected={isConnected(p)}
                        accountName={conn?.accountName}
                        accountId={conn?.accountId}
                        connectedAt={conn?.connectedAt}
                        onConnect={() => setOauthDialog(p)}
                        onDisconnect={() => handleDisconnect(p)}
                      />
                      {isConnected(p) && (
                        <Card className="border-success/20 bg-success/5">
                          <CardContent className="p-3">
                            <p className="text-xs text-success">
                              <strong>Sincronização ativa.</strong> Os leads desta plataforma são importados automaticamente via API OAuth — nenhuma configuração de webhook necessária.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {cfg.webhookSupport && (
                        <>
                          <Separator />
                          <WebhookAccordion platform={p} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Website / API directa */}
              <div className="space-y-3" data-testid="section-website">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted border border-muted-foreground/20">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Site & API Directa</p>
                    <p className="text-[11px] text-muted-foreground">
                      Formulário público, embed e endpoint directo
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pl-1">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold">Formulário Público</h4>
                    <p className="text-xs text-muted-foreground">
                      Formulário pronto para captar leads directamente pelo seu site ou landing page.
                    </p>
                    <CopyField label="URL do Formulário" value={publicFormUrl} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(publicFormUrl, "_blank")}
                      data-testid="button-open-public-form"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir Formulário
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold">Código Embed (iframe)</h4>
                    <p className="text-xs text-muted-foreground">
                      Cole este código HTML no seu site para incorporar o formulário de captação.
                    </p>
                    <CopyField label="Snippet HTML" value={embeddableSnippet} />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold">API Directa</h4>
                    <p className="text-xs text-muted-foreground">
                      Envie leads directamente via POST para o endpoint abaixo.
                    </p>
                    <CopyField
                      label="Webhook URL (Website)"
                      value={`${EDGE_FUNCTION_BASE}?source=website`}
                    />
                    <pre className="bg-muted p-3 rounded-md text-[11px] overflow-x-auto">
                      {`curl -X POST "${EDGE_FUNCTION_BASE}?source=website" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_API" \\
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "+5511999999999",
    "servico": "show_booking",
    "mensagem": "Interesse em contratar um show"
  }'`}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Métricas & Analytics ─────────────────────────────────────── */}
            <TabsContent
              value="metrics"
              className="space-y-3 mt-4"
              data-testid="content-metrics"
            >
              <p className="text-xs text-muted-foreground">
                Conecte as plataformas de analytics para importar métricas orgânicas — visualizações, alcance, engajamento, crescimento de seguidores e performance de conteúdo.
              </p>

              <div className="space-y-3">
                {METRICS_PLATFORMS.map((p) => {
                  const conn = getConnection(p);
                  return (
                    <div key={p} className="space-y-2">
                      <OAuthCard
                        platform={p}
                        isConnected={isConnected(p)}
                        accountName={conn?.accountName}
                        accountId={conn?.accountId}
                        connectedAt={conn?.connectedAt}
                        onConnect={() => setOauthDialog(p)}
                        onDisconnect={() => handleDisconnect(p)}
                      />
                      {isConnected(p) && (
                        <Card className="border-success/20 bg-success/5">
                          <CardContent className="p-3">
                            <p className="text-xs text-success">
                              <strong>Métricas activas.</strong> Os dados analíticos desta plataforma são actualizados automaticamente a cada 24 horas via API OAuth.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {oauthDialog && (
        <MarketingOAuthDialog
          open={oauthDialog !== null}
          onOpenChange={(v) => {
            if (!v) setOauthDialog(null);
          }}
          platform={oauthDialog}
          onSuccess={handleConnectSuccess}
        />
      )}
    </>
  );
}
