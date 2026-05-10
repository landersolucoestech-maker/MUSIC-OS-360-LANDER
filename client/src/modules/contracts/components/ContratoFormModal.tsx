import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contratoSchema, type ContratoFormData } from "@/modules/contracts/lib/contrato-schema";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { format, parseISO } from "date-fns";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { FileUpload, UploadedFile } from "@/shared/components/FileUpload";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import type { ContratoWithRelations, ContratoVersao } from "@/modules/contracts/hooks/useContratos";

// ── Labels ───────────────────────────────────────────────────────────────────
const ARTISTA_SERVICE_LABELS: Record<string, string> = {
  empresariamento: "Empresariamento",
  empresariamento_suporte: "Empresariamento com suporte",
  gestao: "Gestão",
  agenciamento: "Agenciamento",
  edicao: "Edição",
  distribuicao: "Distribuição",
  marketing: "Marketing",
  producao_musical: "Produção Musical",
  producao_audiovisual: "Produção Audiovisual",
  licenciamento: "Licenciamento",
};

const EMPRESA_SERVICE_LABELS: Record<string, string> = {
  producao_musical: "Produção Musical",
  marketing: "Marketing",
  producao_audiovisual: "Produção Audiovisual",
  publicidade: "Publicidade",
  parceria: "Parceria",
  shows: "Shows",
  licenciamento: "Licenciamento",
  outros: "Outros",
};

const EMPRESA_SERVICE_KEYS = Object.keys(EMPRESA_SERVICE_LABELS);

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  pendente: "Pendente",
  aguardando_assinatura: "Aguardando Assinatura",
  assinado: "Assinado",
  ativo: "Ativo",
  vigente: "Vigente",
  expirado: "Expirado",
  rescindido: "Rescindido",
  cancelado: "Cancelado",
};

// ── ContractForm ─────────────────────────────────────────────────────────────
interface ContractFormProps {
  onSubmit: (data: ContratoFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<ContratoFormData>;
  isLoading?: boolean;
  artists?: Array<{ id: string; name: string }>;
}

const ContractForm = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  artists = [],
}: ContractFormProps) => {
  const [documentos, setDocumentos] = useState<UploadedFile[]>([]);
  const { clientes } = useClientes();
  const { lancamentos } = useLancamentos();

  const contatosPF = clientes.filter((c) => c["tipo_pessoa"] === "pessoa_fisica");
  const contatosPJ = clientes.filter((c) => c["tipo_pessoa"] === "pessoa_juridica");

  const form = useForm<ContratoFormData>({
    resolver: zodResolver(contratoSchema),
    defaultValues: { status: "rascunho", registry_office: false, ...initialData },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ status: "rascunho", registry_office: false, ...initialData });
    }
  }, [initialData, form]);

  const handleManualSubmit = () => form.handleSubmit(onSubmit)();

  const getFilteredServiceTypes = () => {
    const clientType = form.watch("client_type");
    if (clientType === "pessoa_juridica") return Object.entries(EMPRESA_SERVICE_LABELS);
    return Object.entries(ARTISTA_SERVICE_LABELS);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Informações Básicas ── */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Contrato *</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Ex: Contrato de Agenciamento Artístico"
                data-testid="input-titulo"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Tipo de Cliente */}
            <div className="space-y-2">
              <Label>Tipo de Cliente *</Label>
              <Select
                value={form.watch("client_type")}
                onValueChange={(value) => {
                  form.setValue("client_type", value as ContratoFormData["client_type"]);
                  const current = form.watch("service_type");
                  if (value === "pessoa_juridica" && current && !EMPRESA_SERVICE_KEYS.includes(current)) {
                    form.setValue("service_type", undefined as any);
                  }
                }}
              >
                <SelectTrigger data-testid="select-client-type">
                  <SelectValue placeholder="Selecione o tipo de cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artista">Artista</SelectItem>
                  <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                  <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.client_type && (
                <p className="text-sm text-destructive">{form.formState.errors.client_type.message}</p>
              )}
            </div>

            {/* Tipo de Serviço */}
            <div className="space-y-2">
              <Label>Tipo de Serviço *</Label>
              <Select
                value={form.watch("service_type")}
                onValueChange={(value) => form.setValue("service_type", value as ContratoFormData["service_type"])}
              >
                <SelectTrigger data-testid="select-service-type">
                  <SelectValue placeholder="Selecione o tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredServiceTypes().map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.service_type && (
                <p className="text-sm text-destructive">{form.formState.errors.service_type.message}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as ContratoFormData["status"])}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contratante PF */}
            {form.watch("client_type") === "pessoa_fisica" && (
              <div className="space-y-2">
                <Label>Contratante (Pessoa Física)</Label>
                <Select
                  value={form.watch("contractor_contact")}
                  onValueChange={(value) => {
                    form.setValue("contractor_contact", value);
                    const contato = contatosPF.find((c) => c.id === value);
                    if (contato) form.setValue("responsible_person", (contato.responsavel as string) || (contato.nome as string));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={contatosPF.length > 0 ? "Selecione um contato do CRM" : "Nenhum contato PF cadastrado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contatosPF.length > 0
                      ? contatosPF.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)
                      : <div className="px-2 py-1 text-sm text-muted-foreground">Nenhum contato PF cadastrado no CRM</div>
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Contratante PJ */}
            {form.watch("client_type") === "pessoa_juridica" && (
              <div className="space-y-2">
                <Label>Contratante (Pessoa Jurídica)</Label>
                <Select
                  value={form.watch("company_id")}
                  onValueChange={(value) => {
                    form.setValue("company_id", value);
                    const empresa = contatosPJ.find((c) => c.id === value);
                    if (empresa) {
                      form.setValue("responsible_person", (empresa.responsavel as string) || "");
                      form.setValue("contractor_contact", empresa.id);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={contatosPJ.length > 0 ? "Selecione uma empresa do CRM" : "Nenhuma empresa cadastrada"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contatosPJ.length > 0
                      ? contatosPJ.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)
                      : <div className="px-2 py-1 text-sm text-muted-foreground">Nenhuma empresa cadastrada no CRM</div>
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Artista */}
            {form.watch("client_type") === "artista" && (
              <div className="space-y-2">
                <Label>Cliente/Artista</Label>
                <Select
                  value={form.watch("artist_id")}
                  onValueChange={(value) => form.setValue("artist_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={artists.length > 0 ? "Selecione um artista" : "Nenhum artista cadastrado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.length > 0
                      ? artists.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)
                      : <div className="px-2 py-1 text-sm text-muted-foreground">Nenhum artista cadastrado</div>
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Responsável */}
            <div className="space-y-2">
              <Label htmlFor="responsible_person">Responsável</Label>
              <Input
                id="responsible_person"
                {...form.register("responsible_person")}
                placeholder="Nome do responsável"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Datas ── */}
      <Card>
        <CardHeader><CardTitle>Datas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <DatePickerField
                value={form.watch("start_date") ? format(form.watch("start_date"), "yyyy-MM-dd") : ""}
                onChange={(iso) => form.setValue("start_date", iso ? parseISO(iso) : (undefined as any))}
                placeholder="Selecione uma data"
                data-testid="datepicker-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <DatePickerField
                value={form.watch("end_date") ? format(form.watch("end_date") as Date, "yyyy-MM-dd") : ""}
                onChange={(iso) => form.setValue("end_date", iso ? parseISO(iso) : undefined)}
                placeholder="Selecione uma data"
                data-testid="datepicker-end-date"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="registry_office"
                checked={form.watch("registry_office")}
                onCheckedChange={(checked) => form.setValue("registry_office", checked as boolean)}
              />
              <Label htmlFor="registry_office">Registrado em cartório</Label>
            </div>
          </div>

          {form.watch("registry_office") && (
            <div className="space-y-2">
              <Label>Data de Registro em Cartório</Label>
              <DatePickerField
                value={form.watch("registry_date") ? format(form.watch("registry_date") as Date, "yyyy-MM-dd") : ""}
                onChange={(iso) => form.setValue("registry_date", iso ? parseISO(iso) : undefined)}
                placeholder="Selecione uma data"
                data-testid="datepicker-registry-date"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Valores ── */}
      <Card>
        <CardHeader><CardTitle>Valores</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {/* PF ou PJ: valor fixo */}
            {(form.watch("client_type") === "pessoa_juridica" || form.watch("client_type") === "pessoa_fisica") && (
              <div className="space-y-2">
                <Label htmlFor="fixed_value">Valor do Contrato (R$)</Label>
                <Input id="fixed_value" type="number" step="0.01" placeholder="0,00"
                  {...form.register("fixed_value", { valueAsNumber: true })} />
              </div>
            )}

            {/* Artista + gestão/agenciamento/empresariamento: royalties + adiantamento */}
            {form.watch("client_type") === "artista" &&
              ["agenciamento", "gestao", "empresariamento", "empresariamento_suporte"].includes(form.watch("service_type") || "") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="royalties_percentage">Royalties (%)</Label>
                    <Input id="royalties_percentage" type="number" step="0.01" min="0" max="100" placeholder="0,00"
                      {...form.register("royalties_percentage", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advance_payment">Adiantamento (R$)</Label>
                    <Input id="advance_payment" type="number" step="0.01" placeholder="0,00"
                      {...form.register("advance_payment", { valueAsNumber: true })} />
                  </div>
                  {form.watch("service_type") === "empresariamento_suporte" && (
                    <div className="space-y-2">
                      <Label htmlFor="financial_support">Suporte Financeiro Mensal (R$)</Label>
                      <Input id="financial_support" type="number" step="0.01" placeholder="0,00"
                        {...form.register("financial_support", { valueAsNumber: true })} />
                    </div>
                  )}
                </>
              )}

            {/* Artista + produção/edição/distribuição: tipo de pagamento */}
            {form.watch("client_type") === "artista" &&
              ["producao_musical", "edicao", "distribuicao"].includes(form.watch("service_type") || "") && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de Pagamento</Label>
                    <Select
                      value={form.watch("payment_type")}
                      onValueChange={(value) => form.setValue("payment_type", value as "valor_fixo" | "royalties")}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo de pagamento" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                        <SelectItem value="royalties">Royalties</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.watch("payment_type") === "valor_fixo" && (
                    <div className="space-y-2">
                      <Label htmlFor="fixed_value_prod">Valor do Serviço (R$)</Label>
                      <Input id="fixed_value_prod" type="number" step="0.01" placeholder="0,00"
                        {...form.register("fixed_value", { valueAsNumber: true })} />
                    </div>
                  )}
                  {form.watch("payment_type") === "royalties" && (
                    <div className="space-y-2">
                      <Label htmlFor="royalties_pct_prod">Royalties (%)</Label>
                      <Input id="royalties_pct_prod" type="number" step="0.01" min="0" max="100" placeholder="0,00"
                        {...form.register("royalties_percentage", { valueAsNumber: true })} />
                    </div>
                  )}
                </>
              )}

            {/* Artista + audiovisual/marketing: valor fixo */}
            {form.watch("client_type") === "artista" &&
              ["producao_audiovisual", "marketing"].includes(form.watch("service_type") || "") && (
                <div className="space-y-2">
                  <Label htmlFor="fixed_value_av">Valor Fixo do Serviço (R$)</Label>
                  <Input id="fixed_value_av" type="number" step="0.01" placeholder="0,00"
                    {...form.register("fixed_value", { valueAsNumber: true })} />
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* ── Arquivo e Vínculos ── */}
      <Card>
        <CardHeader><CardTitle>Arquivo e Vínculos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arquivo_url">URL do Arquivo (PDF)</Label>
            <Input
              id="arquivo_url"
              {...form.register("arquivo_url")}
              placeholder="https://drive.google.com/file/d/... ou link do PDF"
              data-testid="input-arquivo-url"
            />
            <p className="text-xs text-muted-foreground">Cole o link público do PDF do contrato (Google Drive, Dropbox, etc.)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas_versao">Notas desta versão (opcional)</Label>
            <Input
              id="notas_versao"
              {...form.register("notas_versao")}
              placeholder="Ex: Alteração de cláusula de exclusividade, versão revisada pelo jurídico..."
              data-testid="input-notas-versao"
            />
            <p className="text-xs text-muted-foreground">Descreva o que mudou nesta versão do documento</p>
          </div>
          <div className="space-y-2">
            <Label>Lançamento Vinculado (opcional)</Label>
            <Select
              value={form.watch("lancamento_id") || "none"}
              onValueChange={(value) => form.setValue("lancamento_id", value === "none" ? undefined : value)}
            >
              <SelectTrigger data-testid="select-lancamento-id">
                <SelectValue placeholder="Selecionar lançamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {lancamentos.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Documentos Anexos ── */}
      <Card>
        <CardHeader><CardTitle>Documentos Anexos</CardTitle></CardHeader>
        <CardContent>
          <FileUpload
            folder="contratos/documentos"
            accept="application/pdf,image/*"
            maxSize={20}
            multiple
            value={documentos}
            onChange={setDocumentos}
          />
        </CardContent>
      </Card>

      {/* ── Observações e Termos ── */}
      <Card>
        <CardHeader><CardTitle>Observações e Termos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea id="observations" {...form.register("observations")}
              placeholder="Observações adicionais..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terms">Termos</Label>
            <Textarea id="terms" {...form.register("terms")}
              placeholder="Termos do contrato..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
        )}
        <Button type="button" disabled={isLoading} onClick={handleManualSubmit} className="w-full sm:w-auto">
          {isLoading ? "Salvando..." : "Salvar Contrato"}
        </Button>
      </div>
    </form>
  );
};

// ── Mapper: ContratoWithRelations → ContratoFormData ─────────────────────────
function contratoToFormData(c: ContratoWithRelations): Partial<ContratoFormData> {
  const status = c.status as ContratoFormData["status"] | undefined;
  const serviceType = c.tipo as ContratoFormData["service_type"] | undefined;
  const clientType: ContratoFormData["client_type"] = c.artista_id ? "artista" : "pessoa_fisica";
  return {
    title: c.titulo ?? "",
    service_type: serviceType,
    client_type: clientType,
    artist_id: c.artista_id ?? undefined,
    status: status ?? "rascunho",
    arquivo_url: c.arquivo_url ?? undefined,
    lancamento_id: c.lancamento_id ?? undefined,
    start_date: c.data_inicio ? new Date(c.data_inicio) : undefined,
    end_date: c.data_fim ? new Date(c.data_fim) : undefined,
    fixed_value: c.valor ?? undefined,
    observations: c.observacoes ?? undefined,
  };
}

// ── ContratoFormModal ────────────────────────────────────────────────────────
interface ContratoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato?: ContratoWithRelations;
  mode?: "create" | "edit";
  prefill?: { titulo: string; observacoes: string };
}

export const ContratoFormModal = ({
  open,
  onOpenChange,
  contrato,
  mode = "create",
  prefill,
}: ContratoFormModalProps) => {
  const { addContrato, updateContrato } = useContratos();

  const handleSubmit = (data: ContratoFormData) => {
    const {
      title, client_type, service_type, artist_id, status,
      arquivo_url, notas_versao, lancamento_id,
      start_date, end_date, fixed_value,
      royalties_percentage, advance_payment, financial_support, observations,
    } = data;

    const resolvedArquivoUrl = arquivo_url || (mode === "edit" && contrato ? (contrato.arquivo_url ?? null) : null);
    const resolvedLancamentoId = lancamento_id || (mode === "edit" && contrato ? (contrato.lancamento_id ?? null) : null);

    const payload: Record<string, unknown> = {
      titulo: title,
      tipo: service_type,
      status: status || "rascunho",
      artista_id: client_type === "artista" ? (artist_id || null) : null,
      arquivo_url: resolvedArquivoUrl,
      lancamento_id: resolvedLancamentoId,
      data_inicio: start_date ? (start_date as Date).toISOString().split("T")[0] : null,
      data_fim: end_date ? (end_date as Date).toISOString().split("T")[0] : null,
      valor: fixed_value || null,
      observacoes: observations || null,
    };

    if (mode === "edit" && contrato) {
      const prevUrl = contrato.arquivo_url;
      const newUrl = arquivo_url || null;
      const urlChanged = newUrl && newUrl !== prevUrl;
      const existingVersions: ContratoVersao[] = Array.isArray(contrato.versoes)
        ? (contrato.versoes as ContratoVersao[])
        : [];

      if (urlChanged) {
        const nextVersionNum = existingVersions.length + 1;
        const newVersion: ContratoVersao = {
          versao: `v${nextVersionNum}`,
          url: newUrl as string,
          criado_em: new Date().toISOString(),
          notas: notas_versao || undefined,
          autor: "Usuário atual",
        };
        payload.versoes = [...existingVersions, newVersion];
      } else {
        payload.versoes = existingVersions;
      }
      updateContrato.mutate({ id: contrato.id, ...payload });
    } else {
      if (arquivo_url) {
        const firstVersion: ContratoVersao = {
          versao: "v1",
          url: arquivo_url,
          criado_em: new Date().toISOString(),
          notas: notas_versao || undefined,
          autor: "Usuário atual",
        };
        payload.versoes = [firstVersion];
      } else {
        payload.versoes = [];
      }
      addContrato.mutate(payload as Parameters<typeof addContrato.mutate>[0]);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{mode === "create" ? "Novo Contrato" : "Editar Contrato"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6">
          <ContractForm
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            initialData={
              contrato
                ? contratoToFormData(contrato)
                : prefill
                  ? { title: prefill.titulo, observations: prefill.observacoes }
                  : undefined
            }
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
