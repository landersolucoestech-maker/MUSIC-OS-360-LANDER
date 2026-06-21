/**
 * modules/integrations/components/PaidAdsIntegrationsDialog.tsx
 *
 * Modal unificado de Tráfego Pago / Campanhas.
 * Mesmo estilo do LeadIntegrationsDialog: tabs por plataforma,
 * card OAuth de conexão, fluxo de login em vez de tokens.
 *
 * Plataformas: Meta Ads · Google Ads · TikTok Ads
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
} from "lucide-react";
import {
  SiFacebook,
  SiGoogleads,
  SiTiktok,
} from "react-icons/si";
import { toast } from "sonner";
import { usePaidAdsOAuth, type PaidAdsPlatform } from "../hooks/usePaidAdsOAuth";
import {
  IntegrationLogo,
  type IntegrationLogoId,
} from "@/shared/integrations";

// ─── Configuração por plataforma ──────────────────────────────────────────────

interface PlatformConfig {
  id:          PaidAdsPlatform;
  label:       string;
  description: string;
  color:       string;
  bgColor:     string;
  borderColor: string;
  textColor:   string;
  Icon:        React.ComponentType<{ className?: string }>;
  logoId:      IntegrationLogoId;
  scopes:      { key: string; label: string }[];
}

const PLATFORM_CONFIGS: Record<PaidAdsPlatform, PlatformConfig> = {
  meta_ads: {
    id:          "meta_ads",
    label:       "Meta Ads",
    description: "Conecte o seu Meta Business Suite para gerir campanhas do Facebook e Instagram Ads diretamente no MUSIC OS 360.",
    color:       "#1877F2",
    bgColor:     "bg-primary/10",
    borderColor: "border-[#1877F2]/30",
    textColor:   "text-[#1877F2]",
    Icon:        SiFacebook,
    logoId:      "meta_business",
    scopes: [
      { key: "ads_management",       label: "Gerir campanhas e anúncios" },
      { key: "ads_read",             label: "Ler métricas de campanhas" },
      { key: "read_insights",        label: "Insights e relatórios de performance" },
      { key: "business_management",  label: "Gerir conta Business" },
      { key: "pages_manage_ads",     label: "Anúncios em Páginas do Facebook" },
    ],
  },
  google_ads: {
    id:          "google_ads",
    label:       "Google Ads",
    description: "Autentique a sua conta Google Ads para sincronizar campanhas Search, Display e YouTube com o painel de marketing.",
    color:       "#4285F4",
    bgColor:     "bg-primary/10",
    borderColor: "border-[#4285F4]/30",
    textColor:   "text-[#4285F4]",
    Icon:        SiGoogleads,
    logoId:      "google_business",
    scopes: [
      { key: "adwords",              label: "Gerir campanhas do Google Ads" },
      { key: "analytics.readonly",   label: "Leitura de métricas Métricas" },
      { key: "display_video360",     label: "Campanhas Display & YouTube" },
      { key: "userinfo.email",       label: "Identificação da conta Google" },
    ],
  },
  tiktok_ads: {
    id:          "tiktok_ads",
    label:       "TikTok Ads",
    description: "Faça login no TikTok Ads Manager para gerir campanhas e relatórios de desempenho diretamente na plataforma.",
    color:       "#010101",
    bgColor:     "bg-neutral-950/10",
    borderColor: "border-neutral-800/40",
    textColor:   "text-neutral-900",
    Icon:        SiTiktok,
    logoId:      "tiktok_business",
    scopes: [
      { key: "campaign.read",        label: "Ler campanhas ativas" },
      { key: "campaign.update",      label: "Atualizar configurações de campanha" },
      { key: "ad.read",              label: "Ler anúncios e conjuntos" },
      { key: "report.read",          label: "Relatórios de desempenho" },
      { key: "advertiser.read",      label: "Dados da conta de anunciante" },
    ],
  },
};

const PLATFORMS: PaidAdsPlatform[] = ["meta_ads", "google_ads", "tiktok_ads"];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface OAuthCardProps {
  platform:     PaidAdsPlatform;
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
        data-testid={`card-paid-ads-connected-${platform}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-success">Conta conectada</span>
          </div>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            Ativo
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <IntegrationLogo id={cfg.logoId} className="h-7 w-7" imageClassName="h-5 w-5" />
            <span className="text-sm font-medium">{accountName}</span>
          </div>
          {accountId && (
            <p className="text-[11px] text-muted-foreground font-sans ml-5">
              ID: {accountId}
            </p>
          )}
          {connectedAt && (
            <p className="text-[11px] text-muted-foreground ml-5">
              Conectado em:{" "}
              {new Date(connectedAt).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
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
            data-testid={`button-paid-ads-reconnect-${platform}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reconectar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDisconnect}
            data-testid={`button-paid-ads-disconnect-${platform}`}
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
      data-testid={`card-paid-ads-disconnected-${platform}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IntegrationLogo id={cfg.logoId} className="h-8 w-8" imageClassName="h-6 w-6" />
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
          data-testid={`button-paid-ads-connect-${platform}`}
        >
          <Plug className="h-3.5 w-3.5" />
          Entrar com {cfg.label}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{cfg.description}</p>
    </div>
  );
}

// ─── OAuth authorize dialog (inline, sem arquivo separado) ────────────────────

type OAuthState = "idle" | "authorizing" | "success";

interface AdsOAuthDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  platform:     PaidAdsPlatform;
  onSuccess:    (platform: PaidAdsPlatform, scopes: string[]) => Promise<void>;
}

function AdsOAuthDialog({ open, onOpenChange, platform, onSuccess }: AdsOAuthDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid={`dialog-ads-oauth-${platform}`}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <IntegrationLogo id={cfg.logoId} className="h-10 w-10 rounded-xl" imageClassName="h-8 w-8" />
            <div>
              <DialogTitle className="text-base leading-tight">
                Entrar com {cfg.label}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Autorização OAuth 2.0 segura
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {state === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6" data-testid={`state-success-${platform}`}>
            <CheckCircle2 className="h-12 w-12 text-success" />
            <p className="text-sm font-semibold text-success">Conta conectada com sucesso!</p>
            <p className="text-xs text-muted-foreground text-center">
              As campanhas desta plataforma já podem ser geridas pelo MUSIC OS 360.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cfg.description}
            </p>

            <div className={`rounded-lg border p-4 ${cfg.bgColor} ${cfg.borderColor} space-y-3`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={`h-4 w-4 ${cfg.textColor}`} />
                <span className="text-xs font-semibold">Permissões solicitadas</span>
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
                Autenticação gerida pela {cfg.label} — MUSIC OS 360 nunca armazena a sua senha.
              </span>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
                disabled={state === "authorizing"}
                data-testid={`button-ads-oauth-cancel-${platform}`}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                style={{ backgroundColor: cfg.color, borderColor: cfg.color }}
                onClick={handleAuthorize}
                disabled={state === "authorizing"}
                data-testid={`button-ads-oauth-authorize-${platform}`}
              >
                {state === "authorizing" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Autorizando...</>
                ) : (
                  <><Icon className="h-4 w-4" /> Autorizar acesso</>
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

// ─── Dialog principal ─────────────────────────────────────────────────────────

interface PaidAdsIntegrationsDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?:  PaidAdsPlatform;
}

export function PaidAdsIntegrationsDialog({
  open,
  onOpenChange,
  initialTab = "meta_ads",
}: PaidAdsIntegrationsDialogProps) {
  const { connect, disconnect, getConnection, isConnected } = usePaidAdsOAuth();
  const [oauthDialog, setOauthDialog] = useState<PaidAdsPlatform | null>(null);

  const handleConnectSuccess = async (platform: PaidAdsPlatform, scopes: string[]) => {
    await connect(platform, scopes);
    toast.success(`${PLATFORM_CONFIGS[platform].label} conectado com sucesso!`);
  };

  const handleDisconnect = (platform: PaidAdsPlatform) => {
    disconnect(platform);
    toast.info(`${PLATFORM_CONFIGS[platform].label} desconectado.`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[88vh] overflow-y-auto"
          data-testid="dialog-paid-ads-integrations"
        >
          <DialogHeader>
            <DialogTitle data-testid="text-paid-ads-dialog-title">
              Tráfego Pago — Conectar Plataformas
            </DialogTitle>
            <DialogDescription className="text-xs">
              Autentique com a sua conta em cada plataforma de anúncios. Nenhuma senha é armazenada — o acesso é gerido via OAuth 2.0.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList
              className="grid w-full grid-cols-3"
              data-testid="tabs-paid-ads"
            >
              {PLATFORMS.map((p) => {
                const cfg = PLATFORM_CONFIGS[p];
                const { Icon } = cfg;
                return (
                  <TabsTrigger
                    key={p}
                    value={p}
                    className="gap-1.5 text-xs relative"
                    data-testid={`tab-paid-ads-${p}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{cfg.label}</span>
                    {isConnected(p) && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border border-background" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {PLATFORMS.map((p) => {
              const conn = getConnection(p);
              return (
                <TabsContent
                  key={p}
                  value={p}
                  className="space-y-4 mt-4"
                  data-testid={`content-paid-ads-${p}`}
                >
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
                          <strong>Sincronização ativa.</strong> As campanhas desta plataforma estão a ser importadas automaticamente via API OAuth — sem necessidade de tokens manuais.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </DialogContent>
      </Dialog>

      {oauthDialog && (
        <AdsOAuthDialog
          open={oauthDialog !== null}
          onOpenChange={(v) => { if (!v) setOauthDialog(null); }}
          platform={oauthDialog}
          onSuccess={handleConnectSuccess}
        />
      )}
    </>
  );
}



