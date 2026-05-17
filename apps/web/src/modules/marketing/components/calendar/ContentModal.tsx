import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, ChevronDown, ChevronUp, Clock, Heart,
  Loader2, MessageCircle, Send, Upload, X,
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
];

const STATUS_OPTIONS = [
  { value: "rascunho",  label: "Rascunho",   dot: "bg-slate-400" },
  { value: "agendado",  label: "Agendado",   dot: "bg-blue-400" },
  { value: "publicado", label: "Publicado",  dot: "bg-emerald-400" },
  { value: "pausado",   label: "Pausado",    dot: "bg-amber-400" },
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

export function ContentModal({
  open, onOpenChange, initialData, mode, prefilledDate, prefilledHour,
}: ContentModalProps) {
  const { addConteudo, updateConteudo } = useConteudos();

  const [selectedPlataforma, setSelectedPlataforma] = useState<string>("instagram");
  const [selectedTipo, setSelectedTipo]             = useState<string>("post");
  const [selectedStatus, setSelectedStatus]         = useState<string>("agendado");
  const [selectedDate, setSelectedDate]             = useState<Date | undefined>(undefined);
  const [calOpen, setCalOpen]                       = useState(false);
  const [advancedOpen, setAdvancedOpen]             = useState(false);
  const [mediaPreview, setMediaPreview]             = useState<string | null>(null);

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
      setMediaPreview((initialData as any).thumbnail_url ?? null);
    } else {
      reset({ titulo: "", legenda: "", horario: prefilledHour ?? "", campanha_relacionada: "" });
      setSelectedPlataforma("instagram");
      setSelectedTipo("post");
      setSelectedStatus("agendado");
      setSelectedDate(prefilledDate ?? undefined);
      setMediaPreview(null);
    }
  }, [open, initialData, prefilledDate, prefilledHour, reset]);

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

  const currentPlat = PLATAFORMAS.find((p) => p.value === selectedPlataforma) ?? PLATAFORMAS[0];
  const currentTipo = TIPOS.find((t) => t.value === selectedTipo) ?? TIPOS[0];
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === selectedStatus) ?? STATUS_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[720px] p-0 gap-0 overflow-hidden rounded-2xl"
        data-testid="content-modal"
      >
        <DialogTitle className="sr-only">{mode === "edit" ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
        <div className="flex h-full max-h-[90vh]">

          {/* ══ LEFT PANEL: Preview ══ */}
          <div className="w-[280px] shrink-0 flex flex-col bg-muted/30 border-r border-border/40">
            {/* Preview header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] ${currentPlat.color}`}>
                {currentPlat.icon}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Prévia • {currentPlat.label} {currentTipo.label}
              </span>
            </div>

            {/* Media preview */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
              <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[4/5] shadow-md">
                {mediaPreview ? (
                  <>
                    <img src={mediaPreview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      onClick={() => setMediaPreview(null)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <span className="text-white/20 text-4xl">▶</span>
                  </div>
                )}
                {/* Social action icons */}
                <div className="absolute bottom-3 right-2 flex flex-col gap-2.5 items-center">
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
              </div>

              {/* Upload area */}
              <div className="w-full">
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Alterar mídia</p>
                <label className="w-full flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-border/60 bg-background/50 hover:bg-background hover:border-primary/40 cursor-pointer transition-colors group">
                  <Upload className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  <span className="text-[10px] text-muted-foreground/70 text-center leading-tight">
                    Arraste ou clique para<br />fazer upload
                  </span>
                  <span className="text-[9px] text-muted-foreground/40">Vídeo ou imagem • Máx. 200MB</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setMediaPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* ══ RIGHT PANEL: Form ══ */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40">
              <h2 className="text-base font-semibold">
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

            {/* Scrollable fields */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Título */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Título *</Label>
                  <span className={cn(
                    "text-[10px]",
                    tituloVal.length > TITULO_MAX * 0.9 ? "text-amber-500" : "text-muted-foreground/60",
                  )}>
                    {tituloVal.length}/{TITULO_MAX}
                  </span>
                </div>
                <Input
                  {...register("titulo")}
                  placeholder="Ex: Post de lançamento do novo single"
                  className="h-9 rounded-lg text-sm"
                  data-testid="input-titulo"
                  maxLength={TITULO_MAX}
                />
                {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
              </div>

              {/* Plataforma + Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Plataforma *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-9 justify-between text-sm rounded-lg font-normal"
                        data-testid="dropdown-plataforma"
                      >
                        <span className="flex items-center gap-2">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0 ${currentPlat.color}`}>
                            {currentPlat.icon}
                          </span>
                          {currentPlat.label}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48">
                      {PLATAFORMAS.map((p) => (
                        <DropdownMenuItem
                          key={p.value}
                          onClick={() => setSelectedPlataforma(p.value)}
                          className="flex items-center gap-2"
                        >
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white ${p.color}`}>
                            {p.icon}
                          </span>
                          {p.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tipo de conteúdo *</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-9 justify-between text-sm rounded-lg font-normal"
                        data-testid="dropdown-tipo"
                      >
                        {currentTipo.label}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                      {TIPOS.map((t) => (
                        <DropdownMenuItem
                          key={t.value}
                          onClick={() => setSelectedTipo(t.value)}
                        >
                          {t.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Data + Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Data *</Label>
                  <Popover open={calOpen} onOpenChange={setCalOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full h-9 justify-start text-left font-normal text-sm rounded-lg",
                          !selectedDate && "text-muted-foreground",
                        )}
                        data-testid="button-data"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                        {selectedDate
                          ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => { setSelectedDate(d); setCalOpen(false); }}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Hora *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      {...register("horario")}
                      type="time"
                      className="h-9 rounded-lg text-sm pl-9"
                      data-testid="input-horario"
                    />
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Legenda / Copy *</Label>
                  <span className={cn(
                    "text-[10px]",
                    legendaVal.length > LEGENDA_MAX * 0.9 ? "text-amber-500" : "text-muted-foreground/60",
                  )}>
                    {legendaVal.length}/{LEGENDA_MAX}
                  </span>
                </div>
                <Textarea
                  {...register("legenda")}
                  placeholder="Escreva a legenda da publicação…"
                  className="min-h-[100px] rounded-lg text-sm resize-none"
                  data-testid="input-legenda"
                  maxLength={LEGENDA_MAX}
                />
              </div>

              {/* Configurações avançadas */}
              <div className="border border-border/40 rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors"
                  onClick={() => setAdvancedOpen((v) => !v)}
                >
                  <span>Configurações avançadas</span>
                  {advancedOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </button>

                {advancedOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/30">
                    {/* Status */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Status</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-9 justify-between text-sm rounded-lg font-normal"
                          >
                            <span className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${currentStatus.dot}`} />
                              {currentStatus.label}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44">
                          {STATUS_OPTIONS.map((s) => (
                            <DropdownMenuItem
                              key={s.value}
                              onClick={() => setSelectedStatus(s.value)}
                              className="flex items-center gap-2"
                            >
                              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                              {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Campanha */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Campanha relacionada</Label>
                      <Input
                        {...register("campanha_relacionada")}
                        placeholder="Nome da campanha…"
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 rounded-xl text-sm"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-9 rounded-xl text-sm gap-2"
                disabled={isSubmitting}
                data-testid="button-save-content"
              >
                {isSubmitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {mode === "edit" ? "Salvar Conteúdo" : "Agendar Conteúdo"}
                    </>
                }
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
