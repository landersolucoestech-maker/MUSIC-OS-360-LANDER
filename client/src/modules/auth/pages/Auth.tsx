import { useState, forwardRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignIn } from "@clerk/clerk-react";
import { useAuth } from "@/app/providers/AuthContext";
import { toast } from "sonner";
import {
  Loader2, User, Lock, Eye, EyeOff, Facebook, Instagram,
  MessageCircle, Globe, Mail, ArrowLeft, BarChart2, ShieldCheck,
  Users, TrendingUp,
} from "lucide-react";
import { authRateLimiter } from "@/shared/lib/security";
import { MOCK_MODE } from "@/shared/lib/env";

const CLERK_KEY    = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const useClerkMode = !MOCK_MODE && Boolean(CLERK_KEY);

const loginSchema = z.object({
  email:    z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});
const forgotSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});

type LoginData  = z.infer<typeof loginSchema>;
type ForgotData = z.infer<typeof forgotSchema>;
type Mode = "login" | "forgot";

export default function Auth() {
  if (MOCK_MODE) return <Navigate to="/" replace />;
  return <AuthPage />;
}

// ── Particle dots (decorative) ────────────────────────────────────────────────
const DOTS = [
  { x: 8,  y: 88, s: 2,   o: 0.7 },
  { x: 14, y: 82, s: 1.5, o: 0.5 },
  { x: 22, y: 92, s: 2.5, o: 0.6 },
  { x: 5,  y: 75, s: 1.5, o: 0.4 },
  { x: 30, y: 86, s: 2,   o: 0.5 },
  { x: 18, y: 96, s: 1.5, o: 0.6 },
  { x: 10, y: 70, s: 1,   o: 0.3 },
  { x: 35, y: 94, s: 1.5, o: 0.4 },
  { x: 3,  y: 83, s: 2,   o: 0.5 },
  { x: 25, y: 78, s: 1,   o: 0.3 },
  { x: 40, y: 90, s: 2,   o: 0.4 },
  { x: 12, y: 99, s: 1.5, o: 0.5 },
  { x: 28, y: 72, s: 1,   o: 0.25 },
  { x: 42, y: 82, s: 1.5, o: 0.35 },
  { x: 6,  y: 93, s: 2.5, o: 0.55 },
  { x: 20, y: 68, s: 1,   o: 0.2 },
  { x: 33, y: 76, s: 1.5, o: 0.3 },
  { x: 15, y: 65, s: 1,   o: 0.2 },
  { x: 38, y: 70, s: 1.5, o: 0.25 },
  { x: 45, y: 95, s: 1,   o: 0.3 },
];

function Particles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {DOTS.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400"
          style={{
            left: `${d.x}%`,
            top:  `${d.y}%`,
            width:  `${d.s}px`,
            height: `${d.s}px`,
            opacity: d.o,
            boxShadow: `0 0 ${d.s * 2}px rgba(59,130,246,0.8)`,
          }}
        />
      ))}
      {/* Ambient glow */}
      <div
        className="absolute"
        style={{
          bottom: "-60px",
          left:   "-60px",
          width:  "340px",
          height: "340px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="min-h-screen flex" style={{ background: "#080e1c" }}>

      {/* ══════════ LEFT PANEL ══════════ */}
      <div
        className="w-full lg:w-[44%] flex flex-col relative overflow-hidden"
        style={{ background: "#08111f" }}
      >
        <Particles />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">

          {/* ─ Logo ─ */}
          <div className="flex items-center gap-4 mb-1">
            {/* Sound bars */}
            <div className="flex items-end gap-[4px]" style={{ height: "52px" }}>
              {[18, 30, 42, 52, 42, 30, 18].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: "5px",
                    height: `${h}px`,
                    borderRadius: "3px",
                    background: "linear-gradient(to top, #1d4ed8, #3b82f6)",
                    boxShadow: "0 0 6px rgba(59,130,246,0.6)",
                  }}
                />
              ))}
            </div>
            {/* Brand text */}
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ color: "#ffffff", fontWeight: 900, fontSize: "32px", letterSpacing: "2px" }}>MUSIC</div>
              <div style={{ color: "#3b82f6", fontWeight: 900, fontSize: "32px", letterSpacing: "2px" }}>OS 360</div>
            </div>
          </div>

          {/* ─ Tagline ─ */}
          <div className="mt-5 mb-10">
            <p style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px" }}>Sistema de Gestão Musical</p>
            <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "6px", lineHeight: 1.6, textAlign: "center" }}>
              Plataforma completa para gestão operacional<br />da indústria musical.
            </p>
          </div>

          {/* ─ Form area ─ */}
          <div className="flex-1 flex flex-col justify-center" style={{ maxWidth: "360px" }}>
            {mode === "login"  && <LoginForm  onForgot={() => setMode("forgot")} />}
            {mode === "forgot" && <ForgotForm onBack={() => setMode("login")} />}
          </div>

          {/* ─ Footer ─ */}
          <div className="mt-6">
            <div className="flex justify-center gap-7 mb-4">
              {[Facebook, Instagram, MessageCircle, Globe].map((Icon, i) => (
                <a key={i} href="#" style={{ color: "#4b5563" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#4b5563")}
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: "11px", color: "#374151" }}>
              © MUSIC OS 360. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div
        className="hidden lg:flex lg:w-[56%] relative overflow-hidden flex-col justify-end"
        style={{ background: "#050c18" }}
      >
        {/* Background depth gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 60% 40%, #0d1f3a 0%, #050c18 60%)",
          }}
        />

        {/* ─ 3D Card ─ */}
        <div
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-54%, -60%) perspective(1200px) rotateX(12deg) rotateY(-16deg) rotateZ(-2deg)",
            zIndex: 10,
          }}
        >
          {/* Card outer shadow/glow */}
          <div
            style={{
              width: "420px",
              height: "280px",
              borderRadius: "20px",
              background: "linear-gradient(145deg, #1a2744 0%, #0c1529 40%, #111d38 70%, #0a1422 100%)",
              boxShadow: [
                "0 60px 120px rgba(0,0,0,0.8)",
                "0 20px 60px rgba(0,0,0,0.6)",
                "-8px -8px 30px rgba(255,255,255,0.03)",
                "inset 0 1px 0 rgba(255,255,255,0.07)",
                "inset 0 -1px 0 rgba(0,0,0,0.5)",
                "0 0 80px rgba(30,64,175,0.12)",
              ].join(", "),
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Card inner texture */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
                borderRadius: "20px",
              }}
            />

            {/* Sound bars on card */}
            <div className="relative z-10 flex items-end gap-[6px]" style={{ height: "72px" }}>
              {[20, 36, 52, 68, 52, 36, 20].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: `${h}px`,
                    borderRadius: "4px",
                    background: "linear-gradient(to top, #1e40af, #60a5fa)",
                    boxShadow: `0 0 12px rgba(96,165,250,0.8), 0 0 24px rgba(59,130,246,0.4)`,
                  }}
                />
              ))}
            </div>

            {/* Brand on card */}
            <div className="relative z-10 text-center" style={{ lineHeight: 1.05 }}>
              <div style={{
                color: "#ffffff",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "4px",
                textShadow: "0 2px 20px rgba(255,255,255,0.15)",
              }}>MUSIC</div>
              <div style={{
                color: "#3b82f6",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "4px",
                textShadow: "0 2px 20px rgba(59,130,246,0.5)",
              }}>OS 360</div>
            </div>

            {/* Card bottom edge light */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "10%",
                right: "10%",
                height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)",
              }}
            />
          </div>
        </div>

        {/* ─ Bottom text + features ─ */}
        <div className="relative z-10 px-14 pb-12">
          <h2 style={{ color: "#ffffff", fontSize: "26px", fontWeight: 800, marginBottom: "8px" }}>
            Gestão. Controle. Crescimento.
          </h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "36px", lineHeight: 1.6 }}>
            Tudo o que você precisa para<br />levar sua música mais longe.
          </p>

          {/* Feature grid with vertical dividers */}
          <div className="grid grid-cols-4" style={{ gap: 0 }}>
            {[
              { icon: BarChart2,   label: "ANALYTICS",   desc: "Dados que geram estratégias." },
              { icon: ShieldCheck, label: "SEGURANÇA",   desc: "Proteção total para suas informações." },
              { icon: Users,       label: "INTEGRAÇÃO",  desc: "Conecte artistas, equipes e parceiros." },
              { icon: TrendingUp,  label: "PERFORMANCE", desc: "Acompanhe e impulsione resultados." },
            ].map(({ icon: Icon, label, desc }, idx) => (
              <div
                key={label}
                style={{
                  textAlign: "center",
                  padding: "0 16px",
                  borderLeft: idx > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                <Icon size={28} style={{ color: "#60a5fa", margin: "0 auto 10px" }} />
                <p style={{ color: "#ffffff", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" }}>{label}</p>
                <p style={{ color: "#6b7280", fontSize: "11px", lineHeight: 1.4 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AuthInput ─────────────────────────────────────────────────────────────────

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ElementType;
  error?: string;
  showToggle?: boolean;
  onToggle?: () => void;
  showPass?: boolean;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { icon: Icon, error, showToggle, onToggle, showPass, type, ...rest },
  ref,
) {
  return (
    <div style={{ marginBottom: error ? "0" : "0" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Icon
          size={16}
          style={{
            position: "absolute",
            left: "16px",
            color: "#6b7280",
            pointerEvents: "none",
          }}
        />
        <input
          ref={ref}
          type={showToggle ? (showPass ? "text" : "password") : type}
          style={{
            width: "100%",
            height: "50px",
            borderRadius: "10px",
            border: "1px solid #374151",
            background: "transparent",
            color: "#ffffff",
            fontSize: "14px",
            paddingLeft: "44px",
            paddingRight: showToggle ? "44px" : "16px",
            outline: "none",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#3b82f6")}
          onBlur={e  => (e.currentTarget.style.borderColor = "#374151")}
          {...rest}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            style={{ position: "absolute", right: "12px", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p style={{ color: "#f87171", fontSize: "11px", marginTop: "4px", paddingLeft: "4px" }}>{error}</p>}
    </div>
  );
});

// ── LoginForm ─────────────────────────────────────────────────────────────────

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { signIn, setActive }   = useSignIn();
  const { signIn: mockSignIn }  = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginData) => {
    if (!authRateLimiter.check(data.email)) {
      const min = Math.ceil(authRateLimiter.getTimeUntilReset(data.email) / 60000);
      toast.error(`Conta bloqueada temporariamente. Tente em ${min} minutos.`);
      return;
    }
    setLoading(true);
    try {
      if (useClerkMode && signIn) {
        const result = await signIn.create({ identifier: data.email, password: data.password });
        if (result.status === "complete") {
          authRateLimiter.reset(data.email);
          await setActive!({ session: result.createdSessionId });
          toast.success("Bem-vindo ao MUSIC OS 360!");
        } else {
          toast.error("Autenticação incompleta. Verifique seu email.");
        }
      } else {
        const { error } = await mockSignIn(data.email, data.password);
        if (error) {
          const rem = authRateLimiter.getRemainingAttempts(data.email);
          toast.error(`${error.message}. ${rem} tentativas restantes.`);
        } else {
          authRateLimiter.reset(data.email);
          toast.success("Bem-vindo!");
        }
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Erro ao fazer login.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <AuthInput
        icon={User}
        type="email"
        placeholder="Digite o Usuário"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <AuthInput
        icon={Lock}
        type="password"
        placeholder="Digite sua senha"
        autoComplete="current-password"
        showToggle
        showPass={showPass}
        onToggle={() => setShowPass(p => !p)}
        error={errors.password?.message}
        {...register("password")}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          height: "50px",
          borderRadius: "10px",
          background: loading ? "#1d4ed8" : "#2563eb",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: "14px",
          letterSpacing: "2px",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          opacity: loading ? 0.8 : 1,
          transition: "background 0.2s",
          marginTop: "4px",
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
        onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#2563eb"; }}
      >
        {loading ? <><Loader2 size={16} className="animate-spin" />ACESSANDO...</> : "ACESSAR O SISTEMA"}
      </button>

      <div style={{ textAlign: "center", marginTop: "4px" }}>
        <button
          type="button"
          onClick={onForgot}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#9ca3af", fontSize: "13px",
            textDecoration: "underline", textUnderlineOffset: "3px",
            display: "block", width: "100%", marginBottom: "8px",
          }}
        >
          Esqueci minha senha
        </button>
        <Link
          to="/register"
          style={{ color: "#3b82f6", fontSize: "13px", textDecoration: "none", display: "block" }}
        >
          Criar nova conta
        </Link>
      </div>
    </form>
  );
}

// ── ForgotForm ────────────────────────────────────────────────────────────────

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const { resetPassword }     = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotData) => {
    setLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      if (error) toast.error(error.message);
      else {
        toast.success("Email enviado! Verifique sua caixa de entrada.");
        onBack();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ marginBottom: "4px" }}>
        <p style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px" }}>Recuperar Senha</p>
        <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "6px" }}>
          Digite seu email para receber um link de redefinição.
        </p>
      </div>
      <AuthInput
        icon={Mail}
        type="email"
        placeholder="Seu email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%", height: "50px", borderRadius: "10px",
          background: "#2563eb", color: "#ffffff", fontWeight: 800,
          fontSize: "14px", letterSpacing: "2px", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: "8px",
        }}
      >
        {loading ? <><Loader2 size={16} className="animate-spin" />ENVIANDO...</> : "ENVIAR LINK"}
      </button>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#6b7280", fontSize: "13px", display: "flex",
          alignItems: "center", justifyContent: "center", gap: "4px",
          width: "100%",
        }}
      >
        <ArrowLeft size={14} /> Voltar ao Login
      </button>
    </form>
  );
}
