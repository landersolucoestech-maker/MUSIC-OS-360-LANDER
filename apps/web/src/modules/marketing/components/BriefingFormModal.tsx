import { useState, useEffect, KeyboardEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { FieldError } from "@/shared/components/FormField";
import { Badge } from "@/shared/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, X, Loader2 } from "lucide-react";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { AIGenerateButton } from "@/shared/components/AIGenerateButton";
import { briefingSchema, type BriefingFormData } from "@/modules/marketing/lib/briefing-schema";
import { useBriefings } from "@/modules/marketing/hooks/useBriefings";

interface BriefingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  mode: "create" | "edit";
}

const DEFAULT_VALUES: Omit<BriefingFormData, "entregaveis"> = {
  titulo: "",
  campanhaRelacionada: "",
  prioridade: "",
  status: "",
  budget: "",
  prazoEntrega: "",
  objetivo: "",
  publicoAlvo: "",
  descricao: "",
};

export function BriefingFormModal({ open, onOpenChange, initialData, mode }: BriefingFormModalProps) {
  const [novoEntregavel, setNovoEntregavel] = useState("");
  const [entregaveis, setEntregaveis] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BriefingFormData>({
    resolver: zodResolver(briefingSchema),
    defaultValues: { ...DEFAULT_VALUES, entregaveis: [] },
  });

  const tituloWatched = watch("titulo");
  const objetivoWatched = watch("objetivo");

  useEffect(() => {
    if (!open) return;
    if (initialData && mode === "edit") {
      reset({
        titulo: initialData.titulo || "",
        campanhaRelacionada: initialData.campanhaRelacionada || "",
        prioridade: initialData.prioridade || "",
        status: initialData.status || "",
        budget: initialData.budget || "",
        prazoEntrega: initialData.prazoEntrega
          ? format(new Date(initialData.prazoEntrega), "yyyy-MM-dd")
          : "",
        objetivo: initialData.objetivo || "",
        publicoAlvo: initialData.publicoAlvo || "",
        descricao: initialData.descricao || "",
        entregaveis: initialData.entregaveis || [],
      });
      setEntregaveis(initialData.entregaveis || []);
    } else {
      reset({ ...DEFAULT_VALUES, entregaveis: [] });
      setEntregaveis([]);
    }
    setNovoEntregavel("");
  }, [open, initialData, mode, reset]);

  const handleAddEntregavel = () => {
    if (novoEntregavel.trim()) {
      const updated = [...entregaveis, novoEntregavel.trim()];
      setEntregaveis(updated);
      setValue("entregaveis", updated);
      setNovoEntregavel("");
    }
  };

  const handleRemoveEntregavel = (index: number) => {
    const updated = entregaveis.filter((_, i) => i !== index);
    setEntregaveis(updated);
    setValue("entregaveis", updated);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEntregavel();
    }
  };

  const { addBriefing, updateBriefing } = useBriefings();

  const onSubmit = async (data: BriefingFormData) => {
    try {
      if (mode === "edit" && initialData?.id) {
        await updateBriefing.mutateAsync({ id: initialData.id as string, ...data } as never);
      } else {
        await addBriefing.mutateAsync(data as never);
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar briefing");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Briefing de Marketing" : "Editar Briefing"}</DialogTitle>
          <DialogDescription>Defina os detalhes e diretrizes do projeto de marketing</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Linha 1 - Título e Campanha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Briefing *</Label>
              <Input
                id="titulo"
                {...register("titulo")}
                placeholder="Ex: Campanha de Lançamento do Álbum"
                className={errors.titulo ? "border-destructive" : ""}
                data-testid="input-titulo"
              />
              <FieldError error={errors.titulo?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campanha">Campanha Relacionada</Label>
              <Input
                id="campanha"
                {...register("campanhaRelacionada")}
                placeholder="Nome da campanha"
                data-testid="input-campanha"
              />
            </div>
          </div>

          {/* Linha 2 - Prioridade, Status e Budget */}
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
                      <SelectItem value="em_revisao">Em Revisão</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="rejeitado">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (R$)</Label>
              <Input
                id="budget"
                type="number"
                {...register("budget")}
                placeholder="0,00"
                data-testid="input-budget"
              />
            </div>
          </div>

          {/* Prazo de Entrega */}
          <div className="space-y-2">
            <Label>Prazo de Entrega</Label>
            <Controller
              name="prazoEntrega"
              control={control}
              render={({ field }) => (
                <DatePickerField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Selecione a data"
                  data-testid="datepicker-prazo-entrega"
                />
              )}
            />
            <FieldError error={errors.prazoEntrega?.message} />
          </div>

          {/* Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="objetivo">Objetivo do Projeto</Label>
            <Textarea
              id="objetivo"
              {...register("objetivo")}
              placeholder="Descreva o objetivo principal do projeto"
              rows={3}
              data-testid="textarea-objetivo"
            />
            <FieldError error={errors.objetivo?.message} />
          </div>

          {/* Público-Alvo */}
          <div className="space-y-2">
            <Label htmlFor="publicoAlvo">Público-Alvo</Label>
            <Textarea
              id="publicoAlvo"
              {...register("publicoAlvo")}
              placeholder="Defina o público-alvo do projeto"
              rows={3}
              data-testid="textarea-publico-alvo"
            />
            <FieldError error={errors.publicoAlvo?.message} />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="descricao">Descrição Detalhada</Label>
              <AIGenerateButton
                type="briefing"
                label="Gerar com IA"
                size="xs"
                variant="ghost"
                prompt={
                  tituloWatched || objetivoWatched
                    ? `Crie uma descrição detalhada de briefing de marketing para o projeto "${tituloWatched || "sem título"}". ` +
                      (objetivoWatched ? `Objetivo: ${objetivoWatched}. ` : "") +
                      `Inclua: contexto do projeto, diretrizes criativas, entregáveis esperados e critérios de sucesso. ` +
                      `Seja detalhado e profissional. Voltado para o mercado musical brasileiro.`
                    : ""
                }
                disabled={!tituloWatched && !objetivoWatched}
                onResult={(content) => setValue("descricao", content)}
              />
            </div>
            <Textarea
              id="descricao"
              {...register("descricao")}
              placeholder="Descrição detalhada do briefing"
              rows={4}
              data-testid="textarea-descricao"
            />
            <FieldError error={errors.descricao?.message} />
          </div>

          {/* Entregáveis */}
          <div className="space-y-2">
            <Label>Entregáveis</Label>
            <div className="flex gap-2">
              <Input
                value={novoEntregavel}
                onChange={(e) => setNovoEntregavel(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite um entregável e pressione Enter"
                data-testid="input-novo-entregavel"
              />
              <Button type="button" onClick={handleAddEntregavel} size="icon" data-testid="button-add-entregavel">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {entregaveis.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {entregaveis.map((item, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveEntregavel(index)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting} data-testid="button-submit">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Criar Briefing" : "Atualizar Briefing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
