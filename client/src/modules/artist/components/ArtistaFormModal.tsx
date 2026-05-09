import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Badge } from "@/shared/ui/badge";
import { Loader2, Save, Plus, X, CheckCircle2, XCircle } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/shared/components/FileUpload";
import { useArtistas, type Artista, type ArtistaDistribuidoraEntry } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { toast } from "sonner";
import {
  artistaToFormFields,
  formToArtistaPayload,
  ESPECIALIDADES_LABELS,
  gerarSlugArtistico,
  validateSpotifyUrl,
  validateYoutubeUrl,
  validateInstagramUrl,
  validateTiktokUrl,
  validateSoundcloudUrl,
  validateDeezerUrl,
  validateAppleMusicUrl,
  emptyRelacionamento,
  type ArtistaFormRelacionamento,
  type ArtistaFormResponsavel,
  type FormToArtistaInput,
  type UrlValidationState,
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

const DISTRIBUIDORAS_OPTIONS = [
  { id: "onerpm",    label: "ONErpm" },
  { id: "distrokid", label: "DistroKid" },
  { id: "30por1",    label: "30 Por 1" },
  { id: "symphonic", label: "Symphonic" },
  { id: "somvibe",   label: "Somvibe" },
  { id: "soundon",   label: "SoundOn" },
  { id: "musicpro",  label: "MusicPro" },
  { id: "outro",     label: "Outro" },
];

const FASES_CARREIRA = [
  { value: "iniciante",    label: "Iniciante" },
  { value: "em_ascensao",  label: "Em Ascensão" },
  { value: "consolidado",  label: "Consolidado" },
  { value: "mainstream",   label: "Mainstream" },
];

const TIPOS_RELACIONAMENTO = [
  { tipo: "empresario" as const, label: "Empresários",              hasDistribuidoras: true,  hasEscritorio: false, hasCRC: false, hasResponsaveis: false },
  { tipo: "gravadora"  as const, label: "Gravadoras",               hasDistribuidoras: true,  hasEscritorio: false, hasCRC: false, hasResponsaveis: true  },
  { tipo: "editora"    as const, label: "Editoras",                 hasDistribuidoras: true,  hasEscritorio: false, hasCRC: false, hasResponsaveis: true  },
  { tipo: "booker"     as const, label: "Bookers",                  hasDistribuidoras: false, hasEscritorio: false, hasCRC: false, hasResponsaveis: false },
  { tipo: "juridico"   as const, label: "Jurídico",                 hasDistribuidoras: false, hasEscritorio: true,  hasCRC: false, hasResponsaveis: false },
  { tipo: "financeiro" as const, label: "Financeiro",               hasDistribuidoras: false, hasEscritorio: false, hasCRC: false, hasResponsaveis: false },
  { tipo: "contador"   as const, label: "Contador",                 hasDistribuidoras: false, hasEscritorio: false, hasCRC: true,  hasResponsaveis: false },
  { tipo: "assessoria" as const, label: "Assessoria de Imprensa",   hasDistribuidoras: false, hasEscritorio: false, hasCRC: false, hasResponsaveis: false },
];

const ESPECIALIDADES = Object.entries(ESPECIALIDADES_LABELS).map(([value, label]) => ({ value, label }));

// ─── Form value type ──────────────────────────────────────────────

interface ArtistaFormValues {
  nomeArtistico: string;
  slugArtistico: string;
  tagsMusicais: string[];
  faseCarreira: string;
  generoMusical: string;
  tipoArtista: string;
  statusArtista: string;
  especialidades: string[];
  biografia: string;
  notasInternas: string;
  nome: string;
  dataNascimento: string;
  cpfCnpj: string;
  rg: string;
  genero: string;
  endereco: string;
  telefone: string;
  email: string;
  banco: string;
  agencia: string;
  conta: string;
  chavePix: string;
  titularConta: string;
  spotify: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  soundcloud: string;
  deezer: string;
  appleMusic: string;
  relacionamentos: ArtistaFormRelacionamento[];
  contratoId: string;
}

const DEFAULT_VALUES: ArtistaFormValues = {
  nomeArtistico: "",
  slugArtistico: "",
  tagsMusicais: [],
  faseCarreira: "",
  generoMusical: "",
  tipoArtista: "artista_solo",
  statusArtista: "contratado",
  especialidades: [],
  biografia: "",
  notasInternas: "",
  nome: "",
  dataNascimento: "",
  cpfCnpj: "",
  rg: "",
  genero: "",
  endereco: "",
  telefone: "",
  email: "",
  banco: "",
  agencia: "",
  conta: "",
  chavePix: "",
  titularConta: "",
  spotify: "",
  instagram: "",
  youtube: "",
  tiktok: "",
  soundcloud: "",
  deezer: "",
  appleMusic: "",
  relacionamentos: [],
  contratoId: "",
};

// ─── Helper: URL validation icon ─────────────────────────────────

function UrlIcon({ state }: { state: UrlValidationState }) {
  if (state === "valid")   return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (state === "invalid") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  return null;
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
  const { clientes, addCliente } = useClientes();
  const { contratos } = useContratos();

  // ── Non-form state ──────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [imagemArtista, setImagemArtista] = useState<UploadedFile[]>([]);
  const [documentosPessoais, setDocumentosPessoais] = useState<UploadedFile[]>([]);
  const [presskit, setPresskit]           = useState<UploadedFile[]>([]);
  const [tagInput, setTagInput]           = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Perfil 360 pass-through (no UI in this form — preserved as-is)
  const [bannerUrl, setBannerUrl]           = useState("");
  const [galeriaUrls, setGaleriaUrls]       = useState<string[]>([]);
  const [videoApresentacaoUrl, setVideoApresentacaoUrl] = useState("");
  const [managerNome, setManagerNome]       = useState("");
  const [managerContato, setManagerContato] = useState("");
  const [produtorExecutivo, setProdutorExecutivo] = useState("");
  const [agenciaBooking, setAgenciaBooking] = useState("");
  const [labelParceira, setLabelParceira]   = useState("");
  const [documentosList, setDocumentosList] = useState<{ nome: string; url: string }[]>([]);

  // ── react-hook-form ─────────────────────────────────────────────
  const form = useForm<ArtistaFormValues>({ defaultValues: DEFAULT_VALUES });
  const { register, control, watch: wf, setValue, reset, handleSubmit: rhfSubmit } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "relacionamentos",
  });

  // ── Reactive watches ────────────────────────────────────────────
  const nomeArtisticoVal = wf("nomeArtistico");
  const especialidadesVal = wf("especialidades");
  const tagsMusicaisVal   = wf("tagsMusicais");
  const spotifyVal        = wf("spotify");
  const instagramVal      = wf("instagram");
  const youtubeVal        = wf("youtube");
  const tiktokVal         = wf("tiktok");
  const soundcloudVal     = wf("soundcloud");
  const deezerVal         = wf("deezer");
  const appleMusicVal     = wf("appleMusic");

  // ── Slug auto-generation ────────────────────────────────────────
  useEffect(() => {
    if (!slugManuallyEdited && nomeArtisticoVal) {
      setValue("slugArtistico", gerarSlugArtistico(nomeArtisticoVal));
    }
  }, [nomeArtisticoVal, slugManuallyEdited]);

  // ── Load artista data on open ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const f = artistaToFormFields(artista ?? null);

    reset({
      nomeArtistico: f.nomeArtistico,
      slugArtistico: f.slugArtistico,
      tagsMusicais:  f.tagsMusicais,
      faseCarreira:  f.faseCarreira,
      generoMusical: f.generoMusical,
      tipoArtista:   f.tipoArtista,
      statusArtista: f.statusArtista,
      especialidades: f.especialidades,
      biografia:     f.biografia,
      notasInternas: f.notasInternas,
      nome:          f.nome,
      dataNascimento: f.dataNascimento,
      cpfCnpj:       f.cpfCnpj,
      rg:            f.rg,
      genero:        typeof artista?.genero === "string" ? artista.genero : "",
      endereco:      f.endereco,
      telefone:      f.telefone,
      email:         f.email,
      banco:         f.banco,
      agencia:       f.agencia,
      conta:         f.conta,
      chavePix:      f.chavePix,
      titularConta:  f.titularConta,
      spotify:       f.spotify,
      instagram:     f.instagram,
      youtube:       f.youtube,
      tiktok:        f.tiktok,
      soundcloud:    f.soundcloud,
      deezer:        f.deezer,
      appleMusic:    f.appleMusic,
      relacionamentos: f.relacionamentos,
      contratoId:    f.contratoId,
    });

    setSlugManuallyEdited(!!f.slugArtistico);
    setTagInput("");

    // File uploads
    setImagemArtista(
      f.fotoUrl ? [{ url: f.fotoUrl, name: "foto", size: 0, type: "image/*", path: "" }] : []
    );
    setDocumentosPessoais(
      f.documentosPessoaisUrl
        ? [{ name: "documento.pdf", size: 0, type: "application/pdf", path: f.documentosPessoaisUrl, url: f.documentosPessoaisUrl }]
        : []
    );
    setPresskit(
      f.presskitUrl
        ? [{ name: "presskit.pdf", size: 0, type: "application/pdf", path: f.presskitUrl, url: f.presskitUrl }]
        : []
    );

    // Perfil 360 pass-through
    setBannerUrl(typeof artista?.banner_url === "string" ? artista.banner_url : "");
    setGaleriaUrls(Array.isArray(artista?.galeria_urls) ? (artista.galeria_urls as string[]) : []);
    setVideoApresentacaoUrl(typeof artista?.video_apresentacao_url === "string" ? artista.video_apresentacao_url : "");
    setManagerNome(typeof artista?.manager_nome === "string" ? artista.manager_nome : "");
    setManagerContato(typeof artista?.manager_contato === "string" ? artista.manager_contato : "");
    setProdutorExecutivo(typeof artista?.produtor_executivo === "string" ? artista.produtor_executivo : "");
    setAgenciaBooking(typeof artista?.agencia_booking === "string" ? artista.agencia_booking : "");
    setLabelParceira(typeof artista?.label_parceira === "string" ? artista.label_parceira : "");
    setDocumentosList(Array.isArray(artista?.documentos) ? (artista.documentos as { nome: string; url: string }[]) : []);
  }, [open, artista]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(DEFAULT_VALUES);
      setSlugManuallyEdited(false);
    }
    onOpenChange(nextOpen);
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || tagsMusicaisVal.includes(t)) return;
    setValue("tagsMusicais", [...tagsMusicaisVal, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setValue("tagsMusicais", tagsMusicaisVal.filter((t) => t !== tag));

  const toggleEspecialidade = (value: string, checked: boolean) => {
    const current = wf("especialidades");
    setValue(
      "especialidades",
      checked ? [...current, value] : current.filter((x) => x !== value)
    );
  };

  // Distribuidoras helpers (direct setValue on the array item)
  const getRelDist = (relIdx: number): ArtistaDistribuidoraEntry[] =>
    (wf(`relacionamentos.${relIdx}.distribuidoras`) as ArtistaDistribuidoraEntry[] | undefined) ?? [];

  const addDistribuidora = (relIdx: number, distId: string) => {
    const current = getRelDist(relIdx);
    if (current.find((d) => d.id === distId)) return;
    setValue(`relacionamentos.${relIdx}.distribuidoras`, [...current, { id: distId, email: "", nomeCustom: distId === "outro" ? "" : undefined }]);
  };

  const removeDistribuidora = (relIdx: number, distIdx: number) => {
    setValue(
      `relacionamentos.${relIdx}.distribuidoras`,
      getRelDist(relIdx).filter((_, i) => i !== distIdx)
    );
  };

  const updateDistribuidoraEmail = (relIdx: number, distIdx: number, email: string) => {
    const updated = [...getRelDist(relIdx)];
    updated[distIdx] = { ...updated[distIdx], email };
    setValue(`relacionamentos.${relIdx}.distribuidoras`, updated);
  };

  const updateDistribuidoraNomeCustom = (relIdx: number, distIdx: number, nomeCustom: string) => {
    const updated = [...getRelDist(relIdx)];
    updated[distIdx] = { ...updated[distIdx], nomeCustom };
    setValue(`relacionamentos.${relIdx}.distribuidoras`, updated);
  };

  // Responsáveis helpers (for gravadoras and editoras)
  const getRelResp = (relIdx: number): ArtistaFormResponsavel[] =>
    (wf(`relacionamentos.${relIdx}.responsaveis`) as ArtistaFormResponsavel[] | undefined) ?? [];

  const addResponsavel = (relIdx: number) => {
    setValue(`relacionamentos.${relIdx}.responsaveis`, [...getRelResp(relIdx), { nome: "", telefone: "", email: "" }]);
  };

  const removeResponsavel = (relIdx: number, respIdx: number) => {
    setValue(
      `relacionamentos.${relIdx}.responsaveis`,
      getRelResp(relIdx).filter((_, i) => i !== respIdx)
    );
  };

  const updateResponsavel = (relIdx: number, respIdx: number, field: keyof ArtistaFormResponsavel, value: string) => {
    const updated = [...getRelResp(relIdx)];
    updated[respIdx] = { ...updated[respIdx], [field]: value };
    setValue(`relacionamentos.${relIdx}.responsaveis`, updated);
  };

  // ── Submit ──────────────────────────────────────────────────────
  const onSubmit = async (values: ArtistaFormValues) => {
    if (!values.nomeArtistico.trim()) { toast.error("Nome artístico é obrigatório"); return; }
    if (!values.nome.trim())          { toast.error("Nome completo é obrigatório");  return; }

    setIsSubmitting(true);
    try {
      // Compute legacy fields from relacionamentos for backward compat
      const firstEmp  = values.relacionamentos.find((r) => r.tipo === "empresario");
      const firstGrav = values.relacionamentos.find((r) => r.tipo === "gravadora");
      const firstEdit = values.relacionamentos.find((r) => r.tipo === "editora");
      const tipoPerfil = firstEmp  ? "com_empresario" as const
        : firstGrav ? "gravadora"    as const
        : firstEdit ? "editora"      as const
        : "independente" as const;

      const formInput: FormToArtistaInput = {
        nomeArtistico:   values.nomeArtistico,
        slugArtistico:   values.slugArtistico,
        tagsMusicais:    values.tagsMusicais,
        faseCarreira:    values.faseCarreira,
        generoMusical:   values.generoMusical,
        tipoArtista:     values.tipoArtista,
        statusArtista:   values.statusArtista,
        especialidades:  values.especialidades,
        biografia:       values.biografia,
        notasInternas:   values.notasInternas,
        nome:            values.nome,
        dataNascimento:  values.dataNascimento,
        cpfCnpj:         values.cpfCnpj,
        rg:              values.rg,
        endereco:        values.endereco,
        telefone:        values.telefone,
        email:           values.email,
        banco:           values.banco,
        agencia:         values.agencia,
        conta:           values.conta,
        chavePix:        values.chavePix,
        titularConta:    values.titularConta,
        spotify:         values.spotify,
        spotifyOuvintes: "",
        instagram:       values.instagram,
        instagramSeguidores: "",
        youtube:         values.youtube,
        youtubeInscritos: "",
        tiktok:          values.tiktok,
        tiktokSeguidores: "",
        soundcloud:      values.soundcloud,
        soundcloudSeguidores: "",
        deezer:          values.deezer,
        deezerFas:       "",
        appleMusic:      values.appleMusic,
        appleMusicAlbuns: "",
        relacionamentos: values.relacionamentos,
        tipoPerfil,
        empresarioId:    "",
        empresarioNome:  firstEmp?.nome ?? "",
        empresarioTelefone: firstEmp?.telefone ?? "",
        empresarioEmail: firstEmp?.email ?? "",
        gravadoraId:     "",
        gravadoraNome:   (firstGrav ?? firstEdit)?.nome ?? "",
        gravadoraTelefone: (firstGrav ?? firstEdit)?.telefone ?? "",
        gravadoraEmail:  (firstGrav ?? firstEdit)?.email ?? "",
        gravadoraResponsavelId: "",
        gravadoraResponsavelNome: "",
        gravadoraResponsavelTelefone: "",
        gravadoraResponsavelEmail: "",
        distribuidorasSelecionadas: {},
        distribuidorasEmails: {},
        distribuidorasEmpresaSelecionadas: {},
        distribuidorasEmpresaEmails: {},
        fotoUrl:             imagemArtista[0]?.url ?? "",
        documentosPessoaisUrl: documentosPessoais[0]?.url ?? "",
        presskitUrl:         presskit[0]?.url ?? "",
        contratoId:          values.contratoId,
      };

      const payload = formToArtistaPayload(formInput);
      const extraFields = {
        genero:               values.genero || null,
        banner_url:           bannerUrl.trim() || null,
        galeria_urls:         galeriaUrls.length > 0 ? galeriaUrls : null,
        video_apresentacao_url: videoApresentacaoUrl.trim() || null,
        manager_nome:         managerNome.trim() || null,
        manager_contato:      managerContato.trim() || null,
        produtor_executivo:   produtorExecutivo.trim() || null,
        agencia_booking:      agenciaBooking.trim() || null,
        label_parceira:       labelParceira.trim() || null,
        documentos:           documentosList.length > 0 ? documentosList : null,
      };

      if (isEditing) {
        await updateArtista.mutateAsync({ id: artista.id, ...payload, ...extraFields });
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
          ...payload,
          ...extraFields,
          contrato_id: values.contratoId || null,
        });
      }
      handleClose(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Computed validation states ──────────────────────────────────
  const urlStates = {
    spotify:    validateSpotifyUrl(spotifyVal),
    instagram:  validateInstagramUrl(instagramVal),
    youtube:    validateYoutubeUrl(youtubeVal),
    tiktok:     validateTiktokUrl(tiktokVal),
    soundcloud: validateSoundcloudUrl(soundcloudVal),
    deezer:     validateDeezerUrl(deezerVal),
    appleMusic: validateAppleMusicUrl(appleMusicVal),
  };

  const contratosDisponiveis = contratos.filter(
    (c: any) => (c.status === "ativo" || c.status === "vencendo") && !c.artista_id
  );

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

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
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
                  <Label>Gênero Musical <span className="text-destructive">*</span></Label>
                  <Controller
                    control={control}
                    name="generoMusical"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slug Artístico</Label>
                  <Input
                    {...register("slugArtistico")}
                    placeholder="nome-do-artista"
                    onChange={(e) => {
                      register("slugArtistico").onChange(e);
                      setSlugManuallyEdited(true);
                    }}
                    data-testid="input-slug-artistico"
                  />
                  <p className="text-xs text-muted-foreground">Gerado automaticamente. Editável.</p>
                </div>
                <div className="space-y-2">
                  <Label>Fase da Carreira</Label>
                  <Controller
                    control={control}
                    name="faseCarreira"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-fase-carreira">
                          <SelectValue placeholder="Selecione a fase" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {FASES_CARREIRA.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags Musicais</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-background">
                  {tagsMusicaisVal.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                    placeholder={tagsMusicaisVal.length === 0 ? "Digite uma tag e pressione Enter…" : ""}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    data-testid="input-tags-musicais"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Separe com Enter ou vírgula. Ex: trap, autoral, baile.</p>
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
                  onChange={setDocumentosPessoais}
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
                        value={field.value}
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
                  <Label>CPF / CNPJ</Label>
                  <Input
                    {...register("cpfCnpj")}
                    placeholder="000.000.000-00"
                    data-testid="input-cpf-cnpj"
                  />
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                  <Input
                    {...register("endereco")}
                    placeholder="Rua, número, bairro, cidade, CEP"
                    data-testid="input-endereco"
                  />
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
                      <Select value={field.value} onValueChange={field.onChange}>
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

            {/* ═══ 4. Perfis e Redes Sociais ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">4.</span>
                <h3 className="text-lg font-semibold">Perfis e Redes Sociais</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Spotify</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("spotify")}
                      placeholder="https://open.spotify.com/artist/…"
                      data-testid="input-spotify-url"
                    />
                    <UrlIcon state={urlStates.spotify} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("instagram")}
                      placeholder="https://instagram.com/perfil"
                      data-testid="input-instagram-url"
                    />
                    <UrlIcon state={urlStates.instagram} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>YouTube</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("youtube")}
                      placeholder="https://youtube.com/channel/UC…"
                      data-testid="input-youtube-url"
                    />
                    <UrlIcon state={urlStates.youtube} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>TikTok</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("tiktok")}
                      placeholder="https://tiktok.com/@perfil"
                      data-testid="input-tiktok-url"
                    />
                    <UrlIcon state={urlStates.tiktok} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SoundCloud</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("soundcloud")}
                      placeholder="https://soundcloud.com/perfil"
                      data-testid="input-soundcloud-url"
                    />
                    <UrlIcon state={urlStates.soundcloud} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Deezer</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("deezer")}
                      placeholder="https://deezer.com/artist/…"
                      data-testid="input-deezer-url"
                    />
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
              <p className="text-sm text-muted-foreground">
                Adicione múltiplos relacionamentos por categoria. Cada artista pode ter
                vários empresários, gravadoras, editoras e equipa simultaneamente.
              </p>

              {TIPOS_RELACIONAMENTO.map(({ tipo, label, hasDistribuidoras, hasEscritorio, hasCRC, hasResponsaveis }) => {
                const tipoFields = fields
                  .map((field, idx) => ({ field, idx }))
                  .filter(({ field }) => (field as ArtistaFormRelacionamento).tipo === tipo);

                return (
                  <div key={tipo} className="space-y-2">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm font-medium">{label}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => append(emptyRelacionamento(tipo))}
                        data-testid={`button-add-${tipo}`}
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar
                      </Button>
                    </div>

                    {tipoFields.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                        Nenhum(a) {label.toLowerCase()} cadastrado(a).
                      </p>
                    )}

                    {tipoFields.map(({ idx }, position) => (
                      <div
                        key={`${tipo}-${idx}`}
                        className="p-3 border rounded-lg space-y-3 bg-muted/20"
                        data-testid={`card-relacionamento-${tipo}-${position}`}
                      >
                        {/* Card header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">
                            {label.replace(/s$/, "")} {position + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(idx)}
                            data-testid={`button-remove-relacionamento-${idx}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Nome + Telefone */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nome</Label>
                            <Input
                              {...register(`relacionamentos.${idx}.nome`)}
                              placeholder="Nome completo"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Telefone</Label>
                            <Input
                              {...register(`relacionamentos.${idx}.telefone`)}
                              placeholder="(00) 00000-0000"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Email + optional field */}
                        <div className={hasEscritorio || hasCRC ? "grid grid-cols-2 gap-3" : ""}>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Email</Label>
                            <Input
                              {...register(`relacionamentos.${idx}.email`)}
                              type="email"
                              placeholder="email@exemplo.com"
                              className="h-8 text-sm"
                            />
                          </div>
                          {hasEscritorio && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Escritório / Firma</Label>
                              <Input
                                {...register(`relacionamentos.${idx}.escritorio`)}
                                placeholder="Nome do escritório"
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                          {hasCRC && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">CRC</Label>
                              <Input
                                {...register(`relacionamentos.${idx}.crc`)}
                                placeholder="CRC 000000/0-0"
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        {/* Distribuidoras sub-section */}
                        {hasResponsaveis && (() => {
                          const resps = getRelResp(idx);
                          return (
                            <div className="space-y-2 pt-2 border-t border-border/40">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">Responsáveis</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs gap-1 px-2"
                                  onClick={() => addResponsavel(idx)}
                                >
                                  <Plus className="h-3 w-3" />
                                  Adicionar Responsável
                                </Button>
                              </div>
                              {resps.length === 0 && (
                                <p className="text-xs text-muted-foreground">Nenhum responsável cadastrado.</p>
                              )}
                              {resps.map((rv, ri) => (
                                <div key={ri} className="p-2 border rounded space-y-2 bg-muted/10">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Responsável {ri + 1}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeResponsavel(idx, ri)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Nome</Label>
                                      <Input
                                        value={rv.nome}
                                        onChange={(e) => updateResponsavel(idx, ri, "nome", e.target.value)}
                                        placeholder="Nome completo"
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Telefone</Label>
                                      <Input
                                        value={rv.telefone}
                                        onChange={(e) => updateResponsavel(idx, ri, "telefone", e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Email</Label>
                                    <Input
                                      type="email"
                                      value={rv.email}
                                      onChange={(e) => updateResponsavel(idx, ri, "email", e.target.value)}
                                      placeholder="email@exemplo.com"
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {hasDistribuidoras && (() => {
                          const dists = getRelDist(idx);
                          const available = DISTRIBUIDORAS_OPTIONS.filter(
                            (o) => !dists.find((d) => d.id === o.id)
                          );
                          return (
                            <div className="space-y-2 pt-2 border-t border-border/40">
                              <Label className="text-xs text-muted-foreground">Distribuidoras</Label>

                              {dists.map((d, di) => (
                                <div key={di} className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium min-w-[80px] shrink-0">
                                      {DISTRIBUIDORAS_OPTIONS.find((o) => o.id === d.id)?.label ?? d.id}
                                    </span>
                                    <Input
                                      value={d.email}
                                      onChange={(e) => updateDistribuidoraEmail(idx, di, e.target.value)}
                                      placeholder="email@distribuidora.com"
                                      type="email"
                                      className="h-7 text-xs"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 shrink-0"
                                      onClick={() => removeDistribuidora(idx, di)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {d.id === "outro" && (
                                    <div className="ml-[88px]">
                                      <Input
                                        value={d.nomeCustom ?? ""}
                                        onChange={(e) => updateDistribuidoraNomeCustom(idx, di, e.target.value)}
                                        placeholder="Nome da distribuidora personalizada"
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}

                              {available.length > 0 && (
                                <Select onValueChange={(val) => addDistribuidora(idx, val)}>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Adicionar distribuidora…" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border border-border z-50">
                                    {available.map((o) => (
                                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* ═══ 6. Observações e Contrato ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">6.</span>
                <h3 className="text-lg font-semibold">Observações e Contrato</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Contrato Vinculado</Label>
                <Controller
                  control={control}
                  name="contratoId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-contrato">
                        <SelectValue placeholder="Selecione um contrato ativo (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="">Nenhum</SelectItem>
                        {contratosDisponiveis.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.numero_contrato || c.id} — {c.tipo || "Contrato"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Contratos activos sem artista vinculado. Para desvincular, selecione "Nenhum".
                </p>
              </div>

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
