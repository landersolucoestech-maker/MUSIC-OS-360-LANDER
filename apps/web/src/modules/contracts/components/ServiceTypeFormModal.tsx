import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Upload, FileText, X, Plus, ChevronDown } from "lucide-react";
import type { ContractServiceType, ContractServiceTypeInsert, ClientType, FinancialModel } from "@/modules/contracts/hooks/useContractServiceTypes";

const ACCEPT_DOCS = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

const TEMPLATE_VARIABLES = [
  "{{CONTRACTED_NAME}}",
  "{{ROYALTIES_PERCENTAGE}}",
  "{{START_DATE}}",
  "{{END_DATE}}",
  "{{FIXED_VALUE}}",
  "{{ADVANCE_AMOUNT}}",
  "{{FINANCIAL_SUPPORT}}",
  "{{WORK_TITLE}}",
];

interface Clausula {
  id: string;
  titulo: string;
  conteudo: string;
}

interface AnexoFile {
  nome: string;
  dataUrl: string | null;
}

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  slug: z.string().min(2, "Slug obrigatório").regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _"),
  description: z.string().optional(),
  client_types: z.array(z.enum(["artista", "pessoa_fisica", "pessoa_juridica"])).min(1, "Selecione ao menos um tipo de cliente"),
  financial_model: z.enum(["valor_fixo", "royalties", "misto", "recorrente"]),
  requires_royalties: z.boolean(),
  requires_fixed_value: z.boolean(),
  requires_advance: z.boolean(),
  requires_financial_support: z.boolean(),
  allow_installments: z.boolean(),
  default_financial_category: z.string().optional(),
  active: z.boolean(),
  sort_order: z.number().int().min(1),
});

type FormValues = z.infer<typeof schema>;

interface ServiceTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType: ContractServiceType | null;
  onSave: (data: ContractServiceTypeInsert) => void;
  existingSlugs: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: "artista", label: "Artista" },
  { value: "pessoa_fisica", label: "Pessoa Física" },
  { value: "pessoa_juridica", label: "Pessoa Jurídica" },
];

const FINANCIAL_CHECKBOXES: { key: "requires_royalties" | "requires_fixed_value" | "requires_advance" | "requires_financial_support" | "allow_installments"; label: string }[] = [
  { key: "requires_royalties", label: "Royalties (%)" },
  { key: "requires_fixed_value", label: "Valor Fixo (R$)" },
  { key: "requires_advance", label: "Adiantamento (R$)" },
  { key: "requires_financial_support", label: "Suporte Financeiro Mensal (R$)" },
  { key: "allow_installments", label: "Permite parcelamento / tipo de pagamento" },
];

export function ServiceTypeFormModal({
  open,
  onOpenChange,
  serviceType,
  onSave,
  existingSlugs,
}: ServiceTypeFormModalProps) {
  const isEditing = !!serviceType;

  const [cabecalho, setCabecalho] = useState<AnexoFile | null>(null);
  const [rodape, setRodape] = useState<AnexoFile | null>(null);
  const [clausulas, setClausulas] = useState<Clausula[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const cabecalhoRef = useRef<HTMLInputElement>(null);
  const rodapeRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: AnexoFile | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setter({ nome: file.name, dataUrl: (ev.target?.result as string) ?? null });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddClausula = () => {
    setClausulas((prev) => [
      ...prev,
      { id: crypto.randomUUID(), titulo: `CLÁUSULA ${prev.length + 1}ª`, conteudo: "" },
    ]);
  };

  const handleRemoveClausula = (id: string) =>
    setClausulas((prev) => prev.filter((c) => c.id !== id));

  const handleClausulaChange = (id: string, field: "titulo" | "conteudo", value: string) =>
    setClausulas((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const buildConteudo = (): string =>
    clausulas.map((c) => `${c.titulo}\n${c.conteudo}`).join("\n\n");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      client_types: ["artista"],
      financial_model: "valor_fixo",
      requires_royalties: false,
      requires_fixed_value: true,
      requires_advance: false,
      requires_financial_support: false,
      allow_installments: false,
      default_financial_category: "",
      active: true,
      sort_order: 1,
    },
  });

  const parseClausulasFromContent = (content: string): Clausula[] => {
    const lines = content.split("\n");
    const result: Clausula[] = [];
    let current: Clausula | null = null;
    for (const line of lines) {
      if (line.match(/^CLÁUSULA|^Cláusula|^\d+\./)) {
        if (current) result.push(current);
        current = { id: crypto.randomUUID(), titulo: line.trim(), conteudo: "" };
      } else if (current) {
        current.conteudo += line + "\n";
      }
    }
    if (current) result.push(current);
    return result;
  };

  useEffect(() => {
    if (open) {
      if (serviceType) {
        form.reset({
          name: serviceType.name,
          slug: serviceType.slug,
          description: serviceType.description ?? "",
          client_types: serviceType.client_types as ClientType[],
          financial_model: serviceType.financial_model as FinancialModel,
          requires_royalties: serviceType.requires_royalties,
          requires_fixed_value: serviceType.requires_fixed_value,
          requires_advance: serviceType.requires_advance,
          requires_financial_support: serviceType.requires_financial_support,
          allow_installments: serviceType.allow_installments,
          default_financial_category: serviceType.default_financial_category ?? "",
          active: serviceType.active,
          sort_order: serviceType.sort_order,
        });
        setCabecalho(
          serviceType.header_image_url
            ? { nome: "cabeçalho", dataUrl: serviceType.header_image_url }
            : null,
        );
        setRodape(
          serviceType.footer_image_url
            ? { nome: "rodapé", dataUrl: serviceType.footer_image_url }
            : null,
        );
        setClausulas(parseClausulasFromContent(serviceType.conteudo ?? ""));
        setAdvancedOpen(true);
      } else {
        form.reset({
          name: "",
          slug: "",
          description: "",
          client_types: ["artista"],
          financial_model: "valor_fixo",
          requires_royalties: false,
          requires_fixed_value: true,
          requires_advance: false,
          requires_financial_support: false,
          allow_installments: false,
          default_financial_category: "",
          active: true,
          sort_order: 1,
        });
        setCabecalho(null);
        setRodape(null);
        setClausulas([]);
        setAdvancedOpen(false);
      }
    }
  }, [open, serviceType, form]);

  const nameValue = form.watch("name");
  useEffect(() => {
    if (!isEditing) {
      form.setValue("slug", slugify(nameValue || ""));
    }
  }, [nameValue, isEditing, form]);

  const handleSubmit = form.handleSubmit((values) => {
    if (existingSlugs.includes(values.slug)) {
      form.setError("slug", { message: "Já existe um tipo com este slug" });
      return;
    }
    onSave({
      ...values,
      description: values.description || null,
      default_financial_category: values.default_financial_category || null,
      header_image_url: cabecalho?.dataUrl ?? null,
      footer_image_url: rodape?.dataUrl ?? null,
      conteudo: buildConteudo(),
    });
  });

  const clientTypes = form.watch("client_types");
  const toggleClientType = (ct: ClientType) => {
    const current = form.getValues("client_types");
    if (current.includes(ct)) {
      if (current.length === 1) return;
      form.setValue("client_types", current.filter((c) => c !== ct));
    } else {
      form.setValue("client_types", [...current, ct]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tipo de Contrato" : "Novo Tipo de Contrato"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[85vh] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4 py-1 pr-1">

            {/* ── Seção 1: Informações Básicas ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nome + Descrição — 2 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Ex: Agenciamento Artístico"
                      data-testid="input-type-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      placeholder="Descreva o tipo de contrato..."
                      rows={2}
                      data-testid="textarea-type-description"
                    />
                  </div>
                </div>

                {/* Tipos de Cliente */}
                <div className="space-y-2">
                  <Label>Tipos de Cliente *</Label>
                  <div className="flex gap-4 flex-wrap">
                    {CLIENT_TYPES.map((ct) => (
                      <div key={ct.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`ct-${ct.value}`}
                          checked={clientTypes.includes(ct.value)}
                          onCheckedChange={() => toggleClientType(ct.value)}
                          data-testid={`checkbox-client-type-${ct.value}`}
                        />
                        <Label htmlFor={`ct-${ct.value}`} className="font-normal cursor-pointer">{ct.label}</Label>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.client_types && (
                    <p className="text-xs text-destructive">{form.formState.errors.client_types.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Seção 2: Configuração Financeira ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Configuração Financeira
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Modelo Financeiro */}
                <div className="space-y-2">
                  <Label>Modelo Financeiro</Label>
                  <Select
                    value={form.watch("financial_model")}
                    onValueChange={(v) => form.setValue("financial_model", v as FinancialModel)}
                  >
                    <SelectTrigger data-testid="select-financial-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                      <SelectItem value="royalties">Royalties</SelectItem>
                      <SelectItem value="misto">Misto (Fixo + Royalties)</SelectItem>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos Financeiros — 2 colunas */}
                <div className="space-y-2">
                  <Label>Campos financeiros exibidos no formulário</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FINANCIAL_CHECKBOXES.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={key}
                          checked={form.watch(key)}
                          onCheckedChange={(v) => form.setValue(key, !!v)}
                          data-testid={`checkbox-${key}`}
                        />
                        <Label htmlFor={key} className="font-normal cursor-pointer text-sm leading-tight">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categoria Financeira Padrão */}
                <div className="space-y-2">
                  <Label htmlFor="default_financial_category">Categoria Financeira Padrão (opcional)</Label>
                  <Input
                    id="default_financial_category"
                    {...form.register("default_financial_category")}
                    placeholder="Ex: receitas-musicais, servicos, caches..."
                    data-testid="input-default-category"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Seção 3: Cláusulas do Contrato ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Cláusulas do Contrato
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddClausula}
                    className="gap-2"
                    data-testid="button-add-clausula"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Cláusula
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Variáveis disponíveis como badges */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Variáveis disponíveis para uso nas cláusulas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-[10px]">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>

                {clausulas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    Nenhuma cláusula adicionada. Clique em "Adicionar Cláusula" para começar.
                  </div>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-4 pr-2">
                      {clausulas.map((clausula, index) => (
                        <div key={clausula.id} className="rounded-lg border border-border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">Cláusula {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveClausula(clausula.id)}
                              className="text-destructive hover:text-destructive h-7 w-7"
                              data-testid={`remove-clausula-${clausula.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                              value={clausula.titulo}
                              onChange={(e) => handleClausulaChange(clausula.id, "titulo", e.target.value)}
                              placeholder="Ex: DO OBJETO"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Conteúdo</Label>
                            <Textarea
                              value={clausula.conteudo}
                              onChange={(e) => handleClausulaChange(clausula.id, "conteudo", e.target.value)}
                              placeholder="Texto da cláusula... Use {{VARIAVEL}} para campos dinâmicos."
                              rows={4}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* ── Seção 4: Personalização do Documento ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Personalização do Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Cabeçalho */}
                  <div className="space-y-2">
                    <Label>Cabeçalho do Contrato</Label>
                    <input
                      ref={cabecalhoRef}
                      type="file"
                      accept={ACCEPT_DOCS}
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setCabecalho)}
                      data-testid="input-file-cabecalho"
                    />
                    {cabecalho ? (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="flex-1 truncate text-sm">{cabecalho.nome}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setCabecalho(null)}
                          data-testid="remove-cabecalho"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 text-muted-foreground"
                        onClick={() => cabecalhoRef.current?.click()}
                        data-testid="button-upload-cabecalho"
                      >
                        <Upload className="h-4 w-4" />
                        Anexar cabeçalho
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PDF, Word ou imagem (PNG/JPG)</p>
                  </div>

                  {/* Rodapé */}
                  <div className="space-y-2">
                    <Label>Rodapé do Contrato</Label>
                    <input
                      ref={rodapeRef}
                      type="file"
                      accept={ACCEPT_DOCS}
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setRodape)}
                      data-testid="input-file-rodape"
                    />
                    {rodape ? (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="flex-1 truncate text-sm">{rodape.nome}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setRodape(null)}
                          data-testid="remove-rodape"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 text-muted-foreground"
                        onClick={() => rodapeRef.current?.click()}
                        data-testid="button-upload-rodape"
                      >
                        <Upload className="h-4 w-4" />
                        Anexar rodapé
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PDF, Word ou imagem (PNG/JPG)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Seção 5: Configurações Avançadas (collapsible) ── */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Configurações Avançadas
                      </CardTitle>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Slug */}
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug (identificador único)</Label>
                      <Input
                        id="slug"
                        {...form.register("slug")}
                        placeholder="agenciamento_artistico"
                        data-testid="input-type-slug"
                      />
                      <p className="text-xs text-muted-foreground">Gerado automaticamente. Editável manualmente. Apenas letras minúsculas, números e _.</p>
                      {form.formState.errors.slug && (
                        <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
                      )}
                    </div>

                    {/* Ordem */}
                    <div className="space-y-2">
                      <Label htmlFor="sort_order">Ordem de exibição</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        min={1}
                        {...form.register("sort_order", { valueAsNumber: true })}
                        data-testid="input-sort-order"
                      />
                    </div>

                    {/* Status Ativo */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="active"
                        checked={form.watch("active")}
                        onCheckedChange={(v) => form.setValue("active", !!v)}
                        data-testid="checkbox-active"
                      />
                      <Label htmlFor="active" className="font-normal cursor-pointer">Ativo</Label>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

          </form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-type">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} data-testid="button-save-type">
            {isEditing ? "Salvar Alterações" : "Criar Tipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
