import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, ChevronDown, ChevronUp, Clock, Heart,
  Loader2, MessageCircle, Send, X, MapPin, Hash, Globe, Lock, Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { useConteudos } from "@/modules/marketing/hooks/useConteudos";
import type { ConteudoWithRelations, ConteudoInsert } from "@/modules/marketing/hooks/useConteudos";
import { useMediaUpload } from "@/modules/marketing/hooks/useMediaUpload";
import { MediaUploader } from "./MediaUploader";
import { toast } from "sonner";
import {
  InstagramIcon, TikTokIcon, YouTubeIcon, FacebookIcon, TwitterXIcon, LinkedInIcon,
} from "./platform-icons";

const PLATAFORMAS = [
  { value: "instagram", icon: <InstagramIcon className="h-4 w-4" />, label: "Instagram",  color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { value: "tiktok",    icon: <TikTokIcon    className="h-4 w-4" />, label: "TikTok",     color: "bg-black" },
  { value: "youtube",   icon: <YouTubeIcon   className="h-4 w-4" />, label: "YouTube",    color: "bg-red-600" },
  { value: "facebook",  icon: <FacebookIcon  className="h-4 w-4" />, label: "Facebook",   color: "bg-blue-600" },
  { value: "twitter",   icon: <TwitterXIcon  className="h-4 w-4" />, label: "Twitter/X",  color: "bg-sky-500" },
  { value: "linkedin",  icon: <LinkedInIcon  className="h-4 w-4" />, label: "LinkedIn",   color: "bg-blue-700" },
];

const TIPOS = [
  { value: "post",      label: "Post" },
  { value: "reels",     label: "Reels" },
  { value: "stories",   label: "Stories" },
  { value: "video",     label: "Vídeo" },
  { value: "carrossel", label: "Carrossel" },
  { value: "anuncio",   label: "Anúncio" },
  { value: "shorts",    label: "Shorts" },
];

const STATUS_OPTIONS = [
  { value: "rascunho",  label: "Rascunho",   dot: "bg-slate-400" },
  { value: "agendado",  label: "Agendado",   dot: "bg-blue-400" },
  { value: "publicado", label: "Publicado",  dot: "bg-emerald-400" },
  { value: "pausado",   label: "Pausado",    dot: "bg-amber-400" },
];

const YT_PRIVACY = [
  { value: "public",    label: "Público",      icon: <Globe className="h-3.5 w-3.5" /> },
  { value: "unlisted",  label: "Não listado",  icon: <Users className="h-3.5 w-3.5" /> },
  { value: "private",   label: "Privado",      icon: <Lock  className="h-3.5 w-3.5" /> },
];

const TK_PRIVACY = [
  { value: "public",    label: "Público",      icon: <Globe className="h-3.5 w-3.5" /> },
  { value: "friends",   label: "Amigos",       icon: <Users className="h-3.5 w-3.5" /> },
  { value: "private",   label: "Privado",      icon: <Lock  className="h-3.5 w-3.5" /> },
];

const TITULO_MAX  = 100;
const LEGENDA_MAX = 2200;

const schema = z.object({
  titulo:   z.string().min(1, "Título obrigatório").max(TITULO_MAX),
  legenda:  z.string().max(LEGENDA_MAX).optional(),
  horario:  z.string().optional(),
  campanha_relacionada: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ConteudoWithRelations | null;
  mode: "create" | "edit";
  prefilledDate?: Date | null;
  prefilledHour?: string | null;
}

function ChipInput({
  label, chips, onAdd, onRemove, placeholder,
}: { label: string; chips: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const commit = () => {
    const tokens = input.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
    tokens.forEach(onAdd);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex flex-wrap gap-1 p-2 rounded-lg border border-input bg-background min-h-[36px] focus-within:ring-1 focus-within:ring-ring">
        {chips.map((chip, i) => (
          <span key={i} className="flex items-center gap-0.5 bg-muted text-foreground text-[10px] px-2 py-0.5 rounded-full">
            {chip}
            <button type="button" onClick={() => onRemove(i)} className="ml-0.5 hover:text-destructive transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
          onBlur={commit}
          placeholder={chips.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}

export function ContentModal({
  open, onOpenChange, initialData, mode, prefilledDate, prefilledHour,
}: ContentModalProps) {
  const { addConteudo, updateConteudo } = useConteudos();
  const media         = useMediaUpload();
  const ytThumbMedia  = useMediaUpload();
  const tkThumbMedia  = useMediaUpload();

  const [selectedPlataforma, setSelectedPlataforma] = useState<string>("instagram");
  const [selectedTipo, setSelectedTipo]             = useState<string>("post");
  const [selectedStatus, setSelectedStatus]         = useState<string>("agendado");
  const [selectedDate, setSelectedDate]             = useState<Date | undefined>(undefined);
  const [calOpen, setCalOpen]                       = useState(false);
  const [advancedOpen, setAdvancedOpen]             = useState(false);

  const [igHashtags, setIgHashtags]   = useState<string[]>([]);
  const [igLocation, setIgLocation]   = useState("");
  const [igCarrossel, setIgCarrossel] = useState(false);

  const [ytPrivacy, setYtPrivacy] = useState("public");
  const [ytTags, setYtTags]       = useState<string[]>([]);

  const [tkPrivacy, setTkPrivacy]   = useState("public");
  const [tkDuration, setTkDuration] = useState<string>("");

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: "", legenda: "", horario: "", campanha_relacionada: "" },
  });

  const tituloVal  = watch("titulo")  ?? "";
  const legendaVal = watch("legenda") ?? "";

  useEffect(() => {
    if (!open) return;
    media.reset();
    ytThumbMedia.reset();
    tkThumbMedia.reset();
    if (initialData) {
      reset({
        titulo:   initialData.titulo ?? "",
        legenda:  initialData.legenda ?? "",
        horario:  initialData.horario_publicacao?.slice(0, 5) ?? "",
        campanha_relacionada: (initialData.campanha_relacionada as string | undefined) ?? "",
      });
      const p = initialData.plataforma;
      const plats = Array.isArray(p) ? p : p ? [p] : [];
      setSelectedPlataforma(plats[0] ?? "instagram");
      const t = initialData.tipo_conteudo;
      setSelectedTipo(Array.isArray(t) ? t[0] ?? "post" : t ?? "post");
      setSelectedStatus(initialData.status ?? "agendado");
      setSelectedDate(initialData.data_publicacao ? new Date(initialData.data_publicacao) : undefined);

      const meta = (initialData.meta_plataforma ?? {}) as Record<string, unknown>;
      setIgHashtags((meta.hashtags as string[] | undefined) ?? []);
      setIgLocation((meta.location as string | undefined) ?? "");
      setIgCarrossel((meta.carrossel as boolean | undefined) ?? false);
      setYtPrivacy((meta.ytPrivacy as string | undefined) ?? "public");
      setYtTags((meta.ytTags as string[] | undefined) ?? []);
      setTkPrivacy((meta.tkPrivacy as string | undefined) ?? "public");
      setTkDuration(String((meta.tkDuration as number | undefined) ?? ""));
    } else {
      reset({ titulo: "", legenda: "", horario: prefilledHour ?? "", campanha_relacionada: "" });
      setSelectedPlataforma("instagram");
      setSelectedTipo("post");
      setSelectedStatus("agendado");
      setSelectedDate(prefilledDate ?? undefined);
      setIgHashtags([]); setIgLocation(""); setIgCarrossel(false);
      setYtPrivacy("public"); setYtTags([]);
      setTkPrivacy("public"); setTkDuration("");
    }
  }, [open, initialData, prefilledDate, prefilledHour, reset]);

  const buildMetaPlataforma = () => {
    if (selectedPlataforma === "instagram") {
      return { hashtags: igHashtags, location: igLocation, carrossel: igCarrossel };
    }
    if (selectedPlataforma === "youtube") {
      return {
        ytPrivacy,
        ytTags,
        ytThumbnail: ytThumbMedia.previewUrl ?? null,
      };
    }
    if (selectedPlataforma === "tiktok") {
      return {
        tkPrivacy,
        tkDuration:  tkDuration ? Number(tkDuration) : null,
        tkThumbnail: tkThumbMedia.previewUrl ?? null,
      };
    }
    return {};
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      titulo:             data.titulo,
      legenda:            data.legenda || null,
      plataforma:         [selectedPlataforma],
      tipo_conteudo:      [selectedTipo],
      status:             selectedStatus,
      data_publicacao:    selectedDate ? selectedDate.toISOString().slice(0, 10) : null,
      horario_publicacao: data.horario || null,
      campanha_relacionada: data.campanha_relacionada || null,
      thumbnail_url:      media.previewUrl ?? null,
      url:                media.previewUrl ?? null,
      meta_plataforma:    buildMetaPlataforma(),
    };
    try {
      if (mode === "edit" && initialData?.id) {
        await updateConteudo.mutateAsync({ id: initialData.id, ...payload });
      } else {
        await addConteudo.mutateAsync(payload as ConteudoInsert);
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar conteúdo");
    }
  };

  const currentPlat   = PLATAFORMAS.find((p) => p.value === selectedPlataforma) ?? PLATAFORMAS[0];
  const currentTipo   = TIPOS.find((t) => t.value === selectedTipo) ?? TIPOS[0];
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === selectedStatus) ?? STATUS_OPTIONS[0];
  const currentYtPrivacy = YT_PRIVACY.find((p) => p.value === ytPrivacy) ?? YT_PRIVACY[0];
  const currentTkPrivacy = TK_PRIVACY.find((p) => p.value === tkPrivacy) ?? TK_PRIVACY[0];

  const showSocialIcons = ["instagram", "tiktok"].includes(selectedPlataforma);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[720px] p-0 gap-0 overflow-hidden rounded-2xl"
        data-testid="content-modal"
      >
        <DialogTitle className="sr-only">{mode === "edit" ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
        <div className="flex" style={{ maxHeight: "90vh" }}>

          {/* ══ LEFT PANEL: Preview ══ */}
          <div className="w-[268px] shrink-0 flex flex-col bg-muted/30 border-r border-border/40 overflow-y-auto">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 shrink-0">
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${currentPlat.color}`}>
                {currentPlat.icon}
              </span>
              <span className="text-xs text-muted-foreground font-medium truncate">
                Prévia • {currentPlat.label} {currentTipo.label}
              </span>
            </div>

            <div className="flex-1 flex flex-col p-3 gap-3">
              <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-md" style={{ aspectRatio: "4/5" }}>
                {media.previewUrl ? (
                  <>
                    <img src={media.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      onClick={() => media.reset()}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900`}>
                    <span className="text-white/10 text-5xl select-none">▶</span>
                  </div>
                )}
                {showSocialIcons && (
                  <div className="absolute bottom-3 right-2 flex flex-col gap-2.5 items-center pointer-events-none">
                    <div className="flex flex-col items-center gap-0.5">
                      <Heart className="h-5 w-5 text-white drop-shadow" />
                      <span className="text-[9px] text-white/80">0</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <MessageCircle className="h-5 w-5 text-white drop-shadow" />
                      <span className="text-[9px] text-white/80">0</span>
                    </div>
                    <Send className="h-5 w-5 text-white drop-shadow" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Alterar mídia</p>
                <MediaUploader media={media} compact />
              </div>
            </div>
          </div>

          {/* ══ RIGHT PANEL: Form ══ */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40 shrink-0">
              <h2 className="text-sm font-semibold">
                {mode === "edit" ? "Editar Conteúdo" : "Novo Conteúdo"}
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">

              {/* Título */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Título *</Label>
                  <span className={cn("text-[10px]", tituloVal.length > TITULO_MAX * 0.9 ? "text-amber-500" : "text-muted-foreground/50")}>
                    {tituloVal.length}/{TITULO_MAX}
                  </span>
                </div>
                <Input
                  {...register("titulo")}
                  placeholder="Ex: Post de lançamento do novo single"
                  className="h-8 rounded-lg text-sm"
                  data-testid="input-titulo"
                  maxLength={TITULO_MAX}
                />
                {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
              </div>

              {/* Plataforma + Tipo */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Plataforma *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="w-full h-8 justify-between text-xs rounded-lg font-normal" data-testid="dropdown-plataforma">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center text-white shrink-0 ${currentPlat.color}`}>
                            {currentPlat.icon}
                          </span>
                          {currentPlat.label}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-44">
                      {PLATAFORMAS.map((p) => (
                        <DropdownMenuItem key={p.value} onClick={() => setSelectedPlataforma(p.value)} className="flex items-center gap-2 text-sm">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0 ${p.color}`}>{p.icon}</span>
                          {p.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Tipo de conteúdo *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="w-full h-8 justify-between text-xs rounded-lg font-normal" data-testid="dropdown-tipo">
                        {currentTipo.label}
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-36">
                      {TIPOS.map((t) => (
                        <DropdownMenuItem key={t.value} onClick={() => setSelectedTipo(t.value)}>{t.label}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Data + Hora */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Data *</Label>
                  <Popover open={calOpen} onOpenChange={setCalOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button" variant="outline"
                        className={cn("w-full h-8 justify-start text-left font-normal text-xs rounded-lg", !selectedDate && "text-muted-foreground")}
                        data-testid="button-data"
                      >
                        <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setCalOpen(false); }} initialFocus locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Hora *</Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    <Input {...register("horario")} type="time" className="h-8 rounded-lg text-xs pl-8" data-testid="input-horario" />
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Legenda / Copy *</Label>
                  <span className={cn("text-[10px]", legendaVal.length > LEGENDA_MAX * 0.9 ? "text-amber-500" : "text-muted-foreground/50")}>
                    {legendaVal.length}/{LEGENDA_MAX}
                  </span>
                </div>
                <Textarea
                  {...register("legenda")}
                  placeholder="Escreva a legenda da publicação…"
                  className="min-h-[80px] rounded-lg text-xs resize-none"
                  data-testid="input-legenda"
                  maxLength={LEGENDA_MAX}
                />
              </div>

              {/* Configurações avançadas */}
              <div className="border border-border/40 rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium hover:bg-muted/40 transition-colors"
                  onClick={() => setAdvancedOpen((v) => !v)}
                >
                  <span>Configurações avançadas</span>
                  {advancedOpen
                    ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </button>

                {advancedOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/30">
                    {/* Status */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Status</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" className="w-full h-8 justify-between text-xs rounded-lg font-normal">
                            <span className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${currentStatus.dot}`} />
                              {currentStatus.label}
                            </span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-40">
                          {STATUS_OPTIONS.map((s) => (
                            <DropdownMenuItem key={s.value} onClick={() => setSelectedStatus(s.value)} className="flex items-center gap-2 text-xs">
                              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                              {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Campanha */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Campanha relacionada</Label>
                      <Input {...register("campanha_relacionada")} placeholder="Nome da campanha…" className="h-8 rounded-lg text-xs" />
                    </div>

                    {/* ── INSTAGRAM ── */}
                    {selectedPlataforma === "instagram" && (
                      <>
                        <ChipInput
                          label="Hashtags"
                          chips={igHashtags}
                          onAdd={(v) => setIgHashtags((prev) => prev.includes(v) ? prev : [...prev, v.startsWith("#") ? v : `#${v}`])}
                          onRemove={(i) => setIgHashtags((prev) => prev.filter((_, idx) => idx !== i))}
                          placeholder="#música #lançamento…"
                        />
                        <div className="space-y-1">
                          <Label className="text-xs font-medium flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" /> Localização
                          </Label>
                          <Input
                            value={igLocation}
                            onChange={(e) => setIgLocation(e.target.value)}
                            placeholder="Ex: São Paulo, Brasil"
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between py-0.5">
                          <Label className="text-xs font-medium">Carrossel</Label>
                          <button
                            type="button"
                            onClick={() => setIgCarrossel((v) => !v)}
                            className={cn(
                              "h-5 w-9 rounded-full transition-colors relative",
                              igCarrossel ? "bg-primary" : "bg-muted-foreground/30",
                            )}
                          >
                            <span className={cn(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                              igCarrossel ? "translate-x-4" : "translate-x-0.5",
                            )} />
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── YOUTUBE ── */}
                    {selectedPlataforma === "youtube" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Privacy status</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" className="w-full h-8 justify-between text-xs rounded-lg font-normal">
                                <span className="flex items-center gap-2">
                                  {currentYtPrivacy.icon}
                                  {currentYtPrivacy.label}
                                </span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-40">
                              {YT_PRIVACY.map((p) => (
                                <DropdownMenuItem key={p.value} onClick={() => setYtPrivacy(p.value)} className="flex items-center gap-2 text-xs">
                                  {p.icon} {p.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <ChipInput
                          label="Tags"
                          chips={ytTags}
                          onAdd={(v) => setYtTags((prev) => prev.includes(v) ? prev : [...prev, v])}
                          onRemove={(i) => setYtTags((prev) => prev.filter((_, idx) => idx !== i))}
                          placeholder="música, lançamento, indie…"
                        />
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Thumbnail personalizada</Label>
                          <MediaUploader media={ytThumbMedia} compact />
                        </div>
                      </>
                    )}

                    {/* ── TIKTOK ── */}
                    {selectedPlataforma === "tiktok" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-muted-foreground" /> Privacidade
                          </Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" className="w-full h-8 justify-between text-xs rounded-lg font-normal">
                                <span className="flex items-center gap-2">
                                  {currentTkPrivacy.icon}
                                  {currentTkPrivacy.label}
                                </span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-40">
                              {TK_PRIVACY.map((p) => (
                                <DropdownMenuItem key={p.value} onClick={() => setTkPrivacy(p.value)} className="flex items-center gap-2 text-xs">
                                  {p.icon} {p.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Duração do vídeo (segundos)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={600}
                            value={tkDuration}
                            onChange={(e) => setTkDuration(e.target.value)}
                            placeholder="Ex: 60"
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Thumbnail personalizada</Label>
                          <MediaUploader media={tkThumbMedia} compact />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-3 border-t border-border/40 shrink-0">
              <Button type="button" variant="outline" className="flex-1 h-8 rounded-xl text-xs" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-8 rounded-xl text-xs gap-1.5" disabled={isSubmitting} data-testid="button-save-content">
                {isSubmitting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <><CalendarIcon className="h-3 w-3" />{mode === "edit" ? "Salvar Conteúdo" : "Agendar Conteúdo"}</>
                }
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
