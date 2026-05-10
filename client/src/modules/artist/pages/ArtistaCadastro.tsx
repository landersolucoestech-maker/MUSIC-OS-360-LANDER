import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  ChevronLeft, Loader2, Save, FileText, PlusCircle,
  Shield, ExternalLink, Plus, Trash2, Music, Package,
} from "lucide-react";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { FileUpload, type UploadedFile } from "@/shared/components/FileUpload";
import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import {
  artistaToFormFields,
  formToArtistaPayload,
  ESPECIALIDADES_LABELS,
} from "@/modules/artist/mappers";
import { formatDate, formatCurrency } from "@/shared/lib/format-utils";
import { ContratoStatusBadge, getContratoSituacao } from "@/shared/components/ContratoStatusBadge";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

type TipoPerfil = "independente" | "com_empresario" | "gravadora" | "editora";

const GENEROS_MUSICAIS = [
  "Funk", "Forró", "Sertanejo", "Pop", "Rock", "MPB", "Eletrônica",
  "Hip Hop", "R&B", "Axé", "Pagode", "Gospel", "Reggae", "Jazz", "Outro",
];

const BANCOS = [
  "Banco do Brasil", "Bradesco", "Caixa Econômica", "Itaú", "Santander",
  "Nubank", "Inter", "C6 Bank", "PicPay", "Mercado Pago", "Outro",
];

const DISTRIBUIDORAS = [
  "Believe", "CD Baby", "DistroKid", "Ingrooves", "Kontor", "ONErpm",
  "Orchard", "Sony Music", "Stem", "Symphonic", "TuneCore", "Warner Music", "Outro",
];

const VINCULO_COM_EMPRESA = new Set(["com_empresario", "gravadora", "editora"]);

interface DistribuidoraEntry {
  distribuidora: string;
  email: string;
}

const EMPTY_DISTRIBUIDORA: DistribuidoraEntry = { distribuidora: "", email: "" };

const ESPECIALIDADES = Object.entries(ESPECIALIDADES_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const TIPOS_ARTISTA = [
  { value: "solo",        label: "Solo" },
  { value: "banda",       label: "Banda" },
  { value: "dupla",       label: "Dupla" },
  { value: "trio",        label: "Trio" },
  { value: "grupo",       label: "Grupo" },
  { value: "compositor",  label: "Compositor" },
  { value: "produtor",    label: "Produtor" },
  { value: "dj",          label: "DJ" },
];

const STATUS_ARTISTA = [
  { value: "contratado",   label: "Contratado" },
  { value: "negociando",   label: "Negociando" },
  { value: "inativo",      label: "Inativo" },
  { value: "prospect",     label: "Prospect" },
  { value: "onboarding",   label: "Em Onboarding" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArtistaCadastro() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { artistas, addArtista, updateArtista } = useArtistas();
  const { contratos } = useContratos();
  const { clientes, addCliente } = useClientes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("perfil");

  const artistaExistente: Artista | undefined = isEdit ? artistas.find((a) => a.id === id) : undefined;

  const artistaContratos = useMemo(
    () => (id ? contratos.filter((c) => c.artista_id === id) : []),
    [contratos, id],
  );

  const contatosCRM = useMemo(
    () => clientes.filter((c) => c.tipo_pessoa === "pessoa_fisica" || c.tipo_pessoa === "pessoa_juridica"),
    [clientes],
  );
  const gravadorasCRM = useMemo(
    () => clientes.filter((c: any) => c.tipo_pessoa === "pessoa_juridica"),
    [clientes],
  );
  const pessoasFisicasCRM = useMemo(
    () => clientes.filter((c: any) => c.tipo_pessoa === "pessoa_fisica"),
    [clientes],
  );
  const contratosDisponiveis = useMemo(
    () => contratos.filter((c: any) => (c.status === "ativo" || c.status === "vencendo") && !c.artista_id),
    [contratos],
  );

  // ── 1. Informações Básicas ────────────────────────────────────────────────
  const [imagemArtista, setImagemArtista] = useState<UploadedFile[]>([]);
  const [nomeArtistico, setNomeArtistico] = useState("");
  const [generoMusical, setGeneroMusical] = useState("");
  const [tipoArtista, setTipoArtista] = useState("artista_solo");
  const [statusArtista, setStatusArtista] = useState("contratado");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [documentosPessoais, setDocumentosPessoais] = useState<UploadedFile[]>([]);
  const [presskit, setPresskit] = useState<UploadedFile[]>([]);
  const [biografia, setBiografia] = useState("");
  const [notasInternas, setNotasInternas] = useState("");

  // ── 2. Dados Pessoais ─────────────────────────────────────────────────────
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [rg, setRg] = useState("");
  const [generoPessoa, setGeneroPessoa] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // ── 3. Dados Bancários ────────────────────────────────────────────────────
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [titularConta, setTitularConta] = useState("");

  // ── 4. Redes Sociais ──────────────────────────────────────────────────────
  const [spotify, setSpotify] = useState("");
  const [spotifyOuvintes, setSpotifyOuvintes] = useState("");
  const [instagram, setInstagram] = useState("");
  const [instagramSeguidores, setInstagramSeguidores] = useState("");
  const [youtube, setYoutube] = useState("");
  const [youtubeInscritos, setYoutubeInscritos] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [tiktokSeguidores, setTiktokSeguidores] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [soundcloudSeguidores, setSoundcloudSeguidores] = useState("");
  const [deezer, setDeezer] = useState("");
  const [deezerFas, setDeezerFas] = useState("");
  const [appleMusic, setAppleMusic] = useState("");
  const [appleMusicAlbuns, setAppleMusicAlbuns] = useState("");

  // ── 5. Tipo de Perfil ─────────────────────────────────────────────────────
  const [tipoPerfil, setTipoPerfil] = useState<TipoPerfil>("independente");
  const [empresarioId, setEmpresarioId] = useState("");
  const [empresarioNome, setEmpresarioNome] = useState("");
  const [empresarioTelefone, setEmpresarioTelefone] = useState("");
  const [empresarioEmail, setEmpresarioEmail] = useState("");
  const [gravadoraId, setGravadoraId] = useState("");
  const [gravadoraNome, setGravadoraNome] = useState("");
  const [gravadoraTelefone, setGravadoraTelefone] = useState("");
  const [gravadoraEmail, setGravadoraEmail] = useState("");
  const [gravadoraResponsavelId, setGravadoraResponsavelId] = useState("");
  const [gravadoraResponsavelNome, setGravadoraResponsavelNome] = useState("");
  const [gravadoraResponsavelTelefone, setGravadoraResponsavelTelefone] = useState("");
  const [gravadoraResponsavelEmail, setGravadoraResponsavelEmail] = useState("");

  // ── 6. Distribuidoras ─────────────────────────────────────────────────────
  const [distribuidorasArtista, setDistribuidorasArtista] = useState<DistribuidoraEntry[]>([{ ...EMPTY_DISTRIBUIDORA }]);
  const [distribuidorasEmpresa, setDistribuidorasEmpresa] = useState<DistribuidoraEntry[]>([{ ...EMPTY_DISTRIBUIDORA }]);

  // ── 7. Mídia 360 ──────────────────────────────────────────────────────────
  const [bannerUrl, setBannerUrl] = useState("");
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [galeriaInput, setGaleriaInput] = useState("");
  const [videoApresentacaoUrl, setVideoApresentacaoUrl] = useState("");
  const [managerNome, setManagerNome] = useState("");
  const [managerContato, setManagerContato] = useState("");
  const [produtorExecutivo, setProdutorExecutivo] = useState("");
  const [agenciaBooking, setAgenciaBooking] = useState("");
  const [labelParceira, setLabelParceira] = useState("");
  const [documentosList, setDocumentosList] = useState<{ nome: string; url: string }[]>([]);
  const [docNomeInput, setDocNomeInput] = useState("");
  const [docUrlInput, setDocUrlInput] = useState("");

  // ── Contrato vinculado ────────────────────────────────────────────────────
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState("");

  // ── Load artista existente ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !artistaExistente) return;
    const f = artistaToFormFields(artistaExistente);
    setNomeArtistico(f.nomeArtistico);
    setGeneroMusical(f.generoMusical);
    setTipoArtista(f.tipoArtista);
    setStatusArtista(f.statusArtista);
    setEspecialidades(f.especialidades);
    setBiografia(f.biografia);
    setNotasInternas(f.notasInternas);
    setImagemArtista(f.fotoUrl ? [{ url: f.fotoUrl, name: "foto", size: 0, type: "image/*", path: "" }] : []);
    setNome(f.nome);
    setDataNascimento(f.dataNascimento);
    setCpfCnpj(f.cpfCnpj);
    setRg(f.rg);
    setGeneroPessoa(typeof artistaExistente.genero === "string" ? artistaExistente.genero : "");
    setEndereco(f.endereco);
    setTelefone(f.telefone);
    setEmail(f.email);
    setBanco(f.banco);
    setAgencia(f.agencia);
    setConta(f.conta);
    setChavePix(f.chavePix);
    setTitularConta(f.titularConta);
    setSpotify(f.spotify);
    setSpotifyOuvintes(f.spotifyOuvintes);
    setInstagram(f.instagram);
    setInstagramSeguidores(f.instagramSeguidores);
    setYoutube(f.youtube);
    setYoutubeInscritos(f.youtubeInscritos);
    setTiktok(f.tiktok);
    setTiktokSeguidores(f.tiktokSeguidores);
    setSoundcloud(f.soundcloud);
    setSoundcloudSeguidores(f.soundcloudSeguidores);
    setDeezer(f.deezer);
    setDeezerFas(f.deezerFas);
    setAppleMusic(f.appleMusic);
    setAppleMusicAlbuns(f.appleMusicAlbuns);
    setTipoPerfil(f.tipoPerfil as TipoPerfil);
    setEmpresarioId(f.empresarioId);
    setEmpresarioNome(f.empresarioNome);
    setEmpresarioTelefone(f.empresarioTelefone);
    setEmpresarioEmail(f.empresarioEmail);
    setGravadoraId(f.gravadoraId);
    setGravadoraNome(f.gravadoraNome);
    setGravadoraTelefone(f.gravadoraTelefone);
    setGravadoraEmail(f.gravadoraEmail);
    setGravadoraResponsavelId(f.gravadoraResponsavelId);
    setGravadoraResponsavelNome(f.gravadoraResponsavelNome);
    setGravadoraResponsavelTelefone(f.gravadoraResponsavelTelefone);
    setGravadoraResponsavelEmail(f.gravadoraResponsavelEmail);
    // Converte Records salvos → linhas dinâmicas
    const artRows = Object.entries(f.distribuidorasSelecionadas)
      .filter(([, sel]) => sel)
      .map(([name]) => ({ distribuidora: name, email: f.distribuidorasEmails[name] || "" }));
    setDistribuidorasArtista(artRows.length > 0 ? artRows : [{ ...EMPTY_DISTRIBUIDORA }]);
    const empSel = (artistaExistente?.distribuidoras_empresa_selecionadas as Record<string, boolean> | null) ?? {};
    const empEmails = (artistaExistente?.distribuidoras_empresa_emails as Record<string, string> | null) ?? {};
    const empRows = Object.entries(empSel)
      .filter(([, sel]) => sel)
      .map(([name]) => ({ distribuidora: name, email: empEmails[name] || "" }));
    setDistribuidorasEmpresa(empRows.length > 0 ? empRows : [{ ...EMPTY_DISTRIBUIDORA }]);
    setDocumentosPessoais(
      f.documentosPessoaisUrl
        ? [{ name: "documento.pdf", size: 0, type: "application/pdf", path: f.documentosPessoaisUrl, url: f.documentosPessoaisUrl }]
        : [],
    );
    setPresskit(
      f.presskitUrl
        ? [{ name: "presskit.pdf", size: 0, type: "application/pdf", path: f.presskitUrl, url: f.presskitUrl }]
        : [],
    );
    setContratoSelecionadoId(f.contratoId);
    setBannerUrl(typeof artistaExistente.banner_url === "string" ? artistaExistente.banner_url : "");
    setGaleriaUrls(Array.isArray(artistaExistente.galeria_urls) ? artistaExistente.galeria_urls as string[] : []);
    setVideoApresentacaoUrl(typeof artistaExistente.video_apresentacao_url === "string" ? artistaExistente.video_apresentacao_url : "");
    setManagerNome(typeof artistaExistente.manager_nome === "string" ? artistaExistente.manager_nome : "");
    setManagerContato(typeof artistaExistente.manager_contato === "string" ? artistaExistente.manager_contato : "");
    setProdutorExecutivo(typeof artistaExistente.produtor_executivo === "string" ? artistaExistente.produtor_executivo : "");
    setAgenciaBooking(typeof artistaExistente.agencia_booking === "string" ? artistaExistente.agencia_booking : "");
    setLabelParceira(typeof artistaExistente.label_parceira === "string" ? artistaExistente.label_parceira : "");
    setDocumentosList(
      Array.isArray(artistaExistente.documentos)
        ? artistaExistente.documentos as { nome: string; url: string }[]
        : [],
    );
  }, [isEdit, artistaExistente]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEmpresarioSelect = (selectedId: string) => {
    const c = contatosCRM.find((x) => x.id === selectedId);
    if (c) {
      setEmpresarioId(selectedId);
      setEmpresarioNome(c.nome);
      setEmpresarioTelefone(c.telefone ?? "");
      setEmpresarioEmail(c.email ?? "");
    }
  };

  const handleGravadoraSelect = (selectedId: string) => {
    const c = gravadorasCRM.find((x) => x.id === selectedId);
    if (c) {
      setGravadoraId(selectedId);
      setGravadoraNome(c.nome);
      setGravadoraTelefone(c.telefone ?? "");
      setGravadoraEmail(c.email ?? "");
    }
  };

  const handleResponsavelSelect = (selectedId: string) => {
    const c = pessoasFisicasCRM.find((x) => x.id === selectedId);
    if (c) {
      setGravadoraResponsavelId(selectedId);
      setGravadoraResponsavelNome(c.nome);
      setGravadoraResponsavelTelefone(c.telefone ?? "");
      setGravadoraResponsavelEmail(c.email ?? "");
    }
  };

  const handleAddGaleriaUrl = () => {
    if (galeriaInput.trim()) {
      setGaleriaUrls((prev) => [...prev, galeriaInput.trim()]);
      setGaleriaInput("");
    }
  };

  const handleAddDoc = () => {
    if (docNomeInput.trim() && docUrlInput.trim()) {
      setDocumentosList((prev) => [...prev, { nome: docNomeInput.trim(), url: docUrlInput.trim() }]);
      setDocNomeInput("");
      setDocUrlInput("");
    }
  };

  // ── Distribuidoras — artista ───────────────────────────────────────────────
  const setDistribuidoraArtistaField = (idx: number, field: keyof DistribuidoraEntry, value: string) =>
    setDistribuidorasArtista((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  const addDistribuidoraArtista = () =>
    setDistribuidorasArtista((prev) => [...prev, { ...EMPTY_DISTRIBUIDORA }]);
  const removeDistribuidoraArtista = (idx: number) =>
    setDistribuidorasArtista((prev) => prev.filter((_, i) => i !== idx));

  // ── Distribuidoras — empresa ───────────────────────────────────────────────
  const setDistribuidoraEmpresaField = (idx: number, field: keyof DistribuidoraEntry, value: string) =>
    setDistribuidorasEmpresa((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  const addDistribuidoraEmpresa = () =>
    setDistribuidorasEmpresa((prev) => [...prev, { ...EMPTY_DISTRIBUIDORA }]);
  const removeDistribuidoraEmpresa = (idx: number) =>
    setDistribuidorasEmpresa((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!nomeArtistico.trim()) {
      toast.error("Nome artístico é obrigatório");
      setActiveTab("perfil");
      return;
    }
    if (!nome.trim()) {
      toast.error("Nome completo é obrigatório");
      setActiveTab("pessoal");
      return;
    }

    setIsSubmitting(true);
    try {
      const camposComuns = formToArtistaPayload({
        nomeArtistico,
        generoMusical,
        tipoArtista,
        statusArtista,
        especialidades,
        biografia,
        notasInternas,
        nome,
        dataNascimento,
        cpfCnpj,
        rg,
        endereco,
        telefone,
        email,
        banco,
        agencia,
        conta,
        chavePix,
        titularConta,
        spotify,
        spotifyOuvintes,
        instagram,
        instagramSeguidores,
        youtube,
        youtubeInscritos,
        tiktok,
        tiktokSeguidores,
        soundcloud,
        soundcloudSeguidores,
        deezer,
        deezerFas,
        appleMusic,
        appleMusicAlbuns,
        tipoPerfil,
        empresarioId,
        empresarioNome,
        empresarioTelefone,
        empresarioEmail,
        gravadoraId,
        gravadoraNome,
        gravadoraTelefone,
        gravadoraEmail,
        gravadoraResponsavelId,
        gravadoraResponsavelNome,
        gravadoraResponsavelTelefone,
        gravadoraResponsavelEmail,
        distribuidorasSelecionadas: Object.fromEntries(
          distribuidorasArtista.filter((e) => e.distribuidora).map((e) => [e.distribuidora, true]),
        ),
        distribuidorasEmails: Object.fromEntries(
          distribuidorasArtista.filter((e) => e.distribuidora && e.email).map((e) => [e.distribuidora, e.email]),
        ),
        distribuidorasEmpresaSelecionadas: Object.fromEntries(
          distribuidorasEmpresa.filter((e) => e.distribuidora).map((e) => [e.distribuidora, true]),
        ),
        distribuidorasEmpresaEmails: Object.fromEntries(
          distribuidorasEmpresa.filter((e) => e.distribuidora && e.email).map((e) => [e.distribuidora, e.email]),
        ),
        fotoUrl: imagemArtista[0]?.url || "",
        documentosPessoaisUrl: documentosPessoais[0]?.url || "",
        presskitUrl: presskit[0]?.url || "",
        contratoId: contratoSelecionadoId,
      });

      const extraFields = {
        genero: generoPessoa || null,
        banner_url: bannerUrl.trim() || null,
        galeria_urls: galeriaUrls.length > 0 ? galeriaUrls : null,
        video_apresentacao_url: videoApresentacaoUrl.trim() || null,
        manager_nome: managerNome.trim() || null,
        manager_contato: managerContato.trim() || null,
        produtor_executivo: produtorExecutivo.trim() || null,
        agencia_booking: agenciaBooking.trim() || null,
        label_parceira: labelParceira.trim() || null,
        documentos: documentosList.length > 0 ? documentosList : null,
      };

      if (isEdit && artistaExistente) {
        await updateArtista.mutateAsync({ id: artistaExistente.id, ...camposComuns, ...extraFields });
      } else {
        const clienteData = {
          tipo_pessoa: "pessoa_fisica" as const,
          nome: nomeArtistico.trim(),
          cpf_cnpj: cpfCnpj.trim() || null,
          responsavel: nome.trim() || null,
          email: email.trim() || null,
          telefone: telefone.trim() || null,
          endereco: endereco.trim() || null,
          cidade: null as string | null,
          estado: null as string | null,
          observacoes: biografia.trim() || null,
          status: "ativo",
        };
        await addCliente.mutateAsync(clienteData);
        await addArtista.mutateAsync({ ...camposComuns, ...extraFields, contrato_id: contratoSelecionadoId || null });
      }
      navigate("/artistas");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const pageTitle = isEdit
    ? `Editar: ${artistaExistente?.nome_artistico ?? "Artista"}`
    : "Novo Artista";

  return (
    <MainLayout
      title={pageTitle}
      description={isEdit ? "Atualize todos os dados do artista" : "Cadastro completo de novo artista no casting"}
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/artistas")} className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            Artistas
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{isEdit ? "Editar" : "Novo Artista"}</span>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="perfil" className="text-xs h-7 px-3" data-testid="tab-perfil">
              Perfil Artístico
            </TabsTrigger>
            <TabsTrigger value="pessoal" className="text-xs h-7 px-3" data-testid="tab-pessoal">
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="bancario" className="text-xs h-7 px-3" data-testid="tab-bancario">
              Bancário
            </TabsTrigger>
            <TabsTrigger value="plataformas" className="text-xs h-7 px-3" data-testid="tab-plataformas">
              Plataformas
            </TabsTrigger>
            <TabsTrigger value="relacionamentos" className="text-xs h-7 px-3" data-testid="tab-relacionamentos">
              Relacionamentos
            </TabsTrigger>
            <TabsTrigger value="midia" className="text-xs h-7 px-3" data-testid="tab-midia">
              Mídia 360
            </TabsTrigger>
            <TabsTrigger value="notas" className="text-xs h-7 px-3" data-testid="tab-notas">
              Notas Internas
            </TabsTrigger>
            {isEdit && (
              <TabsTrigger value="contratos" className="text-xs h-7 px-3" data-testid="tab-contratos">
                Contratos ({artistaContratos.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* ═══ 1. PERFIL ARTÍSTICO ═══ */}
          <TabsContent value="perfil">
            <Card>
              <CardContent className="pt-6 space-y-6">

                <div className="space-y-2">
                  <Label>Foto / Imagem do Artista</Label>
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
                      placeholder="Nome usado profissionalmente"
                      value={nomeArtistico}
                      onChange={(e) => setNomeArtistico(e.target.value)}
                      data-testid="input-nome-artistico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gênero Musical</Label>
                    <Select value={generoMusical} onValueChange={setGeneroMusical}>
                      <SelectTrigger data-testid="select-genero">
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {GENEROS_MUSICAIS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Artista</Label>
                    <Select value={tipoArtista} onValueChange={setTipoArtista}>
                      <SelectTrigger data-testid="select-tipo">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {TIPOS_ARTISTA.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusArtista} onValueChange={setStatusArtista}>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {STATUS_ARTISTA.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Especialidades / Funções</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/30">
                    {ESPECIALIDADES.map((esp) => (
                      <div key={esp.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`esp-${esp.value}`}
                          checked={especialidades.includes(esp.value)}
                          onCheckedChange={(checked) => {
                            if (checked) setEspecialidades((p) => [...p, esp.value]);
                            else setEspecialidades((p) => p.filter((x) => x !== esp.value));
                          }}
                        />
                        <Label htmlFor={`esp-${esp.value}`} className="cursor-pointer text-sm">{esp.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Biografia Artística</Label>
                  <Textarea
                    placeholder="Trajetória, conquistas, estilo musical e principais projetos..."
                    value={biografia}
                    onChange={(e) => setBiografia(e.target.value)}
                    className="min-h-[120px]"
                    data-testid="textarea-biografia"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 2. DADOS PESSOAIS ═══ */}
          <TabsContent value="pessoal">
            <Card>
              <CardContent className="pt-6 space-y-6">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="Nome conforme documento"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      data-testid="input-nome-civil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <DatePickerField
                      value={dataNascimento}
                      onChange={setDataNascimento}
                      placeholder="Selecione a data"
                      data-testid="datepicker-nascimento"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CPF / CNPJ</Label>
                    <Input
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      data-testid="input-cpf-cnpj"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RG</Label>
                    <Input
                      placeholder="00.000.000-0"
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      data-testid="input-rg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Select value={generoPessoa} onValueChange={setGeneroPessoa}>
                      <SelectTrigger data-testid="select-genero-pessoa">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Não binário">Não binário</SelectItem>
                        <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      data-testid="input-telefone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>E-mail de Contato</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Endereço Completo</Label>
                  <Input
                    placeholder="Rua, número, bairro, cidade, estado, CEP"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    data-testid="input-endereco"
                  />
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 3. BANCÁRIO ═══ */}
          <TabsContent value="bancario">
            <Card>
              <CardContent className="pt-6 space-y-6">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Select value={banco} onValueChange={setBanco}>
                      <SelectTrigger data-testid="select-banco">
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {BANCOS.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input placeholder="0000" value={agencia} onChange={(e) => setAgencia(e.target.value)} data-testid="input-agencia" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conta com Dígito</Label>
                    <Input placeholder="00000-0" value={conta} onChange={(e) => setConta(e.target.value)} data-testid="input-conta" />
                  </div>
                  <div className="space-y-2">
                    <Label>Chave Pix</Label>
                    <Input placeholder="CPF, e-mail, telefone ou aleatória" value={chavePix} onChange={(e) => setChavePix(e.target.value)} data-testid="input-pix" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Titular da Conta</Label>
                  <Input
                    placeholder="Nome completo do titular"
                    value={titularConta}
                    onChange={(e) => setTitularConta(e.target.value)}
                    data-testid="input-titular"
                  />
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 4. PLATAFORMAS ═══ */}
          <TabsContent value="plataformas">
            <Card>
              <CardContent className="pt-6 space-y-6">

                <p className="text-xs text-muted-foreground">
                  Cole as URLs públicas dos perfis. O sistema extrai automaticamente os identificadores para buscar métricas reais.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input placeholder="https://instagram.com/@perfil" value={instagram} onChange={(e) => setInstagram(e.target.value)} data-testid="input-instagram" />
                  </div>
                  <div className="space-y-2">
                    <Label>Seguidores Instagram</Label>
                    <Input placeholder="ex: 150000" value={instagramSeguidores} onChange={(e) => setInstagramSeguidores(e.target.value)} data-testid="input-instagram-seguidores" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>TikTok</Label>
                    <Input placeholder="https://tiktok.com/@perfil" value={tiktok} onChange={(e) => setTiktok(e.target.value)} data-testid="input-tiktok" />
                  </div>
                  <div className="space-y-2">
                    <Label>Seguidores TikTok</Label>
                    <Input placeholder="ex: 200000" value={tiktokSeguidores} onChange={(e) => setTiktokSeguidores(e.target.value)} data-testid="input-tiktok-seguidores" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Spotify</Label>
                    <Input placeholder="https://open.spotify.com/artist/..." value={spotify} onChange={(e) => setSpotify(e.target.value)} data-testid="input-spotify" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ouvintes Mensais Spotify</Label>
                    <Input placeholder="ex: 450000" value={spotifyOuvintes} onChange={(e) => setSpotifyOuvintes(e.target.value)} data-testid="input-spotify-ouvintes" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>YouTube</Label>
                    <Input placeholder="https://youtube.com/channel/UC..." value={youtube} onChange={(e) => setYoutube(e.target.value)} data-testid="input-youtube" />
                  </div>
                  <div className="space-y-2">
                    <Label>Inscritos YouTube</Label>
                    <Input placeholder="ex: 80000" value={youtubeInscritos} onChange={(e) => setYoutubeInscritos(e.target.value)} data-testid="input-youtube-inscritos" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Apple Music</Label>
                    <Input placeholder="https://music.apple.com/artist/..." value={appleMusic} onChange={(e) => setAppleMusic(e.target.value)} data-testid="input-apple-music" />
                  </div>
                  <div className="space-y-2">
                    <Label>Álbuns Apple Music</Label>
                    <Input placeholder="ex: 3" value={appleMusicAlbuns} onChange={(e) => setAppleMusicAlbuns(e.target.value)} data-testid="input-apple-albuns" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deezer</Label>
                    <Input placeholder="https://deezer.com/artist/..." value={deezer} onChange={(e) => setDeezer(e.target.value)} data-testid="input-deezer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fãs Deezer</Label>
                    <Input placeholder="ex: 30000" value={deezerFas} onChange={(e) => setDeezerFas(e.target.value)} data-testid="input-deezer-fas" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SoundCloud</Label>
                    <Input placeholder="https://soundcloud.com/perfil" value={soundcloud} onChange={(e) => setSoundcloud(e.target.value)} data-testid="input-soundcloud" />
                  </div>
                  <div className="space-y-2">
                    <Label>Seguidores SoundCloud</Label>
                    <Input placeholder="ex: 12000" value={soundcloudSeguidores} onChange={(e) => setSoundcloudSeguidores(e.target.value)} data-testid="input-soundcloud-seguidores" />
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 5. RELACIONAMENTOS ═══ */}
          <TabsContent value="relacionamentos">
            <Card>
              <CardContent className="pt-6 space-y-6">

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Tipo de Perfil</h3>
                  <Select value={tipoPerfil} onValueChange={(v) => setTipoPerfil(v as TipoPerfil)}>
                    <SelectTrigger data-testid="select-tipo-perfil">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      <SelectItem value="independente">Independente</SelectItem>
                      <SelectItem value="com_empresario">Com Empresário</SelectItem>
                      <SelectItem value="gravadora">Gravadora</SelectItem>
                      <SelectItem value="editora">Editora</SelectItem>
                    </SelectContent>
                  </Select>

                  {tipoPerfil === "com_empresario" && (
                    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                      <h4 className="font-medium text-sm">Dados do Empresário</h4>
                      <Select value={empresarioId || "none"} onValueChange={(v) => v !== "none" && handleEmpresarioSelect(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Buscar no CRM..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="none">Selecione um contato...</SelectItem>
                          {contatosCRM.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <Input value={empresarioTelefone} onChange={(e) => setEmpresarioTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" value={empresarioEmail} onChange={(e) => setEmpresarioEmail(e.target.value)} placeholder="email@exemplo.com" />
                        </div>
                      </div>
                    </div>
                  )}

                  {(tipoPerfil === "gravadora" || tipoPerfil === "editora") && (
                    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                      <h4 className="font-medium text-sm">Dados da {tipoPerfil === "gravadora" ? "Gravadora" : "Editora"}</h4>
                      <Select value={gravadoraId || "none"} onValueChange={(v) => v !== "none" && handleGravadoraSelect(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Buscar ${tipoPerfil === "gravadora" ? "gravadora" : "editora"} no CRM...`} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="none">Selecione...</SelectItem>
                          {gravadorasCRM.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <Input value={gravadoraTelefone} disabled placeholder="Preenchido automaticamente" />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" value={gravadoraEmail} disabled placeholder="Preenchido automaticamente" />
                        </div>
                      </div>
                      <Separator />
                      <h4 className="font-medium text-sm">Responsável pelo Contato</h4>
                      <Select
                        value={gravadoraResponsavelId || "none"}
                        onValueChange={(v) => v !== "none" && handleResponsavelSelect(v)}
                        disabled={!gravadoraId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={gravadoraId ? "Selecione um responsável..." : "Selecione uma gravadora primeiro"} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="none">Selecione...</SelectItem>
                          {pessoasFisicasCRM.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <Input value={gravadoraResponsavelTelefone} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" value={gravadoraResponsavelEmail} disabled />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* ── 6. Distribuidoras / Agregadoras ─────────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Distribuidoras / Agregadoras do Artista</h3>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Distribuidoras vinculadas diretamente ao artista. Adicione quantas forem necessárias.
                  </p>

                  <div className="space-y-3">
                    {distribuidorasArtista.map((entry, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-3 items-end">
                        <div className="space-y-1.5">
                          {idx === 0 && <Label className="text-sm">Distribuidora</Label>}
                          <Select
                            value={entry.distribuidora}
                            onValueChange={(v) => setDistribuidoraArtistaField(idx, "distribuidora", v)}
                          >
                            <SelectTrigger data-testid={`select-dist-artista-${idx}`}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              {DISTRIBUIDORAS.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="space-y-1.5 flex-1">
                            {idx === 0 && <Label className="text-sm">E-mail de share / acesso</Label>}
                            <Input
                              type="email"
                              placeholder="email@distribuidora.com"
                              value={entry.email}
                              onChange={(e) => setDistribuidoraArtistaField(idx, "email", e.target.value)}
                              data-testid={`input-dist-artista-email-${idx}`}
                            />
                          </div>
                          {idx > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDistribuidoraArtista(idx)}
                              data-testid={`button-remove-dist-artista-${idx}`}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDistribuidoraArtista}
                    data-testid="button-add-dist-artista"
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar outra distribuidora
                  </Button>
                </div>

                {/* ── Distribuidoras da Empresa (condicional) ─────────── */}
                {VINCULO_COM_EMPRESA.has(tipoPerfil) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">
                            Distribuidoras / Agregadoras da {tipoPerfil === "com_empresario" ? "Empresa / Empresário" : tipoPerfil === "gravadora" ? "Gravadora" : "Editora"}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Distribuidoras vinculadas à empresa responsável. Podem ser diferentes das do artista.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pr-9">
                        <Label className="text-xs text-muted-foreground">Distribuidora</Label>
                        <Label className="text-xs text-muted-foreground">E-mail de share</Label>
                      </div>

                      <div className="space-y-2.5">
                        {distribuidorasEmpresa.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="grid grid-cols-2 gap-3 flex-1">
                              <Select
                                value={entry.distribuidora}
                                onValueChange={(v) => setDistribuidoraEmpresaField(idx, "distribuidora", v)}
                              >
                                <SelectTrigger data-testid={`select-dist-empresa-${idx}`}>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border border-border z-50">
                                  {DISTRIBUIDORAS.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="email"
                                placeholder="email@empresa.com"
                                value={entry.email}
                                onChange={(e) => setDistribuidoraEmpresaField(idx, "email", e.target.value)}
                                data-testid={`input-dist-empresa-email-${idx}`}
                              />
                            </div>
                            {distribuidorasEmpresa.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDistribuidoraEmpresa(idx)}
                                data-testid={`button-remove-dist-empresa-${idx}`}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDistribuidoraEmpresa}
                        data-testid="button-add-dist-empresa"
                        className="gap-1.5 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar distribuidora da empresa
                      </Button>
                    </div>
                  </>
                )}

                <Separator />

                {!isEdit && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Vincular Contrato Existente</h3>
                    <Select value={contratoSelecionadoId || "none"} onValueChange={(v) => setContratoSelecionadoId(v === "none" ? "" : v)}>
                      <SelectTrigger data-testid="select-contrato">
                        <SelectValue placeholder="Selecionar contrato..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="none">Nenhum</SelectItem>
                        {contratosDisponiveis.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Vincule um contrato já existente ou crie um novo após salvar o artista.
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 6. MÍDIA 360 ═══ */}
          <TabsContent value="midia">
            <Card>
              <CardContent className="pt-6 space-y-6">

                <div className="space-y-2">
                  <Label>Banner / Capa (URL)</Label>
                  <Input
                    placeholder="https://... (imagem 1920×600 recomendada)"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    data-testid="input-banner-url"
                  />
                  {bannerUrl && (
                    <img src={bannerUrl} alt="Banner preview" className="w-full h-24 object-cover rounded-md border mt-2" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Vídeo de Apresentação (URL)</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                    value={videoApresentacaoUrl}
                    onChange={(e) => setVideoApresentacaoUrl(e.target.value)}
                    data-testid="input-video-url"
                  />
                </div>

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
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                      {galeriaUrls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img src={url} alt={`Galeria ${idx + 1}`} className="w-full aspect-square object-cover rounded-md border" />
                          <button
                            type="button"
                            onClick={() => setGaleriaUrls((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <h3 className="text-sm font-semibold">Equipe e Parceiros</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Manager / Empresário</Label>
                    <Input
                      placeholder="Nome do manager"
                      value={managerNome}
                      onChange={(e) => setManagerNome(e.target.value)}
                      data-testid="input-manager-nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contato do Manager</Label>
                    <Input
                      placeholder="Telefone ou email"
                      value={managerContato}
                      onChange={(e) => setManagerContato(e.target.value)}
                      data-testid="input-manager-contato"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Produtor Executivo</Label>
                    <Input
                      placeholder="Nome do produtor executivo"
                      value={produtorExecutivo}
                      onChange={(e) => setProdutorExecutivo(e.target.value)}
                      data-testid="input-produtor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agência de Booking</Label>
                    <Input
                      placeholder="Nome da agência"
                      value={agenciaBooking}
                      onChange={(e) => setAgenciaBooking(e.target.value)}
                      data-testid="input-agencia-booking"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Label Parceira</Label>
                  <Input
                    placeholder="Nome da label ou gravadora parceira"
                    value={labelParceira}
                    onChange={(e) => setLabelParceira(e.target.value)}
                    data-testid="input-label-parceira"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Documentos Vinculados</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do documento"
                      value={docNomeInput}
                      onChange={(e) => setDocNomeInput(e.target.value)}
                      data-testid="input-doc-nome"
                      className="flex-1"
                    />
                    <Input
                      placeholder="URL do documento"
                      value={docUrlInput}
                      onChange={(e) => setDocUrlInput(e.target.value)}
                      data-testid="input-doc-url"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddDoc} className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {documentosList.length > 0 && (
                    <div className="space-y-2">
                      {documentosList.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1 truncate">{doc.nome}</span>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs shrink-0">
                            Abrir
                          </a>
                          <button
                            type="button"
                            onClick={() => setDocumentosList((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 7. NOTAS INTERNAS ═══ */}
          <TabsContent value="notas">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Notas Internas</Label>
                  <Textarea
                    placeholder="Notas internas sobre o artista, rider técnico, preferências de contrato, histórico de negociações..."
                    value={notasInternas}
                    onChange={(e) => setNotasInternas(e.target.value)}
                    className="min-h-[200px]"
                    data-testid="textarea-notas"
                  />
                  <p className="text-xs text-muted-foreground">
                    Essas notas são visíveis apenas para a equipe interna e não são compartilhadas com o artista.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ 8. CONTRATOS (edit only) ═══ */}
          {isEdit && (
            <TabsContent value="contratos">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" />
                      Contratos Vinculados ({artistaContratos.length})
                    </CardTitle>
                    <Link
                      to="/contratos"
                      state={{ novoContratoArtistaId: id }}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Adicionar Contrato
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {artistaContratos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-xl bg-muted/60 border border-border p-4 mb-3">
                        <Music className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Nenhum contrato vinculado</p>
                      <Link to="/contratos" className="mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">Criar Contrato</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {artistaContratos.map((contrato) => (
                        <div key={contrato.id} className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{contrato.titulo}</span>
                              <ContratoStatusBadge situacao={getContratoSituacao([contrato])} />
                              {contrato.exclusivo && (
                                <Badge className="bg-emerald-600 text-white text-xs gap-1">
                                  <Shield className="h-3 w-3" /> Exclusivo
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span>{contrato.tipo || "—"}</span>
                              {contrato.data_inicio && (
                                <span>
                                  {formatDate(contrato.data_inicio)}
                                  {contrato.data_fim ? ` → ${formatDate(contrato.data_fim)}` : ""}
                                </span>
                              )}
                              {contrato.valor && <span>{formatCurrency(contrato.valor)}</span>}
                            </div>
                          </div>
                          <Link to="/contratos" title="Abrir em Contratos">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>

        <Separator />

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/artistas")} disabled={isSubmitting} data-testid="button-cancelar">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2" data-testid="button-salvar">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Salvar Alterações" : "Cadastrar Artista"}
          </Button>
        </div>

      </div>
    </MainLayout>
  );
}
