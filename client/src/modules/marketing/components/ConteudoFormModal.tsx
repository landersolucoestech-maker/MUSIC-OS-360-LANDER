import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/shared/ui/dropdown-menu";
import { Textarea } from "@/shared/ui/textarea";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { FieldError } from "@/shared/components/FormField";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown, Loader2, Music2, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { conteudoSchema, type ConteudoFormData } from "@/modules/marketing/lib/conteudo-schema";
import { useConteudos, type ConteudoInsert, type Conteudo } from "@/modules/marketing/hooks/useConteudos";
import { useLancamentos, type LancamentoWithRelations } from "@/modules/releases/hooks/useLancamentos";

const PLATAFORMA_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
];

const TIPO_CONTEUDO_OPTIONS = [
  { value: "post", label: "Post" },
  { value: "stories", label: "Stories" },
  { value: "video", label: "Vídeo" },
  { value: "anuncio", label: "Anúncio" },
  { value: "carrossel", label: "Carrossel" },
  { value: "reels", label: "Reels" },
];

const FORMATO_OPTIONS = [
  { value: "imagem", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "carrossel", label: "Carrossel" },
  { value: "texto", label: "Texto" },
  { value: "gif", label: "GIF" },
];

interface ConteudoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Conteudo | null;
  mode: "create" | "edit";
  tipo?: "post" | "stories" | "default";
}

export function ConteudoFormModal({ open, onOpenChange, initialData, mode, tipo = "default" }: ConteudoFormModalProps) {
  const { addConteudo, updateConteudo } = useConteudos();
  const { lancamentos, isLoading: loadingLancamentos } = useLancamentos();

  // Multi-value arrays managed separately (custom DropdownMenu UI)
  const [plataformas, setPlataformas] = useState<string[]>([]);
  const [tiposConteudo, setTiposConteudo] = useState<string[]>([]);
  const [formatos, setFormatos] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConteudoFormData>({
    resolver: zodResolver(conteudoSchema),
    defaultValues: {
      titulo: "",
      status: "",
      campanhaRelacionada: "",
      lancamentoId: "",
      descricao: "",
      legenda: "",
      horarioPublicacao: "",
    },
  });

  const getTitulo = () => {
    if (mode === "edit") return "Editar Conteúdo";
    if (tipo === "post") return "Criar Post";
    if (tipo === "stories") return "Criar Stories";
    return "Novo Conteúdo";
  };

  useEffect(() => {
    if (!open) return;
    if (initialData && mode === "edit") {
      reset({
        titulo: (initialData.titulo as string) || "",
        status: (initialData.status as string) || "",
        campanhaRelacionada: (initialData.campanha_relacionada as string) || "",
        lancamentoId: (initialData.lancamento_id as string) || "",
        descricao: (initialData.descricao as string) || "",
        legenda: (initialData.legenda as string) || "",
        horarioPublicacao: (initialData.horario_publicacao as string) || "",
      });
      setPlataformas(Array.isArray(initialData.plataforma) ? (initialData.plataforma as string[]) : []);
      setTiposConteudo(Array.isArray(initialData.tipo_conteudo) ? (initialData.tipo_conteudo as string[]) : []);
      setFormatos(Array.isArray(initialData.formato) ? (initialData.formato as string[]) : []);
    } else {
      reset({
        titulo: "",
        status: "",
        campanhaRelacionada: "",
        lancamentoId: "",
        descricao: "",
        legenda: "",
        horarioPublicacao: "",
      });
      setPlataformas([]);
      setTiposConteudo(tipo === "post" ? ["post"] : tipo === "stories" ? ["stories"] : []);
      setFormatos([]);
    }
  }, [open, initialData, mode, tipo, reset]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const onSubmit = async (data: ConteudoFormData) => {
    try {
      const payload: ConteudoInsert = {
        titulo: data.titulo,
        plataforma: plataformas.length > 0 ? plataformas : null,
        tipo_conteudo: tiposConteudo.length > 0 ? tiposConteudo : null,
        formato: formatos.length > 0 ? formatos : null,
        status: data.status || "rascunho",
        campanha_relacionada: data.campanhaRelacionada || null,
        descricao: data.descricao || null,
        legenda: data.legenda || null,
        data_publicacao: null,
        horario_publicacao: data.horarioPublicacao || null,
        lancamento_id: data.lancamentoId || null,
      };

      if (mode === "edit" && initialData?.id) {
        await updateConteudo.mutateAsync({ id: initialData.id, ...payload });
      } else {
        await addConteudo.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar conteúdo");
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "planejado": return "Planejado";
      case "analise": return "Em Análise";
      case "aprovado": return "Aprovado";
      case "ativo": return "Ativo";
      case "programado": return "Programado";
      default: return s;
    }
  };

  const renderMultiSelect = (
    label: string,
    options: { value: string; label: string }[],
    selected: string[],
    setSelected: (v: string[]) => void,
    testId: string,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            data-testid={`dropdown-${testId}`}
          >
            {selected.length === 0
              ? placeholder
              : `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto" align="start">
          {options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggleItem(selected, setSelected, opt.value)}
              onSelect={(e) => e.preventDefault()}
              data-testid={`dropdown-item-${testId}-${opt.value}`}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((s) => {
            const optLabel = options.find((o) => o.value === s)?.label || s;
            return (
              <Badge
                key={s}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => toggleItem(selected, setSelected, s)}
                data-testid={`badge-${testId}-${s}`}
              >
                {optLabel}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitulo()}</DialogTitle>
          <DialogDescription>Configure os detalhes do conteúdo de marketing</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Conteúdo *</Label>
            <Input
              id="titulo"
              {...register("titulo")}
              placeholder="Ex: Post de lançamento do novo single"
              className={errors.titulo ? "border-destructive" : ""}
              data-testid="input-titulo"
            />
            <FieldError error={errors.titulo?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderMultiSelect("Plataforma", PLATAFORMA_OPTIONS, plataformas, setPlataformas, "plataforma", "Selecione as plataformas")}
            {renderMultiSelect("Tipo de Conteúdo", TIPO_CONTEUDO_OPTIONS, tiposConteudo, setTiposConteudo, "tipo-conteudo", "Selecione os tipos")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderMultiSelect("Formato", FORMATO_OPTIONS, formatos, setFormatos, "formato", "Selecione os formatos")}
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Music2 className="h-4 w-4" />
              Vincular a Lançamento (Faixa)
            </Label>
            <Controller
              name="lancamentoId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger data-testid="select-lancamento">
                    <SelectValue placeholder="Selecione um lançamento (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {loadingLancamentos ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : (
                      lancamentos.map((lanc: LancamentoWithRelations) => (
                        <SelectItem key={lanc.id} value={lanc.id}>
                          {lanc.titulo}
                          {lanc.artistas?.nome_artistico ? ` — ${lanc.artistas.nome_artistico}` : ""}
                          {lanc.status ? ` (${getStatusLabel(lanc.status)})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">Vincule a uma faixa da área de distribuição para rastrear performance</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campanhaRelacionada">Campanha Relacionada</Label>
            <Input
              id="campanhaRelacionada"
              {...register("campanhaRelacionada")}
              placeholder="Nome da campanha (opcional)"
              data-testid="input-campanha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do Conteúdo</Label>
            <Textarea
              id="descricao"
              {...register("descricao")}
              placeholder="Descrição detalhada do conteúdo"
              rows={3}
              data-testid="input-descricao"
            />
            <FieldError error={errors.descricao?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legenda">Legenda / Copy</Label>
            <Textarea
              id="legenda"
              {...register("legenda")}
              placeholder="Texto que acompanhará a publicação"
              rows={4}
              data-testid="input-legenda"
            />
            <FieldError error={errors.legenda?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="horarioPublicacao">Horário de Publicação</Label>
            <Input
              id="horarioPublicacao"
              {...register("horarioPublicacao")}
              type="time"
              data-testid="input-horario"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancelar">
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting} data-testid="button-salvar">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Salvar Conteúdo" : "Atualizar Conteúdo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
