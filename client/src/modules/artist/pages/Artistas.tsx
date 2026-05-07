import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Users, Phone, Mail, Sparkles, Music,
  DollarSign, Calendar, CheckCircle, Search, PlusCircle, Pencil, Trash2,
  MoreVertical, Upload, Download,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiSpotify, SiSoundcloud, SiApplemusic } from "react-icons/si";

import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { ArtistaPlatformMetrics } from "@/modules/artist/components/ArtistaPlatformMetrics";
import { useArtistasAssinados } from "@/modules/artist/hooks/useArtistasAssinados";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useMetrics } from "@/shared/hooks/useMetrics";
import { ContratoStatusBadge, getContratoSituacao } from "@/shared/components/ContratoStatusBadge";
import { formatCurrency } from "@/shared/lib/format-utils";
import { ArtistaVisao360Modal } from "@/modules/artist/components/ArtistaVisao360Modal";
import { ArtistaFormModal } from "@/modules/artist/components/ArtistaFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { ArtistasSkeleton } from "@/shared/components/PageSkeletons";
import { toast } from "sonner";
import {
  artistaToExportRow,
  importRowToArtista,
} from "@/modules/artist/mappers";

const getXLSX = () => import("xlsx");

const DISTRIBUIDORAS = [
  { id: "onerpm",    label: "ONErpm" },
  { id: "distrokid", label: "DistroKid" },
  { id: "30por1",    label: "30 Por 1" },
  { id: "symphonic", label: "Symphonic" },
  { id: "somvibe",   label: "Somvibe" },
  { id: "soundon",   label: "SoundOn" },
  { id: "musicpro",  label: "MusicPro" },
];
const DISTRIBUIDORAS_LABELS: Record<string, string> = Object.fromEntries(
  DISTRIBUIDORAS.map((d) => [d.id, d.label])
);

export default function Artistas() {
  const navigate = useNavigate();
  const { id: editIdFromUrl } = useParams<{ id?: string }>();
  const { artistas: artistasComContrato } = useArtistasAssinados();
  const { artistas: todosArtistas, deleteArtista, addArtista, isLoading: artistasLoading } = useArtistas();
  const excelInputRef = useRef<HTMLInputElement>(null);

  const { eventos } = useEventos();
  const { contratos } = useContratos();

  const contratosPorArtista = useMemo(() => {
    const map = new Map<string, Array<{ status?: string | null; data_fim?: string | null; exclusivo?: boolean | null }>>();
    for (const c of contratos as Array<{ artista_id?: string | null; status?: string | null; data_fim?: string | null; exclusivo?: boolean | null }>) {
      if (!c.artista_id) continue;
      const arr = map.get(c.artista_id) ?? [];
      arr.push({ status: c.status, data_fim: c.data_fim, exclusivo: c.exclusivo });
      map.set(c.artista_id, arr);
    }
    return map;
  }, [contratos]);

  const ATIVO_STATUSES_VINCULO = new Set(["ativo", "assinado", "vigente", "vencendo"]);
  const getVinculoBadge = (artistaId: string) => {
    const cs = contratosPorArtista.get(artistaId);
    const isExclusivo = cs?.some(
      c => c.exclusivo === true && ATIVO_STATUSES_VINCULO.has((c.status || "").toLowerCase())
    ) ?? false;
    return isExclusivo
      ? <Badge className="bg-success hover:bg-success text-success-foreground text-xs px-2 py-0.5">Artista exclusivo</Badge>
      : <Badge className="bg-primary hover:bg-primary text-primary-foreground text-xs px-2 py-0.5">Artista parceiro</Badge>;
  };

  const { artistasMetrics, isLoading: metricsLoading } = useMetrics();
  const isLoading = artistasLoading || metricsLoading;
  const metricas = artistasMetrics;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [generoFilter, setGeneroFilter] = useState<string>("todos");

  // Modals state
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; artista?: Artista }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; artista?: Artista }>({ open: false });
  const [visao360Modal, setVisao360Modal] = useState<{ open: boolean; artista?: Artista }>({ open: false });

  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  const getArtistaShows = (artistaId: string) =>
    eventos.filter(e => e.artista_id === artistaId && e.tipo_evento === "Show");
  const getArtistaShowsAgendados = (artistaId: string) =>
    eventos.filter(e => e.artista_id === artistaId && e.tipo_evento === "Show" && (e.status === "Confirmado" || e.status === "Pendente"));
  const getArtistaShowsRealizados = (artistaId: string) =>
    eventos.filter(e => e.artista_id === artistaId && e.tipo_evento === "Show" && e.status === "Realizado");

  const generosUnicos = useMemo(() => {
    const generos = todosArtistas.map(a => a.genero_musical).filter(Boolean);
    return ([...new Set(generos)] as string[]).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todosArtistas]);

  const artistasFiltrados = useMemo(() => {
    return todosArtistas.filter(artista => {
      const matchesSearch =
        searchTerm === "" ||
        artista.nome_artistico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista.nome_civil?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista.genero_musical?.toLowerCase().includes(searchTerm.toLowerCase());
      const cs = contratosPorArtista.get(artista.id);
      const isExclusivo = cs?.some(
        c => c.exclusivo === true && ATIVO_STATUSES_VINCULO.has((c.status || "").toLowerCase())
      ) ?? false;
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "exclusivo" && isExclusivo) ||
        (statusFilter === "parceiro" && !isExclusivo);
      const matchesGenero = generoFilter === "todos" || artista.genero_musical === generoFilter;
      return matchesSearch && matchesStatus && matchesGenero;
    }).sort((a, b) => a.nome_artistico.localeCompare(b.nome_artistico, "pt-BR", { sensitivity: "base" }));
  }, [todosArtistas, searchTerm, statusFilter, generoFilter, contratosPorArtista]);

  const handleDelete = () => {
    if (deleteModal.artista) {
      deleteArtista.mutate(deleteModal.artista.id);
      setDeleteModal({ open: false });
    }
  };

  const handleExcelExport = async () => {
    if (todosArtistas.length === 0) {
      toast.error("Nenhum artista para exportar");
      return;
    }
    try {
      const XLSX = await getXLSX();
      const exportData = todosArtistas.map(artistaToExportRow);
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = Object.keys(exportData[0] ?? {}).map((k) => ({
        wch: Math.max(k.length + 2, 18),
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Artistas");
      XLSX.writeFile(workbook, `artistas_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`${todosArtistas.length} artista(s) exportado(s) com sucesso!`);
    } catch {
      toast.error("Erro ao exportar arquivo Excel");
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await getXLSX();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);
      if (data.length === 0) {
        toast.error("Arquivo Excel vazio");
        return;
      }
      let importados = 0;
      for (const row of data) {
        const payload = importRowToArtista(row);
        if (!payload) continue;
        await addArtista.mutateAsync(payload as any);
        importados++;
      }
      toast.success(`${importados} artista(s) importado(s) com sucesso!`);
    } catch {
      toast.error("Erro ao importar arquivo Excel. Verifique se o formato está correto.");
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setGeneroFilter("todos");
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "todos" || generoFilter !== "todos";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
      case "contratado":
        return <Badge className="bg-success hover:bg-success text-success-foreground text-xs px-2 py-0.5">Ativo</Badge>;
      case "parceiro":
        return <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs px-2 py-0.5">Parceiro</Badge>;
      case "inativo":
        return <Badge className="bg-slate-500 hover:bg-slate-500 text-white text-xs px-2 py-0.5">Inativo</Badge>;
      case "em_negociacao":
        return <Badge className="bg-yellow-600 hover:bg-yellow-600 text-white text-xs px-2 py-0.5">Em Negociação</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-2 py-0.5">{status?.replace(/_/g, ' ')}</Badge>;
    }
  };

  const getInitials = (nome: string) =>
    nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const toggleSelectAll = () => {
    if (selectedArtists.length === artistasFiltrados.length) {
      setSelectedArtists([]);
    } else {
      setSelectedArtists(artistasFiltrados.map(a => a.id));
    }
  };

  const toggleSelectArtist = (id: string) => {
    if (selectedArtists.includes(id)) {
      setSelectedArtists(selectedArtists.filter(a => a !== id));
    } else {
      setSelectedArtists([...selectedArtists, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedArtists.length === 0) return;
    selectedArtists.forEach(id => deleteArtista.mutate(id));
    toast.success(`${selectedArtists.length} artista(s) excluído(s) com sucesso`);
    setSelectedArtists([]);
  };

  useEffect(() => {
    if (!editIdFromUrl || isLoading) return;
    const found =
      todosArtistas.find((a) => a.id === editIdFromUrl) ||
      artistasComContrato.find((a) => a.id === editIdFromUrl);
    if (found) setEditModal({ open: true, artista: found });
  }, [editIdFromUrl, isLoading, todosArtistas, artistasComContrato]);

  if (isLoading) {
    return <ArtistasSkeleton />;
  }

  return (
    <MainLayout
      title="Artistas"
      description="Visão geral de todos os artistas"
      actions={
        <>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelImport}
            data-testid="input-import-excel"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => excelInputRef.current?.click()}
            data-testid="button-importar-excel"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExcelExport}
            data-testid="button-exportar-excel"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setCreateModal(true)}
            data-testid="button-novo-artista"
          >
            <PlusCircle className="h-4 w-4" />
            Novo Artista
          </Button>
        </>
      }
    >
      <div className="space-y-6 pt-[10px] pb-[10px]">
        <div className="space-y-6 pt-[10px] pb-[10px]">
          {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total de Artistas</span>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-2">{metricas.totalArtistas}</p>
                  <p className="text-xs text-muted-foreground mt-1">no casting</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total de Shows</span>
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-2">{metricas.totalShows}</p>
                  <p className="text-xs text-muted-foreground mt-1">shows vendidos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Shows Agendados</span>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-2">{metricas.showsAgendados}</p>
                  <p className="text-xs text-muted-foreground mt-1">pendentes/confirmados</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Shows Realizados</span>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-2">{metricas.showsRealizados}</p>
                  <p className="text-xs text-muted-foreground mt-1">executados</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Receita em Shows</span>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(metricas.receitaTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">total vendido</p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, gênero..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border">
                  <SelectValue placeholder="Todos os artistas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os artistas</SelectItem>
                  <SelectItem value="exclusivo">Artista exclusivo</SelectItem>
                  <SelectItem value="parceiro">Artista parceiro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={generoFilter} onValueChange={setGeneroFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border">
                  <SelectValue placeholder="Todos Gêneros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Gêneros</SelectItem>
                  {generosUnicos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar
                </Button>
              )}
            </div>

            {/* Select All */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
              <Checkbox
                checked={selectedArtists.length === artistasFiltrados.length && artistasFiltrados.length > 0}
                onCheckedChange={toggleSelectAll}
                className="border-muted-foreground"
              />
              <span className="text-sm text-muted-foreground flex-1">Selecionar todos</span>
              {selectedArtists.length > 0 && (
                <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir ({selectedArtists.length})
                </Button>
              )}
              {hasActiveFilters && (
                <span className="text-sm text-muted-foreground" data-testid="text-contagem-artistas">
                  {artistasFiltrados.length} de {artistasComContrato.length} artistas
                </span>
              )}
            </div>

            {/* Lista de Artistas */}
            <div className="space-y-4">
              {artistasFiltrados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p data-testid="text-empty-title">
                    {hasActiveFilters ? "Nenhum artista corresponde aos filtros aplicados" : "Nenhum artista com contrato assinado"}
                  </p>
                  <p className="text-sm mt-2" data-testid="text-empty-description">
                    {hasActiveFilters
                      ? "Tente ajustar a busca ou limpar os filtros"
                      : "Cadastre um contato como artista no CRM e assine um contrato para que ele apareça aqui."}
                  </p>
                </div>
              ) : (
                artistasFiltrados.map(artista => (
                  <div key={artista.id}>
                    {/* Artist Card */}
                    <div className="border rounded-lg bg-card p-4">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="pt-6">
                          <Checkbox
                            checked={selectedArtists.includes(artista.id)}
                            onCheckedChange={() => toggleSelectArtist(artista.id)}
                            className="border-primary data-[state=checked]:bg-primary"
                          />
                        </div>

                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <Avatar className="h-16 w-16">
                            {artista.foto_url && (
                              <AvatarImage src={artista.foto_url} alt={artista.nome_artistico} className="object-cover" />
                            )}
                            <AvatarFallback className="bg-muted text-foreground text-xl font-semibold">
                              {getInitials(artista.nome_artistico)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-1 lg:grid-cols-[0.6fr_auto_1.4fr] gap-4">
                            {/* Column 1: Artist Info */}
                            <div className="space-y-2">
                              <div>
                                <h3 className="font-semibold text-lg text-foreground">{artista.nome_artistico}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                {artista.genero_musical && (
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">{artista.genero_musical}</Badge>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 text-sm text-muted-foreground pt-1">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" />
                                  {artista.telefone || "Não informado"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {artista.email || "Não informado"}
                                </span>
                              </div>
                            </div>

                            {/* Column 2: Social Networks & Stats */}
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-foreground mb-1">Redes Sociais</p>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const instagramUrl = artista.instagram || null;
                                    const tiktokUrl = artista.tiktok || null;
                                    const youtubeUrl = artista.youtube_channel_id
                                      ? `https://www.youtube.com/channel/${artista.youtube_channel_id}`
                                      : null;
                                    const spotifyUrl = artista.spotify_artist_id
                                      ? `https://open.spotify.com/artist/${artista.spotify_artist_id}`
                                      : null;
                                    const deezerUrl = artista.deezer_url || null;
                                    const appleMusicUrl = artista.apple_music_url || null;
                                    const soundcloudUrl = artista.soundcloud_url || null;
                                    const links = [
                                      { url: instagramUrl,  icon: <SiInstagram  className="h-5 w-5" />, label: "Instagram"   },
                                      { url: tiktokUrl,     icon: <SiTiktok     className="h-5 w-5" />, label: "TikTok"      },
                                      { url: youtubeUrl,    icon: <SiYoutube    className="h-5 w-5" />, label: "YouTube"     },
                                      { url: spotifyUrl,    icon: <SiSpotify    className="h-5 w-5" />, label: "Spotify"     },
                                      { url: deezerUrl,     icon: <Music        className="h-5 w-5" />, label: "Deezer"      },
                                      { url: appleMusicUrl, icon: <SiApplemusic className="h-5 w-5" />, label: "Apple Music" },
                                      { url: soundcloudUrl, icon: <SiSoundcloud className="h-5 w-5" />, label: "SoundCloud"  },
                                    ];
                                    return links.map(({ url, icon, label }) =>
                                      url ? (
                                        <a
                                          key={label}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={label}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-foreground hover:text-primary transition-colors"
                                        >
                                          {icon}
                                        </a>
                                      ) : (
                                        <span key={label} title={`${label} não cadastrado`} className="text-muted-foreground/40">
                                          {icon}
                                        </span>
                                      )
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-foreground">{getArtistaShows(artista.id).length}</p>
                                  <p className="text-xs text-muted-foreground">Shows</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-foreground">{getArtistaShowsAgendados(artista.id).length}</p>
                                  <p className="text-xs text-muted-foreground">Agendados</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-foreground">{getArtistaShowsRealizados(artista.id).length}</p>
                                  <p className="text-xs text-muted-foreground">Realizados</p>
                                </div>
                              </div>
                            </div>

                            {/* Column 3: Profile Type Info + Action Buttons */}
                            <div className="space-y-3 flex flex-row">
                              <div className="space-y-1 max-w-[220px]">
                                {(() => {
                                  const tp = artista.tipo_perfil as string | null | undefined;
                                  if (tp === "com_empresario") {
                                    return (
                                      <>
                                        <p className="text-sm font-medium text-foreground">Perfil: Com Empresário</p>
                                        {artista.empresario_nome && <p className="text-sm"><span className="text-foreground">Nome:</span> <span className="text-muted-foreground">{artista.empresario_nome}</span></p>}
                                        {artista.empresario_telefone && <p className="text-sm"><span className="text-foreground">Tel:</span> <span className="text-muted-foreground">{artista.empresario_telefone}</span></p>}
                                        {artista.empresario_email && <p className="text-sm"><span className="text-foreground">Email:</span> <span className="text-muted-foreground">{artista.empresario_email}</span></p>}
                                      </>
                                    );
                                  }
                                  if (tp === "gravadora" || tp === "editora") {
                                    const label = tp === "gravadora" ? "Gravadora" : "Editora";
                                    return (
                                      <>
                                        <p className="text-sm font-medium text-foreground">Perfil: {label}</p>
                                        {artista.gravadora_nome && <p className="text-sm"><span className="text-foreground">Nome:</span> <span className="text-muted-foreground">{artista.gravadora_nome}</span></p>}
                                        {artista.gravadora_responsavel_nome && <p className="text-sm"><span className="text-foreground">Resp.:</span> <span className="text-muted-foreground">{artista.gravadora_responsavel_nome}</span></p>}
                                        {artista.gravadora_telefone && <p className="text-sm"><span className="text-foreground">Tel:</span> <span className="text-muted-foreground">{artista.gravadora_telefone}</span></p>}
                                        {artista.gravadora_email && <p className="text-sm"><span className="text-foreground">Email:</span> <span className="text-muted-foreground">{artista.gravadora_email}</span></p>}
                                      </>
                                    );
                                  }
                                  return (
                                    <p className="text-sm font-medium text-foreground">Perfil: Independente</p>
                                  );
                                })()}
                              </div>

                              {/* Action Buttons: Visão 360° (visible) + 3-dot dropdown */}
                              <div className="flex-wrap gap-1 ml-auto flex items-center justify-end">
                                <Button
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90 text-white gap-1"
                                  onClick={() => setVisao360Modal({ open: true, artista: artista as any })}
                                  data-testid={`button-visao360-${artista.id}`}
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Visão 360°
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      data-testid={`button-menu-${artista.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => setEditModal({ open: true, artista })}
                                      data-testid={`menu-edit-${artista.id}`}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeleteModal({ open: true, artista: artista as any })}
                                      data-testid={`menu-delete-${artista.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Platform Metrics — Spotify/YouTube/Deezer vêm das Edge
                        Functions (Tasks #340 e #354). Apple Music e SoundCloud
                        mostram apenas o link do perfil cadastrado (sem
                        integração de métricas pública por enquanto).
                        Instagram/TikTok permanecem como placeholder até
                        integração própria. */}
                    <ArtistaPlatformMetrics
                      artistaId={artista.id}
                      instagramUrl={(artista as Artista).instagram ?? null}
                      instagramSeguidores={(artista as Artista).instagram_seguidores ?? null}
                      tiktokUrl={(artista as Artista).tiktok ?? null}
                      tiktokSeguidores={(artista as Artista).tiktok_seguidores ?? null}
                      spotifyArtistId={(artista as Artista).spotify_artist_id}
                      spotifyOuvintes={(artista as Artista).spotify_ouvintes ?? null}
                      youtubeChannelId={(artista as Artista).youtube_channel_id}
                      youtubeInscritos={(artista as Artista).youtube_inscritos ?? null}
                      deezerUrl={(artista as Artista).deezer_url}
                      deezerFas={(artista as Artista).deezer_fas ?? null}
                      appleMusicUrl={(artista as Artista).apple_music_url}
                      appleMusicAlbuns={(artista as Artista).apple_music_albuns ?? null}
                      soundcloudUrl={(artista as Artista).soundcloud_url}
                      soundcloudSeguidores={(artista as Artista).soundcloud_seguidores ?? null}
                    />
                  </div>
                ))
              )}
            </div>
        </div>
      </div>

      {/* Modals */}
      <ArtistaFormModal open={createModal} onOpenChange={setCreateModal} />

      <ArtistaFormModal
        open={editModal.open}
        onOpenChange={open => {
          setEditModal(prev => ({ ...prev, open }));
          if (!open && editIdFromUrl) navigate("/artistas");
        }}
        artista={editModal.artista}
      />


      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={open => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Artista"
        description="Tem certeza que deseja excluir este artista? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
      />

      <ArtistaVisao360Modal
        open={visao360Modal.open}
        onOpenChange={open => setVisao360Modal({ ...visao360Modal, open })}
        artista={visao360Modal.artista as any}
      />
    </MainLayout>
  );
}
