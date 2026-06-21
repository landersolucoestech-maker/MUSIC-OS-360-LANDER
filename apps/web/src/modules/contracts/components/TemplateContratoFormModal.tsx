import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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
import { X, Save, ChevronDown, Check, Search } from "lucide-react";
import type { TemplateContrato, TemplateContratoInsert } from "@/modules/contracts/hooks/useTemplatesContratos";
import type { ContractServiceType } from "@/modules/contracts/hooks/useContractServiceTypes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateContratoSchema, type TemplateContratoFormData } from "@/modules/contracts/lib/template-contrato-schema";
import { FormField, FieldError } from "@/shared/components/FormField";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useCRMContatos } from "@/modules/contracts/hooks/useCRMContatos";
import { getContractPartyOrigin } from "@/modules/contracts/mappers/contract-party-origin.mapper";
import { cn } from "@/shared/lib/utils";

interface TemplateContratoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateContrato | null;
  onSave: (data: TemplateContratoInsert) => void;
  tiposServico: ContractServiceType[];
}

export function TemplateContratoFormModal({
  open,
  onOpenChange,
  template,
  onSave,
  tiposServico,
}: TemplateContratoFormModalProps) {
  const [artistasSelecionados, setArtistasSelecionados] = useState<string[]>([]);
  const [contatosSelecionados, setContatosSelecionados] = useState<string[]>([]);
  const [artistaSearch, setArtistaSearch] = useState("");
  const [contatoSearch, setContatoSearch] = useState("");
  const [artistaPopoverOpen, setArtistaPopoverOpen] = useState(false);
  const [contatoPopoverOpen, setContatoPopoverOpen] = useState(false);

  const { artistas = [] } = useArtistas();
  const { contatos = [] } = useCRMContatos();

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
  const partyOrigin = getContractPartyOrigin(tipoSelecionado ?? "");
  const isArtistico = partyOrigin === "ARTIST";
  const isCRM = partyOrigin === "CRM";

  useEffect(() => {
    if (open) {
      if (template) {
        const t = template as Record<string, unknown>;
        reset({
          nome: (t.nome as string) ?? "",
          tipo_servico: (t.tipo_servico as string) ?? "",
          ativo: (t.ativo as boolean) ?? true,
        });
        setArtistasSelecionados((t.artistas_ids as string[]) ?? []);
        setContatosSelecionados((t.clientes_ids as string[]) ?? []);
      } else {
        reset({ nome: "", tipo_servico: "", ativo: true });
        setArtistasSelecionados([]);
        setContatosSelecionados([]);
      }
      setArtistaSearch("");
      setContatoSearch("");
    }
  }, [template, open, reset]);

  useEffect(() => {
    if (isArtistico) {
      setContatosSelecionados([]);
    }

    if (isCRM) {
      setArtistasSelecionados([]);
    }

    if (partyOrigin === "NONE") {
      setContatosSelecionados([]);
      setArtistasSelecionados([]);
    }
  }, [partyOrigin, isArtistico, isCRM]);

  const toggleArtista = (id: string) => {
    setArtistasSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleContato = (id: string) => {
    setContatosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const artistasFiltrados = artistas.filter((a) => {
    const t = a as Record<string, unknown>;
    const nome = ((t.nome_artistico as string) || (t.nome as string) || "").toLowerCase();
    return nome.includes(artistaSearch.toLowerCase());
  });

  const contatosFiltrados = contatos.filter((c) =>
    c.nome.toLowerCase().includes(contatoSearch.toLowerCase())
  );

  const onSubmit = (data: TemplateContratoFormData) => {
    onSave({
      nome: data.nome,
      tipo_servico: data.tipo_servico,
      descricao: "",
      conteudo: "",
      variaveis: [],
      ativo: data.ativo,
      header_image_url: null,
      footer_image_url: null,
      party_origin: partyOrigin,
      artistas_ids: isArtistico ? artistasSelecionados : [],
      clientes_ids: isCRM ? contatosSelecionados : [],
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
                      <SelectItem key={tipo.slug} value={tipo.name}>
                        {tipo.name}
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

          {/* Partes do Contrato — visível apenas quando partyOrigin !== "NONE" */}
          {partyOrigin !== "NONE" && (
            <div className="rounded-lg border border-border p-4 space-y-4">
              <h3 className="font-medium text-foreground">
                {isArtistico ? "Artistas Vinculados" : "Contatos Vinculados"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isArtistico
                  ? "Selecione os artistas cadastrados que serão parte deste template."
                  : "Selecione contatos do CRM vinculados ao contrato."}
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
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted cursor-pointer"
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
                  <Popover open={contatoPopoverOpen} onOpenChange={setContatoPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                        data-testid="button-select-contatos"
                      >
                        <span className="text-muted-foreground">
                          {contatosSelecionados.length > 0
                            ? `${contatosSelecionados.length} contato(s) selecionado(s)`
                            : "Buscar contatos do CRM…"}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <div className="flex items-center border-b px-3">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
                        <input
                          className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Buscar contatos do CRM..."
                          value={contatoSearch}
                          onChange={(e) => setContatoSearch(e.target.value)}
                          data-testid="input-search-contato"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto p-1">
                        {contatosFiltrados.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</p>
                        ) : (
                          contatosFiltrados.map((c) => {
                            const selecionado = contatosSelecionados.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                                onClick={() => toggleContato(c.id)}
                                data-testid={`item-contato-${c.id}`}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                  selecionado ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {selecionado && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span className="flex-1 text-left">{c.nome}</span>
                                {c.tipo && (
                                  <span className="text-xs text-muted-foreground">{c.tipo}</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {contatosSelecionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {contatosSelecionados.map((id) => {
                        const c = contatos.find((x) => x.id === id);
                        const nome = c ? c.nome : id;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1">
                            {nome}
                            <button
                              type="button"
                              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                              onClick={() => toggleContato(id)}
                              data-testid={`remove-contato-${id}`}
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

