import { useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { useLicencas } from "@/modules/licensing/hooks/useLicencas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useDataQuery } from "@/shared/hooks/useDataQuery";
import { QUERY_KEYS } from "@/shared/lib/query-config";
import { EntityCombobox } from "@/modules/licensing/components/EntityCombobox";
import { obraArtistaLabel } from "@/modules/licensing/lib/licenca-format";
import type { Obra } from "@/modules/catalog/types/catalog.types";

interface LicencaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenca?: any;
  mode: "create" | "edit" | "view";
}

const tiposLicenca = ["Sync TV", "Sync Cinema", "Sync Publicidade", "Sync Games", "Sync Digital", "Master Use", "Mecânica"];
const midiasDestino = ["TV Aberta", "TV Fechada", "Cinema", "Streaming", "Redes Sociais", "Publicidade Digital", "Games", "Outro"];
const territorios = ["Brasil", "América Latina", "Mundial", "Estados Unidos", "Europa", "Ásia"];
const statusOptions = [
  { value: "ativa", label: "Ativa" },
  { value: "negociacao", label: "Em Negociação" },
  { value: "proposta", label: "Proposta Enviada" },
  { value: "expirada", label: "Expirada" },
];

const DEFAULT_VALUES: LicencaFormData = {
  titulo: "",
  tipoLicenca: "",
  obraId: "",
  clienteId: "",
  projeto: "",
  midiaDestino: "",
  territorio: "",
  status: "negociacao",
  dataInicio: "",
  dataFim: "",
  remunerationType: "FIXED",
  currency: "BRL",
  amount: "",
  percentage: "",
  observacoes: "",
};

export function LicencaFormModal({ open, onOpenChange, licenca, mode }: LicencaFormModalProps) {
  const isViewMode = mode === "view";
  const title = mode === "create" ? "Nova Licença de Sync" : mode === "edit" ? "Editar Licença" : "Detalhes da Licença";
  const { addLicenca, updateLicenca } = useLicencas();
  const { obras } = useObras();
  const { data: clientes } = useDataQuery<{ id: string; nome: string }>({ queryKey: [...QUERY_KEYS.CLIENTES], table: "clientes" });

  const obraItems = useMemo(() => (obras as Obra[]).map((o) => ({ id: o.id, label: o.titulo })), [obras]);
  const clienteItems = useMemo(() => clientes.map((c) => ({ id: c.id, label: c.nome })), [clientes]);

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

  // Artista é derivado da obra selecionada (read-only, não persistido)
  const obraId = useWatch({ control, name: "obraId" });
  const remunerationType = useWatch({ control, name: "remunerationType" });
  const artistaDerivado = useMemo(
    () => obraArtistaLabel((obras as Obra[]).find((o) => o.id === obraId)),
    [obras, obraId],
  );
  const showMonetary = remunerationType === "FIXED" || remunerationType === "FIXED_PLUS_PERCENTAGE";
  const showPercentage = remunerationType === "PERCENTAGE" || remunerationType === "FIXED_PLUS_PERCENTAGE";

  useEffect(() => {
    if (!open) return;
    if (licenca) {
      reset({
        titulo: licenca.titulo || "",
        tipoLicenca: licenca.tipo || "",
        obraId: licenca.obra_id || "",
        clienteId: licenca.cliente_id || "",
        projeto: licenca.projeto || "",
        midiaDestino: licenca.midia_destino || "",
        territorio: licenca.territorio || "",
        status: licenca.status || "negociacao",
        dataInicio: licenca.data_inicio || "",
        dataFim: licenca.data_fim || "",
        remunerationType: licenca.remuneration_type || "FIXED",
        currency: licenca.currency || "BRL",
        amount: (licenca.amount ?? licenca.valor) != null ? String(licenca.amount ?? licenca.valor) : "",
        percentage: licenca.percentage != null ? String(licenca.percentage) : "",
        observacoes: licenca.observacoes || "",
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [open, licenca, reset]);

  const buildPayload = (data: LicencaFormData) => {
    const isFixed = data.remunerationType === "FIXED";
    const isPct = data.remunerationType === "PERCENTAGE";
    const isBoth = data.remunerationType === "FIXED_PLUS_PERCENTAGE";
    const amountNum = data.amount ? Number(data.amount) : null;
    const pctNum = data.percentage ? Number(data.percentage) : null;
    return {
      titulo:            data.titulo,
      tipo:              data.tipoLicenca || undefined,
      obra_id:           data.obraId,
      cliente_id:        data.clienteId,
      projeto:           data.projeto || undefined,
      midia_destino:     data.midiaDestino || undefined,
      territorio:        data.territorio || undefined,
      status:            data.status || "negociacao",
      data_inicio:       data.dataInicio || undefined,
      data_fim:          data.dataFim || undefined,
      remuneration_type: data.remunerationType,
      currency:          isFixed || isBoth ? data.currency : null,
      amount:            isFixed || isBoth ? amountNum : null,
      percentage:        isPct || isBoth ? pctNum : null,
      valor:             isFixed || isBoth ? amountNum : null, // back-compat (campo legado)
      observacoes:       data.observacoes || undefined,
    };
  };

  const onSubmit = async (data: LicencaFormData) => {
    if (isViewMode) return;
    try {
      const payload = buildPayload(data);
      if (mode === "edit" && licenca?.id) {
        await updateLicenca.mutateAsync({ id: licenca.id as string, data: payload as never });
        toast.success("Licença atualizada com sucesso.");
      } else {
        await addLicenca.mutateAsync(payload as never);
        toast.success("Licença criada com sucesso.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar licença");
    }
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
          {/* Informações da Licença */}
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
                <Controller
                  name="obraId"
                  control={control}
                  render={({ field }) => (
                    <EntityCombobox
                      items={obraItems}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione a obra"
                      searchPlaceholder="Buscar obra…"
                      disabled={isViewMode}
                      invalid={!!errors.obraId}
                      data-testid="select-obra-musical"
                    />
                  )}
                />
                <FieldError error={errors.obraId?.message} />
              </div>
              <div className="space-y-2">
                <Label>Artista <span className="text-muted-foreground font-normal">(da obra)</span></Label>
                <Input
                  value={artistaDerivado}
                  readOnly
                  disabled
                  placeholder="Definido pela obra selecionada"
                  data-testid="input-artista"
                />
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
                <Controller
                  name="clienteId"
                  control={control}
                  render={({ field }) => (
                    <EntityCombobox
                      items={clienteItems}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione o cliente"
                      searchPlaceholder="Buscar cliente…"
                      disabled={isViewMode}
                      invalid={!!errors.clienteId}
                      data-testid="select-cliente"
                    />
                  )}
                />
                <FieldError error={errors.clienteId?.message} />
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

            <div className="grid grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Período e Remuneração */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Período e Remuneração
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Controller
                  name="dataInicio"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField value={field.value ?? ""} onChange={field.onChange} disabled={isViewMode} placeholder="Selecione a data" displayFormat="dd/MM/yyyy" data-testid="datepicker-data-inicio" />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Controller
                  name="dataFim"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField value={field.value ?? ""} onChange={field.onChange} disabled={isViewMode} placeholder="Selecione a data" displayFormat="dd/MM/yyyy" data-testid="datepicker-data-fim" />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Remuneração</Label>
                <Controller
                  name="remunerationType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? "FIXED"} onValueChange={field.onChange} disabled={isViewMode}>
                      <SelectTrigger data-testid="select-remuneration-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Valor Fixo</SelectItem>
                        <SelectItem value="PERCENTAGE">Percentual</SelectItem>
                        <SelectItem value="FIXED_PLUS_PERCENTAGE">Fixo + Percentual</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {showMonetary && (
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? "BRL"} onValueChange={field.onChange} disabled={isViewMode}>
                          <SelectTrigger className="w-20" data-testid="select-currency"><SelectValue /></SelectTrigger>
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
                      {...register("amount")}
                      disabled={isViewMode}
                      placeholder="0,00"
                      className={`flex-1 ${errors.amount ? "border-destructive" : ""}`}
                      data-testid="input-amount"
                    />
                  </div>
                  <FieldError error={errors.amount?.message} />
                </div>
              )}

              {showPercentage && (
                <div className="space-y-2">
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    {...register("percentage")}
                    disabled={isViewMode}
                    placeholder="0"
                    className={errors.percentage ? "border-destructive" : ""}
                    data-testid="input-percentage"
                  />
                  <FieldError error={errors.percentage?.message} />
                </div>
              )}
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
              <Button type="submit" size="sm" className="h-8 text-xs gap-1.5" disabled={isSubmitting} data-testid="button-submit">
                {mode === "create" ? "Criar Licença" : "Salvar Alterações"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
