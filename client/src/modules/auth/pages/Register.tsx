import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import {
  Loader2, Building2, User, Settings, Rocket,
  ArrowLeft, ArrowRight, Check, Eye, EyeOff,
  BarChart3, FileText, Music, DollarSign, Calendar, Globe,
  ShieldCheck, Zap,
} from "lucide-react";

/* ── helpers ── */
function slugify(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cnpjMask(val: string) {
  return val
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function phoneMask(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Muito fraca",  color: "bg-red-500" };
  if (score === 2) return { score, label: "Fraca",        color: "bg-orange-500" };
  if (score === 3) return { score, label: "Média",        color: "bg-yellow-500" };
  if (score === 4) return { score, label: "Forte",        color: "bg-blue-400" };
  return             { score, label: "Muito forte",  color: "bg-green-500" };
}

/* ── schemas ── */
const step1Schema = z.object({
  companyName:     z.string().min(2, "Nome da empresa obrigatório"),
  tradeName:       z.string().min(2, "Nome fantasia obrigatório"),
  cnpj:            z.string().min(14, "CNPJ inválido"),
  segment:         z.enum(["gravadora", "editora", "distribuidora", "indie", "outro"]),
  address:         z.string().min(5, "Endereço obrigatório"),
  city:            z.string().min(2, "Cidade obrigatória"),
  state:           z.string().length(2, "UF com 2 letras"),
  phone:           z.string().min(10, "Telefone obrigatório"),
  corporateEmail:  z.string().email("Email corporativo inválido"),
});

const step2Schema = z
  .object({
    fullName:        z.string().min(2, "Nome completo obrigatório"),
    role:            z.string().min(2, "Cargo obrigatório"),
    email:           z.string().email("Email inválido"),
    password:        z.string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Uma letra maiúscula")
      .regex(/[0-9]/, "Um número")
      .regex(/[^A-Za-z0-9]/, "Um caractere especial"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

const step3Schema = z.object({
  workspaceName: z.string().min(2, "Nome do workspace obrigatório"),
  slug:          z.string().min(2, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
});

const step4Schema = z.object({
  plan:          z.enum(["trial_7", "trial_14"]),
  acceptTerms:   z.literal(true, { errorMap: () => ({ message: "Aceite os termos" }) }),
  acceptLgpd:    z.literal(true, { errorMap: () => ({ message: "Aceite a LGPD" }) }),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;
type Step4 = z.infer<typeof step4Schema>;

/* ── step config ── */
const STEPS = [
  { id: 1, label: "Empresa",     icon: Building2 },
  { id: 2, label: "Administrador", icon: User },
  { id: 3, label: "Workspace",   icon: Settings },
  { id: 4, label: "Ativação",    icon: Rocket },
] as const;

const STATES_BR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const SEGMENTS  = [
  { value: "gravadora",     label: "Gravadora" },
  { value: "editora",       label: "Editora Musical" },
  { value: "distribuidora", label: "Distribuidora" },
  { value: "indie",         label: "Artista Independente" },
  { value: "outro",         label: "Outro" },
];

/* ── shared field ── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-[11.5px] text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "flex h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-colors";
const selectCls = inputCls + " appearance-none cursor-pointer";

/* ─────────── MAIN COMPONENT ─────────── */
export default function Register() {
  const navigate              = useNavigate();
  const [step, setStep]       = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  /* collected data across steps */
  const [data, setData] = useState<Partial<Step1 & Step2 & Step3 & Step4>>({});

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: { segment: "gravadora", state: "SP" } });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema) });
  const form4 = useForm<Step4>({ resolver: zodResolver(step4Schema), defaultValues: { plan: "trial_14" } });

  const pw = form2.watch("password") ?? "";
  const pwStrength = passwordStrength(pw);

  /* auto-fill slug from workspace name */
  const workspaceName = form3.watch("workspaceName") ?? "";

  const handleSlugSuggest = useCallback(() => {
    const current = form3.getValues("slug");
    if (!current || current === "") {
      form3.setValue("slug", slugify(workspaceName));
    }
  }, [form3, workspaceName]);

  /* ─ handlers ─ */
  const onStep1 = (d: Step1) => { setData((p) => ({ ...p, ...d })); setStep(2); };
  const onStep2 = (d: Step2) => { setData((p) => ({ ...p, ...d })); setStep(3); };
  const onStep3 = (d: Step3) => { setData((p) => ({ ...p, ...d })); setStep(4); };

  const onStep4 = async (d: Step4) => {
    setIsLoading(true);
    const all = { ...data, ...d };

    /* mock: store new tenant in localStorage */
    const tenantId  = `tenant-${Date.now()}`;
    const tenant = {
      id:           tenantId,
      name:         all.companyName,
      tradeName:    all.tradeName,
      cnpj:         all.cnpj,
      segment:      all.segment,
      address:      all.address,
      city:         all.city,
      state:        all.state,
      phone:        all.phone,
      email:        all.corporateEmail,
      slug:         all.slug,
      workspaceName: all.workspaceName,
      adminName:    all.fullName,
      adminEmail:   all.email,
      adminRole:    all.role,
      plan:         all.plan,
      createdAt:    new Date().toISOString(),
      status:       "trial",
    };

    localStorage.setItem(`musicos360_tenant_${tenantId}`, JSON.stringify(tenant));
    localStorage.setItem("musicos360_current_tenant", JSON.stringify(tenant));

    /* simula delay de criação */
    await new Promise((r) => setTimeout(r, 1800));
    setIsLoading(false);
    toast.success(`Empresa "${all.companyName}" criada com sucesso!`);
    navigate("/");
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  /* ─ benefits for right panel ─ */
  const benefits = [
    { icon: BarChart3,  title: "Analytics Avançado",   desc: "Dashboards em tempo real de streaming e social media" },
    { icon: DollarSign, title: "Gestão Financeira",     desc: "Fluxo de caixa, conciliação OFX e nota fiscal" },
    { icon: Music,      title: "Catálogo Musical",      desc: "ISRC, ISWC, fonogramas e gestão de shares" },
    { icon: FileText,   title: "Contratos Digitais",    desc: "Templates, assinatura eletrônica e alertas de vencimento" },
    { icon: Calendar,   title: "Agenda & Eventos",      desc: "Calendário de shows, produções e entregáveis" },
    { icon: Globe,      title: "Distribuição",          desc: "Envio multicanal para Spotify, Apple Music e mais" },
  ];

  return (
    <div className="min-h-screen flex bg-black">

      {/* ── LEFT — form ── */}
      <div className="w-full lg:w-1/2 flex flex-col bg-black overflow-y-auto">
        <div className="flex-1 flex flex-col px-8 py-8 max-w-xl mx-auto w-full">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/auth" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
            <img
              src="/lovable-uploads/a21a1ab1-df8a-4b7b-a1e4-0e36f63eff02.png"
              alt="MUSIC OS 360"
              className="h-10 w-10 object-contain"
            />
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white tracking-wider">CRIAR EMPRESA</h1>
            <p className="text-sm text-gray-400 mt-1">Configure seu workspace profissional em minutos</p>
          </div>

          {/* Step indicator */}
          <div className="mb-8">
            {/* Progress bar */}
            <div className="h-1.5 bg-white/10 rounded-full mb-5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Step pills */}
            <div className="grid grid-cols-4 gap-2">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const done    = step > s.id;
                const active  = step === s.id;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center border transition-all duration-300",
                      done   ? "bg-primary border-primary"            : "",
                      active ? "bg-primary/20 border-primary"         : "",
                      !done && !active ? "bg-white/5 border-white/10" : "",
                    )}>
                      {done
                        ? <Check className="h-4 w-4 text-white" />
                        : <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-gray-500")} />
                      }
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium text-center leading-tight",
                      active ? "text-primary" : done ? "text-gray-400" : "text-gray-600",
                    )}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── STEP 1 — EMPRESA ── */}
          {step === 1 && (
            <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-white">Dados da Empresa</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome da Empresa" error={form1.formState.errors.companyName?.message}>
                  <input className={inputCls} placeholder="Lander Records Ltda" {...form1.register("companyName")} data-testid="input-company-name" />
                </Field>
                <Field label="Nome Fantasia" error={form1.formState.errors.tradeName?.message}>
                  <input className={inputCls} placeholder="Lander Records" {...form1.register("tradeName")} data-testid="input-trade-name" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="CNPJ" error={form1.formState.errors.cnpj?.message}>
                  <input
                    className={inputCls}
                    placeholder="00.000.000/0001-00"
                    data-testid="input-cnpj"
                    {...form1.register("cnpj")}
                    onChange={(e) => form1.setValue("cnpj", cnpjMask(e.target.value))}
                  />
                </Field>
                <Field label="Segmento" error={form1.formState.errors.segment?.message}>
                  <select className={selectCls} {...form1.register("segment")} data-testid="select-segment">
                    {SEGMENTS.map((s) => <option key={s.value} value={s.value} className="bg-gray-900">{s.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Endereço Completo" error={form1.formState.errors.address?.message}>
                <input className={inputCls} placeholder="Rua das Artes, 123 — Sala 45" {...form1.register("address")} data-testid="input-address" />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Cidade" error={form1.formState.errors.city?.message}>
                    <input className={inputCls} placeholder="São Paulo" {...form1.register("city")} data-testid="input-city" />
                  </Field>
                </div>
                <Field label="UF" error={form1.formState.errors.state?.message}>
                  <select className={selectCls} {...form1.register("state")} data-testid="select-state">
                    {STATES_BR.map((s) => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone" error={form1.formState.errors.phone?.message}>
                  <input
                    className={inputCls}
                    placeholder="(11) 99999-0000"
                    data-testid="input-phone"
                    {...form1.register("phone")}
                    onChange={(e) => form1.setValue("phone", phoneMask(e.target.value))}
                  />
                </Field>
                <Field label="Email Corporativo" error={form1.formState.errors.corporateEmail?.message}>
                  <input className={inputCls} type="email" placeholder="contato@empresa.com" {...form1.register("corporateEmail")} data-testid="input-corporate-email" />
                </Field>
              </div>

              <StepActions step={step} setStep={setStep} isLoading={isLoading} />
            </form>
          )}

          {/* ── STEP 2 — ADMINISTRADOR ── */}
          {step === 2 && (
            <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-white">Dados do Administrador</h2>
              </div>
              <p className="text-[12px] text-gray-500 -mt-2">Este usuário será o owner e admin master da organização.</p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome Completo" error={form2.formState.errors.fullName?.message}>
                  <input className={inputCls} placeholder="João da Silva" {...form2.register("fullName")} data-testid="input-full-name" />
                </Field>
                <Field label="Cargo" error={form2.formState.errors.role?.message}>
                  <input className={inputCls} placeholder="CEO / Diretor" {...form2.register("role")} data-testid="input-role" />
                </Field>
              </div>

              <Field label="Email de Acesso" error={form2.formState.errors.email?.message}>
                <input className={inputCls} type="email" placeholder="admin@empresa.com" {...form2.register("email")} data-testid="input-admin-email" />
              </Field>

              <Field label="Senha" error={form2.formState.errors.password?.message}>
                <div className="relative">
                  <input
                    className={inputCls + " pr-10"}
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    {...form2.register("password")}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pw && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            i <= pwStrength.score ? pwStrength.color : "bg-white/10",
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn("text-[11px]", pwStrength.score >= 4 ? "text-green-400" : pwStrength.score >= 3 ? "text-yellow-400" : "text-red-400")}>
                      {pwStrength.label}
                    </p>
                  </div>
                )}
              </Field>

              <Field label="Confirmar Senha" error={form2.formState.errors.confirmPassword?.message}>
                <div className="relative">
                  <input
                    className={inputCls + " pr-10"}
                    type={showCpw ? "text" : "password"}
                    placeholder="••••••••"
                    {...form2.register("confirmPassword")}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    onClick={() => setShowCpw((v) => !v)}
                  >
                    {showCpw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <StepActions step={step} setStep={setStep} isLoading={isLoading} />
            </form>
          )}

          {/* ── STEP 3 — WORKSPACE ── */}
          {step === 3 && (
            <form onSubmit={form3.handleSubmit(onStep3)} className="space-y-4 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-white">Configuração do Workspace</h2>
              </div>

              <Field label="Nome do Workspace" error={form3.formState.errors.workspaceName?.message}>
                <input
                  className={inputCls}
                  placeholder="Lander Records Workspace"
                  {...form3.register("workspaceName")}
                  data-testid="input-workspace-name"
                  onBlur={handleSlugSuggest}
                />
              </Field>

              <Field label="Slug / URL da Empresa" error={form3.formState.errors.slug?.message}>
                <div className="flex items-center gap-0">
                  <div className="flex items-center h-11 px-3 rounded-l-lg border border-r-0 border-white/10 bg-white/[0.03] text-gray-500 text-sm whitespace-nowrap shrink-0">
                    musicos360.com/
                  </div>
                  <input
                    className="flex h-11 flex-1 rounded-r-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-colors"
                    placeholder="minha-gravadora"
                    {...form3.register("slug")}
                    data-testid="input-slug"
                    onChange={(e) => form3.setValue("slug", slugify(e.target.value))}
                  />
                </div>
                {form3.watch("slug") && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    URL: <span className="text-primary font-mono">musicos360.com/{form3.watch("slug")}</span>
                  </p>
                )}
              </Field>

              {/* Workspace preview card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mt-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{workspaceName || "Nome do Workspace"}</p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      musicos360.com/{form3.watch("slug") || "seu-slug"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Artistas",    n: "—" },
                    { label: "Projetos",    n: "—" },
                    { label: "Usuários",    n: "1" },
                  ].map(({ label, n }) => (
                    <div key={label} className="rounded-lg bg-white/5 p-2">
                      <p className="text-base font-bold text-white">{n}</p>
                      <p className="text-[10px] text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StepActions step={step} setStep={setStep} isLoading={isLoading} />
            </form>
          )}

          {/* ── STEP 4 — ATIVAÇÃO ── */}
          {step === 4 && (
            <form onSubmit={form4.handleSubmit(onStep4)} className="space-y-5 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-white">Plano & Ativação</h2>
              </div>

              {/* Plan selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Período Trial</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "trial_7",  label: "7 dias",  desc: "Ideal para avaliar" },
                    { value: "trial_14", label: "14 dias", desc: "Recomendado", recommended: true },
                  ].map(({ value, label, desc, recommended }) => {
                    const selected = form4.watch("plan") === value;
                    return (
                      <label
                        key={value}
                        className={cn(
                          "relative flex flex-col gap-1 rounded-xl border p-4 cursor-pointer transition-all",
                          selected ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:border-white/20",
                        )}
                        data-testid={`plan-${value}`}
                      >
                        <input type="radio" value={value} {...form4.register("plan")} className="sr-only" />
                        {recommended && (
                          <span className="absolute -top-2 right-3 text-[9px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Recomendado
                          </span>
                        )}
                        <p className="text-[15px] font-bold text-white">{label}</p>
                        <p className="text-[11px] text-gray-400">{desc}</p>
                        <p className="text-[11px] text-primary font-medium">Gratuito</p>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Resumo do Cadastro</p>
                {[
                  { label: "Empresa",    value: data.companyName ?? "—" },
                  { label: "CNPJ",       value: data.cnpj         ?? "—" },
                  { label: "Admin",      value: data.fullName      ?? "—" },
                  { label: "Email",      value: data.email         ?? "—" },
                  { label: "Workspace",  value: data.workspaceName ?? "—" },
                  { label: "URL",        value: `musicos360.com/${data.slug ?? "—"}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-white font-medium truncate max-w-[200px] text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                {[
                  {
                    field: "acceptTerms" as const,
                    label: "Li e aceito os Termos de Uso do MUSIC OS 360",
                    error: form4.formState.errors.acceptTerms?.message,
                    testid: "checkbox-terms",
                  },
                  {
                    field: "acceptLgpd" as const,
                    label: "Li e aceito a Política de Privacidade (LGPD)",
                    error: form4.formState.errors.acceptLgpd?.message,
                    testid: "checkbox-lgpd",
                  },
                ].map(({ field, label, error, testid }) => (
                  <div key={field} className="space-y-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        data-testid={testid}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                        {...form4.register(field)}
                      />
                      <span className="text-[12px] text-gray-400 group-hover:text-gray-300 transition-colors leading-snug">
                        {label}
                      </span>
                    </label>
                    {error && <p className="text-[11px] text-red-400 pl-7">{error}</p>}
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-sm tracking-wider rounded-xl gap-2"
                disabled={isLoading}
                data-testid="button-criar-empresa"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    CRIANDO EMPRESA...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    CRIAR EMPRESA
                  </>
                )}
              </Button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 text-gray-500 hover:text-gray-300 text-[12.5px] transition-colors"
                onClick={() => setStep(3)}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-600">Copyright © MUSIC OS 360. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT — hero ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black flex-col">

        {/* BG glows */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-primary/50 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-12">
          {/* Logo + title */}
          <div className="flex items-center gap-3 mb-auto">
            <img
              src="/lovable-uploads/a21a1ab1-df8a-4b7b-a1e4-0e36f63eff02.png"
              alt="MUSIC OS 360"
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-base font-bold text-white tracking-widest">MUSIC OS 360</p>
              <p className="text-[11px] text-gray-400 tracking-wider">ERP OPERACIONAL MUSICAL</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="my-10">
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              O sistema que a<br />
              <span className="text-primary">indústria musical</span><br />
              precisava.
            </h2>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              Centralize artistas, catálogo, contratos, financeiro e distribuição em um único lugar. Plataforma enterprise para gravadoras e editoras.
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 hover:border-primary/30 hover:bg-primary/[0.04] transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-[12px] font-semibold text-white">{title}</p>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-4">
            {[
              { icon: ShieldCheck, label: "LGPD Compliant" },
              { icon: Zap,         label: "99.9% Uptime" },
              { icon: Globe,       label: "Multi-tenant" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step navigation actions ── */
function StepActions({
  step,
  setStep,
  isLoading,
}: {
  step: number;
  setStep: (n: number) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {step > 1 && (
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white gap-1.5"
          onClick={() => setStep(step - 1)}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      )}
      <Button
        type="submit"
        className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold tracking-wider gap-1.5"
        disabled={isLoading}
        data-testid="button-next"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {step === 3 ? "Continuar" : "Próximo"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
