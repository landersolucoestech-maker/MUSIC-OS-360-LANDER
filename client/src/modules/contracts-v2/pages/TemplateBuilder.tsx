import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, FileText, ArrowLeft, Save, Layers } from "lucide-react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useDocumentTemplates, useCreateTemplate } from "../hooks/useDocumentEngine";
import { createTemplateSchema } from "../lib/schemas";
import type { CreateTemplateInput } from "../lib/schemas";
import { TEMPLATE_CATEGORY_LABEL, SIGNER_ROLE_LABEL } from "../types";
import type { TemplateCategory, SignerRole } from "../types";
import { toast } from "sonner";

// ─── Template list card ───────────────────────────────────────────────────────

function TemplateCard({ name, category, variables, signer_roles, version }: {
  name: string;
  category: TemplateCategory;
  variables: { key: string }[];
  signer_roles: SignerRole[];
  version: number;
}) {
  return (
    <Card className="hover:border-primary/40 transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{TEMPLATE_CATEGORY_LABEL[category]}</p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">v{version}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {signer_roles.map((r) => (
            <Badge key={r} variant="outline" className="text-[10px] font-normal">{SIGNER_ROLE_LABEL[r]}</Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{variables.length} variável{variables.length !== 1 ? "is" : ""}</p>
      </CardContent>
    </Card>
  );
}

// ─── New template form ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: TemplateCategory[] = [
  "gravacao", "distribuicao", "publishing", "show", "producao", "licenciamento", "outros",
];

const SIGNER_ROLE_OPTIONS: SignerRole[] = [
  "artista", "label", "testemunha", "procurador", "produtor", "advogado",
];

function NewTemplateForm({ onSuccess }: { onSuccess: () => void }) {
  const createMut = useCreateTemplate();
  const [selectedRoles, setSelectedRoles] = useState<SignerRole[]>(["artista", "label"]);

  const form = useForm<CreateTemplateInput>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name:         "",
      description:  "",
      category:     "gravacao",
      content:      "",
      variables:    [],
      signer_roles: ["artista", "label"],
    },
  });

  function toggleRole(role: SignerRole) {
    setSelectedRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role];
      form.setValue("signer_roles", next);
      return next;
    });
  }

  async function onSubmit(data: CreateTemplateInput) {
    try {
      await createMut.mutateAsync({ ...data, signer_roles: selectedRoles });
      toast.success("Template criado com sucesso!");
      form.reset();
      onSuccess();
    } catch {
      toast.error("Erro ao criar template.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Template</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Contrato de Gravação Exclusiva" {...field} data-testid="input-template-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-template-category">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{TEMPLATE_CATEGORY_LABEL[cat]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Breve descrição do template" {...field} data-testid="input-template-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo HTML do Template</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="<h1>CONTRATO DE GRAVAÇÃO</h1>&#10;<p>Entre {{NOME_LABEL}} e {{NOME_ARTISTA}}…</p>&#10;<p>[ASSIN_ARTISTA]</p>"
                  className="font-mono text-xs min-h-[180px]"
                  {...field}
                  data-testid="textarea-template-content"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Use <code className="bg-muted px-1 rounded">{"{{VARIAVEL}}"}</code> para variáveis e{" "}
                <code className="bg-muted px-1 rounded">[ASSIN_ROLE]</code> para âncoras de assinatura.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Signatários */}
        <div>
          <p className="text-sm font-medium mb-2">Roles de Signatários</p>
          <div className="flex flex-wrap gap-2">
            {SIGNER_ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                data-testid={`toggle-role-${role}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedRoles.includes(role)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/50"
                }`}
              >
                {SIGNER_ROLE_LABEL[role]}
              </button>
            ))}
          </div>
          {selectedRoles.length === 0 && (
            <p className="text-xs text-destructive mt-1">Selecione pelo menos 1 signatário</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            size="sm"
            className="gap-1.5"
            disabled={createMut.isPending || selectedRoles.length === 0}
            data-testid="btn-salvar-template"
          >
            <Save className="h-4 w-4" />
            {createMut.isPending ? "Salvando…" : "Salvar Template"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplateBuilder() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const { data: templates = [], isLoading } = useDocumentTemplates();

  return (
    <MainLayout
      title="Template Builder"
      description="Gerencie modelos de contratos para geração rápida de documentos"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("/contratos-v2")}
            data-testid="btn-voltar-documentos"
          >
            <ArrowLeft className="h-4 w-4" /> Documentos
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
            data-testid="btn-novo-template"
          >
            {showForm ? (
              <><Trash2 className="h-4 w-4" /> Cancelar</>
            ) : (
              <><Plus className="h-4 w-4" /> Novo Template</>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader className="py-4 px-5 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Novo Template
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <NewTemplateForm onSuccess={() => setShowForm(false)} />
            </CardContent>
          </Card>
        )}

        {/* Templates grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Templates disponíveis ({templates.length})</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum template criado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.id} data-testid={`card-template-${tpl.id}`}>
                  <TemplateCard
                    name={tpl.name}
                    category={tpl.category}
                    variables={tpl.variables}
                    signer_roles={tpl.signer_roles}
                    version={tpl.version}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
