import { useEffect } from "react";
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
import type { ContractServiceType, ContractServiceTypeInsert, ClientType, FinancialModel } from "@/modules/contracts/hooks/useContractServiceTypes";

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
  allow_payment_type_select: z.boolean(),
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

export function ServiceTypeFormModal({
  open,
  onOpenChange,
  serviceType,
  onSave,
  existingSlugs,
}: ServiceTypeFormModalProps) {
  const isEditing = !!serviceType;

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
      allow_payment_type_select: false,
      default_financial_category: "",
      active: true,
      sort_order: 1,
    },
  });

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
          allow_payment_type_select: serviceType.allow_payment_type_select,
          default_financial_category: serviceType.default_financial_category ?? "",
          active: serviceType.active,
          sort_order: serviceType.sort_order,
        });
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
          allow_payment_type_select: false,
          default_financial_category: "",
          active: true,
          sort_order: 1,
        });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tipo de Contrato" : "Novo Tipo de Contrato"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          <form onSubmit={handleSubmit} className="space-y-5 py-1">
            {/* Nome */}
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

            {/* Descrição */}
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

            {/* Campos Financeiros */}
            <div className="space-y-3">
              <Label>Campos financeiros exibidos no formulário</Label>
              <div className="space-y-2">
                {[
                  { key: "requires_royalties" as const, label: "Royalties (%)" },
                  { key: "requires_fixed_value" as const, label: "Valor Fixo (R$)" },
                  { key: "requires_advance" as const, label: "Adiantamento (R$)" },
                  { key: "requires_financial_support" as const, label: "Suporte Financeiro Mensal (R$)" },
                  { key: "allow_payment_type_select" as const, label: "Selecionar Tipo de Pagamento (valor fixo ou royalties)" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={form.watch(key)}
                      onCheckedChange={(v) => form.setValue(key, !!v)}
                      data-testid={`checkbox-${key}`}
                    />
                    <Label htmlFor={key} className="font-normal cursor-pointer">{label}</Label>
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

            {/* Status (apenas no edit) */}
            {isEditing && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={form.watch("active")}
                  onCheckedChange={(v) => form.setValue("active", !!v)}
                  data-testid="checkbox-active"
                />
                <Label htmlFor="active" className="font-normal cursor-pointer">Ativo</Label>
              </div>
            )}
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
