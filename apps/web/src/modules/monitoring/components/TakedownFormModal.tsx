import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { FieldError } from "@/shared/components/FormField";
import { toast } from "sonner";
import { AlertTriangle, Link2, FileText } from "lucide-react";
import { takedownSchema, type TakedownFormData } from "@/modules/monitoring/lib/takedown-schema";

interface TakedownFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  takedown?: any;
  mode: "create" | "edit" | "view";
}

const plataformas = ["YouTube", "Spotify", "Apple Music", "Deezer", "SoundCloud", "TikTok", "Instagram", "Facebook", "Twitter/X", "Outra"];
const motivos = ["Uso não autorizado", "Violação de direitos autorais", "Plágio", "Sample não autorizado", "Distribuição ilegal", "Outro"];

export function TakedownFormModal({ open, onOpenChange, takedown, mode }: TakedownFormModalProps) {
  const isViewMode = mode === "view";
  const title = mode === "create" ? "Registrar Takedown" : mode === "edit" ? "Editar Takedown" : "Detalhes do Takedown";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TakedownFormData>({
    resolver: zodResolver(takedownSchema),
    defaultValues: {
      titulo: "",
      tipo: "enviado",
      obraAfetada: "",
      artista: "",
      plataforma: "",
      urlInfratora: "",
      motivo: "",
      descricao: "",
      prioridade: "media",
      dataIdentificacao: new Date().toISOString().split("T")[0],
      evidencias: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (takedown) {
      reset({
        titulo: takedown.titulo || "",
        tipo: takedown.tipo || "enviado",
        obraAfetada: takedown.obraAfetada || "",
        artista: takedown.artista || "",
        plataforma: takedown.plataforma || "",
        urlInfratora: takedown.urlInfratora || "",
        motivo: takedown.motivo || "",
        descricao: takedown.descricao || "",
        prioridade: takedown.prioridade || "media",
        dataIdentificacao: takedown.dataIdentificacao || new Date().toISOString().split("T")[0],
        evidencias: takedown.evidencias || "",
        observacoes: takedown.observacoes || "",
      });
    } else {
      reset({
        titulo: "",
        tipo: "enviado",
        obraAfetada: "",
        artista: "",
        plataforma: "",
        urlInfratora: "",
        motivo: "",
        descricao: "",
        prioridade: "media",
        dataIdentificacao: new Date().toISOString().split("T")[0],
        evidencias: "",
        observacoes: "",
      });
    }
  }, [open, takedown, reset]);

  const onSubmit = (_data: TakedownFormData) => {
    if (isViewMode) return;
    toast.success(mode === "create" ? "Takedown registrado com sucesso!" : "Takedown atualizado com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Informações do Takedown
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título/Identificação *</Label>
                <Input
                  {...register("titulo")}
                  disabled={isViewMode}
                  placeholder="Identificação do takedown"
                  className={errors.titulo ? "border-destructive" : ""}
                  data-testid="input-titulo"
                />
                <FieldError error={errors.titulo?.message} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger data-testid="select-tipo">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enviado">Enviado por nós</SelectItem>
                        <SelectItem value="recebido">Recebido (Claim)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Obra Afetada</Label>
                <Input
                  {...register("obraAfetada")}
                  disabled={isViewMode}
                  placeholder="Nome da obra"
                  data-testid="input-obra-afetada"
                />
                <FieldError error={errors.obraAfetada?.message} />
              </div>
              <div className="space-y-2">
                <Label>Artista</Label>
                <Input
                  {...register("artista")}
                  disabled={isViewMode}
                  placeholder="Nome do artista"
                  data-testid="input-artista"
                />
                <FieldError error={errors.artista?.message} />
              </div>
            </div>
          </div>

          {/* Plataforma e URL */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Plataforma e Localização
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plataforma *</Label>
                <Controller
                  name="plataforma"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger className={errors.plataforma ? "border-destructive" : ""} data-testid="select-plataforma">
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        {plataformas.map(p => (
                          <SelectItem key={p} value={p.toLowerCase().replace(/ /g, "_")}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError error={errors.plataforma?.message} />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Controller
                  name="prioridade"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? "media"} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger data-testid="select-prioridade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL do Conteúdo Infrator</Label>
              <Input
                {...register("urlInfratora")}
                disabled={isViewMode}
                placeholder="https://..."
                data-testid="input-url-infratora"
              />
              <FieldError error={errors.urlInfratora?.message} />
            </div>
          </div>

          {/* Motivo e Descrição */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Motivo e Descrição
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Controller
                  name="motivo"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger className={errors.motivo ? "border-destructive" : ""} data-testid="select-motivo">
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {motivos.map(m => (
                          <SelectItem key={m} value={m.toLowerCase().replace(/ /g, "_")}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError error={errors.motivo?.message} />
              </div>
              <div className="space-y-2">
                <Label>Data de Identificação</Label>
                <Controller
                  name="dataIdentificacao"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={isViewMode}
                      placeholder="Selecione a data"
                      data-testid="datepicker-data-identificacao"
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição Detalhada</Label>
              <Textarea
                {...register("descricao")}
                disabled={isViewMode}
                placeholder="Descreva detalhadamente a infração..."
                rows={3}
                data-testid="textarea-descricao"
              />
              <FieldError error={errors.descricao?.message} />
            </div>

            <div className="space-y-2">
              <Label>Evidências/Links de Prova</Label>
              <Textarea
                {...register("evidencias")}
                disabled={isViewMode}
                placeholder="Links para evidências, screenshots, etc..."
                rows={2}
                data-testid="textarea-evidencias"
              />
              <FieldError error={errors.evidencias?.message} />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                {...register("observacoes")}
                disabled={isViewMode}
                placeholder="Observações adicionais..."
                rows={2}
                data-testid="textarea-observacoes"
              />
              <FieldError error={errors.observacoes?.message} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isViewMode ? "Fechar" : "Cancelar"}
            </Button>
            {!isViewMode && (
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting} data-testid="button-submit">
                {mode === "create" ? "Registrar Takedown" : "Salvar Alterações"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
