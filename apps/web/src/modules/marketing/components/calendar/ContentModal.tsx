import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown, ChevronUp, ImagePlus, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
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

const schema = z.object({
  titulo:    z.string().min(1, "Título obrigatório"),
  legenda:   z.string().optional(),
  horario:   z.string().optional(),
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

  const [selectedPlataformas, setSelectedPlataformas] = useState<string[]>([]);
  const [selectedTipo, setSelectedTipo]   = useState<string>("post");
  const [selectedStatus, setSelectedStatus] = useState<string>("rascunho");
  const [selectedDate, setSelectedDate]   = useState<Date | undefined>(undefined);
  const [calOpen, setCalOpen]             = useState(false);
  const [advancedOpen, setAdvancedOpen]   = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: "", legenda: "", horario: "", campanha_relacionada: "" },
  });

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
      setSelectedPlataformas(Array.isArray(p) ? p : p ? [p] : []);
      const t = initialData.tipo_conteudo;
      setSelectedTipo(Array.isArray(t) ? t[0] ?? "post" : t ?? "post");
      setSelectedStatus(initialData.status ?? "rascunho");
      setSelectedDate(initialData.data_publicacao ? new Date(initialData.data_publicacao) : undefined);
      setThumbnailPreview((initialData as any).thumbnail_url ?? null);
    } else {
      reset({ titulo: "", legenda: "", horario: prefilledHour ?? "", campanha_relacionada: "" });
      setSelectedPlataformas([]);
      setSelectedTipo("post");
      setSelectedStatus("agendado");
      setSelectedDate(prefilledDate ?? undefined);
      setThumbnailPreview(null);
    }
  }, [open, initialData, prefilledDate, prefilledHour, reset]);

  const togglePlataforma = (v: string) =>
    setSelectedPlataformas((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      titulo:             data.titulo,
      legenda:            data.legenda || null,
      plataforma:         selectedPlataformas,
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

  const firstPlat = PLATAFORMAS.find((p) => p.value === selectedPlataformas[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl"
        data-testid="content-modal"
      >
        <div className="flex h-full">
          {/* ── LEFT: Preview ── */}
          <div className={`w-[280px] shrink-0 flex flex-col items-center justify-center gap-4 p-6 ${firstPlat ? firstPlat.color : "bg-muted/40"}`}>
            {thumbnailPreview ? (
              <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden shadow-lg">
                <img src={thumbnailPreview} alt="preview" className="w-full h-full object-cover" />
                <button
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  onClick={() => setThumbnailPreview(null)}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="w-full aspect-[9/16] rounded-xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/50 transition-colors group">
                <ImagePlus className="h-8 w-8 text-white/50 group-hover:text-white/80 transition-colors" />
                <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">Upload mídia</span>
                <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setThumbnailPreview(URL.createObjectURL(f));
                }} />
              </label>
            )}
            <div className="flex gap-2">
              {PLATAFORMAS.slice(0, 4).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlataforma(p.value)}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-white transition-all border-2",
                    selectedPlataformas.includes(p.value)
                      ? "border-white opacity-100 shadow-md scale-110"
                      : "border-transparent opacity-40 hover:opacity-70",
                    p.color,
                  )}
                  title={p.label}
                >
                  {p.icon}
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/50">
              <h2 className="text-base font-semibold">
                {mode === "edit" ? "Editar conteúdo" : "Novo conteúdo"}
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 px-6 py-4 space-y-4">
              {/* Título */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Título *</Label>
                <Input
                  {...register("titulo")}
                  placeholder="Ex: Reels lançamento do single…"
                  className="h-9 rounded-lg text-sm"
                  data-testid="input-titulo"
                />
                {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
              </div>

              {/* Tipo + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {TIPOS.map((t) => (
                      <button
                        key={t.value} type="button"
                        onClick={() => setSelectedTipo(t.value)}
                        className={cn(
                          "px-2.5 h-7 rounded-lg text-xs font-medium border transition-all",
                          selectedTipo === t.value
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/50",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <div className="flex flex-col gap-1">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value} type="button"
                        onClick={() => setSelectedStatus(s.value)}
                        className={cn(
                          "flex items-center gap-2 px-2.5 h-7 rounded-lg text-xs font-medium border transition-all text-left",
                          selectedStatus === s.value
                            ? "bg-muted border-border text-foreground"
                            : "border-transparent text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data + Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Data</Label>
                  <Popover open={calOpen} onOpenChange={setCalOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button" variant="outline"
                        className={cn("w-full h-9 justify-start text-left font-normal text-sm rounded-lg", !selectedDate && "text-muted-foreground")}
                        data-testid="button-data"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
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
                  <Label className="text-xs font-medium text-muted-foreground">Horário</Label>
                  <Input
                    {...register("horario")}
                    type="time"
                    className="h-9 rounded-lg text-sm"
                    data-testid="input-horario"
                  />
                </div>
              </div>

              {/* Legenda */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Legenda / Copy</Label>
                <Textarea
                  {...register("legenda")}
                  placeholder="Escreva a legenda da publicação…"
                  className="min-h-[80px] rounded-lg text-sm resize-none"
                  data-testid="input-legenda"
                />
              </div>

              {/* Advanced toggle */}
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Configurações avançadas
              </button>

              {advancedOpen && (
                <div className="space-y-3 pt-1 border-t border-border/40">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Campanha relacionada</Label>
                    <Input
                      {...register("campanha_relacionada")}
                      placeholder="Nome da campanha…"
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Plataformas adicionais</Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATAFORMAS.map((p) => (
                        <button
                          key={p.value} type="button"
                          onClick={() => togglePlataforma(p.value)}
                          title={p.label}
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-white border-2 transition-all",
                            p.color,
                            selectedPlataformas.includes(p.value)
                              ? "border-foreground shadow-md scale-110 opacity-100"
                              : "border-transparent opacity-40 hover:opacity-70",
                          )}
                        >
                          {p.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-5 pt-2 border-t border-border/50">
              <Button type="button" variant="outline" className="flex-1 h-9 rounded-xl text-sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-9 rounded-xl text-sm" disabled={isSubmitting} data-testid="button-save-content">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "edit" ? "Salvar" : "Agendar"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
