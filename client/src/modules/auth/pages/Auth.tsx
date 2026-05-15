import { useState, forwardRef } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { useAuth } from "@/app/providers/AuthContext";
import { toast } from "sonner";
import {
  Loader2, User, Lock, Eye, EyeOff, Facebook, Instagram,
  MessageCircle, Globe, Mail, ArrowLeft, BarChart2, ShieldCheck,
  Users, TrendingUp,
} from "lucide-react";
import { authRateLimiter } from "@/shared/lib/security";
import { MOCK_MODE } from "@/shared/lib/env";

// ─── Clerk mode detection ──────────────────────────────────────────────────────

const CLERK_KEY    = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const useClerkMode = !MOCK_MODE && Boolean(CLERK_KEY);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const signupSchema = z.object({
  fullName:        z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email:           z.string().trim().email("Email inválido"),
  password:        z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirme sua senha"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

const forgotSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});

type LoginData  = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;
type ForgotData = z.infer<typeof forgotSchema>;
type Mode = "login" | "signup" | "forgot";

// ─── Root export ──────────────────────────────────────────────────────────────

export default function Auth() {
  if (MOCK_MODE) return <Navigate to="/" replace />;
  return <AuthPage />;
}

// ─── Main auth page ───────────────────────────────────────────────────────────

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="min-h-screen flex bg-[#060d1a]">
      {/* ── LEFT PANEL ── */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between px-10 py-10 relative overflow-hidden">
        {/* Background subtle glow */}
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-10 w-48 h-48 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-end gap-[3px] h-9">
            {[3,5,7,9,7,5,3].map((h, i) => (
              <div key={i} className="w-[4px] rounded-full bg-blue-500" style={{ height: `${h * 3}px` }} />
            ))}
          </div>
          <div className="leading-tight">
            <span className="block text-white font-extrabold text-2xl tracking-wide">MUSIC</span>
            <span className="block text-blue-500 font-extrabold text-2xl tracking-wide">OS 360</span>
          </div>
        </div>

        {/* Subtitle */}
        <div className="mb-8">
          <p className="text-white font-semibold text-base">Sistema de Gestão Musical</p>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Plataforma completa para gestão operacional<br />da indústria musical.
          </p>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto lg:mx-0">
          {mode === "login"  && <LoginForm  onForgot={() => setMode("forgot")} onSignup={() => setMode("signup")} />}
          {mode === "signup" && <SignupForm onBack={() => setMode("login")} />}
          {mode === "forgot" && <ForgotForm onBack={() => setMode("login")} />}
        </div>

        {/* Footer */}
        <div className="mt-8">
          <div className="flex justify-center gap-6 mb-4">
            <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors"><Facebook className="h-5 w-5" /></a>
            <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors"><Instagram className="h-5 w-5" /></a>
            <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors"><MessageCircle className="h-5 w-5" /></a>
            <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors"><Globe className="h-5 w-5" /></a>
          </div>
          <p className="text-center text-xs text-gray-600">© MUSIC OS 360. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#0a0f1e] flex-col justify-end p-12">
        {/* Texture / noise overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e1628] via-[#070d1a] to-[#0a1020] opacity-90" />

        {/* 3D Card — logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] z-10">
          <div
            className="w-64 h-44 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-2xl border border-white/10"
            style={{
              background: "linear-gradient(135deg, #1a2340 0%, #0d1528 50%, #111c35 100%)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
              transform: "perspective(800px) rotateX(4deg) rotateY(-6deg)",
            }}
          >
            <div className="flex items-end gap-[3px] h-9">
              {[3,5,7,9,7,5,3].map((h, i) => (
                <div key={i} className="w-[5px] rounded-full bg-blue-500" style={{ height: `${h * 3.5}px`, boxShadow: "0 0 6px rgba(59,130,246,0.6)" }} />
              ))}
            </div>
            <div className="text-center leading-tight mt-1">
              <span className="block text-white font-extrabold text-3xl tracking-widest">MUSIC</span>
              <span className="block text-blue-500 font-extrabold text-3xl tracking-widest">OS 360</span>
            </div>
          </div>
        </div>

        {/* Bottom content */}
        <div className="relative z-10">
          <h2 className="text-white text-2xl font-bold mb-2">Gestão. Controle. Crescimento.</h2>
          <p className="text-gray-400 text-sm mb-8">Tudo o que você precisa para<br />levar sua música mais longe.</p>

          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: BarChart2,   label: "ANALYTICS",   desc: "Dados que geram estratégias." },
              { icon: ShieldCheck, label: "SEGURANÇA",   desc: "Proteção total para suas informações." },
              { icon: Users,       label: "INTEGRAÇÃO",  desc: "Conecte artistas, equipes e parceiros." },
              { icon: TrendingUp,  label: "PERFORMANCE", desc: "Acompanhe e impulsione resultados." },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center">
                <div className="flex justify-center mb-2">
                  <Icon className="h-7 w-7 text-blue-400" />
                </div>
                <p className="text-white text-xs font-bold tracking-wider mb-1">{label}</p>
                <p className="text-gray-500 text-xs leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Input component ──────────────────────────────────────────────────────────

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
    <div className="space-y-1">
      <div className="relative flex items-center">
        <Icon className="absolute left-4 h-4 w-4 text-gray-500 pointer-events-none" />
        <input
          ref={ref}
          type={showToggle ? (showPass ? "text" : "password") : type}
          className="w-full h-12 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-500 text-sm pl-11 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
          {...rest}
        />
        {showToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3 text-gray-500 hover:text-gray-300">
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs pl-1">{error}</p>}
    </div>
  );
});

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onForgot, onSignup }: { onForgot: () => void; onSignup: () => void }) {
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { signIn, setActive }   = useSignIn();
  const { signIn: mockSignIn }  = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AuthInput icon={User} type="email" placeholder="Digite o Usuário" error={errors.email?.message} {...register("email")} />
      <AuthInput icon={Lock} type="password" placeholder="Digite sua senha" showToggle showPass={showPass} onToggle={() => setShowPass(p => !p)} error={errors.password?.message} {...register("password")} />

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />ACESSANDO...</> : "ACESSAR O SISTEMA"}
      </button>

      <div className="text-center space-y-2 pt-1">
        <button type="button" onClick={onForgot} className="text-sm text-gray-400 underline underline-offset-2 hover:text-white transition-colors block w-full">
          Esqueci minha senha
        </button>
        <button type="button" onClick={onSignup} className="text-sm text-blue-400 hover:text-blue-300 transition-colors block w-full">
          Criar nova conta
        </button>
      </div>
    </form>
  );
}

// ─── Signup form ──────────────────────────────────────────────────────────────

function SignupForm({ onBack }: { onBack: () => void }) {
  const [showPass, setShowPass]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const { signUp, setActive }     = useSignUp();
  const { signUp: mockSignUp }    = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupData) => {
    setLoading(true);
    try {
      if (useClerkMode && signUp) {
        const nameParts  = data.fullName.trim().split(" ");
        const firstName  = nameParts[0];
        const lastName   = nameParts.slice(1).join(" ") || "";
        const result = await signUp.create({
          emailAddress: data.email,
          password:     data.password,
          firstName,
          lastName,
        });
        if (result.status === "complete") {
          await setActive!({ session: result.createdSessionId });
          toast.success("Conta criada com sucesso!");
        } else {
          toast.info("Verifique seu email para ativar a conta.");
        }
      } else {
        const { error } = await mockSignUp(data.email, data.password, data.fullName);
        if (error) toast.error(error.message);
        else toast.success("Conta criada!");
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Erro ao criar conta.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <AuthInput icon={User} type="text"     placeholder="Nome Completo"    error={errors.fullName?.message}        {...register("fullName")} />
      <AuthInput icon={Mail} type="email"    placeholder="Email"            error={errors.email?.message}           {...register("email")} />
      <AuthInput icon={Lock} type="password" placeholder="Senha"            showToggle showPass={showPass} onToggle={() => setShowPass(p => !p)} error={errors.password?.message} {...register("password")} />
      <AuthInput icon={Lock} type="password" placeholder="Confirmar Senha"  error={errors.confirmPassword?.message} {...register("confirmPassword")} />

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />CRIANDO...</> : "CRIAR CONTA"}
      </button>

      <button type="button" onClick={onBack} className="w-full text-sm text-gray-500 hover:text-white flex items-center justify-center gap-1 transition-colors pt-1">
        <ArrowLeft className="h-4 w-4" />Voltar ao Login
      </button>
    </form>
  );
}

// ─── Forgot password form ─────────────────────────────────────────────────────

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const { resetPassword }     = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotData) => {
    setLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      if (error) toast.error(error.message);
      else { toast.success("Email enviado! Verifique sua caixa de entrada."); onBack(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-2">
        <p className="text-white font-semibold">Recuperar Senha</p>
        <p className="text-gray-400 text-sm mt-1">Digite seu email para receber um link de redefinição.</p>
      </div>
      <AuthInput icon={Mail} type="email" placeholder="Seu email" error={errors.email?.message} {...register("email")} />
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />ENVIANDO...</> : "ENVIAR LINK"}
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-gray-500 hover:text-white flex items-center justify-center gap-1 transition-colors">
        <ArrowLeft className="h-4 w-4" />Voltar ao Login
      </button>
    </form>
  );
}
