/**
 * modules/integrations/components/MarketingOAuthDialog.tsx
 *
 * Dialog OAuth simulado para plataformas de Marketing Digital.
 * Reproduz a experiência de "popup de login" — mostra permissões, loading e confirmação.
 */

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
import { Loader2, Check, ShieldCheck, ExternalLink } from "lucide-react";
import type { MarketingPlatformId } from "@/shared/integrations/contracts/marketing.contract";

// ─── Metadados por plataforma ─────────────────────────────────────────────────

interface PlatformMeta {
  name: string;
  icon: string;
  buttonLabel: string;
  buttonColor: string;
  buttonTextColor: string;
  scopes: string[];
  authProvider: string;
}

const PLATFORM_META: Record<MarketingPlatformId, PlatformMeta> = {
  meta_business: {
    name: "Meta Business Suite",
    icon: "📘",
    buttonLabel: "Continuar com o Facebook",
    buttonColor: "#1877F2",
    buttonTextColor: "#ffffff",
    authProvider: "Facebook / Meta",
    scopes: [
      "Aceder a métricas do Facebook e Instagram",
      "Gerir campanhas e conjuntos de anúncios do Meta Ads",
      "Visualizar insights de audiência e alcance",
      "Aceder ao Business Manager da conta",
    ],
  },
  youtube_business: {
    name: "YouTube Business",
    icon: "▶️",
    buttonLabel: "Continuar com o Google",
    buttonColor: "#4285F4",
    buttonTextColor: "#ffffff",
    authProvider: "Google",
    scopes: [
      "Aceder ao analytics e relatórios do canal YouTube",
      "Visualizar métricas de vídeos e Shorts",
      "Aceder ao YouTube Studio da conta da empresa",
      "Gerir conteúdo e configurações do canal",
    ],
  },
  tiktok_business: {
    name: "TikTok for Business",
    icon: "🎵",
    buttonLabel: "Continuar com o TikTok",
    buttonColor: "#010101",
    buttonTextColor: "#ffffff",
    authProvider: "TikTok",
    scopes: [
      "Aceder a métricas e analytics do TikTok Business",
      "Visualizar insights de audiência e tendências",
      "Gerir campanhas do TikTok Ads Manager",
      "Aceder ao TikTok Business Center",
    ],
  },
  google_business: {
    name: "Google Business",
    icon: "🔍",
    buttonLabel: "Continuar com o Google",
    buttonColor: "#4285F4",
    buttonTextColor: "#ffffff",
    authProvider: "Google",
    scopes: [
      "Aceder ao Google Analytics 4 (GA4)",
      "Aceder ao Google Search Console",
      "Gerir campanhas e relatórios do Google Ads",
      "Visualizar dados de SEO e desempenho de pesquisa",
    ],
  },
  corp_spotify: {
    name: "Spotify for Artists",
    icon: "🎧",
    buttonLabel: "Continuar com o Spotify",
    buttonColor: "#1DB954",
    buttonTextColor: "#ffffff",
    authProvider: "Spotify",
    scopes: [
      "Aceder ao Spotify for Artists da conta da empresa",
      "Visualizar streams, ouvintes mensais e tendências",
      "Análise de fãs e dados demográficos de audiência",
    ],
  },
  corp_deezer: {
    name: "Deezer for Artists",
    icon: "🎶",
    buttonLabel: "Continuar com o Deezer",
    buttonColor: "#FF0092",
    buttonTextColor: "#ffffff",
    authProvider: "Deezer",
    scopes: [
      "Aceder ao Deezer for Artists da conta da empresa",
      "Visualizar streams e dados de audiência",
    ],
  },
  corp_soundcloud: {
    name: "SoundCloud Pro",
    icon: "☁️",
    buttonLabel: "Continuar com o SoundCloud",
    buttonColor: "#FF5500",
    buttonTextColor: "#ffffff",
    authProvider: "SoundCloud",
    scopes: [
      "Aceder ao perfil SoundCloud Pro da empresa",
      "Visualizar reproduções, seguidores e tendências",
    ],
  },
  corp_apple_music: {
    name: "Apple Music for Artists",
    icon: "🍎",
    buttonLabel: "Continuar com o Apple",
    buttonColor: "#555555",
    buttonTextColor: "#ffffff",
    authProvider: "Apple",
    scopes: [
      "Aceder ao Apple Music for Artists",
      "Visualizar streams e dados de audiência no ecossistema Apple",
    ],
  },
  spotify_ads: {
    name: "Spotify Ad Studio",
    icon: "🎧",
    buttonLabel: "Continuar com o Spotify",
    buttonColor: "#1DB954",
    buttonTextColor: "#ffffff",
    authProvider: "Spotify",
    scopes: [
      "Aceder ao Spotify Ad Studio",
      "Gerir campanhas de áudio e display",
      "Visualizar métricas de frequência e alcance",
    ],
  },
  deezer_ads: {
    name: "Deezer Ad Manager",
    icon: "🎶",
    buttonLabel: "Continuar com o Deezer",
    buttonColor: "#FF0092",
    buttonTextColor: "#ffffff",
    authProvider: "Deezer",
    scopes: [
      "Aceder ao Deezer Ad Manager",
      "Gerir campanhas de áudio",
    ],
  },
  apple_music_ads: {
    name: "Apple Music Ads",
    icon: "🍎",
    buttonLabel: "Continuar com o Apple",
    buttonColor: "#555555",
    buttonTextColor: "#ffffff",
    authProvider: "Apple",
    scopes: [
      "Aceder ao Apple Music Ads",
      "Gerir campanhas no ecossistema Apple",
    ],
  },
  soundcloud_ads: {
    name: "SoundCloud Ads",
    icon: "☁️",
    buttonLabel: "Continuar com o SoundCloud",
    buttonColor: "#FF5500",
    buttonTextColor: "#ffffff",
    authProvider: "SoundCloud",
    scopes: [
      "Aceder ao SoundCloud Ads",
      "Gerir campanhas de áudio",
    ],
  },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OAuthStep = "permissions" | "connecting" | "success";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: MarketingPlatformId;
  onConnect: (platform: MarketingPlatformId, scopes: string[]) => Promise<void>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MarketingOAuthDialog({ open, onOpenChange, platform, onConnect }: Props) {
  const [step, setStep] = useState<OAuthStep>("permissions");
  const meta = PLATFORM_META[platform];

  const handleAuthorize = async () => {
    setStep("connecting");
    try {
      await onConnect(platform, meta.scopes);
      setStep("success");
      setTimeout(() => {
        onOpenChange(false);
        setStep("permissions");
      }, 1800);
    } catch {
      setStep("permissions");
    }
  };

  const handleClose = (val: boolean) => {
    if (!val && step === "connecting") return;
    onOpenChange(val);
    if (!val) setTimeout(() => setStep("permissions"), 300);
  };

  if (!meta) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid={`dialog-oauth-${platform}`}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl leading-none">{meta.icon}</span>
            <div>
              <DialogTitle className="text-base">{meta.name}</DialogTitle>
              <DialogDescription className="text-xs">
                Autorizar acesso via {meta.authProvider}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "permissions" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Permissões solicitadas
              </p>
              <ul className="space-y-1.5">
                {meta.scopes.map((scope, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    {scope}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O MUSIC OS 360 receberá acesso apenas de leitura às métricas e dados
              desta conta. Pode revogar o acesso a qualquer momento nas definições
              da plataforma.
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => handleClose(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5 font-medium"
                style={{ backgroundColor: meta.buttonColor, color: meta.buttonTextColor, borderColor: meta.buttonColor }}
                onClick={handleAuthorize}
                data-testid={`button-oauth-authorize-${platform}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {meta.buttonLabel}
              </Button>
            </div>
          </div>
        )}

        {step === "connecting" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">A conectar com {meta.authProvider}…</p>
            <p className="text-xs text-muted-foreground text-center">
              A aguardar autorização. Não feche esta janela.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Conta conectada!</p>
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              {meta.name}
            </Badge>
            <p className="text-xs text-muted-foreground text-center">
              Os dados começarão a sincronizar em breve.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
