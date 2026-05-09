import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Loader2, Save, CheckCircle2, XCircle } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/shared/components/FileUpload";
import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { toast } from "sonner";
import {
  artistaToFormFields,
  formToArtistaPayload,
  ESPECIALIDADES_LABELS,
  validateSpotifyUrl,
  validateYoutubeUrl,
  validateInstagramUrl,
  validateTiktokUrl,
  validateSoundcloudUrl,
  validateDeezerUrl,
  validateAppleMusicUrl,
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

const TIPO_PERFIL_OPTIONS = [
  { value: "independente",    label: "Independente" },
  { value: "com_empresario",  label: "Com empresário" },
  { value: "gravadora",       label: "Gravadora" },
];

const ESPECIALIDADES = Object.entries(ESPECIALIDADES_LABELS).map(([value, label]) => ({ value, label }));

// ─── Form value type ──────────────────────────────────────────────

interface ArtistaFormValues {
  nomeArtistico: string;
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
  tipoPerfil: string;
}

const DEFAULT_VALUES: ArtistaFormValues = {
  nomeArtistico: "",
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
  tipoPerfil: "independente",
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
  const { addCliente } = useClientes();

  // ── Non-form state ──────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [imagemArtista, setImagemArtista] = useState<UploadedFile[]>([]);
  const [documentosPessoais, setDocumentosPessoais] = useState<UploadedFile[]>([]);
  const [presskit, setPresskit]           = useState<UploadedFile[]>([]);

  // Perfil 360 pass-through (no UI in this form — preserved as-is)
  const [bannerUrl, setBannerUrl]                   = useState("");
  const [galeriaUrls, setGaleriaUrls]               = useState<string[]>([]);
  const [videoApresentacaoUrl, setVideoApresentacaoUrl] = useState("");
  const [managerNome, setManagerNome]               = useState("");
  const [managerContato, setManagerContato]         = useState("");
  const [produtorExecutivo, setProdutorExecutivo]   = useState("");
  const [agenciaBooking, setAgenciaBooking]         = useState("");
  const [labelParceira, setLabelParceira]           = useState("");
  const [documentosList, setDocumentosList]         = useState<{ nome: string; url: string }[]>([]);

  // Preserved data: platform metrics + legacy IDs (no form UI — must round-trip unchanged)
  const [preservedData, setPreservedData] = useState<{
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
    relacionamentos: any[];
    slugArtistico: string;
    tagsMusicais: string[];
    faseCarreira: string;
    contratoId: string;
  }>({
    spotifyOuvintes: "", instagramSeguidores: "", youtubeInscritos: "",
    tiktokSeguidores: "", soundcloudSeguidores: "", deezerFas: "", appleMusicAlbuns: "",
    empresarioId: "", empresarioNome: "", empresarioTelefone: "", empresarioEmail: "",
    gravadoraId: "", gravadoraNome: "", gravadoraTelefone: "", gravadoraEmail: "",
    gravadoraResponsavelId: "", gravadoraResponsavelNome: "", gravadoraResponsavelTelefone: "", gravadoraResponsavelEmail: "",
    distribuidorasSelecionadas: {}, distribuidorasEmails: {},
    distribuidorasEmpresaSelecionadas: {}, distribuidorasEmpresaEmails: {},
    relacionamentos: [], slugArtistico: "", tagsMusicais: [], faseCarreira: "", contratoId: "",
  });

  // ── react-hook-form ─────────────────────────────────────────────
  const form = useForm<ArtistaFormValues>({ defaultValues: DEFAULT_VALUES });
  const { register, control, watch: wf, setValue, reset, handleSubmit: rhfSubmit } = form;

  // ── Reactive watches ────────────────────────────────────────────
  const especialidadesVal = wf("especialidades");
  const spotifyVal        = wf("spotify");
  const instagramVal      = wf("instagram");
  const youtubeVal        = wf("youtube");
  const tiktokVal         = wf("tiktok");
  const soundcloudVal     = wf("soundcloud");
  const deezerVal         = wf("deezer");
  const appleMusicVal     = wf("appleMusic");

  // ── Load artista data on open ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const f = artistaToFormFields(artista ?? null);

    reset({
      nomeArtistico: f.nomeArtistico,
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
      tipoPerfil:    f.tipoPerfil || "independente",
    });

    // Load preserved data (no UI — must be round-tripped unchanged)
    setPreservedData({
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
      relacionamentos: f.relacionamentos,
      slugArtistico: f.slugArtistico,
      tagsMusicais: f.tagsMusicais,
      faseCarreira: f.faseCarreira,
      contratoId: f.contratoId,
    });

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
    if (!nextOpen) reset(DEFAULT_VALUES);
    onOpenChange(nextOpen);
  };

  const toggleEspecialidade = (value: string, checked: boolean) => {
    const current = wf("especialidades");
    setValue(
      "especialidades",
      checked ? [...current, value] : current.filter((x) => x !== value)
    );
  };

  // ── Submit ──────────────────────────────────────────────────────
  const onSubmit = async (values: ArtistaFormValues) => {
    if (!values.nomeArtistico.trim()) { toast.error("Nome artístico é obrigatório"); return; }
    if (!values.nome.trim())          { toast.error("Nome completo é obrigatório");  return; }

    setIsSubmitting(true);
    try {
      const formInput: FormToArtistaInput = {
        nomeArtistico:   values.nomeArtistico,
        slugArtistico:   preservedData.slugArtistico,
        tagsMusicais:    preservedData.tagsMusicais,
        faseCarreira:    preservedData.faseCarreira,
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
        spotifyOuvintes: preservedData.spotifyOuvintes,
        instagram:       values.instagram,
        instagramSeguidores: preservedData.instagramSeguidores,
        youtube:         values.youtube,
        youtubeInscritos: preservedData.youtubeInscritos,
        tiktok:          values.tiktok,
        tiktokSeguidores: preservedData.tiktokSeguidores,
        soundcloud:      values.soundcloud,
        soundcloudSeguidores: preservedData.soundcloudSeguidores,
        deezer:          values.deezer,
        deezerFas:       preservedData.deezerFas,
        appleMusic:      values.appleMusic,
        appleMusicAlbuns: preservedData.appleMusicAlbuns,
        relacionamentos: preservedData.relacionamentos,
        tipoPerfil:      values.tipoPerfil as FormToArtistaInput["tipoPerfil"],
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
        fotoUrl:             imagemArtista[0]?.url ?? "",
        documentosPessoaisUrl: documentosPessoais[0]?.url ?? "",
        presskitUrl:         presskit[0]?.url ?? "",
        contratoId:          preservedData.contratoId,
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
        await updateArtista.mutateAsync({ id: artista.id, ...payload, ...extraFields, contrato_id: preservedData.contratoId || null });
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
        await addArtista.mutateAsync({ ...payload, ...extraFields });
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
                  <Label>Tipo de Artista</Label>
                  <Controller
                    control={control}
                    name="tipoArtista"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-tipo-artista">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="artista_solo">Artista Solo</SelectItem>
                          <SelectItem value="banda">Banda</SelectItem>
                          <SelectItem value="dupla">Dupla</SelectItem>
                          <SelectItem value="grupo">Grupo</SelectItem>
                          <SelectItem value="coletivo">Coletivo</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Controller
                    control={control}
                    name="statusArtista"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-status-artista">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="contratado">Contratado</SelectItem>
                          <SelectItem value="negociacao">Em Negociação</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="suspenso">Suspenso</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
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
                  <Label>CPF</Label>
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

            {/* ═══ 5. Relacionamento Comercial ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">5.</span>
                <h3 className="text-lg font-semibold">Relacionamento Comercial</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Perfil Comercial <span className="text-destructive">*</span></Label>
                <Controller
                  control={control}
                  name="tipoPerfil"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-tipo-perfil">
                        <SelectValue placeholder="Selecione o perfil comercial" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {TIPO_PERFIL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Define a estrutura comercial do artista: independente, com representação empresarial ou vinculado a gravadora.
                </p>
              </div>
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
