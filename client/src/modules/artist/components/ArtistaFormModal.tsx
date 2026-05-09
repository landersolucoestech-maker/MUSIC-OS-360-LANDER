import { useState, useEffect, useRef } from "react";
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
import { Loader2, Save, Plus, X, CheckCircle2, XCircle } from "lucide-react";
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
  { value: "independente",   label: "Independente" },
  { value: "com_empresario", label: "Com empresário" },
  { value: "gravadora",      label: "Gravadora" },
];

const CATEGORIAS_EQUIPE = [
  { value: "booker",          label: "Booker" },
  { value: "assessoria",      label: "Assessoria de Imprensa" },
  { value: "juridico",        label: "Jurídico" },
  { value: "financeiro",      label: "Financeiro" },
  { value: "contador",        label: "Contador" },
  { value: "editora_musical", label: "Editora Musical" },
  { value: "roadie",          label: "Roadie" },
];

const CATEGORIAS_GRAVADORA_EXTRA = [
  { value: "gestor",     label: "Gestor" },
  { value: "empresario", label: "Empresário" },
];

const DISTRIBUIDORAS_OPTIONS = [
  { id: "onerpm",    label: "ONErpm" },
  { id: "distrokid", label: "DistroKid" },
  { id: "30por1",    label: "30 Por 1" },
  { id: "symphonic", label: "Symphonic" },
  { id: "musicpro",  label: "MusicPro" },
  { id: "somvibe",   label: "Somvibe" },
  { id: "outros",    label: "Outros" },
];

const ESPECIALIDADES = Object.entries(ESPECIALIDADES_LABELS).map(([value, label]) => ({ value, label }));

// ─── Types ────────────────────────────────────────────────────────

interface DistribuidoraEntry {
  id: string;
  email: string;
  nomeCustom?: string;
}

interface ContatoEquipe {
  nome: string;
  categoria: string;
  telefone: string;
  email: string;
  distribuidoras: DistribuidoraEntry[];
}

interface ArtistaFormValues {
  nomeArtistico: string;
  generoMusical: string;
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
  distribuidorasGerais: DistribuidoraEntry[];
  tipoPerfil: string;
  contatosEquipe: ContatoEquipe[];
}

const EMPTY_CONTATO: ContatoEquipe = {
  nome: "", categoria: "", telefone: "", email: "", distribuidoras: [],
};

const DEFAULT_VALUES: ArtistaFormValues = {
  nomeArtistico: "",
  generoMusical: "",
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
  distribuidorasGerais: [],
  tipoPerfil: "independente",
  contatosEquipe: [],
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Non-form state ──────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [imagemArtista, setImagemArtista] = useState<UploadedFile[]>([]);
  const [documentosPessoais, setDocumentosPessoais] = useState<UploadedFile[]>([]);
  const [presskit, setPresskit]           = useState<UploadedFile[]>([]);

  // Perfil 360 pass-through
  const [bannerUrl, setBannerUrl]                   = useState("");
  const [galeriaUrls, setGaleriaUrls]               = useState<string[]>([]);
  const [videoApresentacaoUrl, setVideoApresentacaoUrl] = useState("");
  const [managerNome, setManagerNome]               = useState("");
  const [managerContato, setManagerContato]         = useState("");
  const [produtorExecutivo, setProdutorExecutivo]   = useState("");
  const [agenciaBooking, setAgenciaBooking]         = useState("");
  const [labelParceira, setLabelParceira]           = useState("");
  const [documentosList, setDocumentosList]         = useState<{ nome: string; url: string }[]>([]);

  // Preserved: platform metrics + legacy IDs + removed UI fields (round-tripped unchanged)
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
    relacionamentos: unknown[];
    slugArtistico: string;
    tagsMusicais: string[];
    faseCarreira: string;
    contratoId: string;
  }>({
    tipoArtista: "artista_solo", statusArtista: "contratado",
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

  const { fields: contatoFields, append: appendContato, remove: removeContato } = useFieldArray({
    control,
    name: "contatosEquipe",
  });

  // ── Reactive watches ────────────────────────────────────────────
  const especialidadesVal = wf("especialidades");
  const tipoPerfilVal     = wf("tipoPerfil");

  // Auto-adicionar um card vazio quando o modal abre ou quando o perfil muda e a lista está vazia
  useEffect(() => {
    if (!open) return;
    const PERFIS_COM_EQUIPA = ["independente", "com_empresario", "gravadora"];
    if (PERFIS_COM_EQUIPA.includes(tipoPerfilVal) && contatoFields.length === 0) {
      appendContato({ ...EMPTY_CONTATO });
    }
  }, [tipoPerfilVal, open]);
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

    const rawContatos = (artista as Artista & { contatos_equipe?: unknown })?.contatos_equipe;
    const contatosEquipe: ContatoEquipe[] = Array.isArray(rawContatos)
      ? (rawContatos as ContatoEquipe[])
      : [];

    // Se não houver contactos, iniciar já com um card vazio (dentro do reset para evitar scroll automático)
    const initialContatos = contatosEquipe.length > 0 ? contatosEquipe : [{ ...EMPTY_CONTATO }];

    reset({
      nomeArtistico: f.nomeArtistico,
      generoMusical: f.generoMusical,
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
      distribuidorasGerais: [],
      tipoPerfil:    f.tipoPerfil || "independente",
      contatosEquipe: initialContatos,
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
      relacionamentos: f.relacionamentos as unknown[],
      slugArtistico: f.slugArtistico,
      tagsMusicais: f.tagsMusicais,
      faseCarreira: f.faseCarreira,
      contratoId: f.contratoId,
    });

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

    setBannerUrl(typeof artista?.banner_url === "string" ? artista.banner_url : "");
    setGaleriaUrls(Array.isArray(artista?.galeria_urls) ? (artista.galeria_urls as string[]) : []);
    setVideoApresentacaoUrl(typeof artista?.video_apresentacao_url === "string" ? artista.video_apresentacao_url : "");
    setManagerNome(typeof artista?.manager_nome === "string" ? artista.manager_nome : "");
    setManagerContato(typeof artista?.manager_contato === "string" ? artista.manager_contato : "");
    setProdutorExecutivo(typeof artista?.produtor_executivo === "string" ? artista.produtor_executivo : "");
    setAgenciaBooking(typeof artista?.agencia_booking === "string" ? artista.agencia_booking : "");
    setLabelParceira(typeof artista?.label_parceira === "string" ? artista.label_parceira : "");
    setDocumentosList(Array.isArray(artista?.documentos) ? (artista.documentos as { nome: string; url: string }[]) : []);

    // Repor scroll ao topo — o card já está incluído no reset() acima
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, 50);
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

  // Distribuidoras gerais (secção 5) helpers
  const getDistsGerais = (): DistribuidoraEntry[] =>
    (wf("distribuidorasGerais") as DistribuidoraEntry[] | undefined) ?? [];

  const toggleDistGeral = (distId: string, checked: boolean) => {
    const current = getDistsGerais();
    if (checked) {
      setValue("distribuidorasGerais", [
        ...current,
        { id: distId, email: "", nomeCustom: distId === "outros" ? "" : undefined },
      ]);
    } else {
      setValue("distribuidorasGerais", current.filter((d) => d.id !== distId));
    }
  };

  const updateDistEmailGeral = (distId: string, email: string) => {
    setValue(
      "distribuidorasGerais",
      getDistsGerais().map((d) => (d.id === distId ? { ...d, email } : d))
    );
  };

  const updateDistNomeCustomGeral = (nomeCustom: string) => {
    setValue(
      "distribuidorasGerais",
      getDistsGerais().map((d) => (d.id === "outros" ? { ...d, nomeCustom } : d))
    );
  };

  // Distribuidoras helpers — work with DistribuidoraEntry[]
  const getDists = (idx: number): DistribuidoraEntry[] =>
    (wf(`contatosEquipe.${idx}.distribuidoras`) as DistribuidoraEntry[] | undefined) ?? [];

  const toggleDistribuidora = (contatoIdx: number, distId: string, checked: boolean) => {
    const current = getDists(contatoIdx);
    if (checked) {
      setValue(`contatosEquipe.${contatoIdx}.distribuidoras`, [
        ...current,
        { id: distId, email: "", nomeCustom: distId === "outros" ? "" : undefined },
      ]);
    } else {
      setValue(
        `contatosEquipe.${contatoIdx}.distribuidoras`,
        current.filter((d) => d.id !== distId)
      );
    }
  };

  const updateDistEmail = (contatoIdx: number, distId: string, email: string) => {
    const updated = getDists(contatoIdx).map((d) =>
      d.id === distId ? { ...d, email } : d
    );
    setValue(`contatosEquipe.${contatoIdx}.distribuidoras`, updated);
  };

  const updateDistNomeCustom = (contatoIdx: number, nomeCustom: string) => {
    const updated = getDists(contatoIdx).map((d) =>
      d.id === "outros" ? { ...d, nomeCustom } : d
    );
    setValue(`contatosEquipe.${contatoIdx}.distribuidoras`, updated);
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
        tipoArtista:     preservedData.tipoArtista,
        statusArtista:   preservedData.statusArtista,
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
        relacionamentos: preservedData.relacionamentos as Parameters<typeof formToArtistaPayload>[0]["relacionamentos"],
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
        genero:                 values.genero || null,
        banner_url:             bannerUrl.trim() || null,
        galeria_urls:           galeriaUrls.length > 0 ? galeriaUrls : null,
        video_apresentacao_url: videoApresentacaoUrl.trim() || null,
        manager_nome:           managerNome.trim() || null,
        manager_contato:        managerContato.trim() || null,
        produtor_executivo:     produtorExecutivo.trim() || null,
        agencia_booking:        agenciaBooking.trim() || null,
        label_parceira:         labelParceira.trim() || null,
        documentos:             documentosList.length > 0 ? documentosList : null,
        contatos_equipe:        values.contatosEquipe.length > 0 ? values.contatosEquipe : null,
        distribuidoras_gerais:  values.distribuidorasGerais.length > 0 ? values.distribuidorasGerais : null,
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

  // ── URL validation states ───────────────────────────────────────
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

            {/* ═══ 5. Distribuidoras / Agregadoras ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">5.</span>
                <h3 className="text-lg font-semibold">Distribuidoras / Agregadoras</h3>
              </div>
              <Separator />

              {(() => {
                const distsGerais = getDistsGerais();
                const outrosEntryGeral = distsGerais.find((d) => d.id === "outros");
                return (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {DISTRIBUIDORAS_OPTIONS.map((dist) => {
                      const entry = distsGerais.find((d) => d.id === dist.id);
                      const isChecked = !!entry;
                      return (
                        <div key={dist.id} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`geral-dist-${dist.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => toggleDistGeral(dist.id, !!checked)}
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
                                onChange={(e) => updateDistNomeCustomGeral(e.target.value)}
                                placeholder="Nome da distribuidora…"
                                className="h-8 text-sm"
                                data-testid="input-geral-dist-nome-custom"
                              />
                              {(entry?.nomeCustom ?? "").trim().length > 0 && (
                                <Input
                                  value={entry?.email ?? ""}
                                  onChange={(e) => updateDistEmailGeral(dist.id, e.target.value)}
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
                                onChange={(e) => updateDistEmailGeral(dist.id, e.target.value)}
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
                );
              })()}

              {/* Hint para "Outros" sem nome ainda */}
              {getDistsGerais().some((d) => d.id === "outros" && !(d.nomeCustom ?? "").trim()) && (
                <p className="text-xs text-muted-foreground ml-6">
                  Preencha o nome da distribuidora para activar o email de share.
                </p>
              )}
            </div>

            {/* ═══ 6. Tipo de Perfil ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">6.</span>
                <h3 className="text-lg font-semibold">Tipo de Perfil</h3>
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
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {TIPO_PERFIL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* ── Equipa dinâmica (Independente, Com empresário e Gravadora) ── */}
              {["independente", "com_empresario", "gravadora"].includes(tipoPerfilVal) && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Equipa / Contactos</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => appendContato({ ...EMPTY_CONTATO })}
                      data-testid="button-add-contato"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </Button>
                  </div>

                  {contatoFields.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                      Nenhum contacto adicionado. Clique em "Adicionar" para incluir membros da equipa.
                    </p>
                  )}

                  {contatoFields.map((field, idx) => {
                    const categoriaVal = wf(`contatosEquipe.${idx}.categoria`);
                    const distsVal     = getDists(idx);
                    const isEditora    = categoriaVal === "editora_musical" || categoriaVal === "empresario" || categoriaVal === "gestor" || tipoPerfilVal === "com_empresario";
                    const outrosEntry  = distsVal.find((d) => d.id === "outros");

                    return (
                      <div
                        key={field.id}
                        className="p-3 border rounded-lg space-y-3 bg-muted/20"
                        data-testid={`card-contato-${idx}`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">
                            Contacto {idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeContato(idx)}
                            data-testid={`button-remove-contato-${idx}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Nome + Categoria */}
                        <div className={tipoPerfilVal === "com_empresario" ? "space-y-1.5" : "grid grid-cols-2 gap-3"}>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nome</Label>
                            <Input
                              {...register(`contatosEquipe.${idx}.nome`)}
                              placeholder="Nome completo"
                              className="h-8 text-sm"
                              data-testid={`input-contato-nome-${idx}`}
                            />
                          </div>
                          {tipoPerfilVal !== "com_empresario" && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Categoria</Label>
                              <Controller
                                control={control}
                                name={`contatosEquipe.${idx}.categoria`}
                                render={({ field: f }) => (
                                  <Select value={f.value} onValueChange={f.onChange}>
                                    <SelectTrigger className="h-8 text-sm" data-testid={`select-contato-categoria-${idx}`}>
                                      <SelectValue placeholder="Selecione…" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border border-border z-50">
                                      {CATEGORIAS_EQUIPE.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                      ))}
                                      {tipoPerfilVal === "gravadora" && CATEGORIAS_GRAVADORA_EXTRA.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          )}
                        </div>

                        {/* Telefone + Email */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Telefone</Label>
                            <Input
                              {...register(`contatosEquipe.${idx}.telefone`)}
                              placeholder="(00) 00000-0000"
                              className="h-8 text-sm"
                              data-testid={`input-contato-telefone-${idx}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Email</Label>
                            <Input
                              {...register(`contatosEquipe.${idx}.email`)}
                              type="email"
                              placeholder="email@exemplo.com"
                              className="h-8 text-sm"
                              data-testid={`input-contato-email-${idx}`}
                            />
                          </div>
                        </div>

                        {/* Distribuidoras — só quando Editora Musical */}
                        {isEditora && (
                          <div className="space-y-3 pt-2 border-t border-border/40">
                            <Label className="text-xs text-muted-foreground">Distribuidoras</Label>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                              {DISTRIBUIDORAS_OPTIONS.map((dist) => {
                                const entry = distsVal.find((d) => d.id === dist.id);
                                const isChecked = !!entry;

                                return (
                                  <div key={dist.id} className="space-y-1.5">
                                    {/* Checkbox row */}
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`dist-${idx}-${dist.id}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) =>
                                          toggleDistribuidora(idx, dist.id, !!checked)
                                        }
                                        data-testid={`checkbox-dist-${idx}-${dist.id}`}
                                      />
                                      <Label
                                        htmlFor={`dist-${idx}-${dist.id}`}
                                        className="text-xs cursor-pointer font-medium"
                                      >
                                        {dist.label}
                                      </Label>
                                    </div>

                                    {/* Quando selecionada: campo nome (só "outros") + email de share */}
                                    {isChecked && dist.id === "outros" && (
                                      <div className="ml-6 space-y-1.5">
                                        <Input
                                          value={entry?.nomeCustom ?? ""}
                                          onChange={(e) => updateDistNomeCustom(idx, e.target.value)}
                                          placeholder="Nome da distribuidora…"
                                          className="h-7 text-xs"
                                          data-testid={`input-dist-nome-custom-${idx}`}
                                        />
                                        {(entry?.nomeCustom ?? "").trim().length > 0 && (
                                          <Input
                                            value={entry?.email ?? ""}
                                            onChange={(e) => updateDistEmail(idx, dist.id, e.target.value)}
                                            type="email"
                                            placeholder="Email de share…"
                                            className="h-7 text-xs"
                                            data-testid={`input-dist-email-share-${idx}-${dist.id}`}
                                          />
                                        )}
                                      </div>
                                    )}

                                    {/* Email de share para distribuidoras normais */}
                                    {isChecked && dist.id !== "outros" && (
                                      <div className="ml-6">
                                        <Input
                                          value={entry?.email ?? ""}
                                          onChange={(e) => updateDistEmail(idx, dist.id, e.target.value)}
                                          type="email"
                                          placeholder={`Email de share — ${dist.label}`}
                                          className="h-7 text-xs"
                                          data-testid={`input-dist-email-share-${idx}-${dist.id}`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Campo nome para "outros" mesmo sem o trigger do nome */}
                            {outrosEntry && !outrosEntry.nomeCustom && (
                              <p className="text-xs text-muted-foreground ml-6">
                                Preencha o nome da distribuidora para activar o email de share.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══ 7. Observações ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">7.</span>
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
