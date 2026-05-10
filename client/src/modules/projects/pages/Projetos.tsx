import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Clock, TrendingUp, FileText, LayoutGrid, Search, Play, FolderKanban, Loader2, Upload, Download, Plus, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { ProjetoFormModal } from "@/modules/projects/components/ProjetoFormModal";
import { ProjetoViewModal } from "@/modules/projects/components/ProjetoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { EmptyState } from "@/shared/components/EmptyState";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import type { ProjetoWithRelationsExtended } from "@/modules/projects/types/projetos-extensions";
import { getFirstMusicaInfo, getMusicaInfo, parseMusicasFromProjeto, type MusicaData } from "@/modules/projects/lib/musica-helpers";

const projetoColumns: CSVColumn[] = [
  { key: "titulo",          label: "Nome do Projeto" },
  { key: "_artista",        label: "Artista Responsável" },
  { key: "tipo",            label: "Tipo de Lançamento" },
  { key: "status", label: "Status", transform: (row) => {
    const s = row["status"] as string;
    if (s === "em_andamento") return "Em Andamento";
    if (s === "concluido")    return "Concluído";
    if (s === "cancelado")    return "Cancelado";
    return "Planejamento";
  }},
  { key: "_nome_ep",        label: "Nome do EP/Álbum" },
  { key: "_nome_musica",    label: "Nome da Música" },
  { key: "_solo_feat",      label: "Solo/Feat" },
  { key: "_original_remix", label: "Original/Remix" },
  { key: "_instrumental",   label: "Instrumental" },
  { key: "_duracao",        label: "Duração" },
  { key: "_genero",         label: "Gênero Musical" },
  { key: "_idioma",         label: "Idioma" },
  { key: "_compositores",   label: "Compositores" },
  { key: "_interpretes",    label: "Intérpretes" },
  { key: "_produtores",     label: "Produtores" },
  { key: "_letra",          label: "Letra" },
  { key: "_audio",          label: "Arquivos de Áudio (MP3/WAV)" },
  { key: "observacoes",     label: "Observações" },
];

export default function Projetos() {
  const navigate = useNavigate();
  const { projetos: rawProjetos, isLoading, deleteProjeto, addProjeto } = useProjetos();
  const { artistas } = useArtistas();

  // In mock mode the storage doesn't do SQL joins, so artistas is undefined on each project.
  // Build an id→artista map and inject the relation manually.
  const projetos = useMemo<ProjetoWithRelationsExtended[]>(() => {
    const map: Record<string, any> = {};
    artistas.forEach(a => { map[a.id] = a; });
    return (rawProjetos as ProjetoWithRelationsExtended[]).map(p => ({
      ...p,
      artistas: p.artistas ?? (p.artista_id ? map[p.artista_id] : undefined),
    }));
  }, [rawProjetos, artistas]);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; projeto?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; projeto?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; projeto?: any }>({ open: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [artistaFilter, setArtistaFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [generoFilter, setGeneroFilter] = useState("all");

  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open the view modal when arriving with ?projeto=:id (e.g. from an Obra link)
  useEffect(() => {
    const projetoId = searchParams.get("projeto");
    if (!projetoId || isLoading) return;
    const target = projetos.find(p => p.id === projetoId);
    if (target) {
      setViewModal({ open: true, projeto: target });
      const next = new URLSearchParams(searchParams);
      next.delete("projeto");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, projetos, isLoading, setSearchParams]);

  // Canonical genre resolver: direct field wins; fallback to first track only.
  // Both generos dropdown and filteredProjects use this so options always match.
  const getProjetoGenero = (p: typeof projetos[number]): string => {
    if (p.genero) return (p.genero as string).trim().toLowerCase();
    const musicas = parseMusicasFromProjeto(p);
    return (musicas[0]?.genero || "").trim().toLowerCase();
  };

  const filteredProjects = useMemo(() => {
    return projetos.filter(project => {
      const info = getFirstMusicaInfo(project);
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" ||
        project.titulo?.toLowerCase().includes(term) ||
        project.artistas?.nome_artistico?.toLowerCase().includes(term) ||
        info.compositores.toLowerCase().includes(term) ||
        info.interpretes.toLowerCase().includes(term) ||
        info.produtores.toLowerCase().includes(term) ||
        info.genero.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesArtista = artistaFilter === "all" || project.artista_id === artistaFilter;
      const matchesTipo = tipoFilter === "all" || project.tipo?.toLowerCase() === tipoFilter.toLowerCase();
      const matchesGenero = generoFilter === "all" || getProjetoGenero(project) === generoFilter.trim().toLowerCase();

      return matchesSearch && matchesStatus && matchesArtista && matchesTipo && matchesGenero;
    }).sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "", "pt-BR", { sensitivity: "base" }));
  }, [projetos, searchTerm, statusFilter, artistaFilter, tipoFilter, generoFilter]);

  const generos = useMemo(() => {
    const set = new Set<string>();
    projetos.forEach(p => {
      const g = getProjetoGenero(p);
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [projetos]);

  const handleExport = () => {
    const base = selectedIds.length > 0
      ? filteredProjects.filter(p => selectedIds.includes(p.id))
      : filteredProjects;
    const enriched: Record<string, any>[] = [];
    const emptyMusic = {
      _nome_ep: "", _nome_musica: "", _solo_feat: "", _original_remix: "",
      _instrumental: "", _duracao: "", _genero: "", _idioma: "",
      _compositores: "", _interpretes: "", _produtores: "", _letra: "", _audio: "",
    };
    for (const p of base) {
      const nomeEP = p.tipo !== "single" ? (p.titulo || "") : "";
      const artista = p.artistas?.nome_artistico || "";
      const musicas = parseMusicasFromProjeto(p);
      if (musicas.length === 0) {
        enriched.push({ ...p, _artista: artista, ...emptyMusic, _nome_ep: nomeEP });
      } else {
        musicas.forEach((m) => {
          const info = getMusicaInfo(m);
          enriched.push({
            ...p,
            _artista:        artista,
            _nome_ep:        nomeEP,
            _nome_musica:    info.nome,
            _solo_feat:      info.soloFeat,
            _original_remix: info.originalRemix,
            _instrumental:   info.instrumental,
            _duracao:        info.duracao,
            _genero:         info.genero,
            _idioma:         info.idioma,
            _compositores:   info.compositores,
            _interpretes:    info.interpretes,
            _produtores:     info.produtores,
            _letra:          info.letra,
            _audio:          m.audioUrl || "",
          });
        });
      }
    }
    exportToCSV(enriched, projetoColumns, "projetos");
  };

  const handleImport = () => importCSV(async (data) => {
    const artistaByNome: Record<string, string> = {};
    artistas.forEach(a => { if (a.nome_artistico) artistaByNome[a.nome_artistico.toLowerCase()] = a.id; });

    // Group rows by "Nome do Projeto" — multiple song rows collapse into one project
    const grouped = new Map<string, Record<string, string>[]>();
    for (const row of data) {
      const titulo = row["Nome do Projeto"] || row["Título"] || "";
      if (!titulo.trim()) continue;
      if (!grouped.has(titulo)) grouped.set(titulo, []);
      grouped.get(titulo)!.push(row);
    }

    // Case-insensitive + diacritic-insensitive column lookup so accented headers
    // (e.g. "Tipo de Lançamento") are found even if encoding slightly differs.
    const col = (row: Record<string, string>, label: string): string => {
      if (row[label] !== undefined) return row[label];
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const target = norm(label);
      const key = Object.keys(row).find(k => norm(k) === target);
      return key ? row[key] : "";
    };

    let importados = 0;
    for (const [titulo, rows] of grouped) {
      const firstRow = rows[0];
      const rawTipo = (col(firstRow, "Tipo de Lançamento") || "single").toLowerCase().trim();
      const tipo = rawTipo === "álbum" || rawTipo === "album" ? "album"
        : rawTipo === "ep" ? "ep"
        : rawTipo === "turnê" || rawTipo === "turne" ? "turne"
        : "single";

      const artistaNome = (col(firstRow, "Artista Responsável") || "").toLowerCase().trim();
      const artista_id = artistaByNome[artistaNome] || null;

      const splitList = (val: string) => val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];

      const musicas: MusicaData[] = await Promise.all(
        rows
          .filter(r => col(r, "Nome da Música")?.trim())
          .map(async r => {
            const duracao = col(r, "Duração") || "";
            const [duracaoMin = "", duracaoSeg = ""] = duracao.split(":").map(s => s.trim());
            const rawAudio = col(r, "Arquivos de Áudio (MP3/WAV)").trim();
            const audioUrl = rawAudio.startsWith("http") ? rawAudio : undefined;

            // Fetch the remote audio URL to reconstruct the local File metadata.
            // arquivoAudio is a local-only field (not persisted); it powers the
            // in-form file display. audioUrl is persisted and drives the download link.
            let arquivoAudio: { name: string; size: number } | null = null;
            if (audioUrl) {
              try {
                const resp = await fetch(audioUrl);
                if (resp.ok) {
                  const blob = await resp.blob();
                  const filename = audioUrl.split("/").pop() || "audio";
                  arquivoAudio = { name: filename, size: blob.size };
                }
              } catch { /* network error — skip arquivoAudio reconstruction */ }
            }

            return {
              id: Math.random().toString(36).slice(2),
              nome:           col(r, "Nome da Música") || "",
              soloFeat:       (col(r, "Solo/Feat") || "solo").toLowerCase().trim(),
              originalRemix:  (col(r, "Original/Remix") || "original").toLowerCase().trim(),
              instrumental:   (col(r, "Instrumental") || "nao").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(),
              duracaoMin,
              duracaoSeg,
              genero:         (col(r, "Gênero Musical") || "").toLowerCase().trim(),
              idioma:         (col(r, "Idioma") || "").toLowerCase().trim(),
              compositores:   splitList(col(r, "Compositores")),
              interpretes:    splitList(col(r, "Intérpretes")),
              produtores:     splitList(col(r, "Produtores")),
              letra:          col(r, "Letra") || "",
              arquivoAudio,
              ...(audioUrl ? { audioUrl } : {}),
            } as MusicaData;
          })
      );

      // For singles, if no explicit music row, create one from the project title
      if (tipo === "single" && musicas.length === 0) {
        musicas.push({ id: Math.random().toString(36).slice(2), nome: titulo } as MusicaData);
      }

      // Strip the local-only arquivoAudio field before persisting (matches form-modal behaviour)
      const musicasParaSalvar = musicas.map(({ arquivoAudio: _a, ...m }) => m);
      const descricao = musicasParaSalvar.length > 0 ? JSON.stringify(musicasParaSalvar) : null;
      const genero = musicas[0]?.genero || null;

      const rawStatus = (col(firstRow, "Status") || "planejamento")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const status =
        rawStatus === "em andamento" || rawStatus === "em_andamento" ? "em_andamento"
        : rawStatus === "concluido" || rawStatus === "concluído" || rawStatus === "concluido" ? "concluido"
        : rawStatus === "cancelado" ? "cancelado"
        : "planejamento";

      try {
        await addProjeto.mutateAsync({
          titulo,
          tipo,
          status,
          observacoes: col(firstRow, "Observações") || null,
          artista_id,
          genero,
          descricao,
        });
        importados++;
      } catch {}
    }
    if (importados > 0) toast.success(`${importados} projeto(s) importado(s) com sucesso!`);
    else toast.error("Nenhum projeto válido encontrado no arquivo");
  }, ["Nome do Projeto"]);

  const handleDelete = () => {
    if (deleteModal.projeto) {
      deleteProjeto.mutate(deleteModal.projeto.id);
      setDeleteModal({ open: false });
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => deleteProjeto.mutate(id));
    toast.success(`${selectedIds.length} projeto(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map(p => p.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "em_andamento":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">Em Andamento</Badge>;
      case "concluido":
        return <Badge className="bg-success hover:bg-success/90 text-success-foreground text-xs">Concluído</Badge>;
      case "planejamento":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">Planejamento</Badge>;
      case "cancelado":
        return <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground text-xs">Cancelado</Badge>;
      default:
        return <Badge className="bg-zinc-500 hover:bg-zinc-600 text-white text-xs">{status || "—"}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const headerActions = (
    <>
      <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white" onClick={() => setFormModal({ open: true, mode: "create" })}><Plus className="h-4 w-4" />Novo Projeto</Button>
    </>
  );

  const metricas = {
    ativos: projetos.filter(p => p.status === "em_andamento").length,
    concluidos: projetos.filter(p => p.status === "concluido").length,
    rascunhos: projetos.filter(p => p.status === "planejamento").length,
    total: projetos.length
  };

  return (
    <MainLayout title="Projetos" description="Gestão completa de projetos musicais" actions={headerActions}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Projetos Ativos</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.ativos}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">em desenvolvimento</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Concluídos</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.concluidos}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">projetos finalizados</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rascunhos</span>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.rascunhos}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">em planejamento</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Projetos</span>
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{metricas.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">cadastrados no sistema</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por música, artista, compositor, intérprete, produtor, gênero..." 
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="planejamento">Planejamento</SelectItem>
            </SelectContent>
          </Select>
          <Select value={artistaFilter} onValueChange={setArtistaFilter}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Todos Artista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Artista</SelectItem>
              {[...artistas].sort((a, b) => (a.nome_artistico || "").localeCompare(b.nome_artistico || "", "pt-BR", { sensitivity: "base" })).map(a => (
                <SelectItem key={a.id} value={a.id}>{a.nome_artistico}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Todos Tipo de..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipo de...</SelectItem>
              <SelectItem value="album">Álbum</SelectItem>
              <SelectItem value="ep">EP</SelectItem>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="turne">Turnê</SelectItem>
            </SelectContent>
          </Select>
          <Select value={generoFilter} onValueChange={setGeneroFilter}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Todos Gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Gênero</SelectItem>
              {generos.map(g => (
                <SelectItem key={g} value={g.toLowerCase()}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Lista de Projetos</CardTitle>
                <CardDescription>Acompanhe o desenvolvimento de todos os projetos musicais</CardDescription>
              </div>
              {selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={handleBulkDelete}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir selecionados ({selectedIds.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>

            <div className="space-y-2">
              {filteredProjects.length > 0 ? (
                <>
                  <div className="flex items-center gap-4 px-3 pb-2 border-b border-border">
                    <Checkbox
                      checked={selectedIds.length === filteredProjects.length && filteredProjects.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                      aria-label="Selecionar todos"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.length > 0
                        ? `${selectedIds.length} selecionado(s)`
                        : "Selecionar todos"}
                    </span>
                  </div>
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className={`flex items-center gap-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors px-3 rounded ${selectedIds.includes(project.id) ? "bg-muted/20" : ""}`}
                  >
                    <Checkbox
                      checked={selectedIds.includes(project.id)}
                      onCheckedChange={() => toggleSelect(project.id)}
                      data-testid={`checkbox-select-${project.id}`}
                      aria-label={`Selecionar ${project.titulo}`}
                    />
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Play className="h-4 w-4 text-white ml-0.5" />
                    </div>
                    
                    <div className="min-w-[180px] max-w-[200px]">
                      <span className="font-medium block truncate">{project.titulo}</span>
                      <div className="mt-1">{getStatusBadge(project.status)}</div>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm flex-1">
                      {(() => {
                        const info = getFirstMusicaInfo(project);
                        return (
                          <>
                            <div className="flex-1 min-w-0">
                              <span className="text-muted-foreground text-xs block">Compositores</span>
                              <span className="truncate block" data-testid={`text-compositores-${project.id}`}>{info.compositores || "-"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-muted-foreground text-xs block">Intérpretes</span>
                              <span className="truncate block" data-testid={`text-interpretes-${project.id}`}>{info.interpretes || "-"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-muted-foreground text-xs block">Produtor</span>
                              <span className="truncate block" data-testid={`text-produtor-${project.id}`}>{info.produtores || "-"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-muted-foreground text-xs block">Gênero</span>
                              <span className="truncate block capitalize" data-testid={`text-genero-${project.id}`}>{info.genero || "-"}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">Ações</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${project.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewModal({ open: true, projeto: project })} data-testid={`button-view-${project.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", projeto: project })} data-testid={`button-edit-${project.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteModal({ open: true, projeto: project })} className="text-destructive" data-testid={`button-delete-${project.id}`}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                </>
              ) : (
                <EmptyState
                  icon={FolderKanban}
                  title="Nenhum projeto cadastrado"
                  description="Comece criando seu primeiro projeto musical"
                  actionLabel="Novo Projeto"
                  onAction={() => setFormModal({ open: true, mode: "create" })}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjetoFormModal key={formModal.mode === "create" ? "create" : (formModal.projeto?.id ?? "edit")} open={formModal.open} onOpenChange={(open) => setFormModal(prev => ({ ...prev, open }))} projeto={formModal.projeto} mode={formModal.mode} onConcluido={(id) => navigate(`/registro-musicas?newObra=${id}`)} />
      <ProjetoViewModal open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })} projeto={viewModal.projeto} />
      <DeleteConfirmModal open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })} title="Excluir Projeto" description={`Tem certeza que deseja excluir o projeto "${deleteModal.projeto?.titulo}"?`} onConfirm={handleDelete} />
    </MainLayout>
  );
}
