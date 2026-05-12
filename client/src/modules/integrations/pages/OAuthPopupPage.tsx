/**
 * modules/integrations/pages/OAuthPopupPage.tsx
 *
 * Página de popup OAuth simulada — reproduz a experiência real de login
 * "Sign in with [Platform]" que as plataformas abrem num popup de browser.
 *
 * Rota: /oauth/:platform  (pública, sem layout)
 * Comunicação: postMessage → window.opener → Configuracoes.tsx fecha o popup e conecta.
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, EyeOff, ChevronRight, UserCircle2, Lock, Mail } from "lucide-react";

// ─── Metadados de plataforma ──────────────────────────────────────────────────

interface PlatformConfig {
  name: string;
  tagline: string;
  logo: string;
  logoAlt?: string;
  bgColor: string;
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
}

const PLATFORMS: Record<string, PlatformConfig> = {
  meta_business: {
    name: "Meta",
    tagline: "para continuar para o Music Business",
    logo: "f",
    bgColor: "#f0f2f5",
    accentColor: "#1877F2",
    buttonBg: "#1877F2",
    buttonText: "#ffffff",
    borderRadius: "8px",
    loginHint: "E-mail ou número de telemóvel",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "Facebook",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Iniciar sessão no Facebook",
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" },
      { name: "Admin Empresa", email: "admin@empresa.com", avatar: "A" },
    ],
  },
  youtube_business: {
    name: "Google",
    tagline: "para continuar para o Music Business",
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
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@gmail.com", avatar: "M" },
      { name: "Admin Empresa", email: "admin.empresa@gmail.com", avatar: "A" },
    ],
  },
  tiktok_business: {
    name: "TikTok",
    tagline: "para continuar para o Music Business",
    logo: "T",
    bgColor: "#ffffff",
    accentColor: "#010101",
    buttonBg: "#010101",
    buttonText: "#ffffff",
    borderRadius: "4px",
    loginHint: "E-mail / telemóvel / utilizador",
    passwordHint: "Senha",
    footerLeft: "Português (Brasil)",
    footerRight: "TikTok",
    privacyUrl: "#",
    termsUrl: "#",
    accountLabel: "Entrar no TikTok",
    mockAccounts: [
      { name: "@musicbusiness", email: "musicbusiness@empresa.com", avatar: "M" },
    ],
  },
  google_business: {
    name: "Google",
    tagline: "para continuar para Google & YouTube — Music Business",
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
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@gmail.com", avatar: "M" },
      { name: "Admin Empresa", email: "admin.empresa@gmail.com", avatar: "A" },
    ],
  },
  spotify_ads: {
    name: "Spotify",
    tagline: "para continuar para o Ad Studio",
    logo: "S",
    bgColor: "#121212",
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
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" },
    ],
  },
  corp_spotify: {
    name: "Spotify",
    tagline: "para continuar para o Spotify for Artists",
    logo: "S",
    bgColor: "#121212",
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
    mockAccounts: [
      { name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" },
    ],
  },
};

// Fallback para plataformas sem config específica
const FALLBACK: PlatformConfig = {
  name: "Plataforma",
  tagline: "para continuar",
  logo: "P",
  bgColor: "#f5f5f5",
  accentColor: "#333",
  buttonBg: "#333",
  buttonText: "#fff",
  borderRadius: "6px",
  loginHint: "E-mail",
  passwordHint: "Senha",
  footerLeft: "Português (Brasil)",
  footerRight: "Music OS 360",
  privacyUrl: "#",
  termsUrl: "#",
  accountLabel: "Entrar",
  mockAccounts: [{ name: "Music Business", email: "musicbusiness@empresa.com", avatar: "M" }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendSuccessAndClose(platform: string) {
  if (window.opener) {
    window.opener.postMessage({ type: "musicos360_oauth_success", platform }, "*");
  }
  window.close();
}

// ─── Componente ───────────────────────────────────────────────────────────────

type Step = "choose" | "email" | "password" | "connecting";

export default function OAuthPopupPage() {
  const { platform = "google_business" } = useParams<{ platform: string }>();
  const cfg = PLATFORMS[platform] ?? FALLBACK;

  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [pwError, setPwError] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const isDark = cfg.bgColor === "#121212";
  const textMain = isDark ? "#ffffff" : "#202124";
  const textSub = isDark ? "#b3b3b3" : "#5f6368";
  const cardBg = isDark ? "#282828" : "#ffffff";
  const inputBg = isDark ? "#3e3e3e" : "#ffffff";
  const inputBorder = isDark ? "#5a5a5a" : "#dadce0";
  const dividerColor = isDark ? "#3e3e3e" : "#e0e0e0";
  const hoverBg = isDark ? "#383838" : "#f5f5f5";

  // ── Escolher conta ─────────────────────────────────────────────────────────
  const handleAccountClick = (email: string) => {
    setSelectedAccount(email);
    setStep("connecting");
    setTimeout(() => sendSuccessAndClose(platform), 1400);
  };

  const handleUseAnother = () => {
    setStep("email");
    setEmail("");
    setPassword("");
    setEmailError("");
    setPwError("");
  };

  // ── E-mail ────────────────────────────────────────────────────────────────
  const handleEmailNext = () => {
    if (!email.trim()) { setEmailError("Introduza um e-mail válido."); return; }
    setEmailError("");
    setStep("password");
  };

  // ── Senha + conectar ──────────────────────────────────────────────────────
  const handlePasswordNext = () => {
    if (!password) { setPwError("Introduza a sua senha."); return; }
    setPwError("");
    setStep("connecting");
    setTimeout(() => sendSuccessAndClose(platform), 1400);
  };

  return (
    <div
      style={{ backgroundColor: cfg.bgColor, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}
    >
      {/* ── Card ── */}
      <div
        style={{
          backgroundColor: cardBg,
          borderRadius: "12px",
          border: isDark ? "none" : "1px solid #dadce0",
          width: "min(400px, calc(100vw - 32px))",
          padding: "40px 40px 24px",
          boxShadow: isDark ? "0 4px 24px rgba(0,0,0,.4)" : "0 2px 8px rgba(0,0,0,.08)",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              backgroundColor: cfg.accentColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: "#fff",
              flexShrink: 0,
            }}
          >
            {cfg.logo}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: textMain }}>
              {step === "choose" ? "Escolher uma conta" : `Entrar — ${cfg.name}`}
            </div>
            <div style={{ fontSize: 12, color: textSub }}>{cfg.tagline}</div>
          </div>
        </div>

        <div style={{ width: "100%", height: 1, backgroundColor: dividerColor, margin: "0 -40px", width: "calc(100% + 80px)", marginBottom: 16 }} />

        {/* ── STEP: choose ── */}
        {step === "choose" && (
          <>
            {cfg.mockAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleAccountClick(acc.email)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "10px 12px",
                  backgroundColor: "transparent", border: "none",
                  borderRadius: 6, cursor: "pointer", textAlign: "left",
                  transition: "background .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    backgroundColor: cfg.accentColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 600, color: "#fff", flexShrink: 0,
                  }}
                >
                  {acc.avatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: textMain }}>{acc.name}</div>
                  <div style={{ fontSize: 12, color: textSub }}>{acc.email}</div>
                </div>
                <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
              </button>
            ))}

            {/* Usar outra conta */}
            <button
              onClick={handleUseAnother}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "10px 12px",
                backgroundColor: "transparent", border: "none",
                borderRadius: 6, cursor: "pointer", textAlign: "left",
                transition: "background .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  backgroundColor: isDark ? "#5a5a5a" : "#e8eaed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <UserCircle2 size={18} color={textSub} />
              </div>
              <div style={{ fontSize: 14, color: textMain }}>Usar outra conta</div>
              <ChevronRight size={16} color={textSub} style={{ marginLeft: "auto" }} />
            </button>
          </>
        )}

        {/* ── STEP: email ── */}
        {step === "email" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: textSub, margin: 0 }}>
              Introduza o seu {cfg.loginHint.toLowerCase()} para continuar.
            </p>
            <div style={{ position: "relative" }}>
              <Mail size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder={cfg.loginHint}
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                onKeyDown={e => e.key === "Enter" && handleEmailNext()}
                autoFocus
                style={{
                  width: "100%", padding: "9px 12px 9px 32px",
                  border: `1px solid ${emailError ? "#d93025" : inputBorder}`,
                  borderRadius: 4, fontSize: 14,
                  backgroundColor: inputBg, color: textMain,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            {emailError && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{emailError}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <button
                onClick={() => setStep("choose")}
                style={{ fontSize: 13, color: cfg.accentColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Voltar
              </button>
              <button
                onClick={handleEmailNext}
                style={{
                  padding: "8px 20px", fontSize: 14, fontWeight: 500,
                  backgroundColor: cfg.buttonBg, color: cfg.buttonText,
                  border: "none", borderRadius: cfg.borderRadius,
                  cursor: "pointer",
                }}
              >
                Seguinte
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: password ── */}
        {step === "password" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 20,
                border: `1px solid ${inputBorder}`, width: "fit-content",
                backgroundColor: isDark ? "#3e3e3e" : "#f1f3f4",
              }}
            >
              <div
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  backgroundColor: cfg.accentColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, color: "#fff",
                }}
              >
                {email[0]?.toUpperCase() ?? "U"}
              </div>
              <span style={{ fontSize: 13, color: textMain }}>{email}</span>
              <button
                onClick={() => setStep("email")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 4 }}
              >
                <span style={{ fontSize: 11, color: textSub }}>▼</span>
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={15} color={textSub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type={showPw ? "text" : "password"}
                placeholder={cfg.passwordHint}
                value={password}
                onChange={e => { setPassword(e.target.value); setPwError(""); }}
                onKeyDown={e => e.key === "Enter" && handlePasswordNext()}
                autoFocus
                style={{
                  width: "100%", padding: "9px 36px 9px 32px",
                  border: `1px solid ${pwError ? "#d93025" : inputBorder}`,
                  borderRadius: 4, fontSize: 14,
                  backgroundColor: inputBg, color: textMain,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {showPw ? <EyeOff size={15} color={textSub} /> : <Eye size={15} color={textSub} />}
              </button>
            </div>
            {pwError && <p style={{ color: "#d93025", fontSize: 12, margin: 0 }}>{pwError}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <button
                onClick={() => setStep("email")}
                style={{ fontSize: 13, color: cfg.accentColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Voltar
              </button>
              <button
                onClick={handlePasswordNext}
                style={{
                  padding: "8px 20px", fontSize: 14, fontWeight: 500,
                  backgroundColor: cfg.buttonBg, color: cfg.buttonText,
                  border: "none", borderRadius: cfg.borderRadius,
                  cursor: "pointer",
                }}
              >
                Seguinte
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: connecting ── */}
        {step === "connecting" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: "50%",
                border: `3px solid ${cfg.accentColor}`,
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: 14, color: textSub, margin: 0 }}>
              A autenticar com {cfg.name}…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>

      {/* ── Rodapé ── */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          width: "min(400px, calc(100vw - 32px))",
          padding: "12px 4px 0",
          fontSize: 12, color: textSub,
        }}
      >
        <span>{cfg.footerLeft}</span>
        <div style={{ display: "flex", gap: 16 }}>
          <a href={cfg.privacyUrl} style={{ color: textSub, textDecoration: "none" }}>Privacidade</a>
          <a href={cfg.termsUrl} style={{ color: textSub, textDecoration: "none" }}>Termos</a>
          <span>{cfg.footerRight}</span>
        </div>
      </div>
    </div>
  );
}
