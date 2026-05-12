/**
 * modules/integrations/components/MarketingOAuthDialog.tsx
 *
 * Dialog OAuth simulado para plataformas de Marketing Digital.
 * Fluxo: Permissões → Login (e-mail + senha) → Conectando → Sucesso.
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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader2, Check, ShieldCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";
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
  loginLabel: string;
}

const PLATFORM_META: Record<MarketingPlatformId, PlatformMeta> = {
  meta_business: {
    name: "Meta Business Suite",
    icon: "📘",
    buttonLabel: "Entrar no Facebook",
    buttonColor: "#1877F2",
    buttonTextColor: "#ffffff",
    authProvider: "Facebook / Meta",
    loginLabel: "E-mail ou número de telemóvel",
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
    loginLabel: "E-mail ou número de telefone",
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
    loginLabel: "E-mail / utilizador / telefone",
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
    buttonLabel: "Entrar com o Google",
    buttonColor: "#4285F4",
    buttonTextColor: "#ffffff",
    authProvider: "Google",
    loginLabel: "E-mail ou número de telefone",
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
    buttonLabel: "Entrar no Spotify",
    buttonColor: "#1DB954",
    buttonTextColor: "#ffffff",
    authProvider: "Spotify",
    loginLabel: "E-mail ou nome de utilizador",
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
    loginLabel: "E-mail",
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
    loginLabel: "E-mail",
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
    loginLabel: "Apple ID (e-mail)",
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
    buttonTextColor: "#ffffff",
    authProvider: "Spotify",
    loginLabel: "E-mail ou nome de utilizador",
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
    loginLabel: "E-mail",
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
    loginLabel: "Apple ID (e-mail)",
    scopes: [
      "Aceder ao Apple Music Ads",
      "Gerir campanhas no ecossistema Apple",
    ],
  },
  soundcloud_ads: {
    name: "SoundCloud Ads",
    icon: "☁️",
    buttonLabel: "Entrar no SoundCloud",
    buttonColor: "#FF5500",
    buttonTextColor: "#ffffff",
    authProvider: "SoundCloud",
    loginLabel: "E-mail",
    scopes: [
      "Aceder ao SoundCloud Ads",
      "Gerir campanhas de áudio",
    ],
  },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OAuthStep = "permissions" | "login" | "connecting" | "success";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: MarketingPlatformId;
  onConnect: (platform: MarketingPlatformId, scopes: string[]) => Promise<void>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MarketingOAuthDialog({ open, onOpenChange, platform, onConnect }: Props) {
  const [step, setStep] = useState<OAuthStep>("permissions");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const meta = PLATFORM_META[platform];

  const handleClose = (val: boolean) => {
    if (!val && (step === "connecting")) return;
    onOpenChange(val);
    if (!val) {
      setTimeout(() => {
        setStep("permissions");
        setEmail("");
        setPassword("");
        setLoginError("");
        setShowPassword(false);
      }, 300);
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    if (!email.trim()) { setLoginError("Introduza o e-mail ou utilizador."); return; }
    if (!password) { setLoginError("Introduza a senha."); return; }
    setStep("connecting");
    try {
      await onConnect(platform, meta.scopes);
      setStep("success");
      setTimeout(() => {
        handleClose(false);
      }, 1800);
    } catch {
      setStep("login");
      setLoginError("Não foi possível conectar. Verifique as credenciais.");
    }
  };

  if (!meta) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden" data-testid={`dialog-oauth-${platform}`}>

        {/* ── Cabeçalho com cor da plataforma ── */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ backgroundColor: meta.buttonColor }}
        >
          <span className="text-2xl leading-none">{meta.icon}</span>
          <div>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold" style={{ color: meta.buttonTextColor }}>
                {meta.name}
              </DialogTitle>
              <DialogDescription className="text-[11px] opacity-80" style={{ color: meta.buttonTextColor }}>
                Autenticação via {meta.authProvider}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-4">

          {/* ── PASSO 1: Permissões ── */}
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

              <div className="flex gap-2">
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
                  className="flex-1 h-8 text-xs font-medium"
                  style={{ backgroundColor: meta.buttonColor, color: meta.buttonTextColor, borderColor: meta.buttonColor }}
                  onClick={() => setStep("login")}
                  data-testid={`button-oauth-continue-${platform}`}
                >
                  Continuar
                </Button>
              </div>
            </>
          )}

          {/* ── PASSO 2: Login ── */}
          {step === "login" && (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="oauth-email" className="text-xs font-medium">
                    {meta.loginLabel}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="oauth-email"
                      type="text"
                      placeholder={meta.loginLabel}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      autoComplete="username"
                      data-testid={`input-oauth-email-${platform}`}
                      onKeyDown={(e) => e.key === "Enter" && document.getElementById("oauth-password")?.focus()}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="oauth-password" className="text-xs font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="oauth-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-8 pr-8 h-8 text-xs"
                      autoComplete="current-password"
                      data-testid={`input-oauth-password-${platform}`}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <p className="text-xs text-destructive">{loginError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => { setStep("permissions"); setLoginError(""); }}
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-semibold"
                  style={{ backgroundColor: meta.buttonColor, color: meta.buttonTextColor, borderColor: meta.buttonColor }}
                  onClick={handleLogin}
                  data-testid={`button-oauth-login-${platform}`}
                >
                  {meta.buttonLabel}
                </Button>
              </div>
            </>
          )}

          {/* ── PASSO 3: Conectando ── */}
          {step === "connecting" && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">A autenticar com {meta.authProvider}…</p>
              <p className="text-xs text-muted-foreground text-center">
                A verificar credenciais e autorizar acesso.
              </p>
            </div>
          )}

          {/* ── PASSO 4: Sucesso ── */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
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
