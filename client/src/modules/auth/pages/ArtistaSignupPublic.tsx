import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import {
  Loader2, CheckCircle2, Music2, ChevronRight, ChevronLeft,
  Link2, Image, FileText, User, Star, Shield, Zap,
  Instagram, Youtube,
} from "lucide-react";
import { SiSpotify, SiTiktok, SiApplemusic, SiSoundcloud } from "react-icons/si";
import { createArtistUseCase, DuplicateArtistaError } from "@/modules/artist/application/createArtist.usecase";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

const GENEROS = [
  "Funk", "Forró", "Sertanejo", "Pop", "Rock", "MPB", "Eletrônica",
  "Hip Hop", "R&B", "Axé", "Pagode", "Gospel", "Reggae", "Jazz", "Outro",
];

const TIPOS = [
  { value: "artista_solo", label: "Artista Solo" },
  { value: "banda", label: "Banda" },
  { value: "dupla", label: "Dupla" },
  { value: "trio", label: "Trio" },
  { value: "grupo", label: "Grupo" },
  { value: "DJ", label: "DJ / Producer" },
];

type Step = 1 | 2 | 3;

interface FormData {
  nome_artistico: string;
  nome_civil: string;
  tipo: string;
  genero_musical: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  apple_music: string;
  soundcloud: string;
  presskit_url: string;
  bio: string;
  foto_url: string;
  notas_label: string;
}

const EMPTY: FormData = {
  nome_artistico: "", nome_civil: "", tipo: "", genero_musical: "",
  email: "", telefone: "", cpf_cnpj: "",
  instagram: "", tiktok: "", youtube: "", spotify: "",
  apple_music: "", soundcloud: "", presskit_url: "",
  bio: "", foto_url: "", notas_label: "",
};

const STEPS = [
  { num: 1 as Step, label: "Dados Básicos", icon: User },
  { num: 2 as Step, label: "Links e Redes", icon: Link2 },
  { num: 3 as Step, label: "Bio e Contexto", icon: FileText },
];

export default function ArtistaSignupPublic() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [protocol, setProtocol] = useState("");

  const set = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => { const e = { ...p }; delete e[field]; return e; });
  };

  const validateStep1 = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.nome_artistico.trim()) e.nome_artistico = "Obrigatório";
    if (!form.tipo) e.tipo = "Obrigatório";
    if (!form.email.trim()) e.email = "Obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.telefone.trim()) e.telefone = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    const urlFields: (keyof FormData)[] = ["youtube", "spotify", "apple_music", "soundcloud", "presskit_url"];
    urlFields.forEach((f) => {
      const v = (form[f] as string).trim();
      if (v && !/^https?:\/\/.+/.test(v)) e[f] = "URL deve começar com https://";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
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
    try {
      const result = await createArtistUseCase({
        nome_artistico: form.nome_artistico,
        nome_civil: form.nome_civil,
        tipo: form.tipo,
        status: "onboarding",
        genero_musical: form.genero_musical,
        email: form.email,
        telefone: form.telefone,
        cpf_cnpj: form.cpf_cnpj,
        foto_url: form.foto_url,
        observacoes: form.bio,
        org_slug: orgSlug,
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube_channel_id: form.youtube,
        spotify_artist_id: form.spotify,
        apple_music_url: form.apple_music,
        soundcloud_url: form.soundcloud,
        presskit_url: form.presskit_url,
        notas_internas: form.notas_label,
      });
      const alphanumeric = result.id.replace(/[^a-zA-Z0-9]/g, "");
      setProtocol(alphanumeric.slice(-8).toUpperCase());
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof DuplicateArtistaError) {
        if (err.field === "email") {
          setErrors({ email: "E-mail já cadastrado" });
          setStep(1);
          toast.error("E-mail já cadastrado. Volte ao passo 1 e corrija.");
        } else {
          setErrors({ cpf_cnpj: "CPF/CNPJ já cadastrado" });
          setStep(1);
          toast.error("CPF/CNPJ já cadastrado. Volte ao passo 1 e corrija.");
        }
      } else {
        toast.error("Erro ao enviar cadastro. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!orgSlug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="mx-auto rounded-full bg-destructive/10 p-5 w-fit">
            <Music2 className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Link inválido</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Este link de cadastro não está configurado. Entre em contato com a gravadora para obter o link correto.
            </p>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            /cadastro/{"{slug-da-gravadora}"}
          </p>
        </div>
      </div>
    );
  }

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
              Seu cadastro entrou direto no nosso sistema. Nossa equipe vai analisar suas informações e entrar em contato em breve.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-6 py-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Protocolo</p>
            <p className="text-2xl font-bold font-mono tracking-widest text-primary">{protocol}</p>
            <p className="text-xs text-muted-foreground">Guarde este número para acompanhamento</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Verifique seu e-mail <strong>{form.email}</strong> nos próximos dias para atualizações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary/5 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-3">
          <div className="flex justify-center mb-3">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
              <Music2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <Badge variant="outline" className="text-xs font-mono mb-2 border-primary/40 text-primary">
              {orgSlug}
            </Badge>
            <h1 className="text-2xl font-bold">Cadastro de Artista</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
              Preencha seus dados para entrar no nosso casting. Leva menos de 3 minutos.
            </p>
          </div>
          {/* Benefits */}
          <div className="flex items-center justify-center gap-6 pt-2">
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

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "flex items-center gap-2 flex-1",
                idx < STEPS.length - 1 && "mr-2"
              )}>
                <div className={cn(
                  "flex items-center justify-center rounded-full w-7 h-7 text-xs font-bold shrink-0 transition-colors",
                  step === s.num
                    ? "bg-primary text-primary-foreground"
                    : step > s.num
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}>
                  {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  step === s.num ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  "h-px flex-1 transition-colors",
                  step > s.num ? "bg-primary/40" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Dados Básicos */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-base">Dados Básicos</h2>
              <p className="text-sm text-muted-foreground">Informações essenciais sobre você</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">Nome Artístico <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome que usa profissionalmente"
                  value={form.nome_artistico}
                  onChange={(e) => set("nome_artistico", e.target.value)}
                  data-testid="input-nome-artistico"
                  className={errors.nome_artistico ? "border-destructive" : ""}
                />
                {errors.nome_artistico && <p className="text-xs text-destructive">{errors.nome_artistico}</p>}
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">Nome Civil</Label>
                <Input
                  placeholder="Nome completo (documentos)"
                  value={form.nome_civil}
                  onChange={(e) => set("nome_civil", e.target.value)}
                  data-testid="input-nome-civil"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Tipo <span className="text-destructive">*</span></Label>
                <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                  <SelectTrigger data-testid="select-tipo" className={errors.tipo ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-xs text-destructive">{errors.tipo}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Gênero Musical</Label>
                <Select value={form.genero_musical} onValueChange={(v) => set("genero_musical", v)}>
                  <SelectTrigger data-testid="select-genero">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENEROS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  data-testid="input-email"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-sm">Telefone / WhatsApp <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={(e) => set("telefone", e.target.value)}
                  data-testid="input-telefone"
                  className={errors.telefone ? "border-destructive" : ""}
                />
                {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">CPF / CNPJ</Label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf_cnpj}
                onChange={(e) => set("cpf_cnpj", e.target.value)}
                data-testid="input-cpf-cnpj"
              />
            </div>
          </div>
        )}

        {/* Step 2 — Links e Redes */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-base">Links e Redes Sociais</h2>
              <p className="text-sm text-muted-foreground">Todos os campos são opcionais — preencha o que tiver</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 text-pink-500" />
                    Instagram
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">@</span>
                    <Input
                      placeholder="usuario"
                      value={form.instagram}
                      onChange={(e) => set("instagram", e.target.value)}
                      data-testid="input-instagram"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <SiTiktok className="h-3.5 w-3.5" />
                    TikTok
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">@</span>
                    <Input
                      placeholder="usuario"
                      value={form.tiktok}
                      onChange={(e) => set("tiktok", e.target.value)}
                      data-testid="input-tiktok"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <SiSpotify className="h-3.5 w-3.5 text-green-500" />
                  Spotify
                </Label>
                <Input
                  placeholder="https://open.spotify.com/artist/..."
                  value={form.spotify}
                  onChange={(e) => set("spotify", e.target.value)}
                  data-testid="input-spotify"
                  className={errors.spotify ? "border-destructive" : ""}
                />
                {errors.spotify && <p className="text-xs text-destructive">{errors.spotify}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Youtube className="h-3.5 w-3.5 text-red-500" />
                  YouTube
                </Label>
                <Input
                  placeholder="https://youtube.com/@seucanal"
                  value={form.youtube}
                  onChange={(e) => set("youtube", e.target.value)}
                  data-testid="input-youtube"
                  className={errors.youtube ? "border-destructive" : ""}
                />
                {errors.youtube && <p className="text-xs text-destructive">{errors.youtube}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <SiApplemusic className="h-3.5 w-3.5 text-red-400" />
                    Apple Music
                  </Label>
                  <Input
                    placeholder="https://music.apple.com/..."
                    value={form.apple_music}
                    onChange={(e) => set("apple_music", e.target.value)}
                    data-testid="input-apple-music"
                    className={errors.apple_music ? "border-destructive" : ""}
                  />
                  {errors.apple_music && <p className="text-xs text-destructive">{errors.apple_music}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <SiSoundcloud className="h-3.5 w-3.5 text-orange-500" />
                    SoundCloud
                  </Label>
                  <Input
                    placeholder="https://soundcloud.com/..."
                    value={form.soundcloud}
                    onChange={(e) => set("soundcloud", e.target.value)}
                    data-testid="input-soundcloud"
                    className={errors.soundcloud ? "border-destructive" : ""}
                  />
                  {errors.soundcloud && <p className="text-xs text-destructive">{errors.soundcloud}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  Link do Press Kit / EPK
                </Label>
                <Input
                  placeholder="https://drive.google.com/... ou outro link"
                  value={form.presskit_url}
                  onChange={(e) => set("presskit_url", e.target.value)}
                  data-testid="input-presskit"
                  className={errors.presskit_url ? "border-destructive" : ""}
                />
                {errors.presskit_url && <p className="text-xs text-destructive">{errors.presskit_url}</p>}
                <p className="text-xs text-muted-foreground">Google Drive, Dropbox, Notion, site próprio, etc.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Bio e Contexto */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-base">Bio e Contexto</h2>
              <p className="text-sm text-muted-foreground">Conte um pouco mais sobre você e sua proposta musical</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Biografia / Proposta Artística</Label>
              <Textarea
                placeholder="Conte sobre sua trajetória, estilo, influências e o que te diferencia. Seja direto e autêntico."
                rows={5}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                data-testid="textarea-bio"
              />
              <p className="text-xs text-muted-foreground">{form.bio.length} caracteres</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-primary" />
                Foto de Perfil (URL)
              </Label>
              <Input
                placeholder="https://..."
                value={form.foto_url}
                onChange={(e) => set("foto_url", e.target.value)}
                data-testid="input-foto-url"
                className={errors.foto_url ? "border-destructive" : ""}
              />
              {errors.foto_url && <p className="text-xs text-destructive">{errors.foto_url}</p>}
              {form.foto_url && /^https?:\/\/.+/.test(form.foto_url) && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={form.foto_url}
                    alt="Preview"
                    className="h-16 w-16 rounded-full object-cover border border-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <p className="text-xs text-muted-foreground">Preview da foto</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Mensagem para a gravadora</Label>
              <Textarea
                placeholder="Alguma informação específica que queira passar para nossa equipe? Disponibilidade, projetos em andamento, metas..."
                rows={3}
                value={form.notas_label}
                onChange={(e) => set("notas_label", e.target.value)}
                data-testid="textarea-notas"
              />
            </div>

            {/* Resumo do cadastro */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resumo</p>
              <div className="text-sm space-y-1">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Artista</span>
                  <span className="font-medium">{form.nome_artistico}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Tipo</span>
                  <span>{TIPOS.find((t) => t.value === form.tipo)?.label || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Gênero</span>
                  <span>{form.genero_musical || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">E-mail</span>
                  <span className="truncate">{form.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={isSubmitting}
              data-testid="button-back"
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button
              type="button"
              onClick={goNext}
              data-testid="button-next"
              className="gap-1.5"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="button-submit"
              className="gap-1.5 min-w-36"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Enviar Cadastro</>
              )}
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
