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
  MoreVertical, Upload, Download, X,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiSpotify, SiSoundcloud, SiApplemusic } from "react-icons/si";

import { useArtistas, type Artista } from "@/modules/artist/hooks/useArtistas";
import { ArtistaPlatformMetrics } from "@/modules/artist/components/ArtistaPlatformMetrics";
import { useArtistasAssinados } from "@/modules/artist/hooks/useArtistasAssinados";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useMetrics } from "@/shared/hooks/useMetrics";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { EmptyState } from "@/shared/components/EmptyState";
import { MetricCard } from "@/shared/components/MetricCard";
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
import { cn } from "@/shared/lib/utils";

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

  const getVinculoLabel = (artistaId: string): { label: string; status: string } => {
    const cs = contratosPorArtista.get(artistaId);
    const isExclusivo = cs?.some(
      (c) => c.exclusivo === true && ATIVO_STATUSES_VINCULO.has((c.status || "").toLowerCase())
    ) ?? false;
    return isExclusivo
      ? { label: "Exclusivo", status: "ativo" }
      : { label: "Parceiro", status: "confirmed" };
  };

  const { artistasMetrics, isLoading: metricsLoading } = useMetrics();
  const isLoading = artistasLoading || metricsLoading;
  const metricas = artistasMetrics;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [generoFilter, setGeneroFilter] = useState<string>("todos");

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; artista?: Artista }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; artista?: Artista }>({ open: false });
  const [visao360Modal, setVisao360Modal] = useState<{ open: boolean; artista?: Artista }>({ open: false });
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  const getArtistaShows = (artistaId: string) =>
    eventos.filter((e) => e.artista_id === artistaId && e.tipo_evento === "Show");
  const getArtistaShowsAgendados = (artistaId: string) =>
    eventos.filter((e) => e.artista_id === artistaId && e.tipo_evento === "Show" && (e.status === "Confirmado" || e.status === "Pendente"));
  const getArtistaShowsRealizados = (artistaId: string) =>
    eventos.filter((e) => e.artista_id === artistaId && e.tipo_evento === "Show" && e.status === "Realizado");

  const generosUnicos = useMemo(() => {
    const generos = todosArtistas.map((a) => a.genero_musical).filter(Boolean);
    return ([...new Set(generos)] as string[]).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todosArtistas]);

  const artistasFiltrados = useMemo(() => {
    return todosArtistas.filter((artista) => {
      const matchesSearch =
        searchTerm === "" ||
        artista.nome_artistico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista.nome_civil?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artista.genero_musical?.toLowerCase().includes(searchTerm.toLowerCase());
      const cs = contratosPorArtista.get(artista.id);
      const isExclusivo = cs?.some(
        (c) => c.exclusivo === true && ATIVO_STATUSES_VINCULO.has((c.status || "").toLowerCase())
      ) ?? false;
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "exclusivo" && isExclusivo) ||
        (statusFilter === "parceiro" && !isExclusivo) ||
        (statusFilter === "onboarding" && artista.status === "onboarding");
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

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const toggleSelectAll = () => {
    if (selectedArtists.length === artistasFiltrados.length) {
      setSelectedArtists([]);
    } else {
      setSelectedArtists(artistasFiltrados.map((a) => a.id));
    }
  };

  const toggleSelectArtist = (id: string) => {
    setSelectedArtists((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedArtists.length === 0) return;
    selectedArtists.forEach((id) => deleteArtista.mutate(id));
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

  if (isLoading) return <ArtistasSkeleton />;

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
            className="h-8 text-xs gap-1.5"
            onClick={() => excelInputRef.current?.click()}
            data-testid="button-importar-excel"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleExcelExport}
            data-testid="button-exportar-excel"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setCreateModal(true)}
            data-testid="button-novo-artista"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Novo Artista
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Total de Artistas"
            value={metricas.totalArtistas}
            description="no casting"
            icon={Users}
            accent="primary"
          />
          <MetricCard
            title="Total de Shows"
            value={metricas.totalShows}
            description="shows vendidos"
            icon={Music}
            accent="primary"
          />
          <MetricCard
            title="Shows Agendados"
            value={metricas.showsAgendados}
            description="pendentes/confirmados"
            icon={Calendar}
            accent="warning"
          />
          <MetricCard
            title="Shows Realizados"
            value={metricas.showsRealizados}
            description="executados"
            icon={CheckCircle}
            accent="success"
          />
          <MetricCard
            title="Receita em Shows"
            value={formatCurrency(metricas.receitaTotal)}
            description="total vendido"
            icon={DollarSign}
            accent="success"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, gênero…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm bg-card border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos os artistas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os artistas</SelectItem>
              <SelectItem value="exclusivo">Artista exclusivo</SelectItem>
              <SelectItem value="parceiro">Artista parceiro</SelectItem>
              <SelectItem value="onboarding">Em Onboarding</SelectItem>
            </SelectContent>
          </Select>
          <Select value={generoFilter} onValueChange={setGeneroFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos Gêneros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Gêneros</SelectItem>
              {generosUnicos.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3" />
              Limpar
            </Button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground ml-auto" data-testid="text-contagem-artistas">
              {artistasFiltrados.length} de {todosArtistas.length} artistas
            </span>
          )}
        </div>

        {/* ── Bulk Selection Bar ── */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Checkbox
            checked={selectedArtists.length === artistasFiltrados.length && artistasFiltrados.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-xs text-muted-foreground flex-1">
            {selectedArtists.length > 0
              ? `${selectedArtists.length} artista(s) selecionado(s)`
              : "Selecionar todos"}
          </span>
          {selectedArtists.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleBulkDelete}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir ({selectedArtists.length})
            </Button>
          )}
        </div>

        {/* ── Artists List ── */}
        <div className="space-y-3">
          {artistasFiltrados.length === 0 ? (
            <EmptyState
              icon={Users}
              title={hasActiveFilters ? "Nenhum resultado" : "Nenhum artista cadastrado"}
              description={
                hasActiveFilters
                  ? "Nenhum artista corresponde aos filtros aplicados. Tente ajustar a busca."
                  : "Cadastre um contato como artista no CRM e assine um contrato para que ele apareça aqui."
              }
              actionLabel={hasActiveFilters ? undefined : "Cadastrar Artista"}
              onAction={hasActiveFilters ? undefined : () => setCreateModal(true)}
            />
          ) : (
            artistasFiltrados.map((artista) => {
              const vinculo = getVinculoLabel(artista.id);
              const totalShows = getArtistaShows(artista.id).length;
              const agendados = getArtistaShowsAgendados(artista.id).length;
              const realizados = getArtistaShowsRealizados(artista.id).length;

              return (
                <div key={artista.id}>
                  <Card className="group hover:shadow-md transition-shadow duration-200" data-testid={`card-artista-${artista.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedArtists.includes(artista.id)}
                            onCheckedChange={() => toggleSelectArtist(artista.id)}
                          />
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-12 w-12 shrink-0">
                          {artista.foto_url && (
                            <AvatarImage src={artista.foto_url} alt={artista.nome_artistico} className="object-cover" />
                          )}
                          <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                            {getInitials(artista.nome_artistico)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-1 lg:grid-cols-[0.6fr_auto_1.4fr] gap-4">

                            {/* Col 1: Identity */}
                            <div className="space-y-2">
                              <div className="flex items-start gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm leading-tight text-foreground">
                                  {artista.nome_artistico}
                                </h3>
                                {artista.status === "onboarding" ? (
                                  <StatusBadge status="onboarding" label="Onboarding" />
                                ) : (
                                  <StatusBadge status={vinculo.status} label={vinculo.label} />
                                )}
                              </div>
                              {artista.genero_musical && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground h-5">
                                  {artista.genero_musical}
                                </Badge>
                              )}
                              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Phone className="h-3 w-3" />
                                  {artista.telefone || "Não informado"}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Mail className="h-3 w-3" />
                                  {artista.email || "Não informado"}
                                </span>
                              </div>
                            </div>

                            {/* Col 2: Social + Stats */}
                            <div className="space-y-3">
                              {/* Social links */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Redes</p>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const links = [
                                      { url: artista.instagram, icon: <SiInstagram className="h-4 w-4" />, label: "Instagram" },
                                      { url: artista.tiktok, icon: <SiTiktok className="h-4 w-4" />, label: "TikTok" },
                                      {
                                        url: artista.youtube_channel_id
                                          ? `https://www.youtube.com/channel/${artista.youtube_channel_id}`
                                          : null,
                                        icon: <SiYoutube className="h-4 w-4" />, label: "YouTube",
                                      },
                                      {
                                        url: artista.spotify_artist_id
                                          ? `https://open.spotify.com/artist/${artista.spotify_artist_id}`
                                          : null,
                                        icon: <SiSpotify className="h-4 w-4" />, label: "Spotify",
                                      },
                                      { url: artista.deezer_url, icon: <Music className="h-4 w-4" />, label: "Deezer" },
                                      { url: artista.apple_music_url, icon: <SiApplemusic className="h-4 w-4" />, label: "Apple Music" },
                                      { url: artista.soundcloud_url, icon: <SiSoundcloud className="h-4 w-4" />, label: "SoundCloud" },
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
                                          className="text-muted-foreground hover:text-primary transition-colors"
                                        >
                                          {icon}
                                        </a>
                                      ) : (
                                        <span key={label} title={`${label} não cadastrado`} className="text-muted-foreground/25">
                                          {icon}
                                        </span>
                                      )
                                    );
                                  })()}
                                </div>
                              </div>

                            </div>

                            {/* Col 3: Profile type + Actions */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5 text-xs">
                                {(() => {
                                  const tp = artista.tipo_perfil as string | null | undefined;
                                  if (tp === "com_empresario") {
                                    return (
                                      <>
                                        <p className="font-medium text-foreground">Com Empresário</p>
                                        {artista.empresario_nome && (
                                          <p className="text-muted-foreground">{artista.empresario_nome}</p>
                                        )}
                                        {artista.empresario_telefone && (
                                          <p className="text-muted-foreground">{artista.empresario_telefone}</p>
                                        )}
                                        {artista.empresario_email && (
                                          <p className="text-muted-foreground">{artista.empresario_email}</p>
                                        )}
                                      </>
                                    );
                                  }
                                  if (tp === "gravadora" || tp === "editora") {
                                    const label = tp === "gravadora" ? "Gravadora" : "Editora";
                                    return (
                                      <>
                                        <p className="font-medium text-foreground">{label}</p>
                                        {artista.gravadora_nome && (
                                          <p className="text-muted-foreground">{artista.gravadora_nome}</p>
                                        )}
                                        {artista.gravadora_responsavel_nome && (
                                          <p className="text-muted-foreground">{artista.gravadora_responsavel_nome}</p>
                                        )}
                                        {artista.gravadora_telefone && (
                                          <p className="text-muted-foreground">{artista.gravadora_telefone}</p>
                                        )}
                                      </>
                                    );
                                  }
                                  return <p className="font-medium text-foreground">Independente</p>;
                                })()}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 ml-auto shrink-0">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1.5"
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
                                      className="h-7 w-7 p-0"
                                      data-testid={`button-menu-${artista.id}`}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => setEditModal({ open: true, artista })}
                                      data-testid={`menu-edit-${artista.id}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeleteModal({ open: true, artista: artista as any })}
                                      data-testid={`menu-delete-${artista.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

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
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      <ArtistaFormModal open={createModal} onOpenChange={setCreateModal} />
      <ArtistaFormModal
        open={editModal.open}
        onOpenChange={(open) => {
          setEditModal((prev) => ({ ...prev, open }));
          if (!open && editIdFromUrl) navigate("/artistas");
        }}
        artista={editModal.artista}
      />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Artista"
        description="Tem certeza que deseja excluir este artista? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
      />
      <ArtistaVisao360Modal
        open={visao360Modal.open}
        onOpenChange={(open) => setVisao360Modal({ ...visao360Modal, open })}
        artista={visao360Modal.artista as any}
      />
    </MainLayout>
  );
}
