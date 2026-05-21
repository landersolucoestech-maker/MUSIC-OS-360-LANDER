import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { eventoSchema } from "@/modules/events/lib/evento-schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { FormField, FormTextarea, FieldError } from "@/shared/components/FormField";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { format, parse, parseISO, isValid } from "date-fns";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { QUERY_KEYS } from "@/shared/lib/query-config";

interface SchedulerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: any;
  mode: "create" | "edit" | "view";
}

const tiposEvento = [
  { value: "sessoes_estudio", label: "Sessões de estúdio" },
  { value: "ensaios", label: "Ensaios" },
  { value: "sessoes_fotos", label: "Sessões de fotos" },
  { value: "shows", label: "Shows" },
  { value: "entrevistas", label: "Entrevistas" },
  { value: "podcasts", label: "Podcasts" },
  { value: "programas_tv", label: "Programas de TV" },
  { value: "radio", label: "Rádio" },
  { value: "producao_conteudo", label: "Produção de conteúdo" },
  { value: "reunioes", label: "Reuniões" },
];

const statusOptions = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "pendente", label: "Pendente" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

// Artistas serão carregados do banco de dados
const artistasOptions: { value: string; label: string }[] = [];

const tiposRelacionadosArtista = [
  "sessoes_estudio",
  "ensaios",
  "sessoes_fotos",
  "shows",
  "entrevistas",
  "podcasts",
  "programas_tv",
  "radio",
  "producao_conteudo",
];

// Tipos de evento que devem puxar o local do CRM
const tiposLocalCRM = ["shows", "programas_tv", "radio", "podcasts"];

const tipoEventoAliases: Record<string, string> = {
  show: "shows",
  show_teatro: "shows",
  festival: "shows",
  rodeio: "shows",
  lancamento: "shows",
  evento_corporativo: "shows",
  reuniao: "reunioes",
  reunioes: "reunioes",
};

const statusAliases: Record<string, string> = {
  realizado: "concluido",
  concluido: "concluido",
  negociacao: "pendente",
};

const normalizeSelectValue = (value: unknown, aliases: Record<string, string>) => {
  if (typeof value !== "string") return "";
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return aliases[normalized] ?? normalized;
};

const normalizeEventDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return isValid(value) ? value : undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isoParsed = parseISO(trimmed);
  if (isValid(isoParsed)) return isoParsed;

  const brParsed = parse(trimmed, "dd/MM/yyyy", new Date());
  return isValid(brParsed) ? brParsed : undefined;
};

const normalizeTimeValue = (value: unknown): string => {
  if (value instanceof Date && isValid(value)) return format(value, "HH:mm");
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  return "";
};

const getInitialFormData = (evento?: any) => ({
  titulo: evento?.titulo || "",
  tipoEvento: normalizeSelectValue(evento?.tipoEvento || evento?.tipo_evento, tipoEventoAliases),
  artista: evento?.artista || evento?.artista_id || "",
  status: normalizeSelectValue(evento?.status, statusAliases) || "agendado",
  dataInicio: normalizeEventDate(evento?.dataInicio || evento?.data_inicio),
  horarioInicio: normalizeTimeValue(evento?.horarioInicio || evento?.horario_inicio),
  dataFim: normalizeEventDate(evento?.dataFim || evento?.data_fim),
  horarioFim: normalizeTimeValue(evento?.horarioFim || evento?.horario_fim),
  nomeLocal: evento?.nomeLocal || evento?.local || "",
  endereco: evento?.endereco || evento?.endereco || "",
  contatoLocal: evento?.contatoLocal || evento?.contato_local || "",
  capacidadePublico: evento?.capacidadePublico || evento?.capacidade_publico || "",
  valorCache: evento?.valorCache || evento?.valor_cache || "",
  publicoEsperado: evento?.publicoEsperado || evento?.publico_esperado || "",
  descricao: evento?.descricao || "",
  observacoes: evento?.observacoes || "",
});

type SchedulerFormData = ReturnType<typeof getInitialFormData>;

const validationFieldLabels: Record<string, string> = {
  titulo: "Título do Evento",
  tipoEvento: "Tipo de Evento",
  dataInicio: "Data de Início",
  horarioInicio: "Horário de Início",
  dataFim: "Data de Fim",
  horarioFim: "Horário de Fim",
  nomeLocal: "Nome do Local",
  endereco: "Endereço Completo",
  contatoLocal: "Contato do Local",
};

export function SchedulerFormModal({ open, onOpenChange, evento, mode }: SchedulerFormModalProps) {
  const queryClient = useQueryClient();
  const { clientes } = useClientes();
  
  // Filtrar apenas contatos PJ do CRM para o campo de local
  const locaisCRM = clientes.filter((c: any) => c.tipo_pessoa === "pessoa_juridica");
  
  const [formData, setFormData] = useState(getInitialFormData(evento));

  const { addEvento, updateEvento } = useEventos();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(getInitialFormData(open ? evento : undefined));
    setErrors({});
  }, [evento, mode, open]);

  const isViewMode = mode === "view";
  const title = mode === "create" ? "Novo Evento na Agenda" : mode === "edit" ? "Editar Evento" : "Visualizar Evento";

  // Verificar se tipo de evento é relacionado a artista
  const isArtistaRelated = tiposRelacionadosArtista.includes(formData.tipoEvento);
  
  // Exibir campos de local quando for relacionado a artista OU reunião
  const showLocalFields = isArtistaRelated || formData.tipoEvento === "reunioes";
  
  // Exibir campos exclusivos de shows
  const isShow = formData.tipoEvento === "shows";
  
  // Verificar se o tipo de evento deve puxar local do CRM
  const shouldUseCRMLocal = tiposLocalCRM.includes(formData.tipoEvento);

  // Atualizar dados de contato quando selecionar um local do CRM
  const handleLocalCRMChange = (localId: string) => {
    const localSelecionado = locaisCRM.find(l => l.id === localId);
    if (localSelecionado) {
      setFormData({
        ...formData,
        nomeLocal: localId,
        contatoLocal: localSelecionado.telefone || "",
        endereco: [localSelecionado.endereco, localSelecionado.cidade, localSelecionado.estado].filter(Boolean).join(", ")
      });
    } else {
      setFormData({ ...formData, nomeLocal: localId });
    }
  };

  const normalizeDate = (value: Date | string | undefined | null): Date | undefined => {
    return normalizeEventDate(value);
  };

  const getNormalizedFormData = (): SchedulerFormData => ({
    ...formData,
    titulo: String(formData.titulo || evento?.titulo || "").trim(),
    tipoEvento: normalizeSelectValue(formData.tipoEvento || evento?.tipoEvento || evento?.tipo_evento, tipoEventoAliases),
    status: normalizeSelectValue(formData.status || evento?.status, statusAliases) || "agendado",
    dataInicio: normalizeDate(formData.dataInicio) ?? normalizeEventDate(evento?.dataInicio || evento?.data_inicio),
    dataFim: normalizeDate(formData.dataFim) ?? normalizeEventDate(evento?.dataFim || evento?.data_fim),
    horarioInicio: normalizeTimeValue(formData.horarioInicio || evento?.horarioInicio || evento?.horario_inicio),
    horarioFim: normalizeTimeValue(formData.horarioFim || evento?.horarioFim || evento?.horario_fim),
  });

  const validate = (): SchedulerFormData | null => {
    const normalizedFormData = getNormalizedFormData();

    const result = eventoSchema.safeParse({
      titulo: normalizedFormData.titulo,
      tipoEvento: normalizedFormData.tipoEvento,
      artista: normalizedFormData.artista,
      status: normalizedFormData.status,
      dataInicio: normalizedFormData.dataInicio,
      horarioInicio: normalizedFormData.horarioInicio,
      dataFim: normalizedFormData.dataFim,
      horarioFim: normalizedFormData.horarioFim,
      nomeLocal: normalizedFormData.nomeLocal,
      endereco: normalizedFormData.endereco,
      contatoLocal: normalizedFormData.contatoLocal,
      capacidadePublico: normalizedFormData.capacidadePublico,
      valorCache: normalizedFormData.valorCache,
      publicoEsperado: normalizedFormData.publicoEsperado,
      descricao: normalizedFormData.descricao,
      observacoes: normalizedFormData.observacoes,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0];
        if (field && !newErrors[field]) {
          newErrors[String(field)] = err.message;
        }
      });
      setErrors(newErrors);
      const details = result.error.errors.map((e) => ({ path: e.path, message: e.message }));
      console.error("SchedulerFormModal validation errors:", details, { formData, normalizedFormData, evento });
      const firstError = result.error.errors[0];
      const firstField = firstError?.path[0] ? String(firstError.path[0]) : "";
      const firstLabel = validationFieldLabels[firstField] ?? firstField;
      toast.error(firstLabel ? `${firstLabel}: ${firstError.message}` : "Por favor, corrija os erros no formulário");
      return null;
    }

    setErrors({});
    setFormData(normalizedFormData);
    return normalizedFormData;
  };

  const buildPayload = (data: SchedulerFormData) => {
    const dataInicio = normalizeEventDate(data.dataInicio);
    const dataFim = normalizeEventDate(data.dataFim);

    return {
      titulo: data.titulo,
      tipo_evento: data.tipoEvento,
      artista_id: data.artista || null,
      status: data.status,
      data_inicio: dataInicio ? format(dataInicio, "yyyy-MM-dd") : null,
      horario_inicio: normalizeTimeValue(data.horarioInicio) || null,
      data_fim: dataFim ? format(dataFim, "yyyy-MM-dd") : null,
      horario_fim: normalizeTimeValue(data.horarioFim) || null,
      local: data.nomeLocal || null,
      endereco: data.endereco || null,
      contato_local: data.contatoLocal || null,
      capacidade_publico: data.capacidadePublico || null,
      valor_cache: data.valorCache || null,
      publico_esperado: data.publicoEsperado || null,
      descricao: data.descricao || null,
      observacoes: data.observacoes || null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "view") return;

    const normalizedFormData = getNormalizedFormData();
    const validatedFormData = mode === "edit" ? normalizedFormData : validate();
    if (!validatedFormData) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "edit") {
        if (!evento?.id) {
          toast.error("Não foi possível atualizar: evento sem identificador.");
          return;
        }
        await updateEvento.mutateAsync({ id: evento.id, ...buildPayload(validatedFormData) });
      } else {
        await addEvento.mutateAsync(buildPayload(validatedFormData));
      }
      await queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.EVENTOS] });
      onOpenChange(false);
    } catch (error) {
      // A mutação já dispara toast de erro, mas mantemos o loader controlado.
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocalPlaceholder = () => {
    if (formData.tipoEvento === "reunioes") {
      return "Nome do local da reunião";
    }
    return "Nome do venue / casa de show";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campos Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título do Evento */}
            <div className="space-y-2 md:col-span-2">
              <Label>Título do Evento *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Digite o título do evento"
                disabled={isViewMode}
                className={errors.titulo ? "border-destructive" : ""}
              />
              <FieldError error={errors.titulo} />
            </div>

            {/* Tipo de Evento */}
            <div className="space-y-2">
              <Label>Tipo de Evento *</Label>
              <Select 
                value={formData.tipoEvento} 
                onValueChange={(v) => setFormData({ ...formData, tipoEvento: v, artista: "" })} 
                disabled={isViewMode}
              >
                <SelectTrigger className={errors.tipoEvento ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposEvento.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError error={errors.tipoEvento} />
            </div>

            {/* Artista - Condicional */}
            {isArtistaRelated && (
              <div className="space-y-2">
                <Label>Artista</Label>
                <Select 
                  value={formData.artista} 
                  onValueChange={(v) => setFormData({ ...formData, artista: v })} 
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um artista" />
                  </SelectTrigger>
                  <SelectContent>
                    {artistasOptions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum artista cadastrado</div>
                    ) : artistasOptions.map((artista) => (
                      <SelectItem key={artista.value} value={artista.value}>
                        {artista.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })} 
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datas e Horários */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data de Início */}
            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <DatePickerField
                value={formData.dataInicio ? format(formData.dataInicio, "yyyy-MM-dd") : ""}
                onChange={(iso) => setFormData({ ...formData, dataInicio: iso ? parseISO(iso) : undefined })}
                disabled={isViewMode}
                placeholder="Selecione a data"
                className={errors.dataInicio ? "border-destructive" : ""}
                data-testid="datepicker-data-inicio"
              />
              <FieldError error={errors.dataInicio} />
            </div>

            {/* Horário de Início */}
            <div className="space-y-2">
              <Label>Horário de Início</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.horarioInicio}
                  onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                  disabled={isViewMode}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Data de Fim */}
            <div className="space-y-2">
              <Label>Data de Fim</Label>
              <DatePickerField
                value={formData.dataFim ? format(formData.dataFim, "yyyy-MM-dd") : ""}
                onChange={(iso) => setFormData({ ...formData, dataFim: iso ? parseISO(iso) : undefined })}
                disabled={isViewMode}
                placeholder="Selecione a data (opcional)"
                data-testid="datepicker-data-fim"
              />
            </div>

            {/* Horário de Fim */}
            <div className="space-y-2">
              <Label>Horário de Fim</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.horarioFim}
                  onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                  disabled={isViewMode}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Campos de Local - Condicional */}
          {showLocalFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Local</Label>
                {shouldUseCRMLocal ? (
                  <Select 
                    value={formData.nomeLocal} 
                    onValueChange={handleLocalCRMChange} 
                    disabled={isViewMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local (CRM)" />
                    </SelectTrigger>
                    <SelectContent>
                      {locaisCRM.map((local) => (
                        <SelectItem key={local.id} value={local.id}>
                          {local.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.nomeLocal}
                    onChange={(e) => setFormData({ ...formData, nomeLocal: e.target.value })}
                    placeholder={getLocalPlaceholder()}
                    disabled={isViewMode}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Contato do Local</Label>
                <Input
                  value={formData.contatoLocal}
                  onChange={(e) => setFormData({ ...formData, contatoLocal: e.target.value })}
                  placeholder="Telefone / WhatsApp do local"
                  disabled={shouldUseCRMLocal || isViewMode}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Endereço Completo</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Endereço completo do local"
                  disabled={shouldUseCRMLocal || isViewMode}
                />
              </div>
            </div>
          )}

          {/* Campos Exclusivos para Shows */}
          {isShow && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Capacidade do Público</Label>
                <Input
                  type="number"
                  value={formData.capacidadePublico}
                  onChange={(e) => setFormData({ ...formData, capacidadePublico: e.target.value })}
                  placeholder="Capacidade máxima do local"
                  disabled={isViewMode}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor do Cachê</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valorCache}
                    onChange={(e) => setFormData({ ...formData, valorCache: e.target.value })}
                    placeholder="0,00"
                    disabled={isViewMode}
                    className="pl-10"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Público Esperado</Label>
                <Input
                  type="number"
                  value={formData.publicoEsperado}
                  onChange={(e) => setFormData({ ...formData, publicoEsperado: e.target.value })}
                  placeholder="Quantidade de pessoas esperadas"
                  disabled={isViewMode}
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Descrição e Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do evento"
                rows={3}
                disabled={isViewMode}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações sobre o evento"
                rows={3}
                disabled={isViewMode}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            {!isViewMode && (
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Evento"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
