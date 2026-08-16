import { useState, useEffect, useRef } from "react";
import { useForm, Controller, type Control, type FieldErrors, type UseFormRegister, type UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ARTIST_FORM_SECTIONS,
  DISTRIBUIDORAS_OPTIONS,
  artistaSchema,
  artistaToFormValues,
  artistaToPreservedInput,
  emptyArtistFormValues,
  emptyPreservedInput,
  formValuesToArtistaPayload,
  type ArtistFormField,
  type ArtistaFormValues,
  type ArtistaFormAllValues,
  type ArtistaPreservedInput,
} from "@/modules/artist/forms/artist-form.definition";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Loader2, Save, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/shared/components/FileUpload";
import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm-relationships/hooks/useContacts";
import type { Contrato } from "@/modules/contracts/hooks/useContratos";
import { AsyncEntityCombobox } from "@/shared/components/AsyncEntityCombobox";
import { EquipeContatosCRM } from "@/modules/artist/components/EquipeContatosCRM";
import { getExpectedUpdatedAt, handleConcurrencyConflict } from "@/shared/hooks/useConcurrencyConflict";
import { toast } from "sonner";
import { ArtistStatus } from "@music-os-360/types";
import type { ArtistaDistribuidoraEntry } from "@/modules/artist/types/artista.types";
import type { UrlValidationState } from "@/modules/artist/mappers";

// ─── Classificação (DEC-003: campos incorporados de ArtistaCadastro.tsx) ──
// tipo: usa o vocabulário já oficial ArtistaTipo (shared/types/enums.ts), não
// a lista ad hoc de ArtistaCadastro.tsx (que conflitava "tipo" com papéis já
// cobertos por `especialidades`, ex.: compositor/produtor/dj).
const TIPO_ARTISTA_OPTIONS: { value: string; label: string }[] = [
  { value: "artista_solo", label: "Solo" },
  { value: "banda",        label: "Banda" },
  { value: "duo",          label: "Duo" },
  { value: "trio",         label: "Trio" },
  { value: "grupo",        label: "Grupo" },
  { value: "coletivo",     label: "Coletivo" },
];

// status: usa o enum real ArtistStatus (@music-os-360/types), não a lista de
// ArtistaCadastro.tsx (que tinha 2 valores inválidos — "negociando"/"prospect"
// — que não existem no enum e seriam rejeitados pelo backend com 400).
const STATUS_ARTISTA_OPTIONS: { value: ArtistStatus; label: string }[] = [
  { value: ArtistStatus.EM_NEGOCIACAO, label: "Em Negociação" },
  { value: ArtistStatus.CONTRATADO,    label: "Contratado" },
  { value: ArtistStatus.ATIVO,         label: "Ativo" },
  { value: ArtistStatus.ONBOARDING,    label: "Em Onboarding" },
  { value: ArtistStatus.INATIVO,       label: "Inativo" },
  { value: ArtistStatus.SUSPENSO,      label: "Suspenso" },
  { value: ArtistStatus.DESLIGADO,     label: "Desligado" },
  { value: ArtistStatus.EX_ARTISTA,    label: "Ex-Artista" },
  { value: ArtistStatus.PROSPECTO,     label: "Prospecto" },
];

// ─── Helper: URL validation icon ─────────────────────────────────

function UrlIcon({ state }: { state: UrlValidationState }) {
  if (state === "valid")   return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (state === "invalid") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  return null;
}

// ─── Composite: Distribuidoras / Agregadoras ─────────────────────

function DistribuidorasField({
  value,
  onChange,
}: {
  value: ArtistaDistribuidoraEntry[];
  onChange: (next: ArtistaDistribuidoraEntry[]) => void;
}) {
  const toggle = (distId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, { id: distId, email: "", nomeCustom: distId === "outros" ? "" : undefined }]);
    } else {
      onChange(value.filter((d) => d.id !== distId));
    }
  };
  const updateEmail = (distId: string, email: string) =>
    onChange(value.map((d) => (d.id === distId ? { ...d, email } : d)));
  const updateNomeCustom = (nomeCustom: string) =>
    onChange(value.map((d) => (d.id === "outros" ? { ...d, nomeCustom } : d)));

  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {DISTRIBUIDORAS_OPTIONS.map((dist) => {
          const entry = value.find((d) => d.id === dist.id);
          const isChecked = !!entry;
          return (
            <div key={dist.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`geral-dist-${dist.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => toggle(dist.id, !!checked)}
                  data-testid={`checkbox-geral-dist-${dist.id}`}
                />
                <Label htmlFor={`geral-dist-${dist.id}`} className="text-sm cursor-pointer font-medium">
                  {dist.label}
                </Label>
              </div>

              {isChecked && dist.id === "outros" && (
                <div className="ml-6 space-y-1.5">
                  <Input
                    value={entry?.nomeCustom ?? ""}
                    onChange={(e) => updateNomeCustom(e.target.value)}
                    placeholder="Nome da distribuidora…"
                    className="h-8 text-sm"
                    data-testid="input-geral-dist-nome-custom"
                  />
                  {(entry?.nomeCustom ?? "").trim().length > 0 && (
                    <Input
                      value={entry?.email ?? ""}
                      onChange={(e) => updateEmail(dist.id, e.target.value)}
                      type="email"
                      placeholder="Email de share…"
                      className="h-8 text-sm"
                      data-testid="input-geral-dist-email-outros"
                    />
                  )}
                </div>
              )}

              {isChecked && dist.id !== "outros" && (
                <div className="ml-6">
                  <Input
                    value={entry?.email ?? ""}
                    onChange={(e) => updateEmail(dist.id, e.target.value)}
                    type="email"
                    placeholder={`Email de share — ${dist.label}`}
                    className="h-8 text-sm"
                    data-testid={`input-geral-dist-email-${dist.id}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {value.some((d) => d.id === "outros" && !(d.nomeCustom ?? "").trim()) && (
        <p className="text-xs text-muted-foreground ml-6">
          Preencha o nome da distribuidora para activar o email de share.
        </p>
      )}
    </>
  );
}

// ─── Field renderer (dirigido pela definição) ────────────────────

type FileFieldId = "fotoUrl" | "documentosPessoaisUrl" | "presskitUrl";

interface FieldRendererCtx {
  register: UseFormRegister<ArtistaFormValues>;
  control: Control<ArtistaFormValues>;
  watch: UseFormWatch<ArtistaFormValues>;
  files: Record<FileFieldId, UploadedFile[]>;
  setFile: (id: FileFieldId, value: UploadedFile[]) => void;
  artistaId?: string;
}

function FieldLabel({ field }: { field: ArtistFormField }) {
  return (
    <Label>
      {field.label} {field.required && <span className="text-destructive">*</span>}
    </Label>
  );
}

function renderArtistField(field: ArtistFormField, ctx: FieldRendererCtx) {
  const { register, control, watch, files, setFile, artistaId } = ctx;
  const span = field.fullWidth ? "col-span-2" : "";
  const rhfId = field.id as keyof ArtistaFormValues;

  switch (field.type) {
    case "file":
      return (
        <div key={field.id} className={`space-y-2 ${span}`}>
          <FieldLabel field={field} />
          <FileUpload
            folder={field.file!.folder}
            accept={field.file!.accept}
            maxSize={field.file!.maxSize}
            circular={field.file!.circular}
            entity="artist"
            entityId={artistaId}
            value={files[field.id as FileFieldId]}
            onChange={(v) => setFile(field.id as FileFieldId, v)}
          />
        </div>
      );

    case "textarea":
      return (
        <div key={field.id} className={`space-y-2 ${span}`}>
          <FieldLabel field={field} />
          <Textarea
            {...register(rhfId)}
            placeholder={field.placeholder}
            className="min-h-[120px]"
            data-testid={field.testId}
          />
        </div>
      );

    case "select":
      return (
        <div key={field.id} className={`space-y-2 ${span}`}>
          <FieldLabel field={field} />
          <Controller
            control={control}
            name={rhfId}
            render={({ field: rhf }) => (
              <Select value={(rhf.value as string) ?? ""} onValueChange={rhf.onChange}>
                <SelectTrigger data-testid={field.testId}>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      );

    case "multicheck":
      return (
        <div key={field.id} className={`space-y-2 ${span}`}>
          <FieldLabel field={field} />
          <Controller
            control={control}
            name={rhfId}
            render={({ field: rhf }) => {
              const current = Array.isArray(rhf.value) ? (rhf.value as string[]) : [];
              return (
                <div className="flex flex-wrap gap-4">
                  {(field.checkOptions ?? []).map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${field.id}-${opt.value}`}
                        checked={current.includes(opt.value)}
                        onCheckedChange={(checked) =>
                          rhf.onChange(
                            checked ? [...current, opt.value] : current.filter((x) => x !== opt.value),
                          )
                        }
                      />
                      <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </div>
      );

    case "url": {
      const state: UrlValidationState = field.urlValidator
        ? field.urlValidator((watch(rhfId) as string) ?? "")
        : "idle";
      return (
        <div key={field.id} className={`space-y-2 ${span}`}>
          <FieldLabel field={field} />
          <div className="flex items-center gap-2">
            <Input {...register(rhfId)} placeholder={field.placeholder} data-testid={field.testId} />
            <UrlIcon state={state} />
          </div>
        </div>
      );
    }

    case "date":
      return (
        <div key={field.id} className={`space-y-2 ${span}`}>
          <FieldLabel field={field} />
          <Controller
            control={control}
            name={rhfId}
            render={({ field: rhf }) => (
              <DatePickerField
                value={(rhf.value as string) ?? ""}
                onChange={rhf.onChange}
                placeholder={field.placeholder ?? "Selecione a data"}
                data-testid={field.testId}
              />
            )}
          />
        </div>
      );

    case "contatos-crm":
      return (
        <div key={field.id} className={span}>
          <Controller
            control={control}
            name={rhfId}
            render={({ field: rhf }) => (
              <EquipeContatosCRM
                value={Array.isArray(rhf.value) ? (rhf.value as ArtistaFormValues["contatosVinculados"]) : []}
                onChange={rhf.onChange}
              />
            )}
          />
        </div>
      );

    case "distribuidoras":
      return (
        <div key={field.id} className={`space-y-4 ${span}`}>
          <Controller
            control={control}
            name={rhfId}
            render={({ field: rhf }) => (
              <DistribuidorasField
                value={Array.isArray(rhf.value) ? (rhf.value as ArtistaDistribuidoraEntry[]) : []}
                onChange={rhf.onChange}
              />
            )}
          />
        </div>
      );

    default:
      return (
        <div key={field.id} className={`space-y-2 ${span}`}>
          <FieldLabel field={field} />
          <Input
            {...register(rhfId)}
            type={field.type === "email" ? "email" : "text"}
            placeholder={field.placeholder}
            data-testid={field.testId}
          />
        </div>
      );
  }
}

// ─── Props ────────────────────────────────────────────────────────

interface ArtistaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  artista?: Artista | null;
}

// ─── Component ───────────────────────────────────────────────────

export function ArtistaFormModal({ open, onOpenChange, onSuccess, artista }: ArtistaFormModalProps) {
  const isEditing = !!artista;
  const { addArtista, updateArtista } = useArtistas();
  const { addCliente } = useClientes();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Non-form state ──────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<Record<FileFieldId, UploadedFile[]>>({
    fotoUrl: [], documentosPessoaisUrl: [], presskitUrl: [],
  });
  const setFile = (id: FileFieldId, value: UploadedFile[]) =>
    setFiles((prev) => ({ ...prev, [id]: value }));

  // Perfil 360 pass-through (não exibidos neste formulário)
  const [galeriaUrls, setGaleriaUrls]                   = useState<string[]>([]);
  const [managerNome, setManagerNome]                   = useState("");
  const [managerContato, setManagerContato]             = useState("");
  const [produtorExecutivo, setProdutorExecutivo]       = useState("");
  const [agenciaBooking, setAgenciaBooking]             = useState("");
  const [labelParceira, setLabelParceira]               = useState("");
  const [documentosList, setDocumentosList]             = useState<{ nome: string; url: string }[]>([]);
  // Buffers de input para as listas acima (galeria/documentos)
  const [galeriaInput, setGaleriaInput] = useState("");
  const [docNomeInput, setDocNomeInput] = useState("");
  const [docUrlInput, setDocUrlInput]   = useState("");

  const handleAddGaleriaUrl = () => {
    const url = galeriaInput.trim();
    if (!url) return;
    setGaleriaUrls((prev) => [...prev, url]);
    setGaleriaInput("");
  };
  const handleRemoveGaleriaUrl = (index: number) =>
    setGaleriaUrls((prev) => prev.filter((_, i) => i !== index));

  const handleAddDocumento = () => {
    const nome = docNomeInput.trim();
    const url = docUrlInput.trim();
    if (!nome || !url) return;
    setDocumentosList((prev) => [...prev, { nome, url }]);
    setDocNomeInput("");
    setDocUrlInput("");
  };
  const handleRemoveDocumento = (index: number) =>
    setDocumentosList((prev) => prev.filter((_, i) => i !== index));

  // Campos preservados em round-trip (métricas, modelo legado, contrato…)
  const [preserved, setPreserved] = useState<ArtistaPreservedInput>(emptyPreservedInput());
  // Legado: contatos de equipe embutidos (round-trip intacto; o painel usa contatos_vinculados)
  const [contatosEquipe, setContatosEquipe] = useState<unknown[]>([]);

  // ── react-hook-form (schema GERADO da definição do formulário) ──
  const form = useForm<ArtistaFormValues>({
    resolver: zodResolver(artistaSchema),
    defaultValues: emptyArtistFormValues(),
  });
  const { register, control, watch, reset, handleSubmit: rhfSubmit } = form;

  const tipoPerfilVal = watch("tipoPerfil");

  // ── Load artista data on open ───────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // MESMA hidratação canônica usada pela exportação (definição única).
    const v = artistaToFormValues(artista ?? null);
    const { fotoUrl, documentosPessoaisUrl, presskitUrl, ...formValues } = v;
    reset(formValues);

    setPreserved(artistaToPreservedInput(artista ?? null));
    setContatosEquipe(
      Array.isArray((artista as (Artista & { contatos_equipe?: unknown }) | null | undefined)?.contatos_equipe)
        ? ((artista as Artista & { contatos_equipe?: unknown }).contatos_equipe as unknown[])
        : [],
    );

    setFiles({
      fotoUrl: fotoUrl
        ? [{ url: fotoUrl, name: "foto", size: 0, type: "image/*", path: "" }]
        : [],
      documentosPessoaisUrl: documentosPessoaisUrl
        ? [{ name: "documento.pdf", size: 0, type: "application/pdf", path: documentosPessoaisUrl, url: documentosPessoaisUrl }]
        : [],
      presskitUrl: presskitUrl
        ? [{ name: "presskit.pdf", size: 0, type: "application/pdf", path: presskitUrl, url: presskitUrl }]
        : [],
    });

    setGaleriaUrls(Array.isArray(artista?.galeria_urls) ? (artista.galeria_urls as string[]) : []);
    setManagerNome(typeof artista?.manager_nome === "string" ? artista.manager_nome : "");
    setManagerContato(typeof artista?.manager_contato === "string" ? artista.manager_contato : "");
    setProdutorExecutivo(typeof artista?.produtor_executivo === "string" ? artista.produtor_executivo : "");
    setAgenciaBooking(typeof artista?.agencia_booking === "string" ? artista.agencia_booking : "");
    setLabelParceira(typeof artista?.label_parceira === "string" ? artista.label_parceira : "");
    setDocumentosList(Array.isArray(artista?.documentos) ? (artista.documentos as { nome: string; url: string }[]) : []);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, 50);
  }, [open, artista, reset]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset(emptyArtistFormValues());
    onOpenChange(nextOpen);
  };

  // ── Submit ──────────────────────────────────────────────────────
  const onSubmit = async (values: ArtistaFormValues) => {
    setIsSubmitting(true);
    try {
      const allValues: ArtistaFormAllValues = {
        ...values,
        fotoUrl:               files.fotoUrl[0]?.url ?? "",
        documentosPessoaisUrl: files.documentosPessoaisUrl[0]?.url ?? "",
        presskitUrl:           files.presskitUrl[0]?.url ?? "",
      };

      // MESMA conversão canônica usada pela importação (definição única).
      const payload = formValuesToArtistaPayload(allValues, preserved);

      // Pass-through de campos do Perfil 360 que não pertencem a este formulário.
      const passThrough = {
        galeria_urls:           galeriaUrls.length > 0 ? galeriaUrls : null,
        manager_nome:           managerNome.trim() || null,
        manager_contato:        managerContato.trim() || null,
        produtor_executivo:     produtorExecutivo.trim() || null,
        agencia_booking:        agenciaBooking.trim() || null,
        label_parceira:         labelParceira.trim() || null,
        documentos:             documentosList.length > 0 ? documentosList : null,
        contatos_equipe:        contatosEquipe.length > 0
                                  ? (contatosEquipe as Artista["contatos_equipe"])
                                  : null,
      };

      if (isEditing) {
        try {
          await updateArtista.mutateAsync({
            id: artista.id, ...payload, ...passThrough,
            contrato_id: preserved.contratoId || null,
            expectedUpdatedAt: getExpectedUpdatedAt(artista),
          });
        } catch (err) {
          if (handleConcurrencyConflict(err, "artista")) return;
          throw err;
        }
      } else {
        await addCliente.mutateAsync({
          tipo_pessoa: "pessoa_fisica" as const,
          nome:        values.nomeArtistico.trim(),
          cpf_cnpj:    values.cpfCnpj.trim() || null,
          responsavel: values.nome.trim() || null,
          email:       values.email.trim() || null,
          telefone:    values.telefone.trim() || null,
          endereco:    values.endereco.trim() || null,
          cidade:      null as string | null,
          estado:      null as string | null,
          observacoes: values.biografia.trim() || null,
          status:      "ativo",
        });
        await addArtista.mutateAsync({
          ...payload, ...passThrough,
          contrato_id: preserved.contratoId || null,
        });
      }
      handleClose(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: FieldErrors<ArtistaFormValues>) => {
    const first = Object.values(errors).find(
      (e): e is { message: string } => typeof (e as { message?: unknown })?.message === "string",
    );
    if (first) toast.error(first.message);
  };

  const rendererCtx: FieldRendererCtx = { register, control, watch, files, setFile, artistaId: artista?.id };
  const currentValues = watch();

  // ── JSX (seções e campos iterados da definição única) ──────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEditing ? "Editar Artista" : "Novo Artista"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados do artista." : "Preencha os dados do artista."}
            {" "}Campos com <span className="text-destructive">*</span> são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="space-y-8">
            {ARTIST_FORM_SECTIONS.map((section) => {
              if (section.visibleWhen && !section.visibleWhen(currentValues)) return null;
              return (
                <div key={section.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                  </div>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    {section.fields.map((field) => renderArtistField(field, rendererCtx))}
                  </div>

                  {section.id === "perfis-redes" && (
                    <p className="text-xs text-muted-foreground">
                      Cole as URLs públicas. O sistema extrai automaticamente os identificadores
                      do Spotify e YouTube para buscar métricas reais.
                      {" "}Ícone <CheckCircle2 className="inline h-3 w-3 text-green-500" /> = URL válida.
                    </p>
                  )}
                </div>
              );
            })}

            {/* ── Classificação e Vínculos (DEC-003: tipo/status/contrato_id) ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Classificação e Vínculos</h3>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Artista</Label>
                  <Select
                    value={preserved.tipoArtista || "artista_solo"}
                    onValueChange={(v) => setPreserved((p) => ({ ...p, tipoArtista: v }))}
                  >
                    <SelectTrigger data-testid="select-tipo-artista">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {TIPO_ARTISTA_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={preserved.statusArtista || ArtistStatus.CONTRATADO}
                    onValueChange={(v) => setPreserved((p) => ({ ...p, statusArtista: v }))}
                  >
                    <SelectTrigger data-testid="select-status-artista">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {STATUS_ARTISTA_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Vincular Contrato</Label>
                  {/* Task J: busca server-side (AsyncEntityCombobox) — antes
                      populava o Select com useContratos() sem filtro, truncado
                      nos primeiros 50 contratos do tenant. */}
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <AsyncEntityCombobox<Contrato>
                        table="contratos"
                        getLabel={(c) => c.titulo ?? ""}
                        value={preserved.contratoId || null}
                        onChange={(id) => setPreserved((p) => ({ ...p, contratoId: id }))}
                        placeholder="Selecionar contrato..."
                        searchPlaceholder="Buscar contrato..."
                        data-testid="select-contrato"
                      />
                    </div>
                    {preserved.contratoId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPreserved((p) => ({ ...p, contratoId: "" }))}
                        data-testid="button-remover-contrato"
                      >
                        Nenhum
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alterar o status para "Contratado" exige um contrato vinculado.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Equipe de Gestão (DEC-003: campos exclusivos de ArtistaCadastro.tsx) ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Equipe de Gestão</h3>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Manager / Empresário</Label>
                  <Input
                    value={managerNome}
                    onChange={(e) => setManagerNome(e.target.value)}
                    placeholder="Nome do manager"
                    data-testid="input-manager-nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contato do Manager</Label>
                  <Input
                    value={managerContato}
                    onChange={(e) => setManagerContato(e.target.value)}
                    placeholder="Telefone ou email"
                    data-testid="input-manager-contato"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produtor Executivo</Label>
                  <Input
                    value={produtorExecutivo}
                    onChange={(e) => setProdutorExecutivo(e.target.value)}
                    placeholder="Nome do produtor executivo"
                    data-testid="input-produtor-executivo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agência de Booking</Label>
                  <Input
                    value={agenciaBooking}
                    onChange={(e) => setAgenciaBooking(e.target.value)}
                    placeholder="Nome da agência"
                    data-testid="input-agencia-booking"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Label Parceira</Label>
                  <Input
                    value={labelParceira}
                    onChange={(e) => setLabelParceira(e.target.value)}
                    placeholder="Nome da label"
                    data-testid="input-label-parceira"
                  />
                </div>
              </div>
            </div>

            {/* ── Mídia Adicional (DEC-003: galeria_urls / documentos) ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Mídia Adicional</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Galeria de Fotos</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="URL da foto (https://...)"
                    value={galeriaInput}
                    onChange={(e) => setGaleriaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGaleriaUrl(); } }}
                    data-testid="input-galeria-url"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddGaleriaUrl} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {galeriaUrls.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {galeriaUrls.map((url, i) => (
                      <li key={`${url}-${i}`} className="flex items-center justify-between gap-2 text-sm border rounded px-2 py-1">
                        <span className="truncate">{url}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveGaleriaUrl(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label>Documentos</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do documento"
                    value={docNomeInput}
                    onChange={(e) => setDocNomeInput(e.target.value)}
                    data-testid="input-documento-nome"
                  />
                  <Input
                    placeholder="URL (https://...)"
                    value={docUrlInput}
                    onChange={(e) => setDocUrlInput(e.target.value)}
                    data-testid="input-documento-url"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddDocumento} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {documentosList.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {documentosList.map((doc, i) => (
                      <li key={`${doc.url}-${i}`} className="flex items-center justify-between gap-2 text-sm border rounded px-2 py-1">
                        <span className="truncate">{doc.nome}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveDocumento(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
            data-testid="button-cancelar-modal"
          >
            Cancelar
          </Button>
          <Button
            onClick={rhfSubmit(onSubmit, onInvalid)}
            disabled={isSubmitting}
            className="gap-2"
            data-testid="button-salvar-modal"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? "Salvar Alterações" : "Criar Artista"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
