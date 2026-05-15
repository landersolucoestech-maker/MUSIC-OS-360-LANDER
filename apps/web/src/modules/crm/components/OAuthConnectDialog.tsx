import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { CheckCircle2, Loader2, ShieldCheck, Lock } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiGoogleads,
  SiTiktok,
  SiLinkedin,
} from "react-icons/si";
import type { LeadOAuthPlatform } from "../hooks/useLeadOAuth";

export interface OAuthPlatformConfig {
  id: LeadOAuthPlatform;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  scopes: { key: string; label: string }[];
}

export const OAUTH_PLATFORM_CONFIGS: Record<LeadOAuthPlatform, OAuthPlatformConfig> = {
  facebook: {
    id: "facebook",
    label: "Facebook Ads",
    description: "Conecte sua conta do Meta Business Suite para importar leads de campanhas do Facebook diretamente no CRM.",
    color: "#1877F2",
    bgColor: "bg-[#1877F2]/10",
    borderColor: "border-[#1877F2]/30",
    textColor: "text-[#1877F2]",
    scopes: [
      { key: "leads_retrieval", label: "Recuperar leads de formulários" },
      { key: "ads_read", label: "Ler dados de campanhas" },
      { key: "pages_read_engagement", label: "Ver engajamento de páginas" },
      { key: "business_management", label: "Gerenciar conta Business" },
    ],
  },
  instagram: {
    id: "instagram",
    label: "Instagram Ads",
    description: "Autorize o acesso ao Instagram Business para captar leads de anúncios de formulário do Instagram.",
    color: "#833AB4",
    bgColor: "bg-[#833AB4]/10",
    borderColor: "border-[#833AB4]/30",
    textColor: "text-[#833AB4]",
    scopes: [
      { key: "leads_retrieval", label: "Recuperar leads do Instagram" },
      { key: "instagram_basic", label: "Acesso básico à conta" },
      { key: "instagram_manage_insights", label: "Métricas de anúncios" },
      { key: "ads_read", label: "Ler dados de campanhas" },
    ],
  },
  google_ads: {
    id: "google_ads",
    label: "Google Ads",
    description: "Conecte sua conta do Google Ads para receber leads de extensões de formulário diretamente no CRM.",
    color: "#4285F4",
    bgColor: "bg-[#4285F4]/10",
    borderColor: "border-[#4285F4]/30",
    textColor: "text-[#4285F4]",
    scopes: [
      { key: "adwords", label: "Gerenciar campanhas do Google Ads" },
      { key: "analytics.readonly", label: "Leitura de métricas Analytics" },
      { key: "userinfo.email", label: "Identificação da conta" },
      { key: "userinfo.profile", label: "Dados de perfil da conta" },
    ],
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok Ads",
    description: "Autorize o TikTok Ads Manager para importar leads gerados por anúncios de formulário no TikTok.",
    color: "#010101",
    bgColor: "bg-neutral-950/10",
    borderColor: "border-neutral-800/40",
    textColor: "text-neutral-900 dark:text-neutral-100",
    scopes: [
      { key: "leads.read", label: "Recuperar leads de formulários" },
      { key: "campaign.read", label: "Ler dados de campanhas" },
      { key: "ad.read", label: "Ler anúncios ativos" },
      { key: "report.read", label: "Relatórios de desempenho" },
    ],
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn Ads",
    description: "Conecte sua conta do LinkedIn Campaign Manager para captar leads de Lead Gen Forms.",
    color: "#0A66C2",
    bgColor: "bg-[#0A66C2]/10",
    borderColor: "border-[#0A66C2]/30",
    textColor: "text-[#0A66C2]",
    scopes: [
      { key: "r_leads", label: "Recuperar leads gerados" },
      { key: "r_ads", label: "Ler campanhas de anúncios" },
      { key: "r_organization_social", label: "Dados sociais da empresa" },
      { key: "rw_ads", label: "Gerenciar anúncios" },
    ],
  },
};

const PLATFORM_ICON: Record<LeadOAuthPlatform, React.ComponentType<{ className?: string }>> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  google_ads: SiGoogleads,
  tiktok: SiTiktok,
  linkedin: SiLinkedin,
};

type OAuthState = "idle" | "authorizing" | "success";

interface OAuthConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: LeadOAuthPlatform;
  onSuccess: (platform: LeadOAuthPlatform, scopes: string[]) => Promise<void>;
}

export function OAuthConnectDialog({
  open,
  onOpenChange,
  platform,
  onSuccess,
}: OAuthConnectDialogProps) {
  const [state, setState] = useState<OAuthState>("idle");
  const config = OAUTH_PLATFORM_CONFIGS[platform];
  const Icon = PLATFORM_ICON[platform];

  const handleAuthorize = async () => {
    setState("authorizing");
    const scopes = config.scopes.map((s) => s.key);
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
      <DialogContent
        className="max-w-md"
        data-testid={`dialog-oauth-${platform}`}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgColor} ${config.borderColor} border`}
            >
              <Icon className={`h-5 w-5 ${config.textColor}`} />
            </div>
            <div>
              <DialogTitle className="text-base leading-tight">
                Conectar {config.label}
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
            <p className="text-sm font-semibold text-success">Conta conectada com sucesso!</p>
            <p className="text-xs text-muted-foreground text-center">
              Os leads desta plataforma já serão sincronizados automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {config.description}
            </p>

            <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} space-y-3`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={`h-4 w-4 ${config.textColor}`} />
                <span className="text-xs font-semibold">
                  Permissões solicitadas
                </span>
              </div>
              <ul className="space-y-1.5">
                {config.scopes.map((scope) => (
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
                Autenticação gerida pelo {config.label} — MUSIC OS 360 nunca
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
                data-testid={`button-oauth-cancel-${platform}`}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                style={{ backgroundColor: config.color, borderColor: config.color }}
                onClick={handleAuthorize}
                disabled={state === "authorizing"}
                data-testid={`button-oauth-authorize-${platform}`}
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
