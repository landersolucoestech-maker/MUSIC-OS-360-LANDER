import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { useForm, useFieldArray, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { artistaSchema, type ArtistaFormValues } from "@/modules/artist/lib/artista-schema";
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
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Loader2, Save, Plus, X, CheckCircle2, XCircle } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/shared/components/FileUpload";
import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { toast } from "sonner";
import {
  artistaToFormFields,
  formToArtistaPayload,
  gerarSlugArtistico,
  ESPECIALIDADES_LABELS,
  validateSpotifyUrl,
  validateYoutubeUrl,
  validateInstagramUrl,
  validateTiktokUrl,
  validateSoundcloudUrl,
  validateDeezerUrl,
  validateAppleMusicUrl,
  emptyRelacionamento,
  type FormToArtistaInput,
  type UrlValidationState,
  type ArtistaFormRelacionamento,
  type ArtistaDistribuidoraEntry,
} from "@/modules/artist/mappers";

// ─── Constants ────────────────────────────────────────────────────

const GENEROS_MUSICAIS = [
  "Funk", "Forró", "Sertanejo", "Pop", "Rock", "MPB", "Eletrônica",
  "Hip Hop", "R&B", "Axé", "Pagode", "Gospel", "Reggae", "Jazz", "Outro",
];

const BANCOS = [
  "Banco do Brasil", "Bradesco", "Caixa Econômica", "Itaú", "Santander",
  "Nubank", "Inter", "C6 Bank", "PicPay", "Mercado Pago", "Outro",
];

const FASE_CARREIRA_OPTIONS = [
  { value: "iniciante",   label: "Iniciante" },
  { value: "em_ascensao", label: "Em Ascensão" },
  { value: "consolidado", label: "Consolidado" },
  { value: "mainstream",  label: "Mainstream" },
];

const DISTRIBUIDORAS_OPTIONS: { id: string; label: string }[] = [
  { id: "onerpm",    label: "ONErpm" },
  { id: "distrokid", label: "DistroKid" },
  { id: "30por1",    label: "30 Por 1" },
  { id: "symphonic", label: "Symphonic" },
  { id: "somvibe",   label: "Somvibe" },
  { id: "soundon",   label: "SoundOn" },
  { id: "musicpro",  label: "MusicPro" },
  { id: "outros",    label: "Outro (custom)" },
];

const ESPECIALIDADES = Object.entries(ESPECIALIDADES_LABELS).map(([value, label]) => ({ value, label }));

type RelTipo = ArtistaFormRelacionamento["tipo"];

const REL_GRUPOS: { tipo: RelTipo; label: string; singular: string; showResponsaveis: boolean; showDists: boolean; showEscritorio: boolean; showCrc: boolean }[] = [
  { tipo: "empresario", label: "Empresários",  singular: "Empresário",  showResponsaveis: false, showDists: true,  showEscritorio: false, showCrc: false },
  { tipo: "gravadora",  label: "Gravadoras",   singular: "Gravadora",   showResponsaveis: true,  showDists: true,  showEscritorio: false, showCrc: false },
  { tipo: "editora",    label: "Editoras",     singular: "Editora",     showResponsaveis: true,  showDists: true,  showEscritorio: false, showCrc: false },
  { tipo: "booker",     label: "Bookers",      singular: "Booker",      showResponsaveis: false, showDists: false, showEscritorio: false, showCrc: false },
  { tipo: "juridico",   label: "Jurídico",     singular: "Escritório",  showResponsaveis: false, showDists: false, showEscritorio: true,  showCrc: false },
  { tipo: "financeiro", label: "Financeiro",   singular: "Contato",     showResponsaveis: false, showDists: false, showEscritorio: false, showCrc: false },
  { tipo: "contador",   label: "Contador",     singular: "Contador",    showResponsaveis: false, showDists: false, showEscritorio: false, showCrc: true  },
  { tipo: "assessoria", label: "Assessoria",   singular: "Assessor",    showResponsaveis: false, showDists: false, showEscritorio: false, showCrc: false },
];

// ─── Helper: URL validation icon ─────────────────────────────────

function UrlIcon({ state }: { state: UrlValidationState }) {
  if (state === "valid")   return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (state === "invalid") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  return null;
}

// ─── Nested: Distribuidoras sub-array inside a Relacionamento card ─

interface DistribuitorasSubProps {
  control: Control<ArtistaFormValues>;
  parentIndex: number;
}

function DistribuitorasSub({ control, parentIndex }: DistribuitorasSubProps) {
  const name = `relacionamentos.${parentIndex}.distribuidoras` as const;
  const { fields, append, remove, update } = useFieldArray({ control, name });

  const isSelected = (id: string) => fields.some((f) => f.id === id);
  const entryFor   = (id: string) => fields.find((f) => (f as ArtistaDistribuidoraEntry).id === id) as (ArtistaDistribuidoraEntry & { id: string }) | undefined;

  const toggle = (distId: string, checked: boolean) => {
    if (checked) {
      append({ id: distId, email: "", nomeCustom: distId === "outros" ? "" : undefined } as any);
    } else {
      const idx = fields.findIndex((f) => (f as any).id === distId);
      if (idx !== -1) remove(idx);
    }
  };

  const setEmail = (distId: string, email: string) => {
    const idx = fields.findIndex((f) => (f as any).id === distId);
    if (idx !== -1) update(idx, { ...(fields[idx] as any), email });
  };

  const setNomeCustom = (nomeCustom: string) => {
    const idx = fields.findIndex((f) => (f as any).id === "outros");
    if (idx !== -1) update(idx, { ...(fields[idx] as any), nomeCustom });
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <Label className="text-xs text-muted-foreground">Distribuidoras</Label>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {DISTRIBUIDORAS_OPTIONS.map((dist) => {
          const entry   = entryFor(dist.id);
          const checked = isSelected(dist.id);
          return (
            <div key={dist.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`dist-${parentIndex}-${dist.id}`}
                  checked={checked}
                  onCheckedChange={(c) => toggle(dist.id, !!c)}
                  data-testid={`checkbox-rel-dist-${parentIndex}-${dist.id}`}
                />
                <Label htmlFor={`dist-${parentIndex}-${dist.id}`} className="text-xs cursor-pointer font-medium">
                  {dist.label}
                </Label>
              </div>
              {checked && dist.id === "outros" && (
                <div className="ml-6 space-y-1">
                  <Input
                    value={entry?.nomeCustom ?? ""}
                    onChange={(e) => setNomeCustom(e.target.value)}
                    placeholder="Nome da distribuidora…"
                    className="h-7 text-xs"
                    data-testid={`input-rel-dist-nome-${parentIndex}`}
                  />
                  {(entry?.nomeCustom ?? "").trim().length > 0 && (
                    <Input
                      value={entry?.email ?? ""}
                      onChange={(e) => setEmail(dist.id, e.target.value)}
                      type="email"
                      placeholder="Email de share…"
                      className="h-7 text-xs"
                      data-testid={`input-rel-dist-email-${parentIndex}-outros`}
                    />
                  )}
                </div>
              )}
              {checked && dist.id !== "outros" && (
                <div className="ml-6">
                  <Input
                    value={entry?.email ?? ""}
                    onChange={(e) => setEmail(dist.id, e.target.value)}
                    type="email"
                    placeholder={`Email — ${dist.label}`}
                    className="h-7 text-xs"
                    data-testid={`input-rel-dist-email-${parentIndex}-${dist.id}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Nested: Responsáveis sub-array inside a Relacionamento card ──

interface ResponsaveisSubProps {
  control: Control<ArtistaFormValues>;
  parentIndex: number;
}

function ResponsaveisSub({ control, parentIndex }: ResponsaveisSubProps) {
  const name = `relacionamentos.${parentIndex}.responsaveis` as const;
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Responsáveis</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 px-2"
          onClick={() => append({ nome: "", telefone: "", email: "" })}
          data-testid={`button-add-responsavel-${parentIndex}`}
        >
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>
      {fields.map((field, ri) => (
        <div key={field.id} className="flex gap-2 items-start">
          <div className="grid grid-cols-3 gap-1 flex-1">
            <Controller
              control={control}
              name={`relacionamentos.${parentIndex}.responsaveis.${ri}.nome`}
              render={({ field: f }) => (
                <Input {...f} placeholder="Nome" className="h-7 text-xs" data-testid={`input-resp-nome-${parentIndex}-${ri}`} />
              )}
            />
            <Controller
              control={control}
              name={`relacionamentos.${parentIndex}.responsaveis.${ri}.telefone`}
              render={({ field: f }) => (
                <Input {...f} placeholder="Telefone" className="h-7 text-xs" data-testid={`input-resp-tel-${parentIndex}-${ri}`} />
              )}
            />
            <Controller
              control={control}
              name={`relacionamentos.${parentIndex}.responsaveis.${ri}.email`}
              render={({ field: f }) => (
                <Input {...f} type="email" placeholder="Email" className="h-7 text-xs" data-testid={`input-resp-email-${parentIndex}-${ri}`} />
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => remove(ri)}
            data-testid={`button-remove-responsavel-${parentIndex}-${ri}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── RelacionamentoCard ───────────────────────────────────────────

interface RelacionamentoCardProps {
  control: Control<ArtistaFormValues>;
  index: number;
  grupo: typeof REL_GRUPOS[number];
  remove: (i: number) => void;
}

function RelacionamentoCard({ control, index, grupo, remove }: RelacionamentoCardProps) {
  return (
    <div className="p-3 border rounded-lg space-y-3 bg-muted/20" data-testid={`card-rel-${grupo.tipo}-${index}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{grupo.singular}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => remove(index)}
          data-testid={`button-remove-rel-${grupo.tipo}-${index}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Controller
          control={control}
          name={`relacionamentos.${index}.nome`}
          render={({ field }) => (
            <Input {...field} placeholder="Nome" className="h-8 text-sm" data-testid={`input-rel-nome-${index}`} />
          )}
        />
        <Controller
          control={control}
          name={`relacionamentos.${index}.telefone`}
          render={({ field }) => (
            <Input {...field} placeholder="Telefone" className="h-8 text-sm" data-testid={`input-rel-tel-${index}`} />
          )}
        />
        <Controller
          control={control}
          name={`relacionamentos.${index}.email`}
          render={({ field }) => (
            <Input {...field} type="email" placeholder="Email" className="h-8 text-sm" data-testid={`input-rel-email-${index}`} />
          )}
        />
      </div>

      {grupo.showEscritorio && (
        <Controller
          control={control}
          name={`relacionamentos.${index}.escritorio`}
          render={({ field }) => (
            <Input {...field} placeholder="Escritório / Firma" className="h-8 text-sm" data-testid={`input-rel-escritorio-${index}`} />
          )}
        />
      )}

      {grupo.showCrc && (
        <Controller
          control={control}
          name={`relacionamentos.${index}.crc`}
          render={({ field }) => (
            <Input {...field} placeholder="Nº CRC" className="h-8 text-sm" data-testid={`input-rel-crc-${index}`} />
          )}
        />
      )}

      {grupo.showResponsaveis && (
        <ResponsaveisSub control={control} parentIndex={index} />
      )}

      {grupo.showDists && (
        <DistribuitorasSub control={control} parentIndex={index} />
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────

interface ArtistaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  artista?: Artista | null;
}

// ─── Tag Input ───────────────────────────────────────────────────

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = useCallback((raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput("");
  }, [tags, onChange]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center border rounded-md px-2 py-1.5 min-h-[36px] focus-within:ring-2 focus-within:ring-ring">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-destructive">
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? "Digite e pressione Enter…" : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        data-testid="input-tags-musicais"
      />
    </div>
  );
}

// ─── Default form values ──────────────────────────────────────────

const DEFAULT_VALUES: ArtistaFormValues = {
  nomeArtistico:  "",
  slugArtistico:  "",
  tagsMusicais:   [],
  faseCarreira:   "",
  generoMusical:  "",
  especialidades: [],
  biografia:      "",
  notasInternas:  "",
  nome:           "",
  dataNascimento: "",
  cpfCnpj:        "",
  rg:             "",
  genero:         "",
  endereco:       "",
  telefone:       "",
  email:          "",
  banco:          "",
  agencia:        "",
  conta:          "",
  chavePix:       "",
  titularConta:   "",
  spotify:        "",
  instagram:      "",
  youtube:        "",
  tiktok:         "",
  soundcloud:     "",
  deezer:         "",
  appleMusic:     "",
  relacionamentos: [],
};

// ─── Component ───────────────────────────────────────────────────

export function ArtistaFormModal({ open, onOpenChange, onSuccess, artista }: ArtistaFormModalProps) {
  const isEditing = !!artista;
  const { addArtista, updateArtista } = useArtistas();
  const { addCliente } = useClientes();
  const scrollRef = useRef<HTMLDivElement>(null);
  const slugTouched = useRef(false);

  // ── File upload state (not in form, managed separately) ─────────
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [imagemArtista, setImagemArtista]   = useState<UploadedFile[]>([]);
  const [documentosPessoais, setDocumentoPessoais] = useState<UploadedFile[]>([]);
  const [presskit, setPresskit]             = useState<UploadedFile[]>([]);

  // ── Pass-through fields not shown in this form ──────────────────
  const [preservedData, setPreservedData] = useState<{
    tipoArtista: string;
    statusArtista: string;
    spotifyOuvintes: string;
    instagramSeguidores: string;
    youtubeInscritos: string;
    tiktokSeguidores: string;
    soundcloudSeguidores: string;
    deezerFas: string;
    appleMusicAlbuns: string;
    empresarioId: string;
    empresarioNome: string;
    empresarioTelefone: string;
    empresarioEmail: string;
    gravadoraId: string;
    gravadoraNome: string;
    gravadoraTelefone: string;
    gravadoraEmail: string;
    gravadoraResponsavelId: string;
    gravadoraResponsavelNome: string;
    gravadoraResponsavelTelefone: string;
    gravadoraResponsavelEmail: string;
    distribuidorasSelecionadas: Record<string, boolean>;
    distribuidorasEmails: Record<string, string>;
    distribuidorasEmpresaSelecionadas: Record<string, boolean>;
    distribuidorasEmpresaEmails: Record<string, string>;
    tipoPerfil: "independente" | "com_empresario" | "gravadora" | "editora";
    contratoId: string;
    bannerUrl: string;
    galeriaUrls: string[];
    videoApresentacaoUrl: string;
    managerNome: string;
    managerContato: string;
    produtorExecutivo: string;
    agenciaBooking: string;
    labelParceira: string;
    documentosList: { nome: string; url: string }[];
  }>({
    tipoArtista: "artista_solo", statusArtista: "contratado",
    spotifyOuvintes: "", instagramSeguidores: "", youtubeInscritos: "",
    tiktokSeguidores: "", soundcloudSeguidores: "", deezerFas: "", appleMusicAlbuns: "",
    empresarioId: "", empresarioNome: "", empresarioTelefone: "", empresarioEmail: "",
    gravadoraId: "", gravadoraNome: "", gravadoraTelefone: "", gravadoraEmail: "",
    gravadoraResponsavelId: "", gravadoraResponsavelNome: "", gravadoraResponsavelTelefone: "", gravadoraResponsavelEmail: "",
    distribuidorasSelecionadas: {}, distribuidorasEmails: {},
    distribuidorasEmpresaSelecionadas: {}, distribuidorasEmpresaEmails: {},
    tipoPerfil: "independente", contratoId: "",
    bannerUrl: "", galeriaUrls: [], videoApresentacaoUrl: "",
    managerNome: "", managerContato: "", produtorExecutivo: "",
    agenciaBooking: "", labelParceira: "", documentosList: [],
  });

  // ── react-hook-form ─────────────────────────────────────────────
  const form = useForm<ArtistaFormValues>({
    resolver: zodResolver(artistaSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { register, control, watch: wf, setValue, reset, handleSubmit: rhfSubmit } = form;

  const { fields: relFields, append: appendRel, remove: removeRel } = useFieldArray({
    control,
    name: "relacionamentos",
  });

  // ── Watches ─────────────────────────────────────────────────────
  const nomeArtisticoVal = wf("nomeArtistico");
  const slugArtisticoVal = wf("slugArtistico");
  const tagsMusicaisVal  = wf("tagsMusicais") ?? [];
  const especialidadesVal = wf("especialidades") ?? [];
  const spotifyVal    = wf("spotify");
  const instagramVal  = wf("instagram");
  const youtubeVal    = wf("youtube");
  const tiktokVal     = wf("tiktok");
  const soundcloudVal = wf("soundcloud");
  const deezerVal     = wf("deezer");
  const appleMusicVal = wf("appleMusic");

  // ── Auto-generate slug from nome artístico ───────────────────────
  useEffect(() => {
    if (!open) return;
    if (slugTouched.current) return;
    if (nomeArtisticoVal) {
      setValue("slugArtistico", gerarSlugArtistico(nomeArtisticoVal), { shouldDirty: false });
    }
  }, [nomeArtisticoVal, open, setValue]);

  // ── Load artista data on open ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    slugTouched.current = false;
    const f = artistaToFormFields(artista ?? null);

    reset({
      nomeArtistico:  f.nomeArtistico,
      slugArtistico:  f.slugArtistico,
      tagsMusicais:   f.tagsMusicais,
      faseCarreira:   f.faseCarreira,
      generoMusical:  f.generoMusical,
      especialidades: f.especialidades,
      biografia:      f.biografia,
      notasInternas:  f.notasInternas,
      nome:           f.nome,
      dataNascimento: f.dataNascimento,
      cpfCnpj:        f.cpfCnpj,
      rg:             f.rg,
      genero:         typeof artista?.genero === "string" ? artista.genero : "",
      endereco:       f.endereco,
      telefone:       f.telefone,
      email:          f.email,
      banco:          f.banco,
      agencia:        f.agencia,
      conta:          f.conta,
      chavePix:       f.chavePix,
      titularConta:   f.titularConta,
      spotify:        f.spotify,
      instagram:      f.instagram,
      youtube:        f.youtube,
      tiktok:         f.tiktok,
      soundcloud:     f.soundcloud,
      deezer:         f.deezer,
      appleMusic:     f.appleMusic,
      relacionamentos: f.relacionamentos,
    });

    setPreservedData({
      tipoArtista:   f.tipoArtista,
      statusArtista: f.statusArtista,
      spotifyOuvintes: f.spotifyOuvintes,
      instagramSeguidores: f.instagramSeguidores,
      youtubeInscritos: f.youtubeInscritos,
      tiktokSeguidores: f.tiktokSeguidores,
      soundcloudSeguidores: f.soundcloudSeguidores,
      deezerFas: f.deezerFas,
      appleMusicAlbuns: f.appleMusicAlbuns,
      empresarioId: f.empresarioId,
      empresarioNome: f.empresarioNome,
      empresarioTelefone: f.empresarioTelefone,
      empresarioEmail: f.empresarioEmail,
      gravadoraId: f.gravadoraId,
      gravadoraNome: f.gravadoraNome,
      gravadoraTelefone: f.gravadoraTelefone,
      gravadoraEmail: f.gravadoraEmail,
      gravadoraResponsavelId: f.gravadoraResponsavelId,
      gravadoraResponsavelNome: f.gravadoraResponsavelNome,
      gravadoraResponsavelTelefone: f.gravadoraResponsavelTelefone,
      gravadoraResponsavelEmail: f.gravadoraResponsavelEmail,
      distribuidorasSelecionadas: f.distribuidorasSelecionadas,
      distribuidorasEmails: f.distribuidorasEmails,
      distribuidorasEmpresaSelecionadas: f.distribuidorasEmpresaSelecionadas,
      distribuidorasEmpresaEmails: f.distribuidorasEmpresaEmails,
      tipoPerfil: f.tipoPerfil,
      contratoId: f.contratoId,
      bannerUrl: typeof artista?.banner_url === "string" ? artista.banner_url : "",
      galeriaUrls: Array.isArray(artista?.galeria_urls) ? (artista.galeria_urls as string[]) : [],
      videoApresentacaoUrl: typeof artista?.video_apresentacao_url === "string" ? artista.video_apresentacao_url : "",
      managerNome: typeof artista?.manager_nome === "string" ? artista.manager_nome : "",
      managerContato: typeof artista?.manager_contato === "string" ? artista.manager_contato : "",
      produtorExecutivo: typeof artista?.produtor_executivo === "string" ? artista.produtor_executivo : "",
      agenciaBooking: typeof artista?.agencia_booking === "string" ? artista.agencia_booking : "",
      labelParceira: typeof artista?.label_parceira === "string" ? artista.label_parceira : "",
      documentosList: Array.isArray(artista?.documentos) ? (artista.documentos as { nome: string; url: string }[]) : [],
    });

    setImagemArtista(
      f.fotoUrl ? [{ url: f.fotoUrl, name: "foto", size: 0, type: "image/*", path: "" }] : []
    );
    setDocumentoPessoais(
      f.documentosPessoaisUrl
        ? [{ name: "documento.pdf", size: 0, type: "application/pdf", path: f.documentosPessoaisUrl, url: f.documentosPessoaisUrl }]
        : []
    );
    setPresskit(
      f.presskitUrl
        ? [{ name: "presskit.pdf", size: 0, type: "application/pdf", path: f.presskitUrl, url: f.presskitUrl }]
        : []
    );

    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, 50);
  }, [open, artista]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) { reset(DEFAULT_VALUES); slugTouched.current = false; }
    onOpenChange(nextOpen);
  };

  const toggleEspecialidade = (value: string, checked: boolean) => {
    const current = wf("especialidades") ?? [];
    setValue("especialidades", checked ? [...current, value] : current.filter((x) => x !== value));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    slugTouched.current = true;
    setValue("slugArtistico", e.target.value, { shouldDirty: true });
  };

  // ── URL validation states ────────────────────────────────────────
  const urlStates = {
    spotify:    validateSpotifyUrl(spotifyVal ?? ""),
    instagram:  validateInstagramUrl(instagramVal ?? ""),
    youtube:    validateYoutubeUrl(youtubeVal ?? ""),
    tiktok:     validateTiktokUrl(tiktokVal ?? ""),
    soundcloud: validateSoundcloudUrl(soundcloudVal ?? ""),
    deezer:     validateDeezerUrl(deezerVal ?? ""),
    appleMusic: validateAppleMusicUrl(appleMusicVal ?? ""),
  };

  // ── Submit ──────────────────────────────────────────────────────
  const onSubmit = async (values: ArtistaFormValues) => {
    if (!values.nomeArtistico.trim()) { toast.error("Nome artístico é obrigatório"); return; }
    if (!values.nome.trim())          { toast.error("Nome completo é obrigatório");  return; }

    setIsSubmitting(true);
    try {
      const formInput: FormToArtistaInput = {
        nomeArtistico:   values.nomeArtistico,
        slugArtistico:   values.slugArtistico ?? "",
        tagsMusicais:    values.tagsMusicais ?? [],
        faseCarreira:    values.faseCarreira ?? "",
        generoMusical:   values.generoMusical ?? "",
        tipoArtista:     preservedData.tipoArtista,
        statusArtista:   preservedData.statusArtista,
        especialidades:  values.especialidades ?? [],
        biografia:       values.biografia ?? "",
        notasInternas:   values.notasInternas ?? "",
        nome:            values.nome,
        dataNascimento:  values.dataNascimento ?? "",
        cpfCnpj:         values.cpfCnpj ?? "",
        rg:              values.rg ?? "",
        endereco:        values.endereco ?? "",
        telefone:        values.telefone ?? "",
        email:           values.email ?? "",
        banco:           values.banco ?? "",
        agencia:         values.agencia ?? "",
        conta:           values.conta ?? "",
        chavePix:        values.chavePix ?? "",
        titularConta:    values.titularConta ?? "",
        spotify:         values.spotify ?? "",
        spotifyOuvintes: preservedData.spotifyOuvintes,
        instagram:       values.instagram ?? "",
        instagramSeguidores: preservedData.instagramSeguidores,
        youtube:         values.youtube ?? "",
        youtubeInscritos: preservedData.youtubeInscritos,
        tiktok:          values.tiktok ?? "",
        tiktokSeguidores: preservedData.tiktokSeguidores,
        soundcloud:      values.soundcloud ?? "",
        soundcloudSeguidores: preservedData.soundcloudSeguidores,
        deezer:          values.deezer ?? "",
        deezerFas:       preservedData.deezerFas,
        appleMusic:      values.appleMusic ?? "",
        appleMusicAlbuns: preservedData.appleMusicAlbuns,
        relacionamentos: (values.relacionamentos ?? []) as ArtistaFormRelacionamento[],
        tipoPerfil:      preservedData.tipoPerfil,
        empresarioId:    preservedData.empresarioId,
        empresarioNome:  preservedData.empresarioNome,
        empresarioTelefone: preservedData.empresarioTelefone,
        empresarioEmail: preservedData.empresarioEmail,
        gravadoraId:     preservedData.gravadoraId,
        gravadoraNome:   preservedData.gravadoraNome,
        gravadoraTelefone: preservedData.gravadoraTelefone,
        gravadoraEmail:  preservedData.gravadoraEmail,
        gravadoraResponsavelId: preservedData.gravadoraResponsavelId,
        gravadoraResponsavelNome: preservedData.gravadoraResponsavelNome,
        gravadoraResponsavelTelefone: preservedData.gravadoraResponsavelTelefone,
        gravadoraResponsavelEmail: preservedData.gravadoraResponsavelEmail,
        distribuidorasSelecionadas: preservedData.distribuidorasSelecionadas,
        distribuidorasEmails: preservedData.distribuidorasEmails,
        distribuidorasEmpresaSelecionadas: preservedData.distribuidorasEmpresaSelecionadas,
        distribuidorasEmpresaEmails: preservedData.distribuidorasEmpresaEmails,
        fotoUrl:               imagemArtista[0]?.url ?? "",
        documentosPessoaisUrl: documentosPessoais[0]?.url ?? "",
        presskitUrl:           presskit[0]?.url ?? "",
        contratoId:            preservedData.contratoId,
      };

      const payload = formToArtistaPayload(formInput);
      const extraFields = {
        genero:                 (values.genero ?? null) || null,
        banner_url:             preservedData.bannerUrl || null,
        galeria_urls:           preservedData.galeriaUrls.length > 0 ? preservedData.galeriaUrls : null,
        video_apresentacao_url: preservedData.videoApresentacaoUrl || null,
        manager_nome:           preservedData.managerNome || null,
        manager_contato:        preservedData.managerContato || null,
        produtor_executivo:     preservedData.produtorExecutivo || null,
        agencia_booking:        preservedData.agenciaBooking || null,
        label_parceira:         preservedData.labelParceira || null,
        documentos:             preservedData.documentosList.length > 0 ? preservedData.documentosList : null,
      };

      if (isEditing) {
        await updateArtista.mutateAsync({
          id: artista.id, ...payload, ...extraFields,
          contrato_id: preservedData.contratoId || null,
        });
      } else {
        await addCliente.mutateAsync({
          tipo_pessoa: "pessoa_fisica" as const,
          nome:        values.nomeArtistico.trim(),
          cpf_cnpj:    (values.cpfCnpj ?? "").trim() || null,
          responsavel: values.nome.trim() || null,
          email:       (values.email ?? "").trim() || null,
          telefone:    (values.telefone ?? "").trim() || null,
          endereco:    (values.endereco ?? "").trim() || null,
          cidade:      null as string | null,
          estado:      null as string | null,
          observacoes: (values.biografia ?? "").trim() || null,
          status:      "ativo",
        });
        await addArtista.mutateAsync({ ...payload, ...extraFields });
      }
      handleClose(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── JSX ─────────────────────────────────────────────────────────
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

            {/* ═══ 1. Informações Básicas ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">1.</span>
                <h3 className="text-lg font-semibold">Informações Básicas</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Imagem do Artista</Label>
                <FileUpload
                  folder="artistas/fotos"
                  accept="image/*"
                  maxSize={5}
                  circular
                  value={imagemArtista}
                  onChange={setImagemArtista}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Artístico <span className="text-destructive">*</span></Label>
                  <Input
                    {...register("nomeArtistico")}
                    placeholder="Nome usado profissionalmente"
                    data-testid="input-nome-artistico"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug Artístico</Label>
                  <Input
                    value={slugArtisticoVal ?? ""}
                    onChange={handleSlugChange}
                    placeholder="auto-gerado-do-nome"
                    className="font-mono text-sm"
                    data-testid="input-slug-artistico"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gênero Musical <span className="text-destructive">*</span></Label>
                  <Controller
                    control={control}
                    name="generoMusical"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-genero">
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {GENEROS_MUSICAIS.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fase da Carreira</Label>
                  <Controller
                    control={control}
                    name="faseCarreira"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-fase-carreira">
                          <SelectValue placeholder="Selecione a fase" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {FASE_CARREIRA_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags Musicais</Label>
                <TagInput
                  tags={tagsMusicaisVal}
                  onChange={(tags) => setValue("tagsMusicais", tags)}
                />
                <p className="text-xs text-muted-foreground">Pressione Enter ou vírgula para adicionar uma tag.</p>
              </div>

              <div className="space-y-2">
                <Label>Especialidade / Função</Label>
                <div className="flex flex-wrap gap-4">
                  {ESPECIALIDADES.map((esp) => (
                    <div key={esp.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`esp-${esp.value}`}
                        checked={especialidadesVal.includes(esp.value)}
                        onCheckedChange={(checked) => toggleEspecialidade(esp.value, !!checked)}
                      />
                      <Label htmlFor={`esp-${esp.value}`} className="cursor-pointer">{esp.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Documentos Pessoais (PDF)</Label>
                <FileUpload
                  folder="artistas/documentos"
                  accept="application/pdf"
                  maxSize={5}
                  value={documentosPessoais}
                  onChange={setDocumentoPessoais}
                />
              </div>

              <div className="space-y-2">
                <Label>Presskit / Media Kit</Label>
                <FileUpload
                  folder="artistas/presskit"
                  accept="application/pdf,.zip"
                  maxSize={10}
                  value={presskit}
                  onChange={setPresskit}
                />
              </div>

              <div className="space-y-2">
                <Label>Biografia</Label>
                <Textarea
                  {...register("biografia")}
                  placeholder="Trajetória, conquistas e estilo musical…"
                  className="min-h-[120px]"
                  data-testid="textarea-biografia"
                />
              </div>
            </div>

            {/* ═══ 2. Dados Pessoais ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">2.</span>
                <h3 className="text-lg font-semibold">Dados Pessoais</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo <span className="text-destructive">*</span></Label>
                  <Input
                    {...register("nome")}
                    placeholder="Nome conforme documento"
                    data-testid="input-nome-civil"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Controller
                    control={control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <DatePickerField
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Selecione a data"
                        data-testid="datepicker-data-nascimento"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input {...register("cpfCnpj")} placeholder="000.000.000-00" data-testid="input-cpf-cnpj" />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input {...register("rg")} placeholder="00.000.000-0" data-testid="input-rg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Controller
                    control={control}
                    name="genero"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-genero-pessoa">
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço Completo</Label>
                  <Input {...register("endereco")} placeholder="Rua, número, bairro, cidade, CEP" data-testid="input-endereco" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input {...register("telefone")} placeholder="(11) 99999-9999" data-testid="input-telefone" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input {...register("email")} type="email" placeholder="email@exemplo.com" data-testid="input-email" />
                </div>
              </div>
            </div>

            {/* ═══ 3. Dados Bancários ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">3.</span>
                <h3 className="text-lg font-semibold">Dados Bancários</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Controller
                    control={control}
                    name="banco"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o banco" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {BANCOS.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input {...register("agencia")} placeholder="0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conta com Dígito</Label>
                  <Input {...register("conta")} placeholder="00000-0" />
                </div>
                <div className="space-y-2">
                  <Label>Chave Pix</Label>
                  <Input {...register("chavePix")} placeholder="CPF, e-mail, telefone ou chave aleatória" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Titular da Conta</Label>
                <Input {...register("titularConta")} placeholder="Nome completo do titular" />
              </div>
            </div>

            {/* ═══ 4. Redes Sociais ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">4.</span>
                <h3 className="text-lg font-semibold">Redes Sociais & Plataformas</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Spotify</Label>
                  <div className="flex items-center gap-2">
                    <Input {...register("spotify")} placeholder="https://open.spotify.com/artist/…" data-testid="input-spotify-url" />
                    <UrlIcon state={urlStates.spotify} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <div className="flex items-center gap-2">
                    <Input {...register("instagram")} placeholder="https://instagram.com/perfil" data-testid="input-instagram-url" />
                    <UrlIcon state={urlStates.instagram} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>YouTube</Label>
                  <div className="flex items-center gap-2">
                    <Input {...register("youtube")} placeholder="https://youtube.com/channel/UC…" data-testid="input-youtube-url" />
                    <UrlIcon state={urlStates.youtube} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>TikTok</Label>
                  <div className="flex items-center gap-2">
                    <Input {...register("tiktok")} placeholder="https://tiktok.com/@perfil" data-testid="input-tiktok-url" />
                    <UrlIcon state={urlStates.tiktok} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SoundCloud</Label>
                  <div className="flex items-center gap-2">
                    <Input {...register("soundcloud")} placeholder="https://soundcloud.com/perfil" data-testid="input-soundcloud-url" />
                    <UrlIcon state={urlStates.soundcloud} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Deezer</Label>
                  <div className="flex items-center gap-2">
                    <Input {...register("deezer")} placeholder="https://deezer.com/artist/…" data-testid="input-deezer-url" />
                    <UrlIcon state={urlStates.deezer} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Apple Music</Label>
                <div className="flex items-center gap-2">
                  <Input
                    {...register("appleMusic")}
                    placeholder="https://music.apple.com/artist/…"
                    data-testid="input-apple-music-url"
                    className="flex-1"
                  />
                  <UrlIcon state={urlStates.appleMusic} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Cole as URLs públicas. O sistema extrai automaticamente os identificadores
                do Spotify e YouTube para buscar métricas reais.
                {" "}Ícone <CheckCircle2 className="inline h-3 w-3 text-green-500" /> = URL válida.
              </p>
            </div>

            {/* ═══ 5. Relacionamentos Comerciais ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">5.</span>
                <h3 className="text-lg font-semibold">Relacionamentos Comerciais</h3>
              </div>
              <Separator />

              {REL_GRUPOS.map((grupo) => {
                const grupoIndexes = relFields
                  .map((f, i) => ({ f, i }))
                  .filter(({ f }) => (f as unknown as ArtistaFormRelacionamento).tipo === grupo.tipo);

                return (
                  <div key={grupo.tipo} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-muted-foreground">{grupo.label}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => appendRel(emptyRelacionamento(grupo.tipo) as any)}
                        data-testid={`button-add-rel-${grupo.tipo}`}
                      >
                        <Plus className="h-3 w-3" /> Adicionar {grupo.singular}
                      </Button>
                    </div>

                    {grupoIndexes.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1 pl-1">Nenhum adicionado.</p>
                    )}

                    {grupoIndexes.map(({ i }) => (
                      <RelacionamentoCard
                        key={relFields[i].id}
                        control={control}
                        index={i}
                        grupo={grupo}
                        remove={removeRel}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* ═══ 6. Observações ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">6.</span>
                <h3 className="text-lg font-semibold">Observações</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Notas Internas</Label>
                <Textarea
                  {...register("notasInternas")}
                  placeholder="Notas internas, rider técnico, preferências, informações adicionais…"
                  className="min-h-[120px]"
                  data-testid="textarea-observacoes"
                />
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
            onClick={rhfSubmit(onSubmit)}
            disabled={isSubmitting}
            className="gap-2"
            data-testid="button-salvar-modal"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? "Salvar Alterações" : "Cadastrar Artista"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
