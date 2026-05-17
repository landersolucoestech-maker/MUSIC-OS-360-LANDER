/**
 * modules/integrations/pages/OAuthPopupPage.tsx
 *
 * Popup OAuth — reproduz fielmente a experiência visual de login de cada plataforma.
 * Rota: /oauth/:platform  (pública, sem layout)
 * Fluxo: simulação de login → postMessage(musicos360_oauth_success) → parent conecta integração.
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MOCK_MODE } from "@/shared/lib/env";
import { Eye, EyeOff, ChevronRight, UserCircle2, Mail, Lock, Upload, QrCode } from "lucide-react";

// ─── SVG Logos ────────────────────────────────────────────────────────────────

function SvgGoogle({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function SvgMeta({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      <rect width="40" height="40" rx="8" fill="#1877F2"/>
      <path d="M26.5 21.5H23v-2.9c0-1 .5-2 2-2H26.5V13.5S25.3 13.2 24 13.2c-3.2 0-5.3 1.95-5.3 5.5v2.8H15.5v4.2h3.2V35h5v-9.3h3z" fill="white"/>
    </svg>
  );
}

function SvgTikTok({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="black">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.87a8.18 8.18 0 004.78 1.51V7.93a4.85 4.85 0 01-1.01-.12z"/>
    </svg>
  );
}

function SvgSpotify({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#1DB954">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.1-10.561-1.14-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function SvgSEFAZ({ size = 52 }: { size?: number }) {
  return (
    <svg viewBox="0 0 52 60" width={size} height={size * 60 / 52}>
      <path d="M26 1L2 13v16c0 15.5 10 30 24 35C40 59 50 44.5 50 29V13L26 1z" fill="#1E6B2E"/>
      <path d="M26 7L8 18v11c0 12 7 22.5 18 26.3C37 51.5 44 41 44 29V18L26 7z" fill="#2D9E4C" fillOpacity="0.55"/>
      <text x="26" y="31" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="0.5">NF-e</text>
      <text x="26" y="42" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="5" fontFamily="Arial, sans-serif">SEFAZ</text>
    </svg>
  );
}

// Ícone Gov.br (botão) — escudo azul federal
function SvgGovBrIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size}>
      <rect width="20" height="20" rx="3" fill="#1351B4"/>
      <text x="10" y="10" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="5" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="0.2">GOV.BR</text>
    </svg>
  );
}

// Ícone Apple
function SvgApple({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

// Ícone Facebook pequeno
function SvgFbIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PlatformVariant = "google" | "meta" | "tiktok" | "spotify" | "gov" | "saas" | "dark-saas";
type Step = "choose" | "govMethod" | "certAuth" | "email" | "password" | "connecting";
type TikTokMethod = "email" | "phone" | "qr";

interface SocialLogin { id: string; label: string; btnBg: string; btnColor: string; }

interface PlatformConfig {
  name: string;
  tagline: string;
  variant: PlatformVariant;
  logo: string;
  bgColor: string;
  cardBgOverride?: string;
  accentColor: string;
  buttonBg: string;
  buttonText: string;
  borderRadius: string;
  loginHint: string;
  passwordHint: string;
  footerLeft: string;
  footerRight: string;
  privacyUrl: string;
  termsUrl: string;
  accountLabel: string;
  mockAccounts: { name: string; email: string; avatar: string }[];
  forgotText?: string;
  createAccountText?: string;
  socialLogins?: SocialLogin[];
}

// ─── Plataformas ──────────────────────────────────────────────────────────────

const PLATFORMS: Record<string, PlatformConfig> = {

  // ── Marketing Digital ──────────────────────────────────────────────────────

  meta_business: {
    name: "Facebook",
    tagline: "para continuar para o Meta Business Suite",
    variant: "meta",
    logo: "f",
    bgColor: "#f0f2f5",
    accentColor: "#1877F2",
    buttonBg: "#1877F2",
    buttonText: "#ffffff",
    borderRadius: "6px",
    loginHint: "E-mail ou número de telemóvel",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "Meta",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar",
    forgotText: "Esqueceu a senha?",
    createAccountText: "Criar nova conta",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" },
      { name: "Admin Empresa", email: "admin@empresa.com", avatar: "A" },
    ],
  },

  tiktok_business: {
    name: "TikTok",
    tagline: "TikTok Business Center",
    variant: "tiktok",
    logo: "T",
    bgColor: "#ffffff",
    accentColor: "#010101",
    buttonBg: "#010101",
    buttonText: "#ffffff",
    borderRadius: "2px",
    loginHint: "E-mail",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "TikTok for Business",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no TikTok Business",
    forgotText: "Esqueceu a senha?",
    createAccountText: "Criar conta empresarial",
    socialLogins: [
      { id: "google", label: "Continuar com Google", btnBg: "#ffffff", btnColor: "#3c4043" },
      { id: "apple",  label: "Continuar com Apple",  btnBg: "#000000", btnColor: "#ffffff" },
    ],
    mockAccounts: [
      { name: "@musicbusiness", email: "musicbusiness@empresa.com", avatar: "M" },
    ],
  },

  google_business: {
    name: "Google",
    tagline: "para continuar para Google & YouTube",
    variant: "google",
    logo: "G",
    bgColor: "#ffffff",
    accentColor: "#4285F4",
    buttonBg: "#4285F4",
    buttonText: "#ffffff",
    borderRadius: "4px",
    loginHint: "E-mail ou número de telefone",
    passwordHint: "Introduza a sua senha",
    footerLeft: "Português (Brasil)",
    footerRight: "Google",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar com o Google",
    forgotText: "Esqueceu o e-mail?",
    createAccountText: "Criar conta",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@gmail.com", avatar: "M" },
      { name: "Admin Empresa", email: "admin.empresa@gmail.com", avatar: "A" },
    ],
  },

  youtube_business: {
    name: "Google",
    tagline: "para continuar para o YouTube Studio",
    variant: "google",
    logo: "G",
    bgColor: "#ffffff",
    accentColor: "#4285F4",
    buttonBg: "#4285F4",
    buttonText: "#ffffff",
    borderRadius: "4px",
    loginHint: "E-mail ou número de telefone",
    passwordHint: "Introduza a sua senha",
    footerLeft: "Português (Brasil)",
    footerRight: "Google",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar com o Google",
    forgotText: "Esqueceu o e-mail?",
    createAccountText: "Criar conta",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@gmail.com", avatar: "M" },
      { name: "Admin Empresa", email: "admin.empresa@gmail.com", avatar: "A" },
    ],
  },

  spotify_ads: {
    name: "Spotify",
    tagline: "para continuar para o Spotify Ad Studio",
    variant: "spotify",
    logo: "S",
    bgColor: "#121212",
    cardBgOverride: "#121212",
    accentColor: "#1DB954",
    buttonBg: "#1DB954",
    buttonText: "#000000",
    borderRadius: "500px",
    loginHint: "E-mail ou nome de utilizador",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "Spotify",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no Spotify",
    forgotText: "Esqueceu a senha?",
    createAccountText: "Registar no Spotify",
    socialLogins: [
      { id: "google",   label: "Continuar com Google",   btnBg: "#ffffff", btnColor: "#000000" },
      { id: "facebook", label: "Continuar com Facebook", btnBg: "#ffffff", btnColor: "#000000" },
      { id: "apple",    label: "Continuar com Apple",    btnBg: "#ffffff", btnColor: "#000000" },
    ],
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" },
    ],
  },

  corp_spotify: {
    name: "Spotify",
    tagline: "para continuar para o Spotify for Artists",
    variant: "spotify",
    logo: "S",
    bgColor: "#121212",
    cardBgOverride: "#121212",
    accentColor: "#1DB954",
    buttonBg: "#1DB954",
    buttonText: "#000000",
    borderRadius: "500px",
    loginHint: "E-mail ou nome de utilizador",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "Spotify",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no Spotify",
    forgotText: "Esqueceu a senha?",
    createAccountText: "Registar no Spotify",
    socialLogins: [
      { id: "google",   label: "Continuar com Google",   btnBg: "#ffffff", btnColor: "#000000" },
      { id: "facebook", label: "Continuar com Facebook", btnBg: "#ffffff", btnColor: "#000000" },
      { id: "apple",    label: "Continuar com Apple",    btnBg: "#ffffff", btnColor: "#000000" },
    ],
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" },
    ],
  },

  // ── Fiscal ────────────────────────────────────────────────────────────────

  nfe: {
    name: "SEFAZ",
    tagline: "Portal da Nota Fiscal Eletrônica · Receita Federal",
    variant: "gov",
    logo: "NF",
    bgColor: "#e8ecef",
    cardBgOverride: "#ffffff",
    accentColor: "#1E6B2E",
    buttonBg: "#1351B4",
    buttonText: "#ffffff",
    borderRadius: "4px",
    loginHint: "CNPJ ou e-mail",
    passwordHint: "Senha ou PIN do certificado",
    footerLeft: "Brasil",
    footerRight: "Receita Federal do Brasil",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Acessar SEFAZ",
    mockAccounts: [
      { name: "Empresa Demo LTDA", email: "12.345.678/0001-90", avatar: "E" },
    ],
  },

  // ── Distribuidoras ────────────────────────────────────────────────────────

  onerpm: {
    name: "ONErpm",
    tagline: "para continuar para o ONErpm Distribution",
    variant: "dark-saas",
    logo: "1R",
    bgColor: "#0d0d0d",
    cardBgOverride: "#1c1c1c",
    accentColor: "#F97316",
    buttonBg: "#F97316",
    buttonText: "#ffffff",
    borderRadius: "6px",
    loginHint: "E-mail da conta ONErpm",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "ONErpm",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no ONErpm",
    forgotText: "Esqueceu a senha?",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@onerpm.com", avatar: "M" },
    ],
  },

  distrokid: {
    name: "DistroKid",
    tagline: "para continuar para o DistroKid",
    variant: "saas",
    logo: "DK",
    bgColor: "#f7f8fc",
    cardBgOverride: "#ffffff",
    accentColor: "#1d72e8",
    buttonBg: "#1d72e8",
    buttonText: "#ffffff",
    borderRadius: "8px",
    loginHint: "E-mail",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "DistroKid",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no DistroKid",
    forgotText: "Esqueceu a senha?",
    createAccountText: "Criar conta",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@distrokid.com", avatar: "M" },
    ],
  },

  symphonic: {
    name: "Symphonic",
    tagline: "para continuar para o Symphonic Distribution",
    variant: "dark-saas",
    logo: "SY",
    bgColor: "#100c28",
    cardBgOverride: "#1e1a3f",
    accentColor: "#8b5cf6",
    buttonBg: "#8b5cf6",
    buttonText: "#ffffff",
    borderRadius: "8px",
    loginHint: "E-mail",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "Symphonic Distribution",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no Symphonic",
    forgotText: "Recuperar senha",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@symphonicms.com", avatar: "M" },
    ],
  },

  soundon: {
    name: "SoundOn",
    tagline: "powered by TikTok — para continuar para o SoundOn",
    variant: "tiktok",
    logo: "SO",
    bgColor: "#ffffff",
    accentColor: "#fe2c55",
    buttonBg: "#fe2c55",
    buttonText: "#ffffff",
    borderRadius: "2px",
    loginHint: "E-mail / telemóvel / utilizador TikTok",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "SoundOn · TikTok",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no SoundOn",
    forgotText: "Esqueceu a senha?",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@soundon.global", avatar: "M" },
    ],
  },

  musicpro: {
    name: "MusicPro",
    tagline: "para continuar para o MusicPro Distribution",
    variant: "saas",
    logo: "MP",
    bgColor: "#f4faf6",
    cardBgOverride: "#ffffff",
    accentColor: "#15803d",
    buttonBg: "#15803d",
    buttonText: "#ffffff",
    borderRadius: "6px",
    loginHint: "E-mail",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "MusicPro",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no MusicPro",
    forgotText: "Esqueceu a senha?",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@musicpro.com", avatar: "M" },
    ],
  },

  somvibe: {
    name: "SomVibe",
    tagline: "para continuar para o SomVibe",
    variant: "dark-saas",
    logo: "SV",
    bgColor: "#090e1c",
    cardBgOverride: "#111827",
    accentColor: "#3b82f6",
    buttonBg: "#3b82f6",
    buttonText: "#ffffff",
    borderRadius: "8px",
    loginHint: "E-mail",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "SomVibe",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no SomVibe",
    forgotText: "Esqueceu a senha?",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@somvibe.com.br", avatar: "M" },
    ],
  },
};

// Fallback
const FALLBACK: PlatformConfig = {
  name: "Plataforma",
  tagline: "para continuar",
  variant: "saas",
  logo: "P",
  bgColor: "#f5f5f5",
  cardBgOverride: "#ffffff",
  accentColor: "#333333",
  buttonBg: "#333333",
  buttonText: "#ffffff",
  borderRadius: "6px",
  loginHint: "E-mail",
  passwordHint: "Senha",
  footerLeft: "Português (Brasil)",
  footerRight: "MUSIC OS 360",
  privacyUrl: "#",
  termsUrl: "#",
  accountLabel: "Entrar",
  mockAccounts: [{ name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" }],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

// ─── Production OAuth authorization URLs ─────────────────────────────────────
//
// In production mode (MOCK_MODE=false) the popup does NOT simulate a login —
// it immediately redirects to the real platform's OAuth authorization endpoint.
// The platform then redirects back to /oauth/callback?code=...&state=<platform>
// where the callback page (task #24) exchanges the code for a real access_token
// and postMessages it to the opener, completing the flow.
//
// Each URL is built from VITE_* env vars.  If a client_id env var is missing
// the redirect is skipped and an informational message is shown instead.

const CALLBACK_URI = `${window.location.origin}/oauth/callback`;

type PlatformOAuthConfig = {
  authUrl: string;
  clientId: string;
  scopes: string;
  /** Some platforms (TikTok) use `client_key` instead of `client_id` in the authorize URL. */
  clientIdParam?: string;
};

/**
 * Builds the real platform OAuth authorization URL.
 * The `state` parameter carries both the platform id and the CSRF nonce in the
 * form `${platform}:${nonce}` so that OAuthCallbackPage can extract and validate
 * both values before exchanging the authorization code.
 *
 * The param name for the client identifier varies by platform:
 *   Meta/Google → `client_id`
 *   TikTok      → `client_key`
 */
function buildOAuthUrl(platform: string, nonce: string): string | null {
  const cfg = PRODUCTION_OAUTH_CONFIGS[platform];
  if (!cfg?.clientId) return null;
  const clientIdParam = cfg.clientIdParam ?? "client_id";
  const params = new URLSearchParams({
    [clientIdParam]: cfg.clientId,
    redirect_uri:    CALLBACK_URI,
    response_type:   "code",
    scope:           cfg.scopes,
    state:           `${platform}:${nonce}`,
  });
  return `${cfg.authUrl}?${params.toString()}`;
}

const PRODUCTION_OAUTH_CONFIGS: Record<string, PlatformOAuthConfig> = {
  corp_instagram: {
    authUrl:  "https://www.facebook.com/v18.0/dialog/oauth",
    clientId: (import.meta.env.VITE_META_APP_ID as string | undefined) ?? "",
    scopes:   "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
  },
  meta_business: {
    authUrl:  "https://www.facebook.com/v18.0/dialog/oauth",
    clientId: (import.meta.env.VITE_META_APP_ID as string | undefined) ?? "",
    scopes:   "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
  },
  corp_tiktok: {
    authUrl:      "https://www.tiktok.com/v2/auth/authorize",
    clientId:     (import.meta.env.VITE_TIKTOK_CLIENT_KEY as string | undefined) ?? "",
    // TikTok authorize endpoint uses `client_key`, not `client_id`
    clientIdParam: "client_key",
    scopes:       "video.publish,user.info.basic",
  },
  tiktok_business: {
    authUrl:      "https://www.tiktok.com/v2/auth/authorize",
    clientId:     (import.meta.env.VITE_TIKTOK_CLIENT_KEY as string | undefined) ?? "",
    clientIdParam: "client_key",
    scopes:       "video.publish,user.info.basic",
  },
  corp_youtube: {
    authUrl:  "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "",
    scopes:   "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
  },
  youtube_business: {
    authUrl:  "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "",
    scopes:   "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
  },
  google_business: {
    authUrl:  "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "",
    scopes:   "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Sends the OAuth success message to the opener window.
 *
 * MOCK_MODE=true (demo/testing): emits a synthetic `demo_token_*` so the full
 * activation UI flow completes end-to-end without a real backend.
 *
 * MOCK_MODE=false (production): this function is called by the real OAuth
 * callback page (/oauth/callback, task #24) ONLY — the popup itself redirects
 * to the platform's authorization URL and never calls this directly.
 * Synthetic tokens are NEVER emitted in production paths.
 *
 * Target origin is always `window.location.origin` (never "*") to prevent
 * cross-origin token injection by malicious iframes or foreign tabs.
 */
function sendSuccessAndClose(platform: string) {
  if (!window.opener) { window.close(); return; }

  if (MOCK_MODE) {
    // Demo mode only: synthetic token for UI testing.
    const demoToken = `demo_token_${platform}_${Date.now()}`;
    window.opener.postMessage(
      { type: "musicos360_oauth_success", platform, access_token: demoToken },
      window.location.origin,
    );
  }
  // In production mode the caller is the real callback page — it will post the
  // real token itself; nothing to emit here.
  window.close();
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function OAuthPopupPage() {
  const { platform = "google_business" } = useParams<{ platform: string }>();
  const cfg = PLATFORMS[platform] ?? FALLBACK;
  // nonce is passed from MarketingOAuthDialog as a URL query param.
  // In production mode it is embedded in the OAuth state param so
  // OAuthCallbackPage can validate CSRF on return.
  const nonce = new URLSearchParams(window.location.search).get("nonce") ?? "";

  const isDark = cfg.variant === "dark-saas" || cfg.variant === "spotify";
  const isGov  = cfg.variant === "gov";
  const isMeta = cfg.variant === "meta";

  // Cores por tema
  const textMain    = isDark ? "#ffffff" : isGov ? "#1a1a2e" : "#202124";
  const textSub     = isDark ? "#a0a0a0" : isGov ? "#555577" : "#5f6368";
  const cardBg      = cfg.cardBgOverride ?? (isDark ? "#1e1e1e" : "#ffffff");
  const inputBg     = isDark ? "#2e2e2e" : "#ffffff";
  const inputBorder = isDark ? "#444444" : "#dadce0";
  const divColor    = isDark ? "#333333" : "#e0e0e0";
  const hoverBg     = isDark ? "#2a2a2a" : "#f5f5f5";
  const cardBorder  = isDark ? "none" : (isGov ? "1px solid #c8d0d9" : "1px solid #dadce0");
  const cardShadow  = isDark ? "0 4px 32px rgba(0,0,0,.5)" : "0 2px 12px rgba(0,0,0,.08)";

  // Step inicial
  const initialStep: Step = isGov ? "govMethod" : "choose";

  const [step, setStep]           = useState<Step>(initialStep);
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [emailErr, setEmailErr]   = useState("");
  const [pwErr, setPwErr]         = useState("");
  const [ttMethod, setTtMethod]   = useState<TikTokMethod>("email");
  const [certFile, setCertFile]   = useState("");
  const [certPin, setCertPin]     = useState("");
  const [certPinShow, setCertPinShow] = useState(false);

  // Production mode: immediately redirect to the real platform OAuth entry URL.
  // The state param carries `${platform}:${nonce}` for CSRF validation in callback.
  // Synthetic demo tokens are never emitted in production paths.
  // The real access_token arrives via /oauth/callback.
  useEffect(() => {
    if (MOCK_MODE) return;
    const url = buildOAuthUrl(platform, nonce);
    if (url) {
      window.location.replace(url);
    }
    // If no client_id is configured, stay on this page and render the
    // "credentials not configured" UI (handled in the JSX render below).
  }, [platform, nonce]);

  // Handlers
  const onAccountClick = () => {
    setStep("connecting");
    setTimeout(() => sendSuccessAndClose(platform), 1500);
  };
  const onUseAnother = () => { setStep("email"); setEmail(""); setPassword(""); };
  const onEmailNext = () => {
    if (!email.trim()) { setEmailErr("Introduza um e-mail válido."); return; }
    setEmailErr(""); setStep("password");
  };
  const onPasswordNext = () => {
    if (!password) { setPwErr("Introduza a sua senha."); return; }
    setPwErr(""); setStep("connecting");
    setTimeout(() => sendSuccessAndClose(platform), 1500);
  };
  const onSocialLogin = () => {
    setStep("connecting");
    setTimeout(() => sendSuccessAndClose(platform), 1200);
  };
  const onGovBr = () => {
    setStep("email"); setEmail(""); setPassword("");
  };
  const onCertSubmit = () => {
    if (!certFile) return;
    setStep("connecting");
    setTimeout(() => sendSuccessAndClose(platform), 1600);
  };

  // Render logo baseado no variant
  function renderLogoIcon() {
    switch (cfg.variant) {
      case "google": return <SvgGoogle size={46} />;
      case "tiktok": return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#010101", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SvgTikTok size={22} />
          </div>
        </div>
      );
      case "spotify": return <SvgSpotify size={50} />;
      case "gov": return <SvgSEFAZ size={52} />;
      default: {
        const isCircle = cfg.borderRadius === "500px";
        return (
          <div style={{ width: 44, height: 44, borderRadius: isCircle ? "50%" : 10, backgroundColor: cfg.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: cfg.logo.length > 2 ? 13 : 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
            {cfg.logo}
          </div>
        );
      }
    }
  }

  // Social login icon
  function socialIcon(id: string) {
    if (id === "google")   return <SvgGoogle size={18} />;
    if (id === "apple")    return <SvgApple size={18} color="#000" />;
    if (id === "facebook") return <SvgFbIcon size={18} />;
    return null;
  }

  // Fake QR matrix
  function QrMatrix() {
    const rows = [
      [1,1,1,0,1,1,0,1,1,1],
      [1,0,1,0,0,0,0,1,0,1],
      [1,0,1,1,1,0,1,1,0,1],
      [0,0,0,1,0,1,0,0,0,0],
      [1,1,0,0,1,1,0,1,1,0],
      [0,1,0,1,0,0,1,0,1,0],
      [1,1,1,0,1,1,0,1,1,1],
      [1,0,1,1,0,0,0,0,1,0],
      [0,1,0,1,1,0,1,1,0,1],
      [1,0,0,0,1,1,0,1,0,1],
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: 16, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e0e0e0" }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 3 }}>
            {row.map((cell, ci) => (
              <div key={ci} style={{ width: 14, height: 14, backgroundColor: cell ? "#010101" : "transparent", borderRadius: 2 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const cardRadius = cfg.variant === "meta" ? "8px" : "12px";
  const cardPadding = cfg.variant === "spotify" ? "32px 32px 24px" : isMeta ? "0 0 24px" : "36px 40px 24px";

  return (
    <div style={{ backgroundColor: cfg.bgColor, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 0 32px", fontFamily: isMeta ? "'Helvetica Neue', Arial, sans-serif" : cfg.variant === "google" ? "'Google Sans', Roboto, Arial, sans-serif" : "'Inter', -apple-system, sans-serif" }}>

      {/* ── SPOTIFY: Logo acima do card ── */}
      {cfg.variant === "spotify" && (
        <div style={{ marginBottom: 28 }}>
          <SvgSpotify size={48} />
        </div>
      )}

      {/* ── GOOGLE: Logo acima do card ── */}
      {cfg.variant === "google" && step === "choose" && (
        <div style={{ marginBottom: 16 }}>
          <SvgGoogle size={52} />
        </div>
      )}

      {/* ── Card ── */}
      <div style={{ backgroundColor: cardBg, borderRadius: cardRadius, border: cardBorder, width: "min(400px, calc(100vw - 32px))", padding: cardPadding, boxShadow: cardShadow }}>

        {/* META: Barra azul no topo do card */}
        {isMeta && (
          <div style={{ backgroundColor: "#1877F2", borderRadius: "8px 8px 0 0", padding: "24px 32px 20px", marginBottom: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <SvgMeta size={36} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Facebook</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 2 }}>Meta Business Suite</div>
            </div>
          </div>
        )}

        {/* META: Form section */}
        {isMeta && (
          <div style={{ padding: "24px 32px" }}>

            {/* CHOOSE step */}
            {step === "choose" && (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1c1e21", marginBottom: 4 }}>Entrar no Facebook</div>
                <div style={{ fontSize: 13, color: "#606770", marginBottom: 20 }}>Selecione a conta ou inicie sessão</div>
                {cfg.mockAccounts.map(acc => (
                  <button key={acc.email} onClick={onAccountClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "1px solid #dadde1", borderRadius: 8, cursor: "pointer", marginBottom: 10, textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f5f6f7")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>{acc.avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1e21" }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: "#65676b" }}>{acc.email}</div>
                    </div>
                    <ChevronRight size={16} color="#65676b" style={{ marginLeft: "auto" }} />
                  </button>
                ))}
                <button onClick={onUseAnother} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "1px solid #dadde1", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f5f6f7")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#e4e6eb", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle2 size={20} color="#606770" /></div>
                  <div style={{ fontSize: 14, color: "#1c1e21" }}>Entrar com outra conta</div>
                  <ChevronRight size={16} color="#65676b" style={{ marginLeft: "auto" }} />
                </button>
              </>
            )}

            {/* EMAIL step */}
            {step === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1c1e21", marginBottom: 4 }}>Entrar no Facebook</div>
                <input type="text" placeholder={cfg.loginHint} value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }} onKeyDown={e => e.key === "Enter" && onEmailNext()} autoFocus
                  style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${emailErr ? "#d93025" : "#bec3c9"}`, borderRadius: 6, fontSize: 15, backgroundColor: "#fff", color: "#1c1e21", outline: "none", boxSizing: "border-box" }} />
                {emailErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{emailErr}</p>}
                <button onClick={onEmailNext} style={{ padding: "13px", fontSize: 15, fontWeight: 700, backgroundColor: cfg.buttonBg, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Seguinte</button>
                <div style={{ textAlign: "center" }}>
                  <a href="#" style={{ fontSize: 13, color: "#1877F2", textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
                </div>
              </div>
            )}

            {/* PASSWORD step */}
            {step === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1c1e21", marginBottom: 4 }}>Introduza a sua senha</div>
                <div style={{ fontSize: 13, color: "#65676b" }}>{email}</div>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} placeholder={cfg.passwordHint} value={password} onChange={e => { setPassword(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && onPasswordNext()} autoFocus
                    style={{ width: "100%", padding: "12px 40px 12px 14px", border: `1.5px solid ${pwErr ? "#d93025" : "#bec3c9"}`, borderRadius: 6, fontSize: 15, backgroundColor: "#fff", color: "#1c1e21", outline: "none", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                    {showPw ? <EyeOff size={16} color="#65676b" /> : <Eye size={16} color="#65676b" />}
                  </button>
                </div>
                {pwErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{pwErr}</p>}
                <button onClick={onPasswordNext} style={{ padding: "13px", fontSize: 15, fontWeight: 700, backgroundColor: cfg.buttonBg, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Entrar</button>
                <div style={{ textAlign: "center" }}>
                  <a href="#" style={{ fontSize: 13, color: "#1877F2", textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
                </div>
              </div>
            )}

            {/* CONNECTING */}
            {step === "connecting" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${cfg.accentColor}`, borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                <p style={{ fontSize: 14, color: "#65676b", margin: 0 }}>A autenticar com Facebook…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        )}

        {/* META: Criar nova conta */}
        {isMeta && step !== "connecting" && (
          <div style={{ padding: "0 32px 8px", borderTop: "1px solid #dadde1" }}>
            <button onClick={() => {}} style={{ display: "block", margin: "20px auto 4px", padding: "13px 28px", fontSize: 14, fontWeight: 700, backgroundColor: "#42b72a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
              {cfg.createAccountText}
            </button>
          </div>
        )}

        {/* ── GOOGLE variant ── */}
        {cfg.variant === "google" && (
          <>
            {/* Header */}
            {step !== "connecting" && (
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: step === "choose" ? 22 : 20, fontWeight: 400, color: textMain, marginBottom: 6 }}>
                  {step === "choose" ? "Escolher uma conta" : "Entrar"}
                </div>
                <div style={{ fontSize: 13, color: textSub }}>{cfg.tagline}</div>
              </div>
            )}
            <div style={{ height: 1, backgroundColor: divColor, margin: "0 -40px 16px", width: "calc(100% + 80px)" }} />

            {/* CHOOSE */}
            {step === "choose" && (
              <>
                {cfg.mockAccounts.map(acc => (
                  <button key={acc.email} onClick={onAccountClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: cfg.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>{acc.avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: textMain }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: textSub }}>{acc.email}</div>
                    </div>
                    <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
                  </button>
                ))}
                <button onClick={onUseAnother} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle2 size={18} color={textSub} /></div>
                  <div style={{ fontSize: 14, color: textMain }}>Usar outra conta</div>
                  <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${divColor}` }}>
                  <a href="#" style={{ fontSize: 13, color: cfg.accentColor, textDecoration: "none" }} onClick={e => e.preventDefault()}>Português (Brasil)</a>
                  <a href="#" style={{ fontSize: 13, color: cfg.accentColor, textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.createAccountText}</a>
                </div>
              </>
            )}

            {/* EMAIL */}
            {step === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 13, color: textSub, margin: 0 }}>Introduza o seu e-mail ou número de telefone para continuar.</p>
                <div style={{ position: "relative" }}>
                  <Mail size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input type="text" placeholder={cfg.loginHint} value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }} onKeyDown={e => e.key === "Enter" && onEmailNext()} autoFocus
                    style={{ width: "100%", padding: "9px 12px 9px 32px", border: `1px solid ${emailErr ? "#d93025" : inputBorder}`, borderRadius: 4, fontSize: 14, backgroundColor: inputBg, color: textMain, outline: "none", boxSizing: "border-box" }} />
                </div>
                {emailErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{emailErr}</p>}
                <a href="#" style={{ fontSize: 13, color: cfg.accentColor, textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <a href="#" style={{ fontSize: 13, color: cfg.accentColor, textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.createAccountText}</a>
                  <button onClick={onEmailNext} style={{ padding: "8px 22px", fontSize: 14, fontWeight: 500, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Seguinte</button>
                </div>
              </div>
            )}

            {/* PASSWORD */}
            {step === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, border: `1px solid ${inputBorder}`, width: "fit-content", backgroundColor: "#f1f3f4" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: cfg.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>{email[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: 13, color: textMain }}>{email}</span>
                  <button onClick={() => setStep("email")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><span style={{ fontSize: 11, color: textSub }}>▼</span></button>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input type={showPw ? "text" : "password"} placeholder={cfg.passwordHint} value={password} onChange={e => { setPassword(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && onPasswordNext()} autoFocus
                    style={{ width: "100%", padding: "9px 36px 9px 32px", border: `1px solid ${pwErr ? "#d93025" : inputBorder}`, borderRadius: 4, fontSize: 14, backgroundColor: inputBg, color: textMain, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {showPw ? <EyeOff size={15} color={textSub} /> : <Eye size={15} color={textSub} />}
                  </button>
                </div>
                {pwErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{pwErr}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <a href="#" style={{ fontSize: 13, color: cfg.accentColor, textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
                  <button onClick={onPasswordNext} style={{ padding: "8px 22px", fontSize: 14, fontWeight: 500, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Seguinte</button>
                </div>
              </div>
            )}

            {/* CONNECTING */}
            {step === "connecting" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${cfg.accentColor}`, borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                <p style={{ fontSize: 14, color: textSub, margin: 0 }}>A autenticar com Google…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </>
        )}

        {/* ── TIKTOK variant ── */}
        {cfg.variant === "tiktok" && (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#010101", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SvgTikTok size={24} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: textMain }}>{cfg.name}</div>
                <div style={{ fontSize: 11, color: textSub }}>{cfg.tagline}</div>
              </div>
            </div>
            <div style={{ width: "calc(100% + 80px)", margin: "0 -40px 20px", height: 1, backgroundColor: divColor }} />

            {/* CHOOSE */}
            {step === "choose" && (
              <>
                {cfg.mockAccounts.map(acc => (
                  <button key={acc.email} onClick={onAccountClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: cfg.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{acc.avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: textMain }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: textSub }}>{acc.email}</div>
                    </div>
                    <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
                  </button>
                ))}
                <button onClick={onUseAnother} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left", marginTop: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle2 size={18} color={textSub} /></div>
                  <div style={{ fontSize: 14, color: textMain }}>Usar outra conta</div>
                  <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
                </button>
              </>
            )}

            {/* EMAIL */}
            {step === "email" && (
              <>
                {/* Method tabs */}
                <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${divColor}`, marginBottom: 20 }}>
                  {(["qr", "email", "phone"] as TikTokMethod[]).map(m => (
                    <button key={m} onClick={() => setTtMethod(m)} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: ttMethod === m ? 600 : 400, color: ttMethod === m ? cfg.accentColor : textSub, background: "none", border: "none", cursor: "pointer", borderBottom: ttMethod === m ? `2px solid ${cfg.accentColor}` : "2px solid transparent", marginBottom: -2 }}>
                      {m === "qr" ? "QR Code" : m === "email" ? "E-mail" : "Telemóvel"}
                    </button>
                  ))}
                </div>

                {/* QR method */}
                {ttMethod === "qr" && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <QrMatrix />
                    <p style={{ fontSize: 12, color: textSub, textAlign: "center", margin: 0 }}>Abra o TikTok no seu telemóvel e leia o QR Code</p>
                    <button onClick={onSocialLogin} style={{ fontSize: 13, color: cfg.accentColor, background: "none", border: "none", cursor: "pointer" }}>Simular leitura →</button>
                  </div>
                )}

                {/* Email/Phone method */}
                {ttMethod !== "qr" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ position: "relative" }}>
                      <Mail size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                      <input type="text" placeholder={ttMethod === "email" ? "E-mail" : "Número de telemóvel"} value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }} onKeyDown={e => e.key === "Enter" && onEmailNext()} autoFocus
                        style={{ width: "100%", padding: "9px 12px 9px 32px", border: `1px solid ${emailErr ? "#d93025" : inputBorder}`, borderRadius: 2, fontSize: 14, backgroundColor: inputBg, color: textMain, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    {emailErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{emailErr}</p>}
                    <button onClick={onEmailNext} style={{ padding: "11px", fontSize: 14, fontWeight: 600, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Continuar</button>

                    {cfg.socialLogins && cfg.socialLogins.length > 0 && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
                          <div style={{ flex: 1, height: 1, backgroundColor: divColor }} />
                          <span style={{ fontSize: 12, color: textSub }}>ou continuar com</span>
                          <div style={{ flex: 1, height: 1, backgroundColor: divColor }} />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          {cfg.socialLogins.map(s => (
                            <button key={s.id} onClick={onSocialLogin} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", backgroundColor: s.btnBg, color: s.btnColor, border: "1px solid #dadce0", borderRadius: 2, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                              {socialIcon(s.id)}
                              {s.id === "google" ? "Google" : "Apple"}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div style={{ textAlign: "center" }}>
                      <a href="#" style={{ fontSize: 12, color: textSub, textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PASSWORD */}
            {step === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: textSub }}>{email}</div>
                <div style={{ position: "relative" }}>
                  <Lock size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input type={showPw ? "text" : "password"} placeholder={cfg.passwordHint} value={password} onChange={e => { setPassword(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && onPasswordNext()} autoFocus
                    style={{ width: "100%", padding: "9px 36px 9px 32px", border: `1px solid ${pwErr ? "#d93025" : inputBorder}`, borderRadius: 2, fontSize: 14, backgroundColor: inputBg, color: textMain, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {showPw ? <EyeOff size={15} color={textSub} /> : <Eye size={15} color={textSub} />}
                  </button>
                </div>
                {pwErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{pwErr}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep("email")} style={{ fontSize: 13, color: cfg.accentColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Voltar</button>
                  <button onClick={onPasswordNext} style={{ padding: "8px 22px", fontSize: 14, fontWeight: 600, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Entrar</button>
                </div>
              </div>
            )}

            {/* CONNECTING */}
            {step === "connecting" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${cfg.accentColor}`, borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                <p style={{ fontSize: 14, color: textSub, margin: 0 }}>A autenticar com TikTok…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </>
        )}

        {/* ── SPOTIFY variant ── */}
        {cfg.variant === "spotify" && (
          <>
            {step !== "connecting" && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", textAlign: "center", marginBottom: 28, marginTop: 0 }}>
                  {step === "choose" ? "Escolher conta" : "Entrar no Spotify"}
                </h1>

                {/* Social logins (antes do form) */}
                {cfg.socialLogins && step !== "choose" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    {cfg.socialLogins.map(s => (
                      <button key={s.id} onClick={onSocialLogin} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 16px", backgroundColor: s.btnBg, color: s.btnColor, border: "1px solid #727272", borderRadius: "500px", cursor: "pointer", fontSize: 14, fontWeight: 700, width: "100%" }}>
                        {socialIcon(s.id)}
                        {s.label}
                      </button>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
                      <div style={{ flex: 1, height: 1, backgroundColor: "#727272" }} />
                      <span style={{ fontSize: 12, color: "#a7a7a7", fontWeight: 700, letterSpacing: 1.5 }}>OU</span>
                      <div style={{ flex: 1, height: 1, backgroundColor: "#727272" }} />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* CHOOSE */}
            {step === "choose" && (
              <>
                {cfg.mockAccounts.map(acc => (
                  <button key={acc.email} onClick={onAccountClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", backgroundColor: "#282828", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left", marginBottom: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#3e3e3e")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#282828")}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: cfg.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#000" }}>{acc.avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff" }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: "#a7a7a7" }}>{acc.email}</div>
                    </div>
                    <ChevronRight size={16} color="#a7a7a7" style={{ marginLeft: "auto" }} />
                  </button>
                ))}
                <button onClick={onUseAnother} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", backgroundColor: "#282828", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#3e3e3e")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#282828")}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#3e3e3e", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle2 size={18} color="#a7a7a7" /></div>
                  <div style={{ fontSize: 14, color: "#ffffff" }}>Usar outra conta</div>
                  <ChevronRight size={16} color="#a7a7a7" style={{ marginLeft: "auto" }} />
                </button>
              </>
            )}

            {/* EMAIL */}
            {step === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>E-mail ou nome de utilizador</label>
                <input type="text" placeholder={cfg.loginHint} value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }} onKeyDown={e => e.key === "Enter" && onEmailNext()} autoFocus
                  style={{ width: "100%", padding: "11px 14px", border: `1px solid ${emailErr ? "#f15e6c" : "#727272"}`, borderRadius: 4, fontSize: 14, backgroundColor: "#121212", color: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                {emailErr && <p style={{ color: "#f15e6c", fontSize: 12, margin: 0 }}>{emailErr}</p>}
                <button onClick={onEmailNext} style={{ padding: "14px", fontSize: 15, fontWeight: 700, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Entrar</button>
                <a href="#" style={{ fontSize: 13, color: "#ffffff", textDecoration: "underline", textAlign: "center" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
              </div>
            )}

            {/* PASSWORD */}
            {step === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 13, color: "#a7a7a7" }}>{email}</div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>Senha</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} placeholder={cfg.passwordHint} value={password} onChange={e => { setPassword(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && onPasswordNext()} autoFocus
                    style={{ width: "100%", padding: "11px 40px 11px 14px", border: `1px solid ${pwErr ? "#f15e6c" : "#727272"}`, borderRadius: 4, fontSize: 14, backgroundColor: "#121212", color: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {showPw ? <EyeOff size={16} color="#a7a7a7" /> : <Eye size={16} color="#a7a7a7" />}
                  </button>
                </div>
                {pwErr && <p style={{ color: "#f15e6c", fontSize: 12, margin: 0 }}>{pwErr}</p>}
                <button onClick={onPasswordNext} style={{ padding: "14px", fontSize: 15, fontWeight: 700, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Entrar</button>
                <a href="#" style={{ fontSize: 13, color: "#ffffff", textDecoration: "underline", textAlign: "center" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
              </div>
            )}

            {/* CONNECTING */}
            {step === "connecting" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${cfg.accentColor}`, borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                <p style={{ fontSize: 14, color: "#a7a7a7", margin: 0 }}>A autenticar com Spotify…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {step !== "connecting" && (
              <p style={{ textAlign: "center", fontSize: 13, color: "#a7a7a7", marginTop: 20, marginBottom: 0 }}>
                Não tem conta?{" "}
                <a href="#" style={{ color: "#ffffff", fontWeight: 700, textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.createAccountText}</a>
              </p>
            )}
          </>
        )}

        {/* ── GOV variant (NF-e / SEFAZ) ── */}
        {isGov && (
          <>
            {/* Header SEFAZ */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <SvgSEFAZ size={56} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>Portal NF-e — SEFAZ</div>
                <div style={{ fontSize: 12, color: "#555577", marginTop: 2 }}>Receita Federal do Brasil</div>
              </div>
            </div>
            <div style={{ width: "100%", height: 1, backgroundColor: "#c8d0d9", marginBottom: 20 }} />

            {/* GOVMETHOD step — escolher método */}
            {step === "govMethod" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 13, color: "#555577", textAlign: "center", margin: "0 0 8px" }}>Escolha a forma de acesso:</p>

                {/* Gov.br button */}
                <button onClick={onGovBr} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "16px 18px", backgroundColor: "#1351B4", color: "#ffffff", border: "none", borderRadius: 4, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0c326f")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1351B4")}>
                  <SvgGovBrIcon size={36} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Entrar com Gov.br</div>
                    <div style={{ fontSize: 11, opacity: 0.82, marginTop: 2 }}>CPF + senha do portal Gov.br</div>
                  </div>
                  <ChevronRight size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: "auto" }} />
                </button>

                {/* Certificado Digital */}
                <button onClick={() => setStep("certAuth")} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "16px 18px", backgroundColor: "#ffffff", color: "#1a1a2e", border: "2px solid #c8d0d9", borderRadius: 4, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f0f4f8")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#ffffff")}>
                  <div style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: "#1E6B2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Upload size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Certificado Digital A1</div>
                    <div style={{ fontSize: 11, color: "#555577", marginTop: 2 }}>e-CNPJ ou e-CPF (.pfx) + senha</div>
                  </div>
                  <ChevronRight size={16} color="#555577" style={{ marginLeft: "auto" }} />
                </button>

                <p style={{ fontSize: 11, color: "#888", textAlign: "center", marginTop: 4, marginBottom: 0 }}>
                  Para dúvidas acesse o{" "}
                  <a href="#" style={{ color: "#1351B4", textDecoration: "none" }} onClick={e => e.preventDefault()}>Portal de Suporte SEFAZ</a>
                </p>
              </div>
            )}

            {/* CERTAUTH step — Certificado Digital */}
            {step === "certAuth" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <button onClick={() => setStep("govMethod")} style={{ alignSelf: "flex-start", fontSize: 12, color: "#1351B4", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Voltar</button>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>Certificado Digital A1</div>

                {/* File picker */}
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 16px", border: "2px dashed #c8d0d9", borderRadius: 4, cursor: "pointer", backgroundColor: certFile ? "#f0fdf4" : "#fafafa" }}>
                  <Upload size={24} color={certFile ? "#1E6B2E" : "#aab"} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: certFile ? "#1E6B2E" : "#555577" }}>
                      {certFile || "Selecionar certificado (.pfx / .p12)"}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>e-CNPJ ou e-CPF — máx. 10 MB</div>
                  </div>
                  <input type="file" accept=".pfx,.p12" style={{ display: "none" }} onChange={e => setCertFile(e.target.files?.[0]?.name ?? "")} />
                </label>

                {/* PIN */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555577", display: "block", marginBottom: 6 }}>PIN / Senha do certificado</label>
                  <div style={{ position: "relative" }}>
                    <input type={certPinShow ? "text" : "password"} placeholder="Senha do certificado" value={certPin} onChange={e => setCertPin(e.target.value)} onKeyDown={e => e.key === "Enter" && onCertSubmit()}
                      style={{ width: "100%", padding: "10px 36px 10px 12px", border: "1.5px solid #c8d0d9", borderRadius: 4, fontSize: 14, backgroundColor: "#fff", color: "#1a1a2e", outline: "none", boxSizing: "border-box" }} />
                    <button onClick={() => setCertPinShow(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {certPinShow ? <EyeOff size={16} color="#aab" /> : <Eye size={16} color="#aab" />}
                    </button>
                  </div>
                </div>

                <button onClick={onCertSubmit} disabled={!certFile} style={{ padding: "12px", fontSize: 14, fontWeight: 700, backgroundColor: certFile ? "#1E6B2E" : "#aab", color: "#ffffff", border: "none", borderRadius: 4, cursor: certFile ? "pointer" : "not-allowed", opacity: certFile ? 1 : 0.6 }}>
                  Acessar com Certificado
                </button>
              </div>
            )}

            {/* EMAIL step (Gov.br flow) */}
            {step === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", backgroundColor: "#1351B4", borderRadius: 4, marginBottom: 4 }}>
                  <SvgGovBrIcon size={24} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Entrar com Gov.br</div>
                </div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555577" }}>CPF ou e-mail cadastrado no Gov.br</label>
                <input type="text" placeholder="CPF ou e-mail" value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }} onKeyDown={e => e.key === "Enter" && onEmailNext()} autoFocus
                  style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${emailErr ? "#d93025" : "#c8d0d9"}`, borderRadius: 4, fontSize: 14, backgroundColor: "#fff", color: "#1a1a2e", outline: "none", boxSizing: "border-box" }} />
                {emailErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{emailErr}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep("govMethod")} style={{ fontSize: 12, color: "#1351B4", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Voltar</button>
                  <button onClick={onEmailNext} style={{ padding: "9px 22px", fontSize: 14, fontWeight: 700, backgroundColor: "#1351B4", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Continuar</button>
                </div>
              </div>
            )}

            {/* PASSWORD step (Gov.br flow) */}
            {step === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", backgroundColor: "#1351B4", borderRadius: 4, marginBottom: 4 }}>
                  <SvgGovBrIcon size={24} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Entrar com Gov.br</div>
                </div>
                <div style={{ fontSize: 12, color: "#555577", marginBottom: 4 }}>{email}</div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555577" }}>Senha do Gov.br</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} placeholder="Senha" value={password} onChange={e => { setPassword(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && onPasswordNext()} autoFocus
                    style={{ width: "100%", padding: "10px 36px 10px 12px", border: `1.5px solid ${pwErr ? "#d93025" : "#c8d0d9"}`, borderRadius: 4, fontSize: 14, backgroundColor: "#fff", color: "#1a1a2e", outline: "none", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {showPw ? <EyeOff size={16} color="#aab" /> : <Eye size={16} color="#aab" />}
                  </button>
                </div>
                {pwErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{pwErr}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep("email")} style={{ fontSize: 12, color: "#1351B4", background: "none", border: "none", cursor: "pointer", padding: 0 }}>← Voltar</button>
                  <button onClick={onPasswordNext} style={{ padding: "9px 22px", fontSize: 14, fontWeight: 700, backgroundColor: "#1351B4", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Entrar</button>
                </div>
              </div>
            )}

            {/* CONNECTING */}
            {step === "connecting" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #1E6B2E", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                <p style={{ fontSize: 14, color: "#555577", margin: 0 }}>A autenticar com SEFAZ…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </>
        )}

        {/* ── SAAS / DARK-SAAS variant ── */}
        {(cfg.variant === "saas" || cfg.variant === "dark-saas") && (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              {renderLogoIcon()}
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: textMain }}>{step === "choose" ? cfg.name : `Entrar — ${cfg.name}`}</div>
                <div style={{ fontSize: 12, color: textSub }}>{cfg.tagline}</div>
              </div>
            </div>
            <div style={{ width: "calc(100% + 80px)", margin: "0 -40px 20px", height: 1, backgroundColor: divColor }} />

            {/* CHOOSE */}
            {step === "choose" && (
              <>
                {cfg.mockAccounts.map(acc => (
                  <button key={acc.email} onClick={onAccountClick} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: cfg.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{acc.avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: textMain }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: textSub }}>{acc.email}</div>
                    </div>
                    <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
                  </button>
                ))}
                <button onClick={onUseAnother} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left", marginTop: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: isDark ? "#3e3e3e" : "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center" }}><UserCircle2 size={18} color={textSub} /></div>
                  <div style={{ fontSize: 14, color: textMain }}>Usar outra conta</div>
                  <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
                </button>
              </>
            )}

            {/* EMAIL */}
            {step === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 13, color: textSub, margin: 0 }}>Introduza o seu {cfg.loginHint.toLowerCase()}.</p>
                <div style={{ position: "relative" }}>
                  <Mail size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input type="text" placeholder={cfg.loginHint} value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }} onKeyDown={e => e.key === "Enter" && onEmailNext()} autoFocus
                    style={{ width: "100%", padding: "9px 12px 9px 32px", border: `1px solid ${emailErr ? "#d93025" : inputBorder}`, borderRadius: 4, fontSize: 14, backgroundColor: inputBg, color: textMain, outline: "none", boxSizing: "border-box" }} />
                </div>
                {emailErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{emailErr}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <button onClick={() => setStep("choose")} style={{ fontSize: 13, color: cfg.accentColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Voltar</button>
                  <button onClick={onEmailNext} style={{ padding: "9px 22px", fontSize: 14, fontWeight: 600, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Seguinte</button>
                </div>
                {cfg.forgotText && (
                  <a href="#" style={{ fontSize: 12, color: textSub, textDecoration: "none", textAlign: "center" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
                )}
              </div>
            )}

            {/* PASSWORD */}
            {step === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, border: `1px solid ${inputBorder}`, width: "fit-content", backgroundColor: isDark ? "#3e3e3e" : "#f1f3f4" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: cfg.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>{email[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: 13, color: textMain }}>{email}</span>
                  <button onClick={() => setStep("email")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><span style={{ fontSize: 11, color: textSub }}>▼</span></button>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input type={showPw ? "text" : "password"} placeholder={cfg.passwordHint} value={password} onChange={e => { setPassword(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && onPasswordNext()} autoFocus
                    style={{ width: "100%", padding: "9px 36px 9px 32px", border: `1px solid ${pwErr ? "#d93025" : inputBorder}`, borderRadius: 4, fontSize: 14, backgroundColor: inputBg, color: textMain, outline: "none", boxSizing: "border-box" }} />
                  <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {showPw ? <EyeOff size={15} color={textSub} /> : <Eye size={15} color={textSub} />}
                  </button>
                </div>
                {pwErr && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{pwErr}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setStep("email")} style={{ fontSize: 13, color: cfg.accentColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Voltar</button>
                  <button onClick={onPasswordNext} style={{ padding: "9px 22px", fontSize: 14, fontWeight: 600, backgroundColor: cfg.buttonBg, color: cfg.buttonText, border: "none", borderRadius: cfg.borderRadius, cursor: "pointer" }}>Entrar</button>
                </div>
                {cfg.forgotText && (
                  <a href="#" style={{ fontSize: 12, color: textSub, textDecoration: "none", textAlign: "center" }} onClick={e => e.preventDefault()}>{cfg.forgotText}</a>
                )}
              </div>
            )}

            {/* CONNECTING */}
            {step === "connecting" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${cfg.accentColor}`, borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                <p style={{ fontSize: 14, color: textSub, margin: 0 }}>A autenticar com {cfg.name}…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Rodapé ── */}
      {cfg.variant === "gov" ? (
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "#778899" }}>
          <div>{cfg.footerRight}</div>
          <div style={{ marginTop: 4 }}>
            <a href="#" style={{ color: "#778899", textDecoration: "none" }} onClick={e => e.preventDefault()}>Privacidade</a>
            <span style={{ margin: "0 8px" }}>·</span>
            <a href="#" style={{ color: "#778899", textDecoration: "none" }} onClick={e => e.preventDefault()}>Termos de Uso</a>
            <span style={{ margin: "0 8px" }}>·</span>
            <a href="#" style={{ color: "#778899", textDecoration: "none" }} onClick={e => e.preventDefault()}>Acessibilidade</a>
          </div>
        </div>
      ) : cfg.variant === "spotify" ? (
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#a7a7a7" }}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <a href="#" style={{ color: "#a7a7a7", textDecoration: "none" }} onClick={e => e.preventDefault()}>Privacidade</a>
            <a href="#" style={{ color: "#a7a7a7", textDecoration: "none" }} onClick={e => e.preventDefault()}>Cookies</a>
            <a href="#" style={{ color: "#a7a7a7", textDecoration: "none" }} onClick={e => e.preventDefault()}>Termos</a>
            <span>Spotify AB</span>
          </div>
        </div>
      ) : cfg.variant === "meta" ? (
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: "#90949c" }}>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <a href="#" style={{ color: "#90949c", textDecoration: "none" }} onClick={e => e.preventDefault()}>{cfg.footerLeft}</a>
            <a href="#" style={{ color: "#90949c", textDecoration: "none" }} onClick={e => e.preventDefault()}>Privacidade</a>
            <a href="#" style={{ color: "#90949c", textDecoration: "none" }} onClick={e => e.preventDefault()}>Termos</a>
            <span>Meta © 2025</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "min(400px, calc(100vw - 32px))", padding: "12px 4px 0", fontSize: 12, color: isDark ? "#606060" : "#5f6368" }}>
          <span>{cfg.footerLeft}</span>
          <div style={{ display: "flex", gap: 14 }}>
            <a href={cfg.privacyUrl} style={{ color: isDark ? "#606060" : "#5f6368", textDecoration: "none" }}>Privacidade</a>
            <a href={cfg.termsUrl} style={{ color: isDark ? "#606060" : "#5f6368", textDecoration: "none" }}>Termos</a>
            <span>{cfg.footerRight}</span>
          </div>
        </div>
      )}
    </div>
  );
}
