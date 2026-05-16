/**
 * modules/integrations/components/MarketingOAuthDialog.tsx
 *
 * Abre um popup do browser com a página de login da plataforma (/oauth/:platform).
 * Após o utilizador fazer login no popup, este envia um postMessage de sucesso,
 * o dialog recebe, conecta e fecha.
 */

import { useState, useEffect, useRef, useCallback } from "react";
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
    buttonLabel: "Entrar com o Facebook",
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
    buttonLabel: "Entrar com o Google",
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
    buttonLabel: "Entrar no TikTok",
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
    name: "Google & YouTube",
    icon: "🔍",
    buttonLabel: "Entrar com o Google",
    buttonColor: "#4285F4",
    buttonTextColor: "#ffffff",
    authProvider: "Google",
    scopes: [
      "Aceder ao Google Analytics 4 (GA4)",
      "Aceder ao Google Search Console",
      "Gerir campanhas e relatórios do Google Ads",
      "Aceder ao YouTube Studio — canal oficial e analytics",
      "Visualizar métricas de vídeos, Shorts e inscritos",
      "Gerir campanhas de YouTube Ads",
    ],
  },
  corp_spotify: {
    name: "Spotify for Artists",
    icon: "🎧",
    buttonLabel: "Entrar no Spotify",
    buttonColor: "#1DB954",
    buttonTextColor: "#000000",
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
    buttonLabel: "Entrar no Deezer",
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
    buttonLabel: "Entrar no SoundCloud",
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
    buttonLabel: "Entrar no Spotify",
    buttonColor: "#1DB954",
    buttonTextColor: "#000000",
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
    buttonLabel: "Entrar no Deezer",
    buttonColor: "#FF0092",
    buttonTextColor: "#ffffff",
    authProvider: "Deezer",
    scopes: ["Aceder ao Deezer Ad Manager", "Gerir campanhas de áudio"],
  },
  apple_music_ads: {
    name: "Apple Music Ads",
    icon: "🍎",
    buttonLabel: "Continuar com o Apple",
    buttonColor: "#555555",
    buttonTextColor: "#ffffff",
    authProvider: "Apple",
    scopes: ["Aceder ao Apple Music Ads", "Gerir campanhas no ecossistema Apple"],
  },
  soundcloud_ads: {
    name: "SoundCloud Ads",
    icon: "☁️",
    buttonLabel: "Entrar no SoundCloud",
    buttonColor: "#FF5500",
    buttonTextColor: "#ffffff",
    authProvider: "SoundCloud",
    scopes: ["Aceder ao SoundCloud Ads", "Gerir campanhas de áudio"],
  },
  corp_instagram: {
    name: "Instagram Corporativo",
    icon: "📸",
    buttonLabel: "Entrar com o Facebook",
    buttonColor: "#E1306C",
    buttonTextColor: "#ffffff",
    authProvider: "Facebook / Meta",
    scopes: ["Aceder ao Instagram Insights da conta corporativa", "Visualizar métricas de Reels e Stories"],
  },
  corp_tiktok: {
    name: "TikTok Corporativo",
    icon: "🎵",
    buttonLabel: "Entrar no TikTok",
    buttonColor: "#010101",
    buttonTextColor: "#ffffff",
    authProvider: "TikTok",
    scopes: ["Aceder ao TikTok Analytics da conta corporativa", "Visualizar métricas de vídeos e audiência"],
  },
  corp_youtube: {
    name: "YouTube Corporativo",
    icon: "▶️",
    buttonLabel: "Entrar com o Google",
    buttonColor: "#FF0000",
    buttonTextColor: "#ffffff",
    authProvider: "Google",
    scopes: ["Aceder ao YouTube Analytics do canal corporativo", "Visualizar métricas de vídeos e inscritos"],
  },
  meta_ads: {
    name: "Meta Ads",
    icon: "📘",
    buttonLabel: "Entrar com o Facebook",
    buttonColor: "#1877F2",
    buttonTextColor: "#ffffff",
    authProvider: "Facebook / Meta",
    scopes: ["Gerir campanhas do Meta Ads Manager", "Visualizar performance de anúncios Facebook e Instagram"],
  },
  google_ads: {
    name: "Google Ads",
    icon: "🔍",
    buttonLabel: "Entrar com o Google",
    buttonColor: "#4285F4",
    buttonTextColor: "#ffffff",
    authProvider: "Google",
    scopes: ["Aceder ao Google Ads Manager", "Gerir campanhas de Search, Display e YouTube Ads"],
  },
  tiktok_ads: {
    name: "TikTok Ads",
    icon: "🎵",
    buttonLabel: "Entrar no TikTok",
    buttonColor: "#010101",
    buttonTextColor: "#ffffff",
    authProvider: "TikTok",
    scopes: ["Aceder ao TikTok Ads Manager", "Gerir campanhas e visualizar relatórios de anúncios"],
  },
  youtube_ads: {
    name: "YouTube Ads",
    icon: "▶️",
    buttonLabel: "Entrar com o Google",
    buttonColor: "#FF0000",
    buttonTextColor: "#ffffff",
    authProvider: "Google",
    scopes: ["Aceder ao Google Ads para campanhas de YouTube", "Gerir YouTube Ads e métricas de campanhas"],
  },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

type DialogStep = "permissions" | "waiting" | "success";

interface OAuthMessage {
  type: "musicos360_oauth_success";
  platform: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: MarketingPlatformId;
  onConnect: (platform: MarketingPlatformId, scopes: string[]) => Promise<void>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MarketingOAuthDialog({ open, onOpenChange, platform, onConnect }: Props) {
  const [step, setStep] = useState<DialogStep>("permissions");
  const popupRef = useRef<Window | null>(null);

  const meta = PLATFORM_META[platform];

  const handleSuccess = useCallback(async () => {
    setStep("success");
    await onConnect(platform, meta?.scopes ?? []);
    setTimeout(() => {
      onOpenChange(false);
      setTimeout(() => setStep("permissions"), 300);
    }, 1800);
  }, [platform, meta, onConnect, onOpenChange]);

  // Escuta o postMessage do popup
  useEffect(() => {
    if (!open) return;

    const handler = (event: MessageEvent<OAuthMessage>) => {
      if (
        event.data?.type === "musicos360_oauth_success" &&
        event.data?.platform === platform
      ) {
        popupRef.current = null;
        handleSuccess();
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, platform, handleSuccess]);

  // Polling: detecta se o popup foi fechado manualmente sem login
  useEffect(() => {
    if (step !== "waiting") return;
    const interval = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        popupRef.current = null;
        setStep("permissions");
      }
    }, 500);
    return () => clearInterval(interval);
  }, [step]);

  const openPopup = () => {
    const url = `/oauth/${platform}`;
    const w = 480;
    const h = 600;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(
      url,
      `musicos360_oauth_${platform}`,
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    if (popup) {
      popupRef.current = popup;
      setStep("waiting");
    }
  };

  const handleClose = (val: boolean) => {
    if (!val && step === "waiting") {
      popupRef.current?.close();
      popupRef.current = null;
    }
    onOpenChange(val);
    if (!val) setTimeout(() => setStep("permissions"), 300);
  };

  if (!meta) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" data-testid={`dialog-oauth-${platform}`}>

        {/* Cabeçalho com cor da plataforma */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ backgroundColor: meta.buttonColor }}
        >
          <span className="text-2xl leading-none">{meta.icon}</span>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold" style={{ color: meta.buttonTextColor }}>
              {meta.name}
            </DialogTitle>
            <DialogDescription className="text-[11px] opacity-80" style={{ color: meta.buttonTextColor }}>
              Autenticação via {meta.authProvider}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-4">

          {/* PASSO 1: Permissões */}
          {step === "permissions" && (
            <>
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
                O MUSIC OS 360 acederá apenas a leitura de métricas e dados desta conta.
                Pode revogar o acesso a qualquer momento.
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
                  className="flex-1 h-8 text-xs font-semibold gap-1.5"
                  style={{
                    backgroundColor: meta.buttonColor,
                    color: meta.buttonTextColor,
                    borderColor: meta.buttonColor,
                  }}
                  onClick={openPopup}
                  data-testid={`button-oauth-open-${platform}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {meta.buttonLabel}
                </Button>
              </div>
            </>
          )}

          {/* PASSO 2: Aguardando popup */}
          {step === "waiting" && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Janela de login aberta</p>
              <p className="text-xs text-muted-foreground text-center">
                Complete o login na janela do {meta.authProvider} que foi aberta.
                <br />Não feche esta janela.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs mt-2"
                onClick={() => { popupRef.current?.focus(); }}
              >
                Reabrir janela de login
              </Button>
            </div>
          )}

          {/* PASSO 3: Sucesso */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Conta conectada com sucesso!</p>
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                {meta.name}
              </Badge>
              <p className="text-xs text-muted-foreground text-center">
                Os dados começarão a sincronizar em breve.
              </p>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
