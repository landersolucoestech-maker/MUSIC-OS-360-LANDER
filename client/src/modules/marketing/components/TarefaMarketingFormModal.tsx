import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { FieldError } from "@/shared/components/FormField";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { tarefaMarketingSchema, type TarefaMarketingFormData } from "@/modules/marketing/lib/tarefa-marketing-schema";

interface TarefaMarketingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  mode: "create" | "edit";
}

const DEFAULT_VALUES: TarefaMarketingFormData = {
  titulo: "",
  descricao: "",
  campanhaRelacionada: "",
  responsavel: "",
  prioridade: "",
  status: "",
  categoria: "",
  dataEntrega: null,
};

export function TarefaMarketingFormModal({ open, onOpenChange, initialData, mode }: TarefaMarketingFormModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TarefaMarketingFormData>({
    resolver: zodResolver(tarefaMarketingSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    if (initialData && mode === "edit") {
      reset({
        titulo: initialData.titulo || "",
        descricao: initialData.descricao || "",
        campanhaRelacionada: initialData.campanhaRelacionada || "",
        responsavel: initialData.responsavel || "",
        prioridade: initialData.prioridade || "",
        status: initialData.status || "",
        categoria: initialData.categoria || "",
        dataEntrega: initialData.dataEntrega ? new Date(initialData.dataEntrega) : null,
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [open, initialData, mode, reset]);

  const onSubmit = async (_data: TarefaMarketingFormData) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(mode === "create" ? "Tarefa criada com sucesso!" : "Tarefa atualizada com sucesso!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar tarefa");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova Tarefa de Marketing" : "Editar Tarefa"}</DialogTitle>
          <DialogDescription>Configure os detalhes da tarefa de marketing</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Tarefa *</Label>
            <Input
              id="titulo"
              {...register("titulo")}
              placeholder="Ex: Criar arte para Instagram"
              className={errors.titulo ? "border-destructive" : ""}
              data-testid="input-titulo-tarefa"
            />
            <FieldError error={errors.titulo?.message} />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              {...register("descricao")}
              placeholder="Descrição detalhada da tarefa"
              rows={4}
            />
            <FieldError error={errors.descricao?.message} />
          </div>

          {/* Linha 1 - Campanha e Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campanhaRelacionada">Campanha Relacionada</Label>
              <Input
                id="campanhaRelacionada"
                {...register("campanhaRelacionada")}
                placeholder="Nome da campanha (opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Controller
                name="responsavel"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-responsavel">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="copywriting">Copywriting</SelectItem>
                      <SelectItem value="creative_director">Creative Director</SelectItem>
                      <SelectItem value="design_team">Design Team</SelectItem>
                      <SelectItem value="marketing_team">Marketing Team</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="video_team">Video Team</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Linha 2 - Prioridade, Status e Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Controller
                name="prioridade"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-prioridade">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-priority-high" />
                          Alta
                        </span>
                      </SelectItem>
                      <SelectItem value="media">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-priority-medium" />
                          Média
                        </span>
                      </SelectItem>
                      <SelectItem value="baixa">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-priority-low" />
                          Baixa
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="atrasada">Atrasada</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-categoria">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="publicidade">Publicidade</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="copywriting">Copywriting</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Data de Entrega */}
          <div className="space-y-2">
            <Label>Data de Entrega</Label>
            <Controller
              name="dataEntrega"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      data-testid="button-data-entrega"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        "Selecione a data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(date) => field.onChange(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            <FieldError error={errors.dataEntrega?.message} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting} data-testid="button-submit-tarefa">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Criar Tarefa" : "Atualizar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
