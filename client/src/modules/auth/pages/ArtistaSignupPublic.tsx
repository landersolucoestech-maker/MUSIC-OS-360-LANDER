import { useState, useEffect } from "react";
import { MOCK_COMPANY_SETTINGS } from "@/shared/data/mockData";
import { useParams } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import {
  Loader2, CheckCircle2, Music2, ChevronRight, ChevronLeft,
  Link2, Image, FileText, User, Star, Shield, Zap, AlertCircle,
  Instagram, Youtube, CalendarDays, Package, Plus, Trash2, Mail,
} from "lucide-react";
import { SiSpotify, SiTiktok, SiApplemusic, SiSoundcloud } from "react-icons/si";
import { createArtistUseCase, DuplicateArtistaError } from "@/modules/artist/application/createArtist.usecase";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_PERFIL_OPTIONS = [
  "DJ",
  "DJ/Produtor",
  "Compositor/Autor",
  "Intérprete",
  "Produtor",
];

const GENEROS = [
  "Afrobeat", "Axé", "Blues", "Bolero", "Bossa Nova",
  "Country", "Drill", "EDM", "Eletrônica", "Flamenco",
  "Forró", "Funk", "Gospel", "Hip Hop", "House",
  "Jazz", "K-Pop", "Lo-fi", "Maracatu", "Metal",
  "MPB", "Pagode", "Pisadinha", "Pop", "Pop Rock",
  "R&B", "Reggae", "Reggaeton", "Rock", "Samba",
  "Sertanejo", "Sertanejo Universitário", "Soul", "Techno", "Trap",
  "Zouk", "Outro",
];

const DISTRIBUIDORAS = [
  "Believe",
  "CD Baby",
  "DistroKid",
  "Ingrooves",
  "Kontor",
  "ONErpm",
  "Orchard",
  "Sony Music",
  "Stem",
  "Symphonic",
  "TuneCore",
  "Warner Music",
  "Outro",
];

type Step = 1 | 2 | 3;
type SlugState = "checking" | "valid" | "invalid";

interface DistribuidoraEntry {
  distribuidora: string;
  email: string;
}

interface OrgInfo {
  name: string;
  slug: string;
}

interface FormData {
  nome_artistico: string;
  nome_civil: string;
  tipo_perfil: string[];
  genero: string;
  genero_musical: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  data_nascimento: string;
  vinculo: string;
  vinculo_empresa_nome: string;
  vinculo_empresa_contato: string;
  vinculo_empresa_telefone: string;
  vinculo_empresa_email: string;
  vinculo_empresa_email_share: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  apple_music: string;
  deezer: string;
  soundcloud: string;
  presskit_url: string;
  bio: string;
  foto_url: string;
  notas_label: string;
}

const VINCULO_OPTIONS = ["Independente", "Com Empresário", "Gravadora", "Editora"] as const;
const VINCULO_COM_EMPRESA = new Set(["Com Empresário", "Gravadora", "Editora"]);
const VINCULO_COM_NOME_EMPRESA = new Set(["Gravadora", "Editora"]);

const EMPTY: FormData = {
  nome_artistico: "", nome_civil: "", tipo_perfil: [], genero: "",
  genero_musical: "", email: "", telefone: "", cpf_cnpj: "", data_nascimento: "",
  vinculo: "", vinculo_empresa_nome: "", vinculo_empresa_contato: "",
  vinculo_empresa_telefone: "", vinculo_empresa_email: "", vinculo_empresa_email_share: "",
  instagram: "", tiktok: "", youtube: "", spotify: "",
  apple_music: "", deezer: "", soundcloud: "", presskit_url: "",
  bio: "", foto_url: "", notas_label: "",
};

const EMPTY_DISTRIBUIDORA: DistribuidoraEntry = { distribuidora: "", email: "" };

const STEPS = [
  { num: 1 as Step, label: "Dados Básicos", icon: User },
  { num: 2 as Step, label: "Links e Redes", icon: Link2 },
  { num: 3 as Step, label: "Bio e Contexto", icon: FileText },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEMO_SLUGS = new Set([
  "minha-gravadora",
  "gravadora-exemplo",
  "demo",
  "musicos360",
  "teste",
]);

function resolveOrg(slug: string): { valid: boolean; info: OrgInfo } {
  const defaultInfo: OrgInfo = { name: "MUSIC OS 360", slug };

  try {
    const rawData = localStorage.getItem("musicos360_mock_data");
    const seedName =
      MOCK_COMPANY_SETTINGS.fantasy_name ||
      MOCK_COMPANY_SETTINGS.company_name ||
      "MUSIC OS 360";
    let orgName = seedName;
    if (rawData) {
      const data = JSON.parse(rawData) as Record<string, unknown>;
      const cs = data.company_settings;
      const settings = Array.isArray(cs)
        ? (cs as Record<string, unknown>[])[0]
        : (cs as Record<string, unknown>);
      if (settings) {
        orgName =
          (settings.fantasy_name as string) ||
          (settings.company_name as string) ||
          seedName;
      }
    }

    const allKeys = Object.keys(localStorage);
    const slugKeys = allKeys.filter((k) => k.startsWith("musicos360_org_slug:"));
    const slugMatch = slugKeys.some((k) => localStorage.getItem(k) === slug);

    if (slugMatch) return { valid: true, info: { name: orgName, slug } };
    if (DEMO_SLUGS.has(slug.toLowerCase())) return { valid: true, info: { name: orgName, slug } };

    return { valid: false, info: defaultInfo };
  } catch {
    return { valid: true, info: defaultInfo };
  }
}

function extractSpotifyArtistId(input: string): string | null {
  if (!input.trim()) return null;
  const match = input.match(/spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9]+$/.test(input.trim())) return input.trim();
  return null;
}

function extractYouTubeChannelId(input: string): string | null {
  if (!input.trim()) return null;
  const handleMatch = input.match(/youtube\.com\/@([^/?&\s]+)/);
  if (handleMatch) return `@${handleMatch[1]}`;
  const channelMatch = input.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) return channelMatch[1];
  if (/^@[a-zA-Z0-9_.]+$/.test(input.trim())) return input.trim();
  if (/^UC[a-zA-Z0-9_-]+$/.test(input.trim())) return input.trim();
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArtistaSignupPublic() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();

  const [slugState, setSlugState] = useState<SlugState>("checking");
  const [orgInfo, setOrgInfo] = useState<OrgInfo>({ name: "MUSIC OS 360", slug: orgSlug ?? "" });

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [distribuidoras, setDistribuidoras] = useState<DistribuidoraEntry[]>([{ ...EMPTY_DISTRIBUIDORA }]);
  const [emailsShareGravadora, setEmailsShareGravadora] = useState<string[]>([""]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [protocol, setProtocol] = useState("");

  useEffect(() => {
    if (!orgSlug) { setSlugState("invalid"); return; }
    const result = resolveOrg(orgSlug);
    setOrgInfo(result.info);
    setSlugState(result.valid ? "valid" : "invalid");
  }, [orgSlug]);

  const set = (field: keyof Omit<FormData, "tipo_perfil">, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e; });
  };

  const setDistribuidoraField = (idx: number, field: keyof DistribuidoraEntry, value: string) => {
    setDistribuidoras((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addEmailShareGravadora = () => setEmailsShareGravadora((p) => [...p, ""]);
  const removeEmailShareGravadora = (idx: number) =>
    setEmailsShareGravadora((p) => p.filter((_, i) => i !== idx));
  const updateEmailShareGravadora = (idx: number, val: string) =>
    setEmailsShareGravadora((p) => p.map((v, i) => (i === idx ? val : v)));

  const addDistribuidora = () => {
    setDistribuidoras((prev) => [...prev, { ...EMPTY_DISTRIBUIDORA }]);
  };

  const removeDistribuidora = (idx: number) => {
    setDistribuidoras((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleTipoPerfil = (opt: string) => {
    setForm((p) => {
      const exists = p.tipo_perfil.includes(opt);
      return {
        ...p,
        tipo_perfil: exists
          ? p.tipo_perfil.filter((v) => v !== opt)
          : [...p.tipo_perfil, opt],
      };
    });
    if (errors.tipo_perfil) setErrors((p) => { const e = { ...p }; delete e.tipo_perfil; return e; });
  };

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.nome_artistico.trim()) e.nome_artistico = "Obrigatório";
    if (!form.nome_civil.trim()) e.nome_civil = "Obrigatório";
    if (form.tipo_perfil.length === 0) e.tipo_perfil = "Selecione ao menos um tipo de perfil";
    if (!form.genero) e.genero = "Obrigatório";
    if (!form.genero_musical) e.genero_musical = "Obrigatório";
    if (!form.email.trim()) e.email = "Obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.telefone.trim()) e.telefone = "Obrigatório";
    if (!form.cpf_cnpj.trim()) e.cpf_cnpj = "Obrigatório";
    if (!form.data_nascimento) e.data_nascimento = "Obrigatório";
    if (!form.vinculo) e.vinculo = "Obrigatório";
    if (form.vinculo && VINCULO_COM_EMPRESA.has(form.vinculo)) {
      if (VINCULO_COM_NOME_EMPRESA.has(form.vinculo) && !form.vinculo_empresa_nome.trim()) e.vinculo_empresa_nome = "Obrigatório";
      if (!form.vinculo_empresa_contato.trim()) e.vinculo_empresa_contato = "Obrigatório";
      if (!form.vinculo_empresa_telefone.trim()) e.vinculo_empresa_telefone = "Obrigatório";
      if (!form.vinculo_empresa_email.trim()) e.vinculo_empresa_email = "Obrigatório";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.vinculo_empresa_email)) e.vinculo_empresa_email = "E-mail inválido";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    const urlFields: (keyof Omit<FormData, "tipo_perfil">)[] = ["spotify", "youtube", "apple_music", "deezer", "soundcloud", "presskit_url"];
    urlFields.forEach((f) => {
      const v = (form[f] as string).trim();
      if (v && !/^https?:\/\/.+/.test(v) && !v.startsWith("@")) {
        if (/[\s/]/.test(v) || v.includes("://")) {
          e[f] = "URL deve começar com https://";
        }
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = (): boolean => {
    const e: Record<string, string> = {};
    if (form.foto_url.trim() && !/^https?:\/\/.+/.test(form.foto_url.trim())) {
      e.foto_url = "URL inválida — deve começar com https://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => (s + 1) as Step);
    setErrors({});
  };

  const goBack = () => {
    setStep((s) => (s - 1) as Step);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setIsSubmitting(true);

    const redesExtras: string[] = [];
    const spotifyId = extractSpotifyArtistId(form.spotify);
    const youtubeId = extractYouTubeChannelId(form.youtube);
    if (form.spotify.trim() && !spotifyId) redesExtras.push(`Spotify: ${form.spotify.trim()}`);
    if (form.youtube.trim() && !youtubeId) redesExtras.push(`YouTube: ${form.youtube.trim()}`);
    if (form.deezer.trim()) redesExtras.push(`Deezer: ${form.deezer.trim()}`);

    const extrasNotas: string[] = [];
    if (form.data_nascimento) extrasNotas.push(`Data de Nascimento: ${form.data_nascimento}`);
    if (form.genero) extrasNotas.push(`Gênero: ${form.genero}`);
    if (form.vinculo) extrasNotas.push(`Vínculo: ${form.vinculo}`);
    if (form.vinculo && VINCULO_COM_EMPRESA.has(form.vinculo)) {
      if (form.vinculo_empresa_nome.trim()) extrasNotas.push(`Empresa/Responsável: ${form.vinculo_empresa_nome.trim()}`);
      if (form.vinculo_empresa_contato.trim()) extrasNotas.push(`Contato: ${form.vinculo_empresa_contato.trim()}`);
      if (form.vinculo_empresa_telefone.trim()) extrasNotas.push(`Tel. empresa: ${form.vinculo_empresa_telefone.trim()}`);
      if (form.vinculo_empresa_email.trim()) extrasNotas.push(`E-mail empresa: ${form.vinculo_empresa_email.trim()}`);
      if (form.vinculo_empresa_email_share.trim()) extrasNotas.push(`E-mail de contato: ${form.vinculo_empresa_email_share.trim()}`);
    }
    if (VINCULO_COM_NOME_EMPRESA.has(form.vinculo)) {
      const validShareEmails = emailsShareGravadora.filter((e) => e.trim());
      validShareEmails.forEach((e, idx) => {
        extrasNotas.push(`E-mail share ${form.vinculo} ${idx + 1}: ${e.trim()}`);
      });
    }
    distribuidoras.forEach((entry, idx) => {
      if (entry.distribuidora) {
        const label = distribuidoras.length > 1 ? `Distribuidora ${idx + 1}` : "Distribuidora";
        extrasNotas.push(`${label}: ${entry.distribuidora}`);
        if (entry.email) extrasNotas.push(`E-mail distribuidora${distribuidoras.length > 1 ? ` ${idx + 1}` : ""}: ${entry.email}`);
      }
    });

    const notasInternas = [
      form.notas_label.trim(),
      ...redesExtras,
      ...extrasNotas,
    ].filter(Boolean).join("\n");

    try {
      const result = await createArtistUseCase({
        nome_artistico: form.nome_artistico,
        nome_civil: form.nome_civil,
        tipo: form.tipo_perfil.join(", "),
        status: "onboarding",
        genero_musical: form.genero_musical,
        email: form.email,
        telefone: form.telefone,
        cpf_cnpj: form.cpf_cnpj,
        foto_url: form.foto_url,
        observacoes: form.bio,
        org_slug: orgSlug,
        instagram: form.instagram.trim().replace(/^@/, "") || undefined,
        tiktok: form.tiktok.trim().replace(/^@/, "") || undefined,
        spotify_artist_id: spotifyId ?? undefined,
        youtube_channel_id: youtubeId ?? undefined,
        apple_music_url: form.apple_music.trim() || undefined,
        soundcloud_url: form.soundcloud.trim() || undefined,
        presskit_url: form.presskit_url.trim() || undefined,
        notas_internas: notasInternas || undefined,
      });
      const alphanumeric = result.id.replace(/[^a-zA-Z0-9]/g, "");
      setProtocol(alphanumeric.slice(-8).toUpperCase());
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof DuplicateArtistaError) {
        if (err.field === "email") {
          setErrors({ email: "E-mail já cadastrado" });
          setStep(1);
          toast.error("E-mail já cadastrado. Corrija no passo 1.");
        } else {
          setErrors({ cpf_cnpj: "CPF/CNPJ já cadastrado" });
          setStep(1);
          toast.error("CPF/CNPJ já cadastrado. Corrija no passo 1.");
        }
      } else {
        toast.error("Erro ao enviar cadastro. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (slugState === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid slug ─────────────────────────────────────────────────────────────
  if (slugState === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="mx-auto rounded-full bg-destructive/10 p-5 w-fit">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Link inválido</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Este link de cadastro não corresponde a nenhuma gravadora cadastrada. Entre em contato para obter o link correto.
            </p>
          </div>
          {orgSlug && (
            <p className="text-xs text-muted-foreground font-mono bg-muted/40 rounded px-3 py-1.5 inline-block">
              /{orgSlug}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-7">
          <div className="mx-auto rounded-full bg-primary/10 p-6 w-fit">
            <CheckCircle2 className="h-14 w-14 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Cadastro Recebido!</h1>
            <p className="text-muted-foreground">
              Seu cadastro entrou direto no sistema da <strong>{orgInfo.name}</strong>. Nossa equipe vai analisar e entrar em contato em breve.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-6 py-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Protocolo</p>
            <p className="text-2xl font-bold font-mono tracking-widest text-primary">{protocol}</p>
            <p className="text-xs text-muted-foreground">Guarde este número para acompanhamento</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Verifique seu e-mail <strong>{form.email}</strong> nos próximos dias.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary/5 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-3">
          <div className="flex justify-center mb-3">
            <div className="rounded-xl bg-primary/10 border border-primary/20 w-16 h-16 flex items-center justify-center">
              <span className="text-primary font-bold text-xl tracking-tight">
                {orgInfo.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0].toUpperCase())
                  .join("")}
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{orgInfo.name}</h1>
            <div className="text-muted-foreground text-sm mt-2 space-y-2 max-w-lg mx-auto text-center">
              <p className="font-medium text-foreground">Cadastro de Artista</p>
              <p>Preencha seus dados para realização do cadastro artístico junto à {orgInfo.name}.</p>
              <p className="text-xs leading-relaxed">
                As informações fornecidas neste formulário serão utilizadas exclusivamente para processos
                de identificação, validação cadastral, formalização e gestão de artistas, compositores,
                produtores e demais participantes relacionados às obras musicais e fonogramas vinculados
                à {orgInfo.name}.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 pt-1">
            {[
              { icon: Zap, text: "Resposta rápida" },
              { icon: Shield, text: "Dados seguros" },
              { icon: Star, text: "Sem compromisso" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div className={cn("flex items-center gap-2", idx < STEPS.length - 1 && "flex-1")}>
                <div className={cn(
                  "flex items-center justify-center rounded-full w-7 h-7 text-xs font-bold shrink-0 transition-colors",
                  step === s.num ? "bg-primary text-primary-foreground"
                    : step > s.num ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block whitespace-nowrap",
                  step === s.num ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("h-px flex-1 transition-colors", step > s.num ? "bg-primary/40" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1 — Dados Básicos ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-base">Dados Básicos</h2>
              <p className="text-sm text-muted-foreground">Informações essenciais sobre você</p>
            </div>

            {/* Nome Artístico + Nome Civil */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">Nome Artístico <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome usado profissionalmente"
                  value={form.nome_artistico}
                  onChange={(e) => set("nome_artistico", e.target.value)}
                  data-testid="input-nome-artistico"
                  className={errors.nome_artistico ? "border-destructive" : ""}
                />
                {errors.nome_artistico && <p className="text-xs text-destructive">{errors.nome_artistico}</p>}
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">Nome Civil <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome completo (documentos)"
                  value={form.nome_civil}
                  onChange={(e) => set("nome_civil", e.target.value)}
                  data-testid="input-nome-civil"
                  className={errors.nome_civil ? "border-destructive" : ""}
                />
                {errors.nome_civil && <p className="text-xs text-destructive">{errors.nome_civil}</p>}
              </div>
            </div>

            {/* Tipo de Perfil — multi-select toggles */}
            <div className="space-y-2">
              <Label className="text-sm">
                Tipo de Perfil <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap gap-2" data-testid="group-tipo-perfil">
                {TIPO_PERFIL_OPTIONS.map((opt) => {
                  const selected = form.tipo_perfil.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleTipoPerfil(opt)}
                      data-testid={`toggle-tipo-${opt.toLowerCase().replace(/\//g, "-").replace(/\s/g, "-")}`}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-foreground border-border hover:border-primary/60 hover:text-primary"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {errors.tipo_perfil && <p className="text-xs text-destructive">{errors.tipo_perfil}</p>}
            </div>

            {/* Gênero + Gênero Musical */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Gênero <span className="text-destructive">*</span></Label>
                <Select value={form.genero} onValueChange={(v) => set("genero", v)}>
                  <SelectTrigger data-testid="select-genero" className={errors.genero ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                {errors.genero && <p className="text-xs text-destructive">{errors.genero}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Gênero Musical <span className="text-destructive">*</span></Label>
                <Select value={form.genero_musical} onValueChange={(v) => set("genero_musical", v)}>
                  <SelectTrigger data-testid="select-genero-musical" className={errors.genero_musical ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENEROS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.genero_musical && <p className="text-xs text-destructive">{errors.genero_musical}</p>}
              </div>
            </div>

            {/* E-mail + Telefone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email" placeholder="seu@email.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)}
                  data-testid="input-email"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">Telefone / WhatsApp <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={form.telefone} onChange={(e) => set("telefone", e.target.value)}
                  data-testid="input-telefone"
                  className={errors.telefone ? "border-destructive" : ""}
                />
                {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
              </div>
            </div>

            {/* CPF + Data de Nascimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">CPF <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="000.000.000-00"
                  value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)}
                  data-testid="input-cpf-cnpj"
                  className={errors.cpf_cnpj ? "border-destructive" : ""}
                />
                {errors.cpf_cnpj && <p className="text-xs text-destructive">{errors.cpf_cnpj}</p>}
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  Data de Nascimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => set("data_nascimento", e.target.value)}
                  data-testid="input-data-nascimento"
                  className={errors.data_nascimento ? "border-destructive block" : "block"}
                />
                {errors.data_nascimento && <p className="text-xs text-destructive">{errors.data_nascimento}</p>}
              </div>
            </div>

            {/* Vínculo profissional */}
            <div className="space-y-1.5">
              <Label className="text-sm">Vínculo Profissional / Artístico <span className="text-destructive">*</span></Label>
              <Select value={form.vinculo} onValueChange={(v) => set("vinculo", v)}>
                <SelectTrigger data-testid="select-vinculo" className={errors.vinculo ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione seu vínculo" />
                </SelectTrigger>
                <SelectContent>
                  {VINCULO_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vinculo && <p className="text-xs text-destructive">{errors.vinculo}</p>}
            </div>

            {/* Campos condicionais — empresa/responsável */}
            {form.vinculo && VINCULO_COM_EMPRESA.has(form.vinculo) && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {form.vinculo === "Com Empresário" ? "Dados do Empresário" : form.vinculo === "Gravadora" ? "Dados da Gravadora" : "Dados da Editora"}
                </p>

                <div className={`grid grid-cols-1 gap-4 ${VINCULO_COM_NOME_EMPRESA.has(form.vinculo) ? "sm:grid-cols-2" : ""}`}>
                  {VINCULO_COM_NOME_EMPRESA.has(form.vinculo) && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nome da empresa <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Razão social ou nome"
                        value={form.vinculo_empresa_nome}
                        onChange={(e) => set("vinculo_empresa_nome", e.target.value)}
                        data-testid="input-vinculo-empresa-nome"
                        className={errors.vinculo_empresa_nome ? "border-destructive" : ""}
                      />
                      {errors.vinculo_empresa_nome && <p className="text-xs text-destructive">{errors.vinculo_empresa_nome}</p>}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nome do contato <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="Pessoa responsável"
                      value={form.vinculo_empresa_contato}
                      onChange={(e) => set("vinculo_empresa_contato", e.target.value)}
                      data-testid="input-vinculo-empresa-contato"
                      className={errors.vinculo_empresa_contato ? "border-destructive" : ""}
                    />
                    {errors.vinculo_empresa_contato && <p className="text-xs text-destructive">{errors.vinculo_empresa_contato}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Telefone / WhatsApp <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={form.vinculo_empresa_telefone}
                      onChange={(e) => set("vinculo_empresa_telefone", e.target.value)}
                      data-testid="input-vinculo-empresa-telefone"
                      className={errors.vinculo_empresa_telefone ? "border-destructive" : ""}
                    />
                    {errors.vinculo_empresa_telefone && <p className="text-xs text-destructive">{errors.vinculo_empresa_telefone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">E-mail de Contato <span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      placeholder="contato@empresa.com"
                      value={form.vinculo_empresa_email}
                      onChange={(e) => set("vinculo_empresa_email", e.target.value)}
                      data-testid="input-vinculo-empresa-email"
                      className={errors.vinculo_empresa_email ? "border-destructive" : ""}
                    />
                    {errors.vinculo_empresa_email && <p className="text-xs text-destructive">{errors.vinculo_empresa_email}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2 — Links e Redes ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-base">Links e Redes Sociais</h2>
              <p className="text-sm text-muted-foreground">Todos os campos são opcionais — preencha o que tiver</p>
            </div>

            {/* Linha 1 — Instagram | TikTok */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">@</span>
                  <Input placeholder="usuario" value={form.instagram}
                    onChange={(e) => set("instagram", e.target.value)} data-testid="input-instagram"
                    className={errors.instagram ? "border-destructive" : ""} />
                </div>
                {errors.instagram && <p className="text-xs text-destructive">{errors.instagram}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <SiTiktok className="h-3.5 w-3.5" /> TikTok
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">@</span>
                  <Input placeholder="usuario" value={form.tiktok}
                    onChange={(e) => set("tiktok", e.target.value)} data-testid="input-tiktok"
                    className={errors.tiktok ? "border-destructive" : ""} />
                </div>
                {errors.tiktok && <p className="text-xs text-destructive">{errors.tiktok}</p>}
              </div>
            </div>

            {/* Linha 2 — Spotify | YouTube */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <SiSpotify className="h-3.5 w-3.5 text-green-500" /> Spotify
                </Label>
                <Input
                  placeholder="https://open.spotify.com/artist/..."
                  value={form.spotify} onChange={(e) => set("spotify", e.target.value)}
                  data-testid="input-spotify"
                  className={errors.spotify ? "border-destructive" : ""}
                />
                {errors.spotify && <p className="text-xs text-destructive">{errors.spotify}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Youtube className="h-3.5 w-3.5 text-red-500" /> YouTube
                </Label>
                <Input
                  placeholder="https://youtube.com/@seucanal"
                  value={form.youtube} onChange={(e) => set("youtube", e.target.value)}
                  data-testid="input-youtube"
                  className={errors.youtube ? "border-destructive" : ""}
                />
                {errors.youtube && <p className="text-xs text-destructive">{errors.youtube}</p>}
              </div>
            </div>

            {/* Linha 3 — Apple Music | Deezer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <SiApplemusic className="h-3.5 w-3.5 text-red-400" /> Apple Music
                </Label>
                <Input placeholder="https://music.apple.com/..."
                  value={form.apple_music} onChange={(e) => set("apple_music", e.target.value)}
                  data-testid="input-apple-music"
                  className={errors.apple_music ? "border-destructive" : ""}
                />
                {errors.apple_music && <p className="text-xs text-destructive">{errors.apple_music}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Music2 className="h-3.5 w-3.5 text-purple-500" /> Deezer
                </Label>
                <Input placeholder="https://www.deezer.com/artist/..."
                  value={form.deezer} onChange={(e) => set("deezer", e.target.value)}
                  data-testid="input-deezer"
                  className={errors.deezer ? "border-destructive" : ""}
                />
                {errors.deezer && <p className="text-xs text-destructive">{errors.deezer}</p>}
              </div>
            </div>

            {/* Linha 4 — SoundCloud | Link do Presskit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <SiSoundcloud className="h-3.5 w-3.5 text-orange-500" /> SoundCloud
                </Label>
                <Input placeholder="https://soundcloud.com/..."
                  value={form.soundcloud} onChange={(e) => set("soundcloud", e.target.value)}
                  data-testid="input-soundcloud"
                  className={errors.soundcloud ? "border-destructive" : ""}
                />
                {errors.soundcloud && <p className="text-xs text-destructive">{errors.soundcloud}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-primary" /> Link do Press Kit / EPK
                </Label>
                <Input
                  placeholder="https://drive.google.com/... ou Notion, Dropbox..."
                  value={form.presskit_url} onChange={(e) => set("presskit_url", e.target.value)}
                  data-testid="input-presskit"
                  className={errors.presskit_url ? "border-destructive" : ""}
                />
                {errors.presskit_url && <p className="text-xs text-destructive">{errors.presskit_url}</p>}
              </div>
            </div>

            <Separator />

            {/* Distribuidoras */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Distribuidoras</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Informe se já distribui sua música digitalmente. Você pode adicionar mais de uma.
              </p>

              <div className="space-y-3">
                {distribuidoras.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      {idx === 0 && <Label className="text-sm">Distribuidora</Label>}
                      <Select
                        value={entry.distribuidora}
                        onValueChange={(v) => setDistribuidoraField(idx, "distribuidora", v)}
                      >
                        <SelectTrigger data-testid={`select-distribuidora-${idx}`} className={idx === 0 && errors.distribuidora_0 ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISTRIBUIDORAS.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {idx === 0 && errors.distribuidora_0 && <p className="text-xs text-destructive">{errors.distribuidora_0}</p>}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1.5 flex-1">
                        {idx === 0 && <Label className="text-sm">E-mail de share / acesso</Label>}
                        <Input
                          type="email"
                          placeholder="email@distribuidora.com"
                          value={entry.email}
                          onChange={(e) => setDistribuidoraField(idx, "email", e.target.value)}
                          data-testid={`input-distribuidora-email-${idx}`}
                        />
                      </div>
                      {idx > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDistribuidora(idx)}
                          data-testid={`button-remove-distribuidora-${idx}`}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDistribuidora}
                data-testid="button-add-distribuidora"
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar outra distribuidora
              </Button>
            </div>

            {/* E-mails de Share — aparece quando há vínculo com empresa e ao menos uma distribuidora selecionada */}
            {VINCULO_COM_EMPRESA.has(form.vinculo) && distribuidoras.some((d) => d.distribuidora) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">E-mails de Share — {form.vinculo}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Informe os e-mails de share responsáveis pelo recebimento de direitos. Você pode adicionar múltiplos responsáveis.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {emailsShareGravadora.map((email, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1 space-y-1">
                          {idx === 0 && <Label className="text-xs text-muted-foreground">E-mail de share</Label>}
                          <Input
                            type="email"
                            placeholder={`ex: ${idx === 0 ? "financeiro" : idx === 1 ? "distribuidora" : "manager"}@${form.vinculo === "Gravadora" ? "gravadora" : "editora"}.com`}
                            value={email}
                            onChange={(e) => updateEmailShareGravadora(idx, e.target.value)}
                            data-testid={`input-share-gravadora-${idx}`}
                          />
                        </div>
                        {emailsShareGravadora.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEmailShareGravadora(idx)}
                            data-testid={`button-remove-share-gravadora-${idx}`}
                            className={`text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 ${idx === 0 ? "mt-5" : ""}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmailShareGravadora}
                    data-testid="button-add-share-gravadora"
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar outro e-mail de share
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 3 — Bio e Contexto ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-base">Bio e Contexto</h2>
              <p className="text-sm text-muted-foreground">Conte um pouco mais sobre você e sua proposta</p>
            </div>

            {/* Resumo do artista */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Resumo do Cadastro</p>
              <div className="text-sm space-y-1.5">
                {[
                  { label: "Nome do Artista", value: form.nome_artistico },
                  { label: "Tipo de Perfil", value: form.tipo_perfil.length > 0 ? form.tipo_perfil.join(", ") : null },
                  { label: "Telefone / WhatsApp", value: form.telefone },
                  { label: "E-mail", value: form.email },
                  ...(() => {
                    const filled = distribuidoras.map((d) => d.distribuidora).filter(Boolean);
                    return filled.length > 0 ? [{ label: "Distribuidoras", value: filled.join(", ") }] : [];
                  })(),
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-muted-foreground w-36 shrink-0 text-xs">{label}</span>
                    <span className={cn("font-medium truncate text-xs", value ? "" : "text-muted-foreground italic")}>
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Biografia */}
            <div className="space-y-1.5">
              <Label className="text-sm">Biografia / Proposta Artística</Label>
              <Textarea
                placeholder="Trajetória, estilo, influências e o que te diferencia. Seja direto e autêntico."
                rows={5} value={form.bio}
                onChange={(e) => set("bio", e.target.value)} data-testid="textarea-bio"
                className={errors.bio ? "border-destructive" : ""}
              />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio}</p>}
              <p className="text-xs text-muted-foreground">{form.bio.length} caracteres</p>
            </div>

            {/* Foto de Perfil */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-primary" /> Foto de Perfil (URL)
              </Label>
              <Input
                placeholder="https://..." value={form.foto_url}
                onChange={(e) => set("foto_url", e.target.value)}
                data-testid="input-foto-url"
                className={errors.foto_url ? "border-destructive" : ""}
              />
              {errors.foto_url && <p className="text-xs text-destructive">{errors.foto_url}</p>}
              {form.foto_url && /^https?:\/\/.+/.test(form.foto_url) && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={form.foto_url} alt="Preview"
                    className="h-16 w-16 rounded-full object-cover border border-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <p className="text-xs text-muted-foreground">Preview da foto</p>
                </div>
              )}
            </div>

            {/* Mensagem para a gravadora */}
            <div className="space-y-1.5">
              <Label className="text-sm">Mensagem para a gravadora</Label>
              <Textarea
                placeholder="Disponibilidade, projetos em andamento, metas ou qualquer info extra..."
                rows={3} value={form.notas_label}
                onChange={(e) => set("notas_label", e.target.value)} data-testid="textarea-notas"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={goBack}
              disabled={isSubmitting} data-testid="button-back" className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button type="button" onClick={goNext} data-testid="button-next" className="gap-1.5">
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}
              data-testid="button-submit" className="gap-1.5 min-w-36">
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                : <><CheckCircle2 className="h-4 w-4" /> Enviar Cadastro</>}
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Ao enviar, suas informações entram diretamente no sistema da gravadora.{" "}
          Seus dados são tratados com privacidade.
        </p>
      </div>
    </div>
  );
}
