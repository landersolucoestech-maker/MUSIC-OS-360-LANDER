import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Music, FileText, Clock, CheckCircle, Upload, Download, Plus, Search, Disc, Loader2, MoreHorizontal, Eye, Pencil, Trash2, FolderKanban, LinkIcon, Link2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { ObraFormModal, ObraTipoBadge } from "@/modules/catalog/components/ObraFormModal";
import { ObraViewModal } from "@/modules/catalog/components/ObraViewModal";
import { ObraTipoSelectorModal, type TipoObra } from "@/modules/catalog/components/ObraTipoSelectorModal";
import { FonogramaFormModal } from "@/modules/catalog/components/FonogramaFormModal";
import { FonogramaViewModal } from "@/modules/catalog/components/FonogramaViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { toast } from "sonner";
import { EmptyState } from "@/shared/components/EmptyState";
import { useObras, type ObraInsert } from "@/modules/catalog/hooks/useObras";
import { useFonogramas, type FonogramaInsert } from "@/modules/catalog/hooks/useFonogramas";
import {
  normalizeStatusForDb as normStatusObraMapper,
  exportInstrumental,
  exportCriadaPorIA as exportCriadaPorIAFn,
  exportTipoIA,
  exportElementosIA,
  exportParticipantes as exportParticipantesFn,
  exportOutrosTitulos,
  exportReferenciasConexas,
  exportLetraCompleta,
  importParseParticipantes,
  importSplitArray,
  importParseElementosIA,
  projetoToObraSeed,
} from "@/modules/catalog/mappers";
import { parseMusicasFromProjeto } from "@/modules/projects/utils/musicaHelpers";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useArtistasAssinados } from "@/modules/artist/hooks/useArtistasAssinados";

const normStatusObra = (val: string): string => {
  const raw = (val || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (raw === "registrado") return "registrado";
  if (raw === "rejeitado") return "rejeitado";
  if (raw === "em analise" || raw === "em_analise" || raw === "analise" || raw === "em analise") return "analise";
  return "pendente";
};

const statusObraLabel = (s: string): string => {
  if (s === "registrado") return "Registrado";
  if (s === "analise") return "Em Análise";
  if (s === "rejeitado") return "Rejeitado";
  return "Pendente";
};


export default function RegistroMusicas() {
  const navigate = useNavigate();
  const { obras, isLoading: loadingObras, deleteObra, addObra } = useObras();
  const { fonogramas, isLoading: loadingFonogramas, deleteFonograma, addFonograma, updateFonograma, bulkUpdateObraId } = useFonogramas();
  const { projetos: allProjetos } = useProjetos();
  const { artistas: artistasAssinados } = useArtistasAssinados();
  
  const [activeTab, setActiveTab] = useState("obras");
  const [selectedObraIds, setSelectedObraIds] = useState<string[]>([]);
  const toggleSelectAllObras = () => {
    if (selectedObraIds.length === filteredObras.length && filteredObras.length > 0) {
      setSelectedObraIds([]);
    } else {
      setSelectedObraIds(filteredObras.map((o: any) => o.id));
    }
  };
  const toggleSelectObra = (id: string) => setSelectedObraIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDeleteObras = () => {
    if (selectedObraIds.length === 0) return;
    selectedObraIds.forEach(id => deleteObra.mutate(id));
    toast.success(`${selectedObraIds.length} obra(s) excluída(s) com sucesso`);
    setSelectedObraIds([]);
  };

  const [selectedFonogramaIds, setSelectedFonogramaIds] = useState<string[]>([]);
  const toggleSelectAllFonogramas = () => {
    if (selectedFonogramaIds.length === filteredFonogramas.length && filteredFonogramas.length > 0) {
      setSelectedFonogramaIds([]);
    } else {
      setSelectedFonogramaIds(filteredFonogramas.map((f: any) => f.id));
    }
  };
  const toggleSelectFonograma = (id: string) => setSelectedFonogramaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDeleteFonogramas = () => {
    if (selectedFonogramaIds.length === 0) return;
    selectedFonogramaIds.forEach(id => deleteFonograma.mutate(id));
    toast.success(`${selectedFonogramaIds.length} fonograma(s) excluído(s) com sucesso`);
    setSelectedFonogramaIds([]);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [genreFilter, setGenreFilter] = useState("all-genre");
  const [projetoFilter, setProjetoFilter] = useState("all-projetos");
  const [obraVinculadaFilter, setObraVinculadaFilter] = useState("all-obras");
  const [bulkObraModal, setBulkObraModal] = useState(false);
  const [selectedObraIdForBulk, setSelectedObraIdForBulk] = useState<string>("");
  const [obraModal, setObraModal] = useState<{ open: boolean; mode: "create" | "edit"; obra?: any; tipoObra?: TipoObra }>({
    open: false,
    mode: "create",
    obra: undefined,
    tipoObra: undefined,
  });
  const [obraTipoSelectorOpen, setObraTipoSelectorOpen] = useState(false);
  const [pendingProjetoId, setPendingProjetoId] = useState<string | null>(null);
  const [obraViewModal, setObraViewModal] = useState<{ open: boolean; obra?: any }>({ open: false });
  const [fonogramaModal, setFonogramaModal] = useState<{ open: boolean; mode: "create" | "edit"; fonograma?: any }>({
    open: false,
    mode: "create",
    fonograma: undefined
  });
  const [fonogramaViewModal, setFonogramaViewModal] = useState<{ open: boolean; fonograma?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item?: any; type?: string }>({ open: false, item: undefined, type: undefined });

  const isLoading = loadingObras || loadingFonogramas;

  // Apply incoming ?projeto=:id (and optional ?obra=:id) coming from the Projetos screen
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const projetoParam = searchParams.get("projeto");
    const newObraParam = searchParams.get("newObra");
    const obraParam = searchParams.get("obra");
    const editObraParam = searchParams.get("editObra");
    const fonogramaParam = searchParams.get("fonograma");
    if (!projetoParam && !newObraParam && !obraParam && !editObraParam && !fonogramaParam) return;

    // If we still need to resolve an obra/fonograma but data are loading,
    // wait so we don't clear the URL before having a chance to open the modal.
    if ((obraParam || editObraParam) && loadingObras) return;
    if (fonogramaParam && loadingFonogramas) return;

    const next = new URLSearchParams(searchParams);
    let consumed = false;

    if (newObraParam) {
      setActiveTab("obras");
      setProjetoFilter(newObraParam);
      setPendingProjetoId(newObraParam);
      setObraTipoSelectorOpen(true);
      next.delete("newObra");
      consumed = true;
    }

    if (projetoParam) {
      setActiveTab("obras");
      setProjetoFilter(projetoParam);
      next.delete("projeto");
      consumed = true;
    }

    if (obraParam) {
      const target = obras.find((o: any) => o.id === obraParam);
      if (target) {
        setActiveTab("obras");
        setObraViewModal({ open: true, obra: target });
      }
      // Whether or not the obra was found, drop the param so we don't loop.
      next.delete("obra");
      consumed = true;
    }

    if (editObraParam) {
      const target = obras.find((o: any) => o.id === editObraParam);
      if (target) {
        setActiveTab("obras");
        setObraModal({ open: true, mode: "edit", obra: target });
      }
      next.delete("editObra");
      consumed = true;
    }

    if (fonogramaParam) {
      const target = fonogramas.find((f: any) => f.id === fonogramaParam);
      if (target) {
        setActiveTab("fonogramas");
        setFonogramaModal({ open: true, mode: "edit", fonograma: target });
      }
      next.delete("fonograma");
      consumed = true;
    }

    if (consumed) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, obras, fonogramas, loadingObras, loadingFonogramas, setSearchParams]);

  const obrasPorId = useMemo(() => {
    const map = new Map<string, any>();
    for (const o of obras as any[]) { if (o.id) map.set(o.id, o); }
    return map;
  }, [obras]);

  const artistasPorId = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of artistasAssinados) {
      if (a.id) map.set(a.id, a.nome_artistico ?? a.id);
    }
    return map;
  }, [artistasAssinados]);

  const projetosPorId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allProjetos) {
      if (p.id) map.set(p.id, p.titulo ?? p.id);
    }
    return map;
  }, [allProjetos]);

  const obraColumnsResolved = useMemo<CSVColumn[]>(() => {
    return [
      { key: "titulo",        label: "Título da Obra" },
      { key: "tipo_obra",     label: "Tipo de Obra",                    transform: (r) => r.tipo_obra === "referencia" ? "Obra por Referência" : "Obra Autoral" },
      { key: "artista_id",    label: "Artista Responsável",             transform: (r) => artistasPorId.get(r.artista_id as string) ?? "" },
      { key: "projeto_id",    label: "Projeto Vinculado",               transform: (r) => projetosPorId.get(r.projeto_id as string) ?? (r.projetos as { titulo?: string } | null | undefined)?.titulo ?? "" },
      { key: "status",        label: "Status",                          transform: (r) => statusObraLabel(r.status as string) },
      { key: "cod_abramus",   label: "Código ABRAMUS" },
      { key: "cod_ecad",      label: "Código ECAD" },
      { key: "isrc",          label: "ISRC" },
      { key: "iswc",          label: "ISWC" },
      { key: "genero",        label: "Gênero" },
      { key: "idioma",        label: "Idioma" },
      { key: "duracao",       label: "Duração" },
      { key: "instrumental",  label: "Instrumental",                    transform: exportInstrumental },
      { key: "criada_por_ia", label: "Criada por IA",                   transform: exportCriadaPorIAFn },
      { key: "tipo_ia",       label: "Tipo de Geração IA",              transform: exportTipoIA },
      { key: "ia_harmonia",   label: "Elementos IA",                    transform: exportElementosIA },
      { key: "participantes", label: "Participantes (Nome, Função, %, Link)", transform: exportParticipantesFn },
      { key: "outros_titulos",    label: "Outros Títulos",              transform: exportOutrosTitulos },
      { key: "referencias_conexas", label: "Referências Conectadas",   transform: exportReferenciasConexas },
      { key: "letra_completa",label: "Letra",                           transform: exportLetraCompleta },
    ];
  }, [artistasPorId, projetosPorId]);

  const fonogramaColumnsResolved = useMemo<CSVColumn[]>(() => {
    type Participant = { nome?: string; percentual?: string };
    const joinParticipacao = (r: Record<string, unknown>, cat: string): string => {
      const p = r["participacao"] as Record<string, Participant[]> | null | undefined;
      if (!p?.[cat]?.length) return "";
      return p[cat]
        .map((x) => x.nome ? `${x.nome}${x.percentual ? ` (${x.percentual}%)` : ""}` : "")
        .filter(Boolean)
        .join(", ");
    };
    return [
      { key: "titulo",          label: "Título" },
      { key: "status",          label: "Status",                transform: (r) => statusObraLabel(r.status as string) },
      { key: "obra_id",         label: "Obra Vinculada",        transform: (r) => obrasPorId.get(r.obra_id as string)?.titulo ?? "" },
      { key: "cod_abramus",     label: "Código ABRAMUS" },
      { key: "cod_ecad",        label: "Código ECAD" },
      { key: "agregadora",      label: "Agregadora" },
      { key: "isrc",            label: "ISRC" },
      { key: "criada_por_ia",   label: "Criada por IA",         transform: (r) => r.criada_por_ia ? "Sim" : "Não" },
      { key: "instrumental",    label: "Instrumental",          transform: (r) => r.instrumental ? "Sim" : "Não" },
      { key: "emissao",         label: "Emissão" },
      { key: "gravacao_original", label: "Gravação Original" },
      { key: "data_lancamento", label: "Lançamento" },
      { key: "duracao",         label: "Duração" },
      { key: "genero_musical",  label: "Gênero Musical" },
      { key: "classificacao",   label: "Classificação" },
      { key: "midia",           label: "Mídia" },
      { key: "nacional",        label: "Nacional",              transform: (r) => r.nacional !== false ? "Sim" : "Não" },
      { key: "pub_simultanea",  label: "Publicação Simultânea", transform: (r) => r.pub_simultanea ? "Sim" : "Não" },
      { key: "pais_origem",     label: "País de Origem" },
      { key: "pais_publicacao", label: "País de Publicação" },
      { key: "gravadora",       label: "Gravadora" },
      { key: "observacoes",     label: "Observações" },
      { key: "participacao",    label: "Produtores Fonográficos", transform: (r) => joinParticipacao(r, "produtorFonografico") },
      { key: "participacao",    label: "Intérpretes",             transform: (r) => joinParticipacao(r, "interprete") },
      { key: "participacao",    label: "Músicos Acompanhantes",   transform: (r) => joinParticipacao(r, "musicoAcompanhante") },
    ];
  }, [obrasPorId]);

  const collator = useMemo(() => new Intl.Collator("pt-BR", { sensitivity: "base" }), []);

  // Filter fonogramas + sort alphabetically
  const filteredFonogramas = useMemo(() => fonogramas
    .filter((fonograma: any) => {
      const matchesSearch = searchTerm === "" ||
        fonograma.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fonograma.compositores?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all-status" ||
        fonograma.status?.toLowerCase().includes(statusFilter);
      const obraVinculada = obrasPorId.get(fonograma.obra_id);
      const matchesGenre = genreFilter === "all-genre" ||
        obraVinculada?.genero?.toLowerCase() === genreFilter.toLowerCase();
      const matchesObraVinculada = obraVinculadaFilter === "all-obras" ||
        (obraVinculadaFilter === "sem-obra" ? !fonograma.obra_id : !!fonograma.obra_id);
      return matchesSearch && matchesStatus && matchesGenre && matchesObraVinculada;
    })
    .sort((a: any, b: any) => collator.compare(a.titulo ?? "", b.titulo ?? "")),
  [fonogramas, searchTerm, statusFilter, genreFilter, obraVinculadaFilter, obrasPorId, collator]);

  const [bulkLinking, setBulkLinking] = useState(false);
  const handleBulkVincularObra = async () => {
    if (!selectedObraIdForBulk || selectedFonogramaIds.length === 0) return;
    setBulkLinking(true);
    try {
      const { succeeded, failed } = await bulkUpdateObraId(selectedFonogramaIds, selectedObraIdForBulk);
      if (failed === 0) {
        toast.success(`${succeeded} fonograma(s) vinculado(s) com sucesso`);
      } else {
        toast.warning(`${succeeded} vinculado(s) com sucesso, ${failed} falharam`);
      }
    } finally {
      setBulkLinking(false);
    }
    setSelectedFonogramaIds([]);
    setSelectedObraIdForBulk("");
    setBulkObraModal(false);
  };

  // Filter obras + sort alphabetically
  const filteredObras = useMemo(() => obras
    .filter((obra: any) => {
      const matchesSearch = searchTerm === "" ||
        obra.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.compositores?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.projetos?.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all-status" ||
        obra.status?.toLowerCase().includes(statusFilter);
      const matchesGenre = genreFilter === "all-genre" ||
        obra.genero?.toLowerCase() === genreFilter.toLowerCase();
      const matchesProjeto = projetoFilter === "all-projetos" ||
        (projetoFilter === "no-projeto" ? !obra.projeto_id : obra.projeto_id === projetoFilter);
      return matchesSearch && matchesStatus && matchesGenre && matchesProjeto;
    })
    .sort((a: any, b: any) => collator.compare(a.titulo ?? "", b.titulo ?? "")),
  [obras, searchTerm, statusFilter, genreFilter, projetoFilter, collator]);

  // Distinct projetos available for the project filter:
  // include every project (even those without obras yet) plus any project ids
  // referenced by existing obras, so deep links from /projetos always work.
  const generosUnicos = useMemo(() => {
    const seen = new Set<string>();
    const unique: string[] = [];
    const src = activeTab === "fonogramas"
      ? (fonogramas as any[]).map(f => obrasPorId.get(f.obra_id)).filter(Boolean)
      : obras as any[];
    for (const o of src) {
      const g: string | undefined = o.genero;
      if (!g) continue;
      const key = g.toLowerCase();
      if (!seen.has(key)) { seen.add(key); unique.push(g.charAt(0).toUpperCase() + g.slice(1)); }
    }
    return unique.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [obras, fonogramas, obrasPorId, activeTab]);

  const projetosDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    allProjetos.forEach((p: any) => {
      if (p?.id && p?.titulo) map.set(p.id, p.titulo);
    });
    obras.forEach((o: any) => {
      if (o.projetos?.id && o.projetos?.titulo && !map.has(o.projetos.id)) {
        map.set(o.projetos.id, o.projetos.titulo);
      }
    });
    return Array.from(map.entries()).map(([id, titulo]) => ({ id, titulo }));
  }, [obras, allProjetos]);

  // Metrics
  const pendentes = activeTab === "fonogramas" 
    ? fonogramas.filter((f: any) => f.status === "pendente").length
    : obras.filter((o: any) => o.status === "pendente").length;
  
  const emAnalise = activeTab === "fonogramas"
    ? fonogramas.filter((f: any) => f.status === "analise").length
    : obras.filter((o: any) => o.status === "analise").length;
  
  const registrados = activeTab === "fonogramas"
    ? fonogramas.filter((f: any) => f.status === "registrado").length
    : obras.filter((o: any) => o.status === "registrado").length;
  
  const total = activeTab === "fonogramas" ? fonogramas.length : obras.length;
  const taxaAprovacao = total > 0 ? Math.round((registrados / total) * 100) : 0;

  const handleExport = () => {
    if (activeTab === "fonogramas") {
      exportToCSV(fonogramas, fonogramaColumnsResolved, "fonogramas");
    } else {
      exportToCSV(obras, obraColumnsResolved, "obras");
    }
  };

  const handleImport = () => {
    const col = (row: Record<string, string>, ...labels: string[]): string => {
      for (const label of labels) {
        if (row[label] !== undefined && row[label] !== "") return row[label];
        const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const t = norm(label);
        const key = Object.keys(row).find(k => norm(k) === t);
        if (key && row[key] !== "") return row[key];
      }
      return "";
    };
    const splitNames = (val: string): string[] =>
      (val || "").split(",").map(s => s.replace(/\s*\(\d+\.?\d*%\)/g, "").trim()).filter(Boolean);
    const toParticipantes = (val: string) =>
      splitNames(val).map(nome => ({ id: crypto.randomUUID(), nome, percentual: "" }));
    const parseBool = (val: string) => val.toLowerCase().trim() === "sim";

    const headers = activeTab === "fonogramas"
      ? ["Título", "ISRC", "Status", "Gênero Musical"]
      : ["Título da Obra", "Status", "Artista Responsável", "Gênero"];

    importCSV(async (data) => {
      let importados = 0;
      const obraVinculadaNaoResolvida: string[] = [];
      if (activeTab === "fonogramas") {
        const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const obrasPorTitulo = new Map<string, string>();
        for (const o of obras as any[]) {
          if (o.id && o.titulo) obrasPorTitulo.set(norm(o.titulo), o.id);
        }
        for (const row of data) {
          const titulo = col(row, "Título", "titulo", "TITULO");
          if (!titulo) continue;
          const obraTituloRaw = col(row, "Obra Vinculada", "obra_id");
          const obra_id = obraTituloRaw ? (obrasPorTitulo.get(norm(obraTituloRaw)) ?? null) : null;
          const produtoresRaw    = col(row, "Produtores Fonográficos", "produtores");
          const interpretesRaw   = col(row, "Intérpretes", "interpretes");
          const musicosRaw       = col(row, "Músicos Acompanhantes");
          const participacao = {
            produtorFonografico: toParticipantes(produtoresRaw),
            interprete: toParticipantes(interpretesRaw),
            musicoAcompanhante: toParticipantes(musicosRaw),
          };
          try {
            const fonoPayload: FonogramaInsert = {
              titulo,
              obra_id,
              status:            normStatusObra(col(row, "Status", "status")),
              isrc:              col(row, "ISRC", "isrc") || null,
              cod_abramus:       col(row, "Código ABRAMUS", "Cód. ABRAMUS", "cod_abramus") || null,
              cod_ecad:          col(row, "Código ECAD", "Cód. ECAD", "cod_ecad") || null,
              agregadora:        col(row, "Agregadora", "agregadora") || null,
              criada_por_ia:     parseBool(col(row, "Criada por IA", "criada_por_ia")),
              instrumental:      parseBool(col(row, "Instrumental", "instrumental")),
              emissao:           col(row, "Emissão", "emissao") || null,
              gravacao_original: col(row, "Gravação Original", "gravacao_original") || null,
              data_lancamento:   col(row, "Lançamento", "data_lancamento") || null,
              duracao:           col(row, "Duração", "duracao") || null,
              genero_musical:    col(row, "Gênero Musical", "genero_musical") || null,
              classificacao:     col(row, "Classificação", "classificacao") || null,
              midia:             col(row, "Mídia", "midia") || null,
              nacional:          col(row, "Nacional", "nacional") !== "" ? parseBool(col(row, "Nacional", "nacional")) : true,
              pub_simultanea:    parseBool(col(row, "Publicação Simultânea", "Pub. Simultânea", "pub_simultanea")),
              pais_origem:       col(row, "País de Origem", "pais_origem") || null,
              pais_publicacao:   col(row, "País de Publicação", "pais_publicacao") || null,
              gravadora:         col(row, "Gravadora", "gravadora") || null,
              observacoes:       col(row, "Observações", "observacoes") || null,
              participacao,
            };
            await addFonograma.mutateAsync(fonoPayload);
            importados++;
            if (obraTituloRaw && !obra_id) {
              obraVinculadaNaoResolvida.push(`"${titulo}" (Obra Vinculada: "${obraTituloRaw}")`);
            }
          } catch {}
        }
        if (obraVinculadaNaoResolvida.length > 0) {
          const preview = obraVinculadaNaoResolvida.slice(0, 5).join("\n");
          const extra = obraVinculadaNaoResolvida.length > 5
            ? `\n…e mais ${obraVinculadaNaoResolvida.length - 5} fonograma(s).`
            : "";
          toast.warning(
            `${obraVinculadaNaoResolvida.length} fonograma(s) importado(s) com aviso: "Obra Vinculada" não encontrada no catálogo e foi ignorada.\n\n${preview}${extra}`,
            { duration: 10000 }
          );
        }
      } else {
        const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const artistasPorNome = new Map<string, string>();
        for (const a of artistasAssinados) {
          if (a.nome_artistico) artistasPorNome.set(norm(a.nome_artistico), a.id);
        }
        const projetosPorTitulo = new Map<string, string>();
        for (const p of allProjetos) {
          if (p.titulo) projetosPorTitulo.set(norm(p.titulo), p.id);
        }
        for (const row of data) {
          const titulo = col(row, "Título da Obra", "Título", "titulo", "TITULO");
          if (!titulo) continue;
          const outrosTitulosRaw  = col(row, "Outros Títulos", "outros_titulos");
          const referenciasRaw    = col(row, "Referências Conectadas", "Referências Conexas", "referencias_conexas");
          const artistaNome       = col(row, "Artista Responsável", "artista");
          const projetoTitulo     = col(row, "Projeto Vinculado", "projeto");
          const elementosIARaw    = col(row, "Elementos IA", "elementos_ia");
          const participantesRaw  = col(row, "Participantes (Nome, Função, %, Link)", "participantes");
          try {
            const iaVal     = col(row, "Criada por IA", "criada_por_ia");
            const instrVal  = col(row, "Instrumental", "instrumental");
            const tipoIAVal = col(row, "Tipo de Geração IA", "Tipo IA", "tipo_ia");
            const artista_id = artistaNome ? (artistasPorNome.get(norm(artistaNome)) ?? null) : null;
            const projeto_id = projetoTitulo ? (projetosPorTitulo.get(norm(projetoTitulo)) ?? null) : null;
            const criadaPorIABool = parseBool(iaVal);
            const outros    = importSplitArray(outrosTitulosRaw);
            const refs      = importSplitArray(referenciasRaw);
            const partics   = importParseParticipantes(participantesRaw);
            const elementos = importParseElementosIA(elementosIARaw, tipoIAVal);
            const obraPayload: ObraInsert = {
              titulo,
              status:       normStatusObraMapper(col(row, "Status", "status")),
              genero:       col(row, "Gênero", "Gênero Musical", "genero") || null,
              iswc:         col(row, "ISWC", "iswc") || null,
              cod_abramus:  col(row, "Código ABRAMUS", "Cód. ABRAMUS", "cod_abramus") || null,
              duracao:      col(row, "Duração", "duracao") || null,
              artista_id,
              projeto_id,
              ...({
                idioma:              col(row, "Idioma", "idioma") || null,
                cod_ecad:            col(row, "Código ECAD", "Cód. ECAD", "cod_ecad") || null,
                isrc:                col(row, "ISRC", "isrc") || null,
                instrumental:        instrVal ? (parseBool(instrVal) ? "sim" : "nao") : null,
                criada_por_ia:       criadaPorIABool,
                criadaPorIA:         criadaPorIABool ? "sim" : "nao",
                tipo_ia:             tipoIAVal || null,
                tipoIA:              tipoIAVal || null,
                ia_harmonia:         elementos.ia_harmonia,
                iaHarmonia:          elementos.ia_harmonia,
                ia_melodia:          elementos.ia_melodia,
                iaMelodia:           elementos.ia_melodia,
                ia_letra:            elementos.ia_letra,
                iaLetra:             elementos.ia_letra,
                participantes:       partics.length > 0 ? partics : null,
                outros_titulos:      outros.length > 0 ? outros : null,
                outrosTitulos:       outros.length > 0 ? outros : null,
                referencias_conexas: refs.length > 0 ? refs : null,
                referenciasConexas:  refs.length > 0 ? refs : null,
                letra_completa:      col(row, "Letra", "Letra Completa", "letra_completa") || null,
                letraCompleta:       col(row, "Letra", "Letra Completa", "letra_completa") || null,
              } satisfies Record<string, unknown>),
            };
            await addObra.mutateAsync(obraPayload);
            importados++;
          } catch {}
        }
      }
      const tipo = activeTab === "fonogramas" ? "fonograma(s)" : "obra(s)";
      if (importados > 0) {
        const hasWarnings = activeTab === "fonogramas" && obraVinculadaNaoResolvida.length > 0;
        if (hasWarnings) {
          toast.success(
            `${importados} ${tipo} importado(s): ${importados - obraVinculadaNaoResolvida.length} sem avisos, ${obraVinculadaNaoResolvida.length} com vínculo de obra não resolvido.`
          );
        } else {
          toast.success(`${importados} ${tipo} importado(s) com sucesso!`);
        }
      } else {
        toast.error(`Nenhum(a) ${tipo} válido(a) encontrado(a) no arquivo`);
      }
    }, headers);
  };

  const handleDelete = () => {
    if (deleteModal.item) {
      if (deleteModal.type === "fonograma") {
        deleteFonograma.mutate(deleteModal.item.id);
      } else {
        deleteObra.mutate(deleteModal.item.id);
      }
      setDeleteModal({ open: false, item: undefined, type: undefined });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const headerActions = (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleImport}>
        <Upload className="h-4 w-4" />
        Importar
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      <Button 
        size="sm" 
        className="gap-2 bg-primary hover:bg-primary/90 text-white"
        onClick={() => activeTab === "fonogramas" 
          ? setFonogramaModal({ open: true, mode: "create" }) 
          : setObraTipoSelectorOpen(true)
        }
        data-testid="button-nova-obra"
      >
        <Plus className="h-4 w-4" />
        {activeTab === "fonogramas" ? "Novo Fonograma" : "Nova Obra"}
      </Button>
    </>
  );

  return (
    <MainLayout title="Registro de Músicas" description="Registro e controle de obras musicais e fonogramas" actions={headerActions}>
      <div className="space-y-6">

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {activeTab === "fonogramas" ? "Total de Fonogramas" : "Total de Obras"}
                </span>
                {activeTab === "fonogramas" ? (
                  <Disc className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Music className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">registrados no sistema</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pendentes de Registro</span>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{pendentes}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">aguardando análise</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Em Análise</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{emAnalise}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">aguardando aprovação</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Registro Aceito</span>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{registrados}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">aprovados</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Aprovação</span>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">{taxaAprovacao}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === "fonogramas" ? "fonogramas aprovados" : "obras aprovadas"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={activeTab === "fonogramas" ? "Buscar por título, compositor, intérprete, ISRC..." : "Buscar por título, compositor, ISWC, gênero..."}
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === "obras" && projetosDisponiveis.length > 0 && (
            <Select value={projetoFilter} onValueChange={setProjetoFilter}>
              <SelectTrigger className="w-[180px] bg-card border-border" data-testid="select-filter-projeto">
                <SelectValue placeholder="Todos Projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-projetos">Todos Projetos</SelectItem>
                <SelectItem value="no-projeto">Sem projeto vinculado</SelectItem>
                {projetosDisponiveis.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeTab === "fonogramas" && (
            <Select value={obraVinculadaFilter} onValueChange={setObraVinculadaFilter} data-testid="select-filter-obra-vinculada">
              <SelectTrigger className="w-[200px] bg-card border-border" data-testid="trigger-filter-obra-vinculada">
                <SelectValue placeholder="Todas as Obras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-obras">Todas as Obras</SelectItem>
                <SelectItem value="sem-obra">Sem obra vinculada</SelectItem>
                <SelectItem value="com-obra">Com obra vinculada</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="analise">Em Análise</SelectItem>
              <SelectItem value="registrado">Registrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder="Todos Gêneros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-genre">Todos Gêneros</SelectItem>
              {generosUnicos.map(g => (
                <SelectItem key={g} value={g.toLowerCase()}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchTerm !== "" || statusFilter !== "all-status" || genreFilter !== "all-genre" || projetoFilter !== "all-projetos" || obraVinculadaFilter !== "all-obras") && (
            <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all-status"); setGenreFilter("all-genre"); setProjetoFilter("all-projetos"); setObraVinculadaFilter("all-obras"); }} data-testid="button-limpar-filtros">
              Limpar
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <Button 
            variant={activeTab === "obras" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("obras")}
            className={activeTab === "obras" ? "gap-2 bg-muted text-foreground hover:bg-muted" : "gap-2"}
          >
            <Music className="h-4 w-4" />
            Obras
          </Button>
          <Button 
            variant={activeTab === "fonogramas" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("fonogramas")}
            className={activeTab === "fonogramas" ? "gap-2 bg-muted text-foreground hover:bg-muted" : "gap-2"}
          >
            <Disc className="h-4 w-4" />
            Fonogramas
          </Button>
        </div>

        {/* Content - Fonogramas */}
        {activeTab === "fonogramas" && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Fonogramas Registrados</CardTitle>
              <CardDescription>Catálogo completo de gravações registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {fonogramas.length > 0 && (
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <button 
                    onClick={toggleSelectAllFonogramas}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedFonogramaIds.length === filteredFonogramas.length && filteredFonogramas.length > 0 ? 'bg-primary border-primary' : 'border-primary'
                    }`}
                  >
                    {selectedFonogramaIds.length === filteredFonogramas.length && filteredFonogramas.length > 0 && <div className="w-2 h-2 bg-white rounded-full" />}
                  </button>
                  <span className="text-sm text-muted-foreground flex-1">Selecionar todos</span>
                  {selectedFonogramaIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-7 text-xs border-success text-success hover:bg-success/10 dark:hover:bg-success/20"
                        onClick={() => { setSelectedObraIdForBulk(""); setBulkObraModal(true); }}
                        data-testid="button-bulk-vincular-obra"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Vincular à Obra ({selectedFonogramaIds.length})
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDeleteFonogramas} data-testid="button-bulk-delete-fonogramas">
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir ({selectedFonogramaIds.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {filteredFonogramas.length > 0 ? (
                  <>
                  {filteredFonogramas.map((fonograma: any) => (
                    <div 
                      key={fonograma.id} 
                      className="flex items-center gap-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors px-2 rounded"
                    >
                      <button 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors border-primary ${selectedFonogramaIds.includes(fonograma.id) ? 'bg-primary border-primary' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleSelectFonograma(fonograma.id); }}
                        data-testid={`checkbox-fonograma-${fonograma.id}`}
                      >
                        {selectedFonogramaIds.includes(fonograma.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>
                      
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Disc className="h-4 w-4 text-white" />
                      </div>
                      
                      <div className="min-w-[160px] max-w-[200px]">
                        <span className="font-medium block truncate" data-testid={`text-fonograma-titulo-${fonograma.id}`}>{fonograma.titulo}</span>
                        <div className="mt-1 flex flex-wrap gap-1 items-center">
                          <Badge 
                            className={`text-xs ${
                              fonograma.status === "registrado" 
                                ? "bg-success hover:bg-success/90 text-success-foreground" 
                                : fonograma.status === "analise"
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-primary hover:bg-primary text-white"
                            }`}
                          >
                            {fonograma.status === "registrado" ? "Registrado" : fonograma.status === "analise" ? "Em Análise" : "Pendente"}
                          </Badge>
                          {!fonograma.obra_id && (
                            <Badge
                              className="text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/20 gap-1"
                              data-testid={`badge-sem-obra-${fonograma.id}`}
                            >
                              <LinkIcon className="h-3 w-3" />
                              Sem obra vinculada
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-4 text-sm flex-1">
                        <div className="w-24">
                          <span className="text-muted-foreground text-xs block">Cód. ABRAMUS</span>
                          <span className="truncate block">{fonograma.cod_abramus || "-"}</span>
                        </div>
                        <div className="w-24">
                          <span className="text-muted-foreground text-xs block">Cód. ECAD</span>
                          <span className="truncate block">{fonograma.cod_ecad || "-"}</span>
                        </div>
                        <div className="w-28">
                          <span className="text-muted-foreground text-xs block">ISRC</span>
                          <span className="truncate block">{fonograma.isrc || "-"}</span>
                        </div>
                        <div className="w-28">
                          <span className="text-muted-foreground text-xs block">Compositores</span>
                          <span className="truncate block">{fonograma.compositores || "-"}</span>
                        </div>
                        <div className="w-24">
                          <span className="text-muted-foreground text-xs block">Intérpretes</span>
                          <span className="truncate block">{fonograma.interpretes || "-"}</span>
                        </div>
                        <div className="w-24">
                          <span className="text-muted-foreground text-xs block">Produtor</span>
                          <span className="truncate block">{fonograma.produtores || "-"}</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex flex-col items-center">
                        <span className="text-xs text-muted-foreground mb-1">Ações</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setFonogramaViewModal({ open: true, fonograma })}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFonogramaModal({ open: true, mode: "edit", fonograma })}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={fonograma.status === "analise"}
                              title={fonograma.status === "analise" ? "Fonograma em análise — aguarde a conclusão antes de criar um lançamento" : undefined}
                              onClick={() => navigate("/lancamentos")}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Fazer Lançamento
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteModal({ open: true, item: fonograma, type: "fonograma" })}
                              className="text-destructive"
                            >
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
                    icon={Disc}
                    title="Nenhum fonograma cadastrado"
                    description="Comece registrando seu primeiro fonograma"
                    actionLabel="Novo Fonograma"
                    onAction={() => setFonogramaModal({ open: true, mode: "create" })}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content - Obras */}
        {activeTab === "obras" && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Obras Registradas</CardTitle>
              <CardDescription>Catálogo completo de obras musicais registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {obras.length > 0 && (
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <button 
                    onClick={toggleSelectAllObras}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedObraIds.length === filteredObras.length && filteredObras.length > 0 ? 'bg-primary border-primary' : 'border-primary'
                    }`}
                  >
                    {selectedObraIds.length === filteredObras.length && filteredObras.length > 0 && <div className="w-2 h-2 bg-white rounded-full" />}
                  </button>
                  <span className="text-sm text-muted-foreground flex-1">Selecionar todos</span>
                  {selectedObraIds.length > 0 && (
                    <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDeleteObras} data-testid="button-bulk-delete-obras">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir ({selectedObraIds.length})
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {filteredObras.length > 0 ? (
                  <>
                  {filteredObras.map((obra: any) => (
                    <div 
                      key={obra.id} 
                      className="flex items-center gap-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors px-2 rounded"
                    >
                      <button 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors border-primary ${selectedObraIds.includes(obra.id) ? 'bg-primary border-primary' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleSelectObra(obra.id); }}
                        data-testid={`checkbox-obra-${obra.id}`}
                      >
                        {selectedObraIds.includes(obra.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>
                      
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Music className="h-4 w-4 text-white" />
                      </div>
                      
                      <div className="min-w-[160px] max-w-[180px]">
                        <span className="font-medium block truncate" data-testid={`text-obra-titulo-${obra.id}`}>{obra.titulo}</span>
                        <div className="mt-1 flex flex-wrap gap-1 items-center">
                          <Badge 
                            className={`text-xs ${
                              obra.status === "registrado" 
                                ? "bg-success hover:bg-success/90 text-success-foreground" 
                                : obra.status === "analise"
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-primary hover:bg-primary text-white"
                            }`}
                          >
                            {obra.status === "registrado" ? "Registrado" : obra.status === "analise" ? "Em Análise" : "Pendente"}
                          </Badge>
                          <ObraTipoBadge tipo={obra.tipo_obra} />
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-4 text-sm flex-1">
                        <div className="w-24">
                          <span className="text-muted-foreground text-xs block">Cód. ABRAMUS</span>
                          <span className="truncate block">{obra.cod_abramus || "-"}</span>
                        </div>
                        <div className="w-24">
                          <span className="text-muted-foreground text-xs block">Cód. ECAD</span>
                          <span className="truncate block">{obra.cod_ecad || "-"}</span>
                        </div>
                        <div className="w-28">
                          <span className="text-muted-foreground text-xs block">ISWC</span>
                          <span className="truncate block">{obra.iswc || "-"}</span>
                        </div>
                        <div className="w-28">
                          <span className="text-muted-foreground text-xs block">Compositores</span>
                          <span className="truncate block">{obra.compositores || "-"}</span>
                        </div>
                        <div className="w-24">
                          <span className="text-muted-foreground text-xs block">Editora</span>
                          <span className="truncate block">{obra.editora || "-"}</span>
                        </div>
                        <div className="w-20">
                          <span className="text-muted-foreground text-xs block">Gênero</span>
                          <span className="truncate block">{obra.genero || "-"}</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex flex-col items-center">
                        <span className="text-xs text-muted-foreground mb-1">Ações</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setObraViewModal({ open: true, obra })}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setObraModal({ open: true, mode: "edit", obra })}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={obra.status === "analise"}
                              title={obra.status === "analise" ? "Obra em análise — aguarde a conclusão antes de registrar um fonograma" : undefined}
                              onClick={() => {
                                setActiveTab("fonogramas");
                                setFonogramaModal({ open: true, mode: "create", fonograma: { obra_id: obra.id } });
                              }}
                            >
                              <Disc className="h-4 w-4 mr-2" />
                              Registrar Fonograma
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteModal({ open: true, item: obra, type: "obra" })}
                              className="text-destructive"
                            >
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
                    icon={Music}
                    title="Nenhuma obra cadastrada"
                    description="Comece registrando sua primeira obra musical"
                    actionLabel="Nova Obra"
                    onAction={() => setObraTipoSelectorOpen(true)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Modals */}
      <ObraTipoSelectorModal
        open={obraTipoSelectorOpen}
        onOpenChange={(v) => { setObraTipoSelectorOpen(v); if (!v) setPendingProjetoId(null); }}
        onSelect={(tipo) => {
          let obraSeed: Record<string, unknown> | undefined;
          if (pendingProjetoId) {
            const projeto = allProjetos.find(p => p.id === pendingProjetoId);
            if (projeto) {
              const musicas = parseMusicasFromProjeto(projeto);
              obraSeed = projetoToObraSeed(projeto, musicas[0] ?? null);
            } else {
              obraSeed = { projeto_id: pendingProjetoId };
            }
          }
          setObraModal({ open: true, mode: "create", obra: obraSeed, tipoObra: tipo });
          setPendingProjetoId(null);
        }}
      />
      <ObraFormModal 
        open={obraModal.open} 
        onOpenChange={(open) => setObraModal({ ...obraModal, open })} 
        mode={obraModal.mode}
        obra={obraModal.obra}
        tipoObra={obraModal.tipoObra}
      />
      <ObraViewModal 
        open={obraViewModal.open} 
        onOpenChange={(open) => setObraViewModal({ ...obraViewModal, open })} 
        obra={obraViewModal.obra}
      />
      <FonogramaFormModal 
        open={fonogramaModal.open} 
        onOpenChange={(open) => setFonogramaModal({ ...fonogramaModal, open })} 
        mode={fonogramaModal.mode}
        fonograma={fonogramaModal.fonograma}
      />
      <FonogramaViewModal 
        open={fonogramaViewModal.open} 
        onOpenChange={(open) => setFonogramaViewModal({ ...fonogramaViewModal, open })} 
        fonograma={fonogramaViewModal.fonograma}
      />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        onConfirm={handleDelete}
        title={deleteModal.type === "fonograma" ? "Excluir Fonograma" : "Excluir Obra"}
        description={`Tem certeza que deseja excluir ${deleteModal.type === "fonograma" ? "este fonograma" : "esta obra"}? Esta ação não pode ser desfeita.`}
      />

      <Dialog open={bulkObraModal} onOpenChange={(open) => { setBulkObraModal(open); if (!open) setSelectedObraIdForBulk(""); }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-bulk-vincular-obra">
          <DialogHeader>
            <DialogTitle>Vincular {selectedFonogramaIds.length} fonograma(s) a uma obra</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione a obra à qual deseja vincular os fonogramas selecionados.
            </p>
            <Select value={selectedObraIdForBulk} onValueChange={setSelectedObraIdForBulk} data-testid="select-obra-para-vincular">
              <SelectTrigger className="w-full bg-card border-border" data-testid="trigger-obra-para-vincular">
                <SelectValue placeholder="Escolha uma obra..." />
              </SelectTrigger>
              <SelectContent>
                {(obras as any[])
                  .slice()
                  .sort((a, b) => collator.compare(a.titulo ?? "", b.titulo ?? ""))
                  .map((obra: any) => (
                    <SelectItem key={obra.id} value={obra.id} data-testid={`option-obra-${obra.id}`}>
                      {obra.titulo}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkObraModal(false); setSelectedObraIdForBulk(""); }} data-testid="button-cancelar-vincular-obra">
              Cancelar
            </Button>
            <Button
              onClick={handleBulkVincularObra}
              disabled={!selectedObraIdForBulk || bulkLinking}
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
              data-testid="button-confirmar-vincular-obra"
            >
              {bulkLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
