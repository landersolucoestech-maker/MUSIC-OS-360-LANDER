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
const refImg = "/auth-bg.png";

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

// ── Particle dots ─────────────────────────────────────────────────────────────
const DOTS = [
  {x:6,y:88,s:2.2,o:0.75},{x:13,y:82,s:1.6,o:0.5},{x:21,y:93,s:2.6,o:0.6},
  {x:4,y:76,s:1.4,o:0.4},{x:29,y:87,s:2,o:0.5},{x:17,y:97,s:1.6,o:0.6},
  {x:9,y:71,s:1,o:0.3},{x:34,y:94,s:1.6,o:0.4},{x:2,y:84,s:2.1,o:0.5},
  {x:24,y:79,s:1,o:0.3},{x:39,y:91,s:2,o:0.4},{x:11,y:99,s:1.5,o:0.5},
  {x:27,y:73,s:1,o:0.25},{x:41,y:83,s:1.5,o:0.35},{x:5,y:95,s:2.5,o:0.55},
  {x:19,y:68,s:1,o:0.2},{x:32,y:77,s:1.5,o:0.3},{x:44,y:89,s:1.2,o:0.35},
  {x:15,y:64,s:1,o:0.2},{x:37,y:70,s:1.4,o:0.25},{x:8,y:60,s:0.8,o:0.15},
  {x:22,y:58,s:0.8,o:0.15},{x:46,y:96,s:1,o:0.3},{x:3,y:91,s:1.8,o:0.45},
];

function Particles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {DOTS.map((d,i) => (
        <div key={i} className="absolute rounded-full" style={{
          left:`${d.x}%`, top:`${d.y}%`,
          width:`${d.s}px`, height:`${d.s}px`,
          background:"#60a5fa",
          opacity:d.o,
          boxShadow:`0 0 ${d.s*3}px rgba(96,165,250,0.9)`,
        }}/>
      ))}
      <div className="absolute" style={{
        bottom:"-80px", left:"-80px",
        width:"380px", height:"380px",
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(29,78,216,0.22) 0%, transparent 70%)",
      }}/>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"#07101f" }}>

      {/* ══ LEFT PANEL ══ */}
      <div className="w-full lg:w-[44%]" style={{
        display:"flex", flexDirection:"column",
        position:"relative", overflow:"hidden",
        background:"#07101f",
      }}>

        {/* Blue glow radial — bottom-left corner */}
        <div style={{
          position:"absolute", bottom:"-60px", left:"-60px",
          width:"380px", height:"380px", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)",
          pointerEvents:"none",
        }}/>
        {/* Subtle top-right glow */}
        <div style={{
          position:"absolute", top:"-40px", right:"-40px",
          width:"220px", height:"220px", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          pointerEvents:"none",
        }}/>

        <Particles />

        <div style={{
          position:"relative", zIndex:10,
          display:"flex", flexDirection:"column",
          height:"100%", padding:"36px 52px",
        }}>

          {/* ─ Centre block: logo + tagline + form ─ */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:"0" }}>

            {/* Logo */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"18px", marginBottom:"20px" }}>
              <div style={{ display:"flex", alignItems:"flex-end", gap:"4px", height:"56px" }}>
                {[20,32,44,56,44,32,20].map((h,i) => (
                  <div key={i} style={{
                    width:"5px", height:`${h}px`, borderRadius:"3px",
                    background:"linear-gradient(to top, #1d4ed8, #3b82f6)",
                    boxShadow:"0 0 10px rgba(59,130,246,0.8)",
                  }}/>
                ))}
              </div>
              <div style={{ lineHeight:1.05 }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:"32px", letterSpacing:"2px" }}>MUSIC</div>
                <div style={{ color:"#3b82f6", fontWeight:900, fontSize:"32px", letterSpacing:"2px" }}>OS 360</div>
              </div>
            </div>

            {/* Tagline */}
            <div style={{ textAlign:"center", marginBottom:"28px" }}>
              <p style={{ color:"#fff", fontWeight:700, fontSize:"15px", marginBottom:"6px" }}>
                Sistema de Gestão Musical
              </p>
              <p style={{ color:"#6b7280", fontSize:"13px", lineHeight:1.65 }}>
                Plataforma completa para gestão operacional<br/>da indústria musical.
              </p>
            </div>

            {/* Form */}
            <div>
              {mode==="login"  && <LoginForm  onForgot={()=>setMode("forgot")}/>}
              {mode==="forgot" && <ForgotForm onBack={()=>setMode("login")}/>}
            </div>

          </div>

          {/* Footer — pinned to bottom */}
          <div style={{ paddingTop:"20px" }}>
            <div style={{ display:"flex", justifyContent:"center", gap:"28px", marginBottom:"12px" }}>
              {[Facebook,Instagram,MessageCircle,Globe].map((Icon,i) => (
                <a key={i} href="#"
                  style={{ color:"#4b5563", transition:"color .2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="#3b82f6")}
                  onMouseLeave={e=>(e.currentTarget.style.color="#4b5563")}
                ><Icon size={20}/></a>
              ))}
            </div>
            <p style={{ textAlign:"center", fontSize:"11px", color:"#374151" }}>
              © MUSIC OS 360. Todos os direitos reservados.
            </p>
          </div>

        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div
        className="hidden lg:block lg:w-[56%]"
        style={{ position:"relative", overflow:"hidden", background:"#040b16" }}
      >
        {/* Reference image — right portion only (card mockup) */}
        <img
          src={refImg}
          alt=""
          aria-hidden="true"
          style={{
            position:"absolute",
            top:0, right:0,
            height:"100%",
            width:"auto",
            objectFit:"cover",
            objectPosition:"right top",
            userSelect:"none",
            pointerEvents:"none",
          }}
        />

        {/* Gradient that fades the image bottom into solid background */}
        <div style={{
          position:"absolute",
          bottom:0, left:0, right:0,
          height:"68%",
          background:"linear-gradient(to bottom, transparent 0%, rgba(4,11,22,0.85) 30%, #040b16 52%)",
          zIndex:1,
        }}/>

        {/* Text + features over the solid area */}
        <div style={{
          position:"absolute",
          bottom:0, left:0, right:0,
          padding:"0 56px 44px",
          zIndex:2,
        }}>
          <h2 style={{ color:"#fff", fontSize:"26px", fontWeight:800, marginBottom:"8px" }}>
            Gestão. Controle. Crescimento.
          </h2>
          <p style={{ color:"#6b7280", fontSize:"14px", marginBottom:"32px", lineHeight:1.6 }}>
            Tudo o que você precisa para<br/>levar sua música mais longe.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)" }}>
            {[
              { icon:BarChart2,   label:"ANALYTICS",   desc:"Dados que geram estratégias." },
              { icon:ShieldCheck, label:"SEGURANÇA",   desc:"Proteção total para suas informações." },
              { icon:Users,       label:"INTEGRAÇÃO",  desc:"Conecte artistas, equipes e parceiros." },
              { icon:TrendingUp,  label:"PERFORMANCE", desc:"Acompanhe e impulsione resultados." },
            ].map(({icon:Icon,label,desc},idx) => (
              <div key={label} style={{
                textAlign:"center", padding:"0 12px",
                borderLeft: idx>0 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <Icon size={26} style={{ color:"#60a5fa", margin:"0 auto 10px" }}/>
                <p style={{ color:"#fff", fontSize:"11px", fontWeight:700, letterSpacing:"1px", marginBottom:"5px" }}>{label}</p>
                <p style={{ color:"#6b7280", fontSize:"11px", lineHeight:1.4 }}>{desc}</p>
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
  icon: React.ElementType; error?: string;
  showToggle?: boolean; onToggle?: () => void; showPass?: boolean;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { icon: Icon, error, showToggle, onToggle, showPass, type, ...rest }, ref,
) {
  return (
    <div>
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <Icon size={15} style={{ position:"absolute", left:"15px", color:"#6b7280", pointerEvents:"none" }}/>
        <input
          ref={ref}
          type={showToggle?(showPass?"text":"password"):type}
          style={{
            width:"100%", height:"50px", borderRadius:"10px",
            border:"1px solid #374151", background:"transparent",
            color:"#fff", fontSize:"14px",
            paddingLeft:"42px", paddingRight: showToggle?"42px":"14px",
            outline:"none",
          }}
          onFocus={e=>(e.currentTarget.style.borderColor="#3b82f6")}
          onBlur={e=>(e.currentTarget.style.borderColor="#374151")}
          {...rest}
        />
        {showToggle && (
          <button type="button" onClick={onToggle}
            style={{ position:"absolute", right:"12px", color:"#6b7280", background:"none", border:"none", cursor:"pointer" }}>
            {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
          </button>
        )}
      </div>
      {error && <p style={{ color:"#f87171", fontSize:"11px", marginTop:"4px", paddingLeft:"4px" }}>{error}</p>}
    </div>
  );
});

// ── LoginForm ─────────────────────────────────────────────────────────────────
function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [showPass,setShowPass] = useState(false);
  const [loading,setLoading]   = useState(false);
  const { signIn, setActive }  = useSignIn();
  const { signIn: mockSignIn } = useAuth();

  const { register, handleSubmit, formState:{errors} } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email:"", password:"" },
  });

  const onSubmit = async (data: LoginData) => {
    if (!authRateLimiter.check(data.email)) {
      const min = Math.ceil(authRateLimiter.getTimeUntilReset(data.email)/60000);
      toast.error(`Conta bloqueada. Tente em ${min} minutos.`); return;
    }
    setLoading(true);
    try {
      if (useClerkMode && signIn) {
        const result = await signIn.create({ identifier:data.email, password:data.password });
        if (result.status==="complete") {
          authRateLimiter.reset(data.email);
          await setActive!({ session:result.createdSessionId });
          toast.success("Bem-vindo ao MUSIC OS 360!");
        } else {
          toast.error("Autenticação incompleta. Verifique seu email.");
        }
      } else {
        const { error } = await mockSignIn(data.email, data.password);
        if (error) {
          toast.error(`${error.message}. ${authRateLimiter.getRemainingAttempts(data.email)} tentativas restantes.`);
        } else {
          authRateLimiter.reset(data.email);
          toast.success("Bem-vindo!");
        }
      }
    } catch (err: unknown) {
      toast.error((err as {errors?:{message:string}[]})?.errors?.[0]?.message ?? "Erro ao fazer login.");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
      <AuthInput icon={User} type="email" placeholder="Digite o Usuário"
        autoComplete="email" error={errors.email?.message} {...register("email")}/>
      <AuthInput icon={Lock} type="password" placeholder="Digite sua senha"
        autoComplete="current-password" showToggle showPass={showPass}
        onToggle={()=>setShowPass(p=>!p)} error={errors.password?.message}
        {...register("password")}/>

      <button type="submit" disabled={loading} style={{
        width:"100%", height:"50px", borderRadius:"10px",
        background:"#2563eb", color:"#fff", fontWeight:800,
        fontSize:"13px", letterSpacing:"2px", border:"none",
        cursor: loading?"not-allowed":"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
        opacity: loading ? 0.8 : 1, marginTop:"2px",
      }}
        onMouseEnter={e=>{ if(!loading)(e.currentTarget as HTMLButtonElement).style.background="#1d4ed8"; }}
        onMouseLeave={e=>{ if(!loading)(e.currentTarget as HTMLButtonElement).style.background="#2563eb"; }}
      >
        {loading?<><Loader2 size={15} className="animate-spin"/>ACESSANDO...</>:"ACESSAR O SISTEMA"}
      </button>

      <div style={{ textAlign:"center", marginTop:"4px" }}>
        <button type="button" onClick={onForgot} style={{
          background:"none", border:"none", cursor:"pointer",
          color:"#9ca3af", fontSize:"13px",
          textDecoration:"underline", textUnderlineOffset:"3px",
          display:"block", width:"100%", marginBottom:"8px",
        }}>Esqueci minha senha</button>
        <Link to="/register" style={{ color:"#3b82f6", fontSize:"13px", textDecoration:"none", display:"block" }}>
          Criar nova conta
        </Link>
      </div>
    </form>
  );
}

// ── ForgotForm ────────────────────────────────────────────────────────────────
function ForgotForm({ onBack }: { onBack: () => void }) {
  const [loading,setLoading] = useState(false);
  const { resetPassword }    = useAuth();

  const { register, handleSubmit, formState:{errors} } = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email:"" },
  });

  const onSubmit = async (data: ForgotData) => {
    setLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      if (error) toast.error(error.message);
      else { toast.success("Email enviado! Verifique sua caixa de entrada."); onBack(); }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
      <div style={{ marginBottom:"4px" }}>
        <p style={{ color:"#fff", fontWeight:700, fontSize:"15px" }}>Recuperar Senha</p>
        <p style={{ color:"#6b7280", fontSize:"13px", marginTop:"6px" }}>
          Digite seu email para receber um link de redefinição.
        </p>
      </div>
      <AuthInput icon={Mail} type="email" placeholder="Seu email"
        autoComplete="email" error={errors.email?.message} {...register("email")}/>
      <button type="submit" disabled={loading} style={{
        width:"100%", height:"50px", borderRadius:"10px",
        background:"#2563eb", color:"#fff", fontWeight:800,
        fontSize:"13px", letterSpacing:"2px", border:"none", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
      }}>
        {loading?<><Loader2 size={15} className="animate-spin"/>ENVIANDO...</>:"ENVIAR LINK"}
      </button>
      <button type="button" onClick={onBack} style={{
        background:"none", border:"none", cursor:"pointer",
        color:"#6b7280", fontSize:"13px",
        display:"flex", alignItems:"center", justifyContent:"center", gap:"4px", width:"100%",
      }}>
        <ArrowLeft size={14}/> Voltar ao Login
      </button>
    </form>
  );
}
