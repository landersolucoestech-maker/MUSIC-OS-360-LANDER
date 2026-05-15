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

  /* ── Monta objeto tenant sem persistir ainda ── */
  const buildTenant = (all: Partial<Step1 & Step2 & Step3 & Step4>) => {
    const tenantId = `tenant-${Date.now()}`;
    return {
      id:            tenantId,
      name:          all.companyName,
      tradeName:     all.tradeName,
      cnpj:          all.cnpj,
      segment:       all.segment,
      address:       all.address,
      city:          all.city,
      state:         all.state,
      phone:         all.phone,
      email:         all.corporateEmail,
      slug:          all.slug,
      workspaceName: all.workspaceName,
      adminName:     all.fullName,
      adminEmail:    all.email,
      adminRole:     all.role,
      plan:          all.plan,
      createdAt:     new Date().toISOString(),
      status:        "trial",
    };
  };

  /* ── Persiste tenant no localStorage ── */
  const persistTenant = (tenant: Record<string, unknown>) => {
    localStorage.setItem(`musicos360_tenant_${tenant.id}`, JSON.stringify(tenant));
    localStorage.setItem("musicos360_current_tenant", JSON.stringify(tenant));
  };

  /* ── Handler step 4 ── */
  const onStep4 = async (d: Step4) => {
    setIsLoading(true);
    const all = { ...data, ...d };
    const tenant = buildTenant(all);

    try {
      persistTenant(tenant);
      toast.success(`Empresa "${tenant.name}" criada com sucesso!`);
      navigate("/");
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Erro ao criar conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
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
                  onBlur={handleSlugSuggest}
                  data-testid="input-workspace-name"
                />
              </Field>

              <Field label="Slug (URL)" error={form3.formState.errors.slug?.message}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">musicos360.com/</span>
                  <input
                    className={inputCls + " pl-[108px]"}
                    placeholder="lander-records"
                    {...form3.register("slug")}
                    data-testid="input-slug"
                  />
                </div>
              </Field>

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

              {/* Plan selector */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "trial_7",  label: "Trial 7 dias",  desc: "Ideal para avaliação rápida", icon: Zap },
                  { value: "trial_14", label: "Trial 14 dias", desc: "Mais tempo para explorar",    icon: ShieldCheck },
                ] as const).map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = form4.watch("plan") === plan.value;
                  return (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => form4.setValue("plan", plan.value)}
                      className={cn(
                        "flex flex-col items-start gap-1 p-4 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-white/10 bg-white/5 hover:border-white/20",
                      )}
                    >
                      <Icon className={cn("h-5 w-5 mb-1", isSelected ? "text-primary" : "text-gray-400")} />
                      <span className="text-sm font-semibold text-white">{plan.label}</span>
                      <span className="text-[11px] text-gray-400">{plan.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Terms */}
              <div className="space-y-3">
                {[
                  { field: "acceptTerms" as const, label: "Aceito os Termos de Uso e Política de Privacidade" },
                  { field: "acceptLgpd" as const,  label: "Aceito o tratamento de dados conforme a LGPD" },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-primary"
                      {...form4.register(field)}
                      data-testid={`checkbox-${field}`}
                    />
                    <span className="text-[12px] text-gray-400">{label}</span>
                  </label>
                ))}
                {(form4.formState.errors.acceptTerms || form4.formState.errors.acceptLgpd) && (
                  <p className="text-[11.5px] text-red-400">
                    {form4.formState.errors.acceptTerms?.message ?? form4.formState.errors.acceptLgpd?.message}
                  </p>
                )}
              </div>

              <StepActions step={step} setStep={setStep} isLoading={isLoading} isLastStep />
            </form>
          )}

        </div>
      </div>

      {/* ── RIGHT — marketing panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-gray-950 to-black border-l border-white/5 px-12 py-16">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">Tudo para sua música crescer</h2>
          <p className="text-sm text-gray-400">Um sistema completo para gravadoras, editoras e distribuidoras.</p>
        </div>
        <div className="grid grid-cols-2 gap-5">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ── Step navigation actions ── */
function StepActions({
  step, setStep, isLoading, isLastStep = false,
}: {
  step: number;
  setStep: (s: number) => void;
  isLoading: boolean;
  isLastStep?: boolean;
}) {
  return (
    <div className="flex gap-3 mt-auto pt-4">
      {step > 1 && (
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
          onClick={() => setStep(step - 1)}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      )}
      <Button
        type="submit"
        className="flex-1 bg-primary hover:bg-primary/90"
        disabled={isLoading}
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Criando...</>
        ) : isLastStep ? (
          <><Rocket className="h-4 w-4 mr-1" /> Ativar Workspace</>
        ) : (
          <>Próximo <ArrowRight className="h-4 w-4 ml-1" /></>
        )}
      </Button>
    </div>
  );
}
