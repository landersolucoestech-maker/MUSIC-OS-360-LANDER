import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { X, Plus, Save, Upload, FileText, ChevronDown, Check, Search } from "lucide-react";
import type { TemplateContrato, TemplateContratoInsert } from "@/modules/contracts/hooks/useTemplatesContratos";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateContratoSchema, type TemplateContratoFormData } from "@/modules/contracts/lib/template-contrato-schema";
import { FormField, FieldError } from "@/shared/components/FormField";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { cn } from "@/shared/lib/utils";

const TIPO_ARTISTICO = "Contrato Artístico";

const ACCEPT_DOCS = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

interface Clausula {
  id: string;
  titulo: string;
  conteudo: string;
}

interface AnexoFile {
  nome: string;
  dataUrl: string | null;
}

interface TemplateContratoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateContrato | null;
  onSave: (data: TemplateContratoInsert) => void;
  tiposServico: string[];
}

export function TemplateContratoFormModal({
  open,
  onOpenChange,
  template,
  onSave,
  tiposServico,
}: TemplateContratoFormModalProps) {
  const [clausulas, setClausulas] = useState<Clausula[]>([]);

  const [cabecalho, setCabecalho] = useState<AnexoFile | null>(null);
  const [rodape, setRodape] = useState<AnexoFile | null>(null);
  const cabecalhoRef = useRef<HTMLInputElement>(null);
  const rodapeRef = useRef<HTMLInputElement>(null);

  const [artistasSelecionados, setArtistasSelecionados] = useState<string[]>([]);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [artistaSearch, setArtistaSearch] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [artistaPopoverOpen, setArtistaPopoverOpen] = useState(false);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);

  const { artistas = [] } = useArtistas();
  const { clientes = [] } = useClientes();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TemplateContratoFormData>({
    resolver: zodResolver(templateContratoSchema),
    mode: "onChange",
    defaultValues: {
      nome: "",
      tipo_servico: "",
      ativo: true,
    },
  });

  const tipoSelecionado = watch("tipo_servico");
  const isArtistico = tipoSelecionado === TIPO_ARTISTICO;

  useEffect(() => {
    if (open) {
      if (template) {
        const t = template as Record<string, unknown>;
        reset({
          nome: (t.nome as string) ?? "",
          tipo_servico: (t.tipo_servico as string) ?? "",
          ativo: (t.ativo as boolean) ?? true,
        });
        setClausulas(parseClausulasFromContent((t.conteudo as string) ?? ""));
        setCabecalho(
          (t.header_image_url as string)
            ? { nome: "cabeçalho", dataUrl: t.header_image_url as string }
            : null
        );
        setRodape(
          (t.footer_image_url as string)
            ? { nome: "rodapé", dataUrl: t.footer_image_url as string }
            : null
        );
        setArtistasSelecionados((t.artistas_ids as string[]) ?? []);
        setClientesSelecionados((t.clientes_ids as string[]) ?? []);
      } else {
        reset({ nome: "", tipo_servico: "", ativo: true });
        setClausulas([]);
        setCabecalho(null);
        setRodape(null);
        setArtistasSelecionados([]);
        setClientesSelecionados([]);
      }
      setArtistaSearch("");
      setClienteSearch("");
    }
  }, [template, open, reset]);

  useEffect(() => {
    if (tipoSelecionado === TIPO_ARTISTICO) {
      setClientesSelecionados([]);
    } else {
      setArtistasSelecionados([]);
    }
  }, [tipoSelecionado]);

  const parseClausulasFromContent = (content: string): Clausula[] => {
    const lines = content.split("\n");
    const clausulasTemp: Clausula[] = [];
    let currentClausula: Clausula | null = null;

    for (const line of lines) {
      if (line.match(/^CLÁUSULA|^Cláusula|^\d+\./)) {
        if (currentClausula) clausulasTemp.push(currentClausula);
        currentClausula = { id: crypto.randomUUID(), titulo: line.trim(), conteudo: "" };
      } else if (currentClausula) {
        currentClausula.conteudo += line + "\n";
      }
    }
    if (currentClausula) clausulasTemp.push(currentClausula);
    return clausulasTemp;
  };

  const handleAddClausula = () => {
    setClausulas([...clausulas, {
      id: crypto.randomUUID(),
      titulo: `CLÁUSULA ${clausulas.length + 1}ª`,
      conteudo: "",
    }]);
  };

  const handleRemoveClausula = (id: string) =>
    setClausulas(clausulas.filter((c) => c.id !== id));

  const handleClausulaChange = (id: string, field: "titulo" | "conteudo", value: string) =>
    setClausulas(clausulas.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const buildConteudo = (): string =>
    clausulas.map((c) => `${c.titulo}\n${c.conteudo}`).join("\n\n");

  const extractVariaveis = (): string[] => {
    const regex = /\{\{([A-Z_]+)\}\}/g;
    const extracted = new Set<string>();
    for (const match of buildConteudo().matchAll(regex)) {
      extracted.add(match[1]);
    }
    return Array.from(extracted);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: AnexoFile | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setter({ nome: file.name, dataUrl: ev.target?.result as string ?? null });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleArtista = (id: string) => {
    setArtistasSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCliente = (id: string) => {
    setClientesSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const artistasFiltrados = artistas.filter((a) => {
    const t = a as Record<string, unknown>;
    const nome = ((t.nome_artistico as string) || (t.nome as string) || "").toLowerCase();
    return nome.includes(artistaSearch.toLowerCase());
  });

  const clientesFiltrados = clientes.filter((c) => {
    const t = c as Record<string, unknown>;
    const nome = (t.nome as string || "").toLowerCase();
    return nome.includes(clienteSearch.toLowerCase());
  });

  const onSubmit = (data: TemplateContratoFormData) => {
    onSave({
      nome: data.nome,
      tipo_servico: data.tipo_servico,
      descricao: "",
      conteudo: buildConteudo(),
      variaveis: extractVariaveis(),
      ativo: data.ativo,
      header_image_url: cabecalho?.dataUrl ?? null,
      footer_image_url: rodape?.dataUrl ?? null,
      artistas_ids: isArtistico ? artistasSelecionados : [],
      clientes_ids: !isArtistico ? clientesSelecionados : [],
    } as TemplateContratoInsert);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template de Contrato" : "Novo Template de Contrato"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="font-medium text-foreground">Informações Básicas</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Nome do Template"
                required
                {...register("nome")}
                placeholder="Ex: Contrato de Agenciamento Artístico"
                error={errors.nome?.message}
              />
              <div className="space-y-1.5">
                <Label htmlFor="tipo_servico">Tipo de Contrato <span className="text-destructive">*</span></Label>
                <Select
                  value={watch("tipo_servico")}
                  onValueChange={(v) => setValue("tipo_servico", v, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-tipo-servico">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposServico.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError error={errors.tipo_servico?.message} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="ativo"
                checked={watch("ativo")}
                onCheckedChange={(v) => setValue("ativo", v)}
              />
              <Label htmlFor="ativo" className="cursor-pointer">Template ativo</Label>
            </div>
          </div>

          {/* Partes do Contrato — condicional por tipo */}
          {tipoSelecionado && (
            <div className="rounded-lg border border-border p-4 space-y-4">
              <h3 className="font-medium text-foreground">
                {isArtistico ? "Artistas Vinculados" : "Clientes Vinculados"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isArtistico
                  ? "Selecione os artistas cadastrados que serão parte deste template."
                  : "Selecione os clientes cadastrados que serão parte deste template."}
              </p>

              {isArtistico ? (
                <div className="space-y-2">
                  <Popover open={artistaPopoverOpen} onOpenChange={setArtistaPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        data-testid="button-select-artistas"
                      >
                        <span className="text-muted-foreground">
                          {artistasSelecionados.length > 0
                            ? `${artistasSelecionados.length} artista(s) selecionado(s)`
                            : "Buscar e selecionar artistas…"}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <div className="flex items-center border-b px-3">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
                        <input
                          className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Buscar artista…"
                          value={artistaSearch}
                          onChange={(e) => setArtistaSearch(e.target.value)}
                          data-testid="input-search-artista"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto p-1">
                        {artistasFiltrados.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum artista encontrado.</p>
                        ) : (
                          artistasFiltrados.map((a) => {
                            const t = a as Record<string, unknown>;
                            const id = t.id as string;
                            const nome = (t.nome_artistico as string) || (t.nome as string) || id;
                            const selecionado = artistasSelecionados.includes(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                                onClick={() => toggleArtista(id)}
                                data-testid={`item-artista-${id}`}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                  selecionado ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {selecionado && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span>{nome}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {artistasSelecionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {artistasSelecionados.map((id) => {
                        const a = artistas.find((x) => (x as Record<string, unknown>).id === id) as Record<string, unknown> | undefined;
                        const nome = a
                          ? ((a.nome_artistico as string) || (a.nome as string) || id)
                          : id;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1">
                            {nome}
                            <button
                              type="button"
                              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                              onClick={() => toggleArtista(id)}
                              data-testid={`remove-artista-${id}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        data-testid="button-select-clientes"
                      >
                        <span className="text-muted-foreground">
                          {clientesSelecionados.length > 0
                            ? `${clientesSelecionados.length} cliente(s) selecionado(s)`
                            : "Buscar e selecionar clientes…"}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <div className="flex items-center border-b px-3">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
                        <input
                          className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Buscar cliente…"
                          value={clienteSearch}
                          onChange={(e) => setClienteSearch(e.target.value)}
                          data-testid="input-search-cliente"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto p-1">
                        {clientesFiltrados.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                        ) : (
                          clientesFiltrados.map((c) => {
                            const t = c as Record<string, unknown>;
                            const id = t.id as string;
                            const nome = (t.nome as string) || id;
                            const selecionado = clientesSelecionados.includes(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                                onClick={() => toggleCliente(id)}
                                data-testid={`item-cliente-${id}`}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                  selecionado ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {selecionado && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span>{nome}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {clientesSelecionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {clientesSelecionados.map((id) => {
                        const c = clientes.find((x) => (x as Record<string, unknown>).id === id) as Record<string, unknown> | undefined;
                        const nome = c ? ((c.nome as string) || id) : id;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1">
                            {nome}
                            <button
                              type="button"
                              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                              onClick={() => toggleCliente(id)}
                              data-testid={`remove-cliente-${id}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cabeçalho e Rodapé */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <h3 className="font-medium text-foreground">Cabeçalho e Rodapé</h3>
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
          </div>

          {/* Cláusulas */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Cláusulas</h3>
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

            {clausulas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma cláusula adicionada. Clique em "Adicionar Cláusula" para começar.
              </div>
            ) : (
              <div className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">
                        Variáveis disponíveis: {"{{CONTRACTED_NAME}}"}, {"{{ROYALTIES_PERCENTAGE}}"}, {"{{START_DATE}}"}, {"{{END_DATE}}"}, {"{{FIXED_VALUE}}"}, {"{{ADVANCE_AMOUNT}}"}, {"{{FINANCIAL_SUPPORT}}"}, {"{{WORK_TITLE}}"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={isSubmitting} data-testid="button-submit-template">
              <Save className="h-4 w-4" />
              {isSubmitting ? "Salvando..." : "Salvar Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
