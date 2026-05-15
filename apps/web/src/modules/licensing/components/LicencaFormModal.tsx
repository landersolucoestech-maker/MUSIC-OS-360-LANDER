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
import { FileText, Music, DollarSign, Building } from "lucide-react";
import { licencaSchema, type LicencaFormData } from "@/modules/licensing/lib/licenca-schema";

interface LicencaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenca?: any;
  mode: "create" | "edit" | "view";
}

const tiposLicenca = ["Sync TV", "Sync Cinema", "Sync Publicidade", "Sync Games", "Sync Digital", "Master Use", "Mecânica"];
const midiasDestino = ["TV Aberta", "TV Fechada", "Cinema", "Streaming", "Redes Sociais", "Publicidade Digital", "Games", "Outro"];
const territorios = ["Brasil", "América Latina", "Mundial", "Estados Unidos", "Europa", "Ásia"];

const DEFAULT_VALUES: LicencaFormData = {
  titulo: "",
  tipoLicenca: "",
  obraMusical: "",
  artista: "",
  cliente: "",
  projeto: "",
  midiaDestino: "",
  territorio: "",
  dataInicio: "",
  dataFim: "",
  valor: "",
  moeda: "BRL",
  observacoes: "",
};

export function LicencaFormModal({ open, onOpenChange, licenca, mode }: LicencaFormModalProps) {
  const isViewMode = mode === "view";
  const title = mode === "create" ? "Nova Licença de Sync" : mode === "edit" ? "Editar Licença" : "Detalhes da Licença";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LicencaFormData>({
    resolver: zodResolver(licencaSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    if (licenca) {
      reset({
        titulo: licenca.titulo || "",
        tipoLicenca: licenca.tipoLicenca || "",
        obraMusical: licenca.obraMusical || "",
        artista: licenca.artista || "",
        cliente: licenca.cliente || "",
        projeto: licenca.projeto || "",
        midiaDestino: licenca.midiaDestino || "",
        territorio: licenca.territorio || "",
        dataInicio: licenca.dataInicio || "",
        dataFim: licenca.dataFim || "",
        valor: licenca.valor || "",
        moeda: licenca.moeda || "BRL",
        observacoes: licenca.observacoes || "",
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [open, licenca, reset]);

  const onSubmit = (_data: LicencaFormData) => {
    if (isViewMode) return;
    toast.success(mode === "create" ? "Licença criada com sucesso!" : "Licença atualizada com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Music className="h-4 w-4" /> Informações da Licença
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título da Licença *</Label>
                <Input
                  {...register("titulo")}
                  disabled={isViewMode}
                  placeholder="Nome/Título da licença"
                  className={errors.titulo ? "border-destructive" : ""}
                  data-testid="input-titulo"
                />
                <FieldError error={errors.titulo?.message} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Licença</Label>
                <Controller
                  name="tipoLicenca"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger data-testid="select-tipo-licenca">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposLicenca.map(tipo => (
                          <SelectItem key={tipo} value={tipo.toLowerCase().replace(/ /g, "_")}>{tipo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Obra Musical *</Label>
                <Input
                  {...register("obraMusical")}
                  disabled={isViewMode}
                  placeholder="Nome da obra"
                  className={errors.obraMusical ? "border-destructive" : ""}
                  data-testid="input-obra-musical"
                />
                <FieldError error={errors.obraMusical?.message} />
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

          {/* Cliente e Projeto */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" /> Cliente e Projeto
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Input
                  {...register("cliente")}
                  disabled={isViewMode}
                  placeholder="Nome do cliente"
                  className={errors.cliente ? "border-destructive" : ""}
                  data-testid="input-cliente"
                />
                <FieldError error={errors.cliente?.message} />
              </div>
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Input
                  {...register("projeto")}
                  disabled={isViewMode}
                  placeholder="Nome do projeto/campanha"
                  data-testid="input-projeto"
                />
                <FieldError error={errors.projeto?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mídia de Destino</Label>
                <Controller
                  name="midiaDestino"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger data-testid="select-midia-destino">
                        <SelectValue placeholder="Selecione a mídia" />
                      </SelectTrigger>
                      <SelectContent>
                        {midiasDestino.map(midia => (
                          <SelectItem key={midia} value={midia.toLowerCase().replace(/ /g, "_")}>{midia}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Território</Label>
                <Controller
                  name="territorio"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger data-testid="select-territorio">
                        <SelectValue placeholder="Selecione o território" />
                      </SelectTrigger>
                      <SelectContent>
                        {territorios.map(t => (
                          <SelectItem key={t} value={t.toLowerCase().replace(/ /g, "_")}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Período e Valor */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Período e Valor
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Controller
                  name="dataInicio"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={isViewMode}
                      placeholder="Selecione a data"
                      data-testid="datepicker-data-inicio"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Controller
                  name="dataFim"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={isViewMode}
                      placeholder="Selecione a data"
                      data-testid="datepicker-data-fim"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <div className="flex gap-2">
                  <Controller
                    name="moeda"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? "BRL"} onValueChange={field.onChange} disabled={isViewMode}>
                        <SelectTrigger className="w-24" data-testid="select-moeda">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">R$</SelectItem>
                          <SelectItem value="USD">US$</SelectItem>
                          <SelectItem value="EUR">€</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input
                    type="number"
                    {...register("valor")}
                    disabled={isViewMode}
                    placeholder="0,00"
                    className="flex-1"
                    data-testid="input-valor"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              {...register("observacoes")}
              disabled={isViewMode}
              placeholder="Observações adicionais..."
              rows={3}
              data-testid="textarea-observacoes"
            />
            <FieldError error={errors.observacoes?.message} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isViewMode ? "Fechar" : "Cancelar"}
            </Button>
            {!isViewMode && (
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting} data-testid="button-submit">
                {mode === "create" ? "Criar Licença" : "Salvar Alterações"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
