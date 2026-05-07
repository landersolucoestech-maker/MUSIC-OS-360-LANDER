import { useState, useEffect } from "react";
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
import { Loader2, Save, Plus, Trash2, X } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/shared/components/FileUpload";
import { type TipoArtista, type StatusArtista } from "@/modules/artist/components/ArtistaForm";
import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { toast } from "sonner";
import {
  artistaToFormFields,
  formToArtistaPayload,
  ESPECIALIDADES_LABELS,
} from "@/modules/artist/mappers";

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
  { id: "onerpm",    label: "ONErpm" },
  { id: "distrokid", label: "DistroKid" },
  { id: "30por1",    label: "30 Por 1" },
  { id: "symphonic", label: "Symphonic" },
  { id: "somvibe",   label: "Somvibe" },
  { id: "soundon",   label: "SoundOn" },
  { id: "musicpro",  label: "MusicPro" },
];

const ESPECIALIDADES = Object.entries(ESPECIALIDADES_LABELS).map(
  ([value, label]) => ({ value, label }),
);

interface ArtistaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  artista?: Artista | null;
}

export function ArtistaFormModal({ open, onOpenChange, onSuccess, artista }: ArtistaFormModalProps) {
  const isEditing = !!artista;
  const { artistas, addArtista, updateArtista } = useArtistas();
  const { clientes, addCliente } = useClientes();
  const { contratos } = useContratos();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 1. Informações Básicas ─────────────────────────────────────
  const [imagemArtista, setImagemArtista] = useState<UploadedFile[]>([]);
  const [nomeArtistico, setNomeArtistico] = useState("");
  const [generoMusical, setGeneroMusical] = useState("");
  const [tipoArtistaTabela, setTipoArtistaTabela] = useState<TipoArtista>("artista_solo");
  const [statusArtistaTabela, setStatusArtistaTabela] = useState<StatusArtista>("contratado");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [documentosPessoais, setDocumentosPessoais] = useState<UploadedFile[]>([]);
  const [presskit, setPresskit] = useState<UploadedFile[]>([]);
  const [biografia, setBiografia] = useState("");
  const [notasInternas, setNotasInternas] = useState("");

  // ── 2. Dados Pessoais ──────────────────────────────────────────
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [rg, setRg] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // ── 3. Dados Bancários ─────────────────────────────────────────
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [titularConta, setTitularConta] = useState("");

  // ── 4. Redes Sociais ───────────────────────────────────────────
  // Os campos de URL abaixo alimentam tanto a exibição quanto as
  // Edge Functions de métricas (Task #340/#354): extraímos o ID do
  // artista a partir da URL pública para não pedir dois campos ao usuário.
  const [spotify, setSpotify] = useState("");
  const [spotifyOuvintes, setSpotifyOuvintes] = useState<string>("");
  const [instagram, setInstagram] = useState("");
  const [instagramSeguidores, setInstagramSeguidores] = useState<string>("");
  const [youtube, setYoutube] = useState("");
  const [youtubeInscritos, setYoutubeInscritos] = useState<string>("");
  const [tiktok, setTiktok] = useState("");
  const [tiktokSeguidores, setTiktokSeguidores] = useState<string>("");
  const [soundcloud, setSoundcloud] = useState("");
  const [soundcloudSeguidores, setSoundcloudSeguidores] = useState<string>("");
  const [deezer, setDeezer] = useState("");
  const [deezerFas, setDeezerFas] = useState<string>("");
  const [appleMusic, setAppleMusic] = useState("");
  const [appleMusicAlbuns, setAppleMusicAlbuns] = useState<string>("");

  // ── 5. Tipo de Perfil ──────────────────────────────────────────
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

  // ── 6. Distribuidoras ──────────────────────────────────────────
  const [distribuidorasSelecionadas, setDistribuidorasSelecionadas] = useState<Record<string, boolean>>({});
  const [distribuidorasEmails, setDistribuidorasEmails] = useState<Record<string, string>>({});

  // ── 7. Mídias ─────────────────────────────────────────────────
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [galeriaInput, setGaleriaInput] = useState("");
  const [videoApresentacaoUrl, setVideoApresentacaoUrl] = useState("");

  // ── 8. Relacionamentos ────────────────────────────────────────
  const [managerNome, setManagerNome] = useState("");
  const [managerContato, setManagerContato] = useState("");
  const [produtorExecutivo, setProdutorExecutivo] = useState("");
  const [agenciaBooking, setAgenciaBooking] = useState("");
  const [labelParceira, setLabelParceira] = useState("");

  // ── 9. Documentos vinculados ──────────────────────────────────
  const [documentosList, setDocumentosList] = useState<{ nome: string; url: string }[]>([]);
  const [docNomeInput, setDocNomeInput] = useState("");
  const [docUrlInput, setDocUrlInput] = useState("");

  // ── Contrato vinculado ─────────────────────────────────────────
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState("");

  const contatosCRM = clientes.filter((c) => c.tipo_pessoa === "pessoa_fisica" || c.tipo_pessoa === "pessoa_juridica");
  const gravadorasCRM = clientes.filter((c: any) => c.tipo_pessoa === "pessoa_juridica");
  const pessoasFisicasCRM = clientes.filter((c: any) => c.tipo_pessoa === "pessoa_fisica");
  const contratosDisponiveis = contratos.filter((c: any) => (c.status === "ativo" || c.status === "vencendo") && !c.artista_id);

  const resetForm = () => {
    setImagemArtista([]); setNomeArtistico(""); setGeneroMusical("");
    setTipoArtistaTabela("artista_solo"); setStatusArtistaTabela("contratado");
    setEspecialidades([]); setDocumentosPessoais([]); setPresskit([]); setBiografia("");
    setNome(""); setDataNascimento(""); setCpfCnpj(""); setRg("");
    setEndereco(""); setTelefone(""); setEmail("");
    setBanco(""); setAgencia(""); setConta(""); setChavePix(""); setTitularConta("");
    setSpotify(""); setSpotifyOuvintes("");
    setInstagram(""); setInstagramSeguidores("");
    setYoutube(""); setYoutubeInscritos("");
    setTiktok(""); setTiktokSeguidores("");
    setSoundcloud(""); setSoundcloudSeguidores("");
    setDeezer(""); setDeezerFas("");
    setAppleMusic(""); setAppleMusicAlbuns("");
    setTipoPerfil("independente");
    setEmpresarioId(""); setEmpresarioNome(""); setEmpresarioTelefone(""); setEmpresarioEmail("");
    setGravadoraId(""); setGravadoraNome(""); setGravadoraTelefone(""); setGravadoraEmail("");
    setGravadoraResponsavelId(""); setGravadoraResponsavelNome("");
    setGravadoraResponsavelTelefone(""); setGravadoraResponsavelEmail("");
    setDistribuidorasSelecionadas({}); setDistribuidorasEmails({});
    setContratoSelecionadoId("");
    setNotasInternas("");
    setGaleriaUrls([]); setGaleriaInput(""); setVideoApresentacaoUrl("");
    setManagerNome(""); setManagerContato(""); setProdutorExecutivo("");
    setAgenciaBooking(""); setLabelParceira("");
    setDocumentosList([]); setDocNomeInput(""); setDocUrlInput("");
  };

  useEffect(() => {
    if (!open) return;
    const f = artistaToFormFields(artista ?? null);
    if (artista) {
      setNomeArtistico(f.nomeArtistico);
      setGeneroMusical(f.generoMusical);
      setTipoArtistaTabela(f.tipoArtista as TipoArtista);
      setStatusArtistaTabela(f.statusArtista as StatusArtista);
      setEspecialidades(f.especialidades);
      setBiografia(f.biografia);
      setNotasInternas(f.notasInternas);
      setImagemArtista(f.fotoUrl ? [{ url: f.fotoUrl, name: "foto", size: 0, type: "image/*", path: "" }] : []);
      // Dados pessoais
      setNome(f.nome);
      setDataNascimento(f.dataNascimento);
      setCpfCnpj(f.cpfCnpj);
      setRg(f.rg);
      setEndereco(f.endereco);
      setTelefone(f.telefone);
      setEmail(f.email);
      // Bancário
      setBanco(f.banco);
      setAgencia(f.agencia);
      setConta(f.conta);
      setChavePix(f.chavePix);
      setTitularConta(f.titularConta);
      // Plataformas
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
      // Perfil
      setTipoPerfil(f.tipoPerfil);
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
      // Distribuidoras
      setDistribuidorasSelecionadas(f.distribuidorasSelecionadas);
      setDistribuidorasEmails(f.distribuidorasEmails);
      // Documentos
      if (f.documentosPessoaisUrl) {
        setDocumentosPessoais([{ name: "documento.pdf", size: 0, type: "application/pdf", path: f.documentosPessoaisUrl, url: f.documentosPessoaisUrl }]);
      } else {
        setDocumentosPessoais([]);
      }
      if (f.presskitUrl) {
        setPresskit([{ name: "presskit.pdf", size: 0, type: "application/pdf", path: f.presskitUrl, url: f.presskitUrl }]);
      } else {
        setPresskit([]);
      }
      setContratoSelecionadoId(f.contratoId);
      // Perfil 360
      setGaleriaUrls(Array.isArray(artista.galeria_urls) ? artista.galeria_urls : []);
      setVideoApresentacaoUrl(typeof artista.video_apresentacao_url === "string" ? artista.video_apresentacao_url : "");
      setManagerNome(typeof artista.manager_nome === "string" ? artista.manager_nome : "");
      setManagerContato(typeof artista.manager_contato === "string" ? artista.manager_contato : "");
      setProdutorExecutivo(typeof artista.produtor_executivo === "string" ? artista.produtor_executivo : "");
      setAgenciaBooking(typeof artista.agencia_booking === "string" ? artista.agencia_booking : "");
      setLabelParceira(typeof artista.label_parceira === "string" ? artista.label_parceira : "");
      setDocumentosList(Array.isArray(artista.documentos) ? artista.documentos as { nome: string; url: string }[] : []);
    } else {
      resetForm();
    }
  }, [open, artista]);

  const handleEmpresarioSelect = (id: string) => {
    const c = contatosCRM.find((x) => x.id === id);
    if (c) {
      setEmpresarioId(id);
      setEmpresarioNome(c.nome);
      setEmpresarioTelefone(c.telefone ?? "");
      setEmpresarioEmail(c.email ?? "");
    }
  };

  const handleGravadoraSelect = (id: string) => {
    const c = gravadorasCRM.find((x) => x.id === id);
    if (c) {
      setGravadoraId(id);
      setGravadoraNome(c.nome);
      setGravadoraTelefone(c.telefone ?? "");
      setGravadoraEmail(c.email ?? "");
    }
  };

  const handleResponsavelGravadoraSelect = (id: string) => {
    const c = pessoasFisicasCRM.find((x) => x.id === id);
    if (c) {
      setGravadoraResponsavelId(id);
      setGravadoraResponsavelNome(c.nome);
      setGravadoraResponsavelTelefone(c.telefone ?? "");
      setGravadoraResponsavelEmail(c.email ?? "");
    }
  };

  const handleDistribuidoraToggle = (id: string) => {
    setDistribuidorasSelecionadas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDistribuidoraEmailChange = (id: string, val: string) => {
    setDistribuidorasEmails((prev) => ({ ...prev, [id]: val }));
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!nomeArtistico.trim()) { toast.error("Nome artístico é obrigatório"); return; }
    if (!nome.trim()) { toast.error("Nome completo é obrigatório"); return; }

    setIsSubmitting(true);
    try {
      const camposComuns = formToArtistaPayload({
        nomeArtistico,
        generoMusical,
        tipoArtista: tipoArtistaTabela,
        statusArtista: statusArtistaTabela,
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
        distribuidorasSelecionadas,
        distribuidorasEmails,
        fotoUrl: imagemArtista[0]?.url || "",
        documentosPessoaisUrl: documentosPessoais[0]?.url || "",
        presskitUrl: presskit[0]?.url || "",
        contratoId: contratoSelecionadoId,
      });

      const extraFields = {
        galeria_urls: galeriaUrls.length > 0 ? galeriaUrls : null,
        video_apresentacao_url: videoApresentacaoUrl.trim() || null,
        manager_nome: managerNome.trim() || null,
        manager_contato: managerContato.trim() || null,
        produtor_executivo: produtorExecutivo.trim() || null,
        agencia_booking: agenciaBooking.trim() || null,
        label_parceira: labelParceira.trim() || null,
        documentos: documentosList.length > 0 ? documentosList : null,
      };

      if (isEditing) {
        await updateArtista.mutateAsync({ id: artista.id, ...camposComuns, ...extraFields });
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
      handleClose(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

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
                    placeholder="Nome usado profissionalmente"
                    value={nomeArtistico}
                    onChange={(e) => setNomeArtistico(e.target.value)}
                    data-testid="input-nome-artistico"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gênero Musical <span className="text-destructive">*</span></Label>
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


              <div className="space-y-2">
                <Label>Especialidade / Função</Label>
                <div className="flex flex-wrap gap-4">
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
                  placeholder="Escreva uma breve biografia do artista, incluindo sua trajetória, conquistas e estilo musical..."
                  value={biografia}
                  onChange={(e) => setBiografia(e.target.value)}
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
                    placeholder="Nome completo conforme documento"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    data-testid="input-nome-civil"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    data-testid="input-data-nascimento"
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

              <div className="space-y-2">
                <Label>Endereço Completo</Label>
                <Input
                  placeholder="Rua, número, bairro, cidade, estado, CEP"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  data-testid="input-endereco"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Telefone</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    data-testid="input-telefone"
                  />
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
                  <Select value={banco} onValueChange={setBanco}>
                    <SelectTrigger>
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
                  <Input placeholder="0000" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conta com Dígito</Label>
                  <Input placeholder="00000-0" value={conta} onChange={(e) => setConta(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Chave Pix</Label>
                  <Input placeholder="CPF, e-mail, telefone ou chave aleatória" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Titular da Conta</Label>
                <Input placeholder="Nome completo do titular da conta" value={titularConta} onChange={(e) => setTitularConta(e.target.value)} />
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
                  <Label>Perfil Spotify</Label>
                  <Input
                    placeholder="https://open.spotify.com/artist/..."
                    value={spotify}
                    onChange={(e) => setSpotify(e.target.value)}
                    data-testid="input-spotify-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input placeholder="https://instagram.com/perfil" value={instagram} onChange={(e) => setInstagram(e.target.value)} data-testid="input-instagram-url" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>YouTube</Label>
                  <Input
                    placeholder="https://youtube.com/channel/UC..."
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    data-testid="input-youtube-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TikTok</Label>
                  <Input placeholder="https://tiktok.com/@perfil" value={tiktok} onChange={(e) => setTiktok(e.target.value)} data-testid="input-tiktok-url" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SoundCloud</Label>
                  <Input placeholder="https://soundcloud.com/perfil" value={soundcloud} onChange={(e) => setSoundcloud(e.target.value)} data-testid="input-soundcloud-url" />
                </div>
                <div className="space-y-2">
                  <Label>Deezer</Label>
                  <Input placeholder="https://deezer.com/artist/..." value={deezer} onChange={(e) => setDeezer(e.target.value)} data-testid="input-deezer-url" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Apple Music</Label>
                <Input placeholder="https://music.apple.com/artist/..." value={appleMusic} onChange={(e) => setAppleMusic(e.target.value)} data-testid="input-apple-music-url" />
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Cole as URLs públicas dos perfis. O sistema extrai automaticamente
                os identificadores do Spotify e YouTube para buscar métricas
                reais (seguidores, inscritos e visualizações).
              </p>
            </div>

            {/* ═══ 5. Tipo de Perfil ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">5.</span>
                <h3 className="text-lg font-semibold">Tipo de Perfil</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Tipo de Perfil</Label>
                <Select value={tipoPerfil} onValueChange={(v) => setTipoPerfil(v as TipoPerfil)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    <SelectItem value="independente">Independente</SelectItem>
                    <SelectItem value="com_empresario">Com Empresário</SelectItem>
                    <SelectItem value="gravadora">Gravadora</SelectItem>
                    <SelectItem value="editora">Editora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoPerfil === "com_empresario" && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                  <h4 className="font-medium">Dados do Empresário</h4>
                  <div className="space-y-2">
                    <Label>Nome (buscar no CRM)</Label>
                    <Select value={empresarioId} onValueChange={handleEmpresarioSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um contato do CRM" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        {contatosCRM.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone / WhatsApp</Label>
                      <Input placeholder="(00) 00000-0000" value={empresarioTelefone} onChange={(e) => setEmpresarioTelefone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@exemplo.com" value={empresarioEmail} onChange={(e) => setEmpresarioEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {(tipoPerfil === "gravadora" || tipoPerfil === "editora") && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                  <h4 className="font-medium">Dados da {tipoPerfil === "gravadora" ? "Gravadora" : "Editora"}</h4>
                  <div className="space-y-2">
                    <Label>Nome (buscar no CRM)</Label>
                    <Select value={gravadoraId || "none"} onValueChange={(v) => v === "none" ? setGravadoraId("") : handleGravadoraSelect(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Selecione uma ${tipoPerfil === "gravadora" ? "gravadora" : "editora"} do CRM`} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="none">Selecione...</SelectItem>
                        {gravadorasCRM.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={gravadoraTelefone} onChange={(e) => setGravadoraTelefone(e.target.value)} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@exemplo.com" value={gravadoraEmail} onChange={(e) => setGravadoraEmail(e.target.value)} disabled />
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <h4 className="font-medium">Responsável pelo Contato</h4>
                  <div className="space-y-2">
                    <Label>Nome do Responsável (buscar no CRM)</Label>
                    <Select
                      value={gravadoraResponsavelId || "none"}
                      onValueChange={(v) => v === "none" ? setGravadoraResponsavelId("") : handleResponsavelGravadoraSelect(v)}
                      disabled={!gravadoraId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={gravadoraId ? "Selecione um responsável" : "Selecione uma gravadora primeiro"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="none">Selecione...</SelectItem>
                        {pessoasFisicasCRM.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={gravadoraResponsavelTelefone} onChange={(e) => setGravadoraResponsavelTelefone(e.target.value)} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@exemplo.com" value={gravadoraResponsavelEmail} onChange={(e) => setGravadoraResponsavelEmail(e.target.value)} disabled />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ 6. Distribuidora / Agregadora ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">6.</span>
                <h3 className="text-lg font-semibold">Distribuidora / Agregadora</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Selecione as distribuidoras</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DISTRIBUIDORAS.map((dist) => (
                    <div key={dist.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dist-${dist.id}`}
                        checked={distribuidorasSelecionadas[dist.id] || false}
                        onCheckedChange={() => handleDistribuidoraToggle(dist.id)}
                      />
                      <Label htmlFor={`dist-${dist.id}`} className="cursor-pointer text-sm">{dist.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {Object.entries(distribuidorasSelecionadas).filter(([, selected]) => selected).map(([id]) => {
                const dist = DISTRIBUIDORAS.find((d) => d.id === id);
                if (!dist) return null;
                return (
                  <div key={id} className="space-y-2">
                    <Label>Email {dist.label}</Label>
                    <Input
                      type="email"
                      placeholder={`Email cadastrado na ${dist.label}`}
                      value={distribuidorasEmails[id] || ""}
                      onChange={(e) => handleDistribuidoraEmailChange(id, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>

            {/* ═══ 7. Observações ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">7.</span>
                <h3 className="text-lg font-semibold">Observações</h3>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Notas internas, informações adicionais de contrato, rider técnico, preferências..."
                  value={notasInternas}
                  onChange={(e) => setNotasInternas(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-observacoes"
                />
              </div>
            </div>

            {/* ═══ 8. Mídia ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">8.</span>
                <h3 className="text-lg font-semibold">Mídia</h3>
              </div>
              <Separator />

              {/* Galeria de fotos */}
              <div className="space-y-2">
                <Label>Galeria de Fotos (URLs)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://exemplo.com/foto.jpg"
                    value={galeriaInput}
                    onChange={(e) => setGaleriaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && galeriaInput.trim()) {
                        e.preventDefault();
                        setGaleriaUrls((prev) => [...prev, galeriaInput.trim()]);
                        setGaleriaInput("");
                      }
                    }}
                    data-testid="input-galeria-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (galeriaInput.trim()) {
                        setGaleriaUrls((prev) => [...prev, galeriaInput.trim()]);
                        setGaleriaInput("");
                      }
                    }}
                    data-testid="button-add-galeria"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {galeriaUrls.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {galeriaUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/40 rounded text-sm">
                        <span className="flex-1 truncate text-muted-foreground">{url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setGaleriaUrls((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vídeo de apresentação */}
              <div className="space-y-2">
                <Label>Vídeo de Apresentação (YouTube URL)</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoApresentacaoUrl}
                  onChange={(e) => setVideoApresentacaoUrl(e.target.value)}
                  data-testid="input-video-apresentacao"
                />
              </div>
            </div>

            {/* ═══ 9. Relacionamentos ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">9.</span>
                <h3 className="text-lg font-semibold">Relacionamentos</h3>
              </div>
              <Separator />

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
                    placeholder="Telefone ou e-mail"
                    value={managerContato}
                    onChange={(e) => setManagerContato(e.target.value)}
                    data-testid="input-manager-contato"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produtor Executivo</Label>
                  <Input
                    placeholder="Nome do produtor executivo"
                    value={produtorExecutivo}
                    onChange={(e) => setProdutorExecutivo(e.target.value)}
                    data-testid="input-produtor-executivo"
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
                <div className="col-span-2 space-y-2">
                  <Label>Label Parceira</Label>
                  <Input
                    placeholder="Nome da gravadora / label parceira"
                    value={labelParceira}
                    onChange={(e) => setLabelParceira(e.target.value)}
                    data-testid="input-label-parceira"
                  />
                </div>
              </div>
            </div>

            {/* ═══ 10. Documentos Vinculados ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">10.</span>
                <h3 className="text-lg font-semibold">Documentos Vinculados</h3>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Adicionar Documento</Label>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Nome (ex: Press Kit 2025)"
                    value={docNomeInput}
                    onChange={(e) => setDocNomeInput(e.target.value)}
                    data-testid="input-doc-nome"
                  />
                  <Input
                    placeholder="URL do documento"
                    value={docUrlInput}
                    onChange={(e) => setDocUrlInput(e.target.value)}
                    data-testid="input-doc-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (docNomeInput.trim() && docUrlInput.trim()) {
                        setDocumentosList((prev) => [...prev, { nome: docNomeInput.trim(), url: docUrlInput.trim() }]);
                        setDocNomeInput("");
                        setDocUrlInput("");
                      }
                    }}
                    data-testid="button-add-documento"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {documentosList.length > 0 && (
                <div className="space-y-1">
                  {documentosList.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/40 rounded text-sm">
                      <span className="font-medium min-w-[120px]">{doc.nome}</span>
                      <span className="flex-1 truncate text-muted-foreground">{doc.url}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setDocumentosList((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
            onClick={handleSubmit}
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
