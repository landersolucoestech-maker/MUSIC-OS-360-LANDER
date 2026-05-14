import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { toast } from "sonner";
import { ChevronDown, Folder, Music, Plus, Upload, Image as ImageIcon, X, ExternalLink, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import type { Lancamento } from "@/modules/releases/types";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import type { ProjetoWithRelations } from "@/modules/projects/hooks/useProjetos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import {
  lancamentoToFormFields,
  emptyLancamentoFormFields,
  formToLancamentoPayload,
  projetoToLancamentoSeed,
} from "@/modules/releases/mappers";

interface Faixa {
  id: number;
  titulo: string;
  artista: string;
  isrc: string;
  compositores: string[];
  interpretes: string[];
  produtores: string[];
  arquivoAudio: File | null;
  letra: string;
}

interface LancamentoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento?: Lancamento;
  mode: "create" | "edit" | "view";
}

// ── Genre normalization helpers ────────────────────────────────────────────
const GENERO_OPTS = ["funk","pop","rock","sertanejo","trap","rap/hip-hop","pagode","forró","mpb","eletrônica","gospel","reggaeton","r&b","outro"];
const GENERO_LABELS: Record<string, string> = {
  "funk": "Funk", "pop": "Pop", "rock": "Rock", "sertanejo": "Sertanejo",
  "trap": "Trap", "rap/hip-hop": "Rap / Hip-Hop", "pagode": "Pagode",
  "forró": "Forró", "mpb": "MPB", "eletrônica": "Eletrônica",
  "gospel": "Gospel", "reggaeton": "Reggaeton", "r&b": "R&B", "outro": "Outro",
};
// Aliases: raw normalized → canonical GENERO_OPTS value
const GENERO_ALIASES: Record<string, string> = {
  "eletronico": "eletrônica", "electronico": "eletrônica", "electronica": "eletrônica",
  "hip hop": "rap/hip-hop", "hip-hop": "rap/hip-hop", "rap": "rap/hip-hop",
  "bossa nova": "mpb", "mpb/bossa nova": "mpb", "mpb / bossa nova": "mpb",
  "forro": "forró",
};
const normStr = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const matchGenero = (raw: string): string => {
  if (!raw) return "";
  const n = normStr(raw);
  const exact = GENERO_OPTS.find(g => normStr(g) === n);
  if (exact) return exact;
  if (GENERO_ALIASES[n]) return GENERO_ALIASES[n];
  const partial = GENERO_OPTS.find(g => n.startsWith(normStr(g)) || normStr(g).startsWith(n));
  if (partial) return partial;
  return raw.toLowerCase();
};
const splitNames = (s: string | null | undefined): string[] => {
  if (!s) return [""];
  const parts = s.split(",").map(x => x.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [""];
};

export function LancamentoFormModal({ open, onOpenChange, lancamento, mode }: LancamentoFormModalProps) {
  const { addLancamento, updateLancamento } = useLancamentos();
  const { projetos } = useProjetos();
  const { artistas } = useArtistas();
  const { obras } = useObras();
  const { fonogramas } = useFonogramas();

  const [formData, setFormData] = useState(emptyLancamentoFormFields);
  const [selectedObraId, setSelectedObraId] = useState("");
  const [selectedFonogramaId, setSelectedFonogramaId] = useState("");

  const [faixas, setFaixas] = useState<Faixa[]>([
    {
      id: 1,
      titulo: "",
      artista: "",
      isrc: "",
      compositores: [""],
      interpretes: [""],
      produtores: [""],
      arquivoAudio: null,
      letra: "",
    },
  ]);

  const [capaPrincipal, setCapaPrincipal] = useState<File | null>(null);
  const [faixasOpen, setFaixasOpen] = useState(true);
  const [metadadosOpen, setMetadadosOpen] = useState(true);
  const [artesOpen, setArtesOpen] = useState(true);
  const [distribuicaoOpen, setDistribuicaoOpen] = useState(true);

  // ── Searchable combobox state ────────────────────────────────────────────
  const [projetoSearch, setProjetoSearch] = useState("");
  const [projetoOpen, setProjetoOpen] = useState(false);
  const [artistaSearch, setArtistaSearch] = useState("");
  const [artistaOpen, setArtistaOpen] = useState(false);
  const [obraSearch, setObraSearch] = useState("");
  const [obraOpen, setObraOpen] = useState(false);
  const [fonogramaSearch, setFonogramaSearch] = useState("");
  const [fonogramaOpen, setFonogramaOpen] = useState(false);
  // ── Distributor connections (from Settings > Integrações) ─────────────────
  const DIST_STORAGE_KEY = "musicos360_distributor_connections";
  const DISTRIBUTORS = [
    { id: "onerpm",    name: "ONErpm",    description: "Distribuição global com analytics avançados e suporte a label" },
    { id: "distrokid", name: "DistroKid", description: "Distribuição rápida para todas as plataformas de streaming" },
    { id: "symphonic", name: "Symphonic", description: "Distribuição e marketing para artistas e selos independentes" },
    { id: "soundon",   name: "SoundOn",   description: "Distribuidora oficial do TikTok com monetização integrada" },
    { id: "musicpro",  name: "MusicPro",  description: "Distribuição profissional com suporte dedicado e royalties mensais" },
    { id: "somvibe",   name: "SomVibe",   description: "Distribuidora brasileira independente com foco no mercado nacional" },
  ];
  const [distributorConnections] = useState<Record<string, { username: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(DIST_STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const connectedDistributors = DISTRIBUTORS.filter(d => Boolean(distributorConnections[d.id]));

  // ── Auto-fill handlers ───────────────────────────────────────────────────

  const handleSelectProjeto = (projetoId: string) => {
    const projeto: ProjetoWithRelations | undefined = projetos.find((p) => p.id === projetoId);
    if (!projeto) { setFormData(prev => ({ ...prev, projetoSeed: projetoId })); setProjetoOpen(false); setProjetoSearch(""); return; }
    const seed = projetoToLancamentoSeed(projeto);
    const rawGenero = seed.genero?.trim()
      || artistas.find((a) => a.id === projeto.artista_id)?.genero_musical
      || "";
    setFormData(prev => ({
      ...prev,
      projetoSeed: projetoId,
      titulo:     !prev.titulo.trim()     ? seed.titulo     ?? "" : prev.titulo,
      artista_id: !prev.artista_id.trim() ? seed.artista_id ?? "" : prev.artista_id,
      genero:     !prev.genero.trim()     ? matchGenero(rawGenero) : prev.genero,
      tipo:       !prev.tipo.trim()       ? seed.tipo ?? "" : prev.tipo,
    }));
    if (projeto.descricao) {
      try {
        const musicas = JSON.parse(projeto.descricao) as Array<{
          nome?: string; compositores?: string[]; interpretes?: string[];
          produtores?: string[]; isrc?: string; letra?: string;
        }>;
        if (musicas.length > 0) {
          const artistaNome = projeto.artista_id
            ? artistas.find((a) => a.id === projeto.artista_id)?.nome_artistico ?? ""
            : "";
          setFaixas(musicas.map((m, i) => ({
            id: i + 1,
            titulo: m.nome ?? "",
            artista: artistaNome,
            isrc: m.isrc ?? "",
            compositores: m.compositores?.length ? m.compositores : [""],
            interpretes:  m.interpretes?.length  ? m.interpretes  : [""],
            produtores:   m.produtores?.length   ? m.produtores   : [""],
            arquivoAudio: null,
            letra: m.letra ?? "",
          })));
        }
      } catch { /* invalid JSON */ }
    }
    setProjetoOpen(false);
    setProjetoSearch("");
  };

  const handleSelectArtista = (artistaId: string) => {
    setFormData(prev => ({ ...prev, artista_id: artistaId }));
    setArtistaOpen(false);
    setArtistaSearch("");
  };

  const handleSelectObra = (obraId: string) => {
    setSelectedObraId(obraId);
    const obra = obras.find((o) => o.id === obraId);
    if (!obra) { setObraOpen(false); setObraSearch(""); return; }
    const compArr = splitNames(
      Array.isArray(obra.compositores) ? (obra.compositores as string[]).join(", ")
      : typeof obra.compositores === "string" ? obra.compositores
      : obra.compositor ?? ""
    );
    setFormData(prev => ({
      ...prev,
      titulo:     !prev.titulo.trim()     ? obra.titulo ?? "" : prev.titulo,
      genero:     !prev.genero.trim()     ? matchGenero(obra.genero ?? "") : prev.genero,
      isrcGlobal: !prev.isrcGlobal.trim() ? obra.isrc   ?? "" : prev.isrcGlobal,
    }));
    setFaixas(prev => prev.map((f, i) => i !== 0 ? f : {
      ...f,
      titulo:       !f.titulo.trim() ? obra.titulo ?? "" : f.titulo,
      isrc:         !f.isrc.trim()   ? obra.isrc   ?? "" : f.isrc,
      compositores: f.compositores.join("").trim() === "" ? compArr : f.compositores,
    }));
    setObraOpen(false);
    setObraSearch("");
  };

  const handleSelectFonograma = (fonogramaId: string) => {
    setSelectedFonogramaId(fonogramaId);
    const fono = fonogramas.find((f) => f.id === fonogramaId);
    if (!fono) { setFonogramaOpen(false); setFonogramaSearch(""); return; }
    const compArr  = splitNames(fono.compositores ?? "");
    const interpArr = splitNames(fono.interpretes ?? "");
    const prodArr  = splitNames(fono.produtores ?? "");
    setFormData(prev => ({
      ...prev,
      artista_id:  !prev.artista_id.trim()  ? fono.artista_id ?? "" : prev.artista_id,
      gravadora:   !prev.gravadora.trim()   ? fono.gravadora  ?? "" : prev.gravadora,
      isrcGlobal:  !prev.isrcGlobal.trim()  ? fono.isrc       ?? "" : prev.isrcGlobal,
    }));
    setFaixas(prev => prev.map((f, i) => i !== 0 ? f : {
      ...f,
      titulo:       !f.titulo.trim() ? fono.titulo ?? "" : f.titulo,
      isrc:         !f.isrc.trim()   ? fono.isrc   ?? "" : f.isrc,
      artista:      !f.artista.trim()
        ? artistas.find((a) => a.id === fono.artista_id)?.nome_artistico ?? f.artista
        : f.artista,
      compositores: f.compositores.join("").trim() === "" ? compArr  : f.compositores,
      interpretes:  f.interpretes.join("").trim()  === "" ? interpArr : f.interpretes,
      produtores:   f.produtores.join("").trim()   === "" ? prodArr  : f.produtores,
    }));
    setFonogramaOpen(false);
    setFonogramaSearch("");
  };

  // Hydrate form from entity whenever modal opens or lancamento changes.
  // Always reset all auxiliary state so no stale data leaks between lançamentos.
  useEffect(() => {
    if (!open) return;
    const fields = lancamentoToFormFields(lancamento ?? null);
    setFormData(fields);
    const obraId = lancamento?.obra_id ?? "";
    const fonoId = lancamento?.fonograma_id ?? "";
    setSelectedObraId(obraId);
    setSelectedFonogramaId(fonoId);
    setCapaPrincipal(null);
    // Reset search states — labels are derived from loaded data
    setProjetoSearch("");
    setArtistaSearch("");
    setObraSearch("");
    setFonogramaSearch("");
    setProjetoOpen(false);
    setArtistaOpen(false);
    setObraOpen(false);
    setFonogramaOpen(false);
    setFaixas([{
      id: 1, titulo: "", artista: "", isrc: "",
      compositores: [""], interpretes: [""], produtores: [""],
      arquivoAudio: null, letra: "",
    }]);
  }, [open, lancamento]);

  const isViewMode = mode === "view";

  // ── Derived labels for selected items ────────────────────────────────────
  const projetoLabel = formData.projetoSeed
    ? (projetos.find(p => p.id === formData.projetoSeed)?.titulo
      ?? projetos.find(p => p.id === formData.projetoSeed)?.nome
      ?? "")
    : "";
  const artistaLabel = formData.artista_id
    ? (artistas.find(a => a.id === formData.artista_id)?.nome_artistico ?? "")
    : "";
  const obraLabel = selectedObraId
    ? (obras.find(o => o.id === selectedObraId)?.titulo ?? "")
    : "";
  const fonogramaLabel = selectedFonogramaId
    ? (fonogramas.find(f => f.id === selectedFonogramaId)?.titulo ?? "")
    : "";

  // ── Filtered lists for searchable dropdowns ───────────────────────────────
  const TIPOS_MUSICAIS: string[] = ["album", "ep", "single"];
  const projetosFiltrados = projetos
    .filter(p => !p.tipo || TIPOS_MUSICAIS.includes(String(p.tipo).toLowerCase()))
    .filter(p => !projetoSearch || normStr(p.titulo ?? p.nome ?? "").includes(normStr(projetoSearch)));
  const artistasFiltrados = artistas.filter(a =>
    !artistaSearch || normStr(a.nome_artistico ?? "").includes(normStr(artistaSearch)));
  const obrasFiltradas = obras.filter(o =>
    !obraSearch || normStr(o.titulo ?? "").includes(normStr(obraSearch)));
  const fonogramasFiltrados = fonogramas.filter(f =>
    !fonogramaSearch || normStr(f.titulo ?? "").includes(normStr(fonogramaSearch)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "view") return;
    if (!formData.titulo.trim()) {
      toast.error("Informe o título do lançamento.");
      return;
    }
    try {
      const payload = formToLancamentoPayload(formData);
      if (mode === "edit" && lancamento?.id) {
        await updateLancamento.mutateAsync({ id: lancamento.id, ...payload });
        toast.success("Lançamento atualizado!");
      } else {
        await addLancamento.mutateAsync(payload);
        toast.success("Lançamento criado!");
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar lançamento.");
    }
  };

  const addFaixa = () => {
    setFaixas([
      ...faixas,
      {
        id: faixas.length + 1,
        titulo: "",
        artista: "",
        isrc: "",
        compositores: [""],
        interpretes: [""],
        produtores: [""],
        arquivoAudio: null,
        letra: "",
      },
    ]);
  };

  const removeFaixa = (id: number) => {
    if (faixas.length > 1) {
      setFaixas(faixas.filter((f) => f.id !== id));
    }
  };

  const updateFaixa = (id: number, field: keyof Faixa, value: Faixa[keyof Faixa]) => {
    setFaixas(faixas.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const addItemToFaixaArray = (faixaId: number, field: "compositores" | "interpretes" | "produtores") => {
    setFaixas(
      faixas.map((f) => {
        if (f.id === faixaId) {
          return { ...f, [field]: [...f[field], ""] };
        }
        return f;
      })
    );
  };

  const updateFaixaArrayItem = (
    faixaId: number,
    field: "compositores" | "interpretes" | "produtores",
    index: number,
    value: string
  ) => {
    setFaixas(
      faixas.map((f) => {
        if (f.id === faixaId) {
          const newArray = [...f[field]];
          newArray[index] = value;
          return { ...f, [field]: newArray };
        }
        return f;
      })
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo Lançamento" : mode === "edit" ? "Editar Lançamento" : "Detalhes do Lançamento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vinculações */}
          <Card className="bg-muted/30 border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Vinculações</CardTitle>
              </div>
              <CardDescription>Selecione o projeto para pré-carregar informações automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Projeto */}
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Popover open={projetoOpen} onOpenChange={isViewMode ? undefined : setProjetoOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={projetoOpen ? projetoSearch : projetoLabel}
                        onChange={(e) => { setProjetoSearch(e.target.value); setProjetoOpen(true); }}
                        onFocus={() => !isViewMode && setProjetoOpen(true)}
                        onClick={() => !isViewMode && setProjetoOpen(true)}
                        disabled={isViewMode}
                        placeholder="Buscar projeto..."
                        className="pl-10"
                        data-testid="input-buscar-projeto"
                      />
                      {formData.projetoSeed && !isViewMode && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, projetoSeed: "" })); }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[480px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <ScrollArea className="max-h-[280px]">
                      <div className="p-2">
                        {projetosFiltrados.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum projeto encontrado.</p>
                        ) : projetosFiltrados.map((p) => (
                          <div
                            key={p.id}
                            role="option"
                            tabIndex={0}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                            onClick={() => handleSelectProjeto(p.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectProjeto(p.id); } }}
                            data-testid={`option-projeto-${p.id}`}
                          >
                            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0">
                              <Folder className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.titulo ?? p.nome ?? "—"}</p>
                              {p.artista_id && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {artistas.find(a => a.id === p.artista_id)?.nome_artistico ?? ""}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                {formData.projetoSeed && (
                  <p className="text-xs text-muted-foreground">Faixas, artista e gênero preenchidos a partir do projeto.</p>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Informações Básicas */}
          <Card className="bg-muted/30 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações Básicas</CardTitle>
              <CardDescription>Complete as informações do lançamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título do Lançamento *</Label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Nome do single/álbum"
                    disabled={isViewMode}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Artista *</Label>
                  <Popover open={artistaOpen} onOpenChange={isViewMode ? undefined : setArtistaOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          value={artistaOpen ? artistaSearch : artistaLabel}
                          onChange={(e) => { setArtistaSearch(e.target.value); setArtistaOpen(true); }}
                          onFocus={() => !isViewMode && setArtistaOpen(true)}
                          onClick={() => !isViewMode && setArtistaOpen(true)}
                          disabled={isViewMode}
                          placeholder="Buscar artista..."
                          className="pl-10"
                          data-testid="input-buscar-artista"
                        />
                        {formData.artista_id && !isViewMode && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, artista_id: "" })); }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <ScrollArea className="max-h-[280px]">
                        <div className="p-2">
                          {artistasFiltrados.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum artista encontrado.</p>
                          ) : artistasFiltrados.map((a) => (
                            <div
                              key={a.id}
                              role="option"
                              tabIndex={0}
                              className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                              onClick={() => handleSelectArtista(a.id)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectArtista(a.id); } }}
                              data-testid={`option-artista-${a.id}`}
                            >
                              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0">
                                <Music className="h-4 w-4 text-white" />
                              </div>
                              <p className="text-sm font-medium truncate">{a.nome_artistico ?? "—"}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Lançamento</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })} disabled={isViewMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="ep">EP</SelectItem>
                      <SelectItem value="album">Álbum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código UPC</Label>
                  <Input
                    value={formData.codigoUPC}
                    onChange={(e) => setFormData({ ...formData, codigoUPC: e.target.value })}
                    placeholder="Digite o código UPC"
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gênero *</Label>
                  <Select value={formData.genero} onValueChange={(v) => setFormData({ ...formData, genero: v })} disabled={isViewMode}>
                    <SelectTrigger data-testid="select-genero">
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...GENERO_OPTS]
                        .sort((a, b) => (GENERO_LABELS[a] ?? a).localeCompare(GENERO_LABELS[b] ?? b, "pt-BR"))
                        .map(g => (
                          <SelectItem key={g} value={g}>{GENERO_LABELS[g] ?? g}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idioma da Música *</Label>
                  <Select value={formData.idioma} onValueChange={(v) => setFormData({ ...formData, idioma: v })} disabled={isViewMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                      <SelectItem value="en">Inglês</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Lançamento</Label>
                  <DatePickerField
                    value={formData.dataLancamento}
                    onChange={(iso) => setFormData({ ...formData, dataLancamento: iso })}
                    disabled={isViewMode}
                    placeholder="Selecione a data de lançamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={isViewMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejado">Planejado</SelectItem>
                      <SelectItem value="em_producao">Em Produção</SelectItem>
                      <SelectItem value="analise">Em Análise</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="aguardando_distribuicao">Aguardando Distribuição</SelectItem>
                      <SelectItem value="ativo">Ativo / Publicado</SelectItem>
                      <SelectItem value="programado">Programado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Faixas */}
          <Collapsible open={faixasOpen} onOpenChange={setFaixasOpen}>
            <Card className="bg-muted/30 border-border">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">Faixas</CardTitle>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${faixasOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {faixas.map((faixa, index) => (
                    <div key={faixa.id} className="space-y-4 p-4 border border-border rounded-lg relative">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Faixa {index + 1}</span>
                        {faixas.length > 1 && !isViewMode && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeFaixa(faixa.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Título da Faixa *</Label>
                          <Input
                            value={faixa.titulo}
                            onChange={(e) => updateFaixa(faixa.id, "titulo", e.target.value)}
                            placeholder="Nome da música"
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Artista *</Label>
                          <Input
                            value={faixa.artista}
                            onChange={(e) => updateFaixa(faixa.id, "artista", e.target.value)}
                            placeholder="Nome do artista"
                            disabled={isViewMode}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Código ISRC</Label>
                        <Input
                          value={faixa.isrc}
                          onChange={(e) => updateFaixa(faixa.id, "isrc", e.target.value)}
                          placeholder="BR-UBC-12-34567"
                          disabled={isViewMode}
                        />
                      </div>

                      {/* Compositores */}
                      <div className="space-y-2">
                        <Label>Compositores</Label>
                        {faixa.compositores.map((compositor, i) => (
                          <Input
                            key={i}
                            value={compositor}
                            onChange={(e) => updateFaixaArrayItem(faixa.id, "compositores", i, e.target.value)}
                            placeholder="Nome do compositor"
                            disabled={isViewMode}
                            className="mb-2"
                          />
                        ))}
                        {!isViewMode && (
                          <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => addItemToFaixaArray(faixa.id, "compositores")}>
                            <Plus className="h-4 w-4" />
                            Adicionar Compositor
                          </Button>
                        )}
                      </div>

                      {/* Intérpretes */}
                      <div className="space-y-2">
                        <Label>Intérpretes</Label>
                        {faixa.interpretes.map((interprete, i) => (
                          <Input
                            key={i}
                            value={interprete}
                            onChange={(e) => updateFaixaArrayItem(faixa.id, "interpretes", i, e.target.value)}
                            placeholder="Nome do intérprete"
                            disabled={isViewMode}
                            className="mb-2"
                          />
                        ))}
                        {!isViewMode && (
                          <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => addItemToFaixaArray(faixa.id, "interpretes")}>
                            <Plus className="h-4 w-4" />
                            Adicionar Intérprete
                          </Button>
                        )}
                      </div>

                      {/* Produtores */}
                      <div className="space-y-2">
                        <Label>Produtores</Label>
                        {faixa.produtores.map((produtor, i) => (
                          <Input
                            key={i}
                            value={produtor}
                            onChange={(e) => updateFaixaArrayItem(faixa.id, "produtores", i, e.target.value)}
                            placeholder="Nome do produtor"
                            disabled={isViewMode}
                            className="mb-2"
                          />
                        ))}
                        {!isViewMode && (
                          <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => addItemToFaixaArray(faixa.id, "produtores")}>
                            <Plus className="h-4 w-4" />
                            Adicionar Produtor
                          </Button>
                        )}
                      </div>

                      {/* Arquivo de Áudio */}
                      <div className="space-y-2">
                        <Label>Arquivo de Áudio</Label>
                        <div
                          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                          onClick={() => !isViewMode && document.getElementById(`audio-${faixa.id}`)?.click()}
                        >
                          <p className="text-sm text-muted-foreground">MP3 ou WAV (máx. 25MB)</p>
                          {faixa.arquivoAudio ? (
                            <p className="text-sm text-foreground mt-2">{faixa.arquivoAudio.name}</p>
                          ) : (
                            !isViewMode && (
                              <Button type="button" variant="outline" size="sm" className="mt-2 gap-2">
                                <Upload className="h-4 w-4" />
                                Selecionar Áudio
                              </Button>
                            )
                          )}
                          <input
                            id={`audio-${faixa.id}`}
                            type="file"
                            accept=".mp3,.wav"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) updateFaixa(faixa.id, "arquivoAudio", file);
                            }}
                            disabled={isViewMode}
                          />
                        </div>
                      </div>

                      {/* Letra */}
                      <div className="space-y-2">
                        <Label>Letra (Opcional)</Label>
                        <Textarea
                          value={faixa.letra}
                          onChange={(e) => updateFaixa(faixa.id, "letra", e.target.value)}
                          placeholder="Letra da música..."
                          rows={4}
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  ))}

                  {!isViewMode && (
                    <Button type="button" variant="outline" className="w-full gap-2" onClick={addFaixa}>
                      <Plus className="h-4 w-4" />
                      Adicionar Faixa
                    </Button>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Metadados */}
          <Collapsible open={metadadosOpen} onOpenChange={setMetadadosOpen}>
            <Card className="bg-muted/30 border-border">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Metadados</CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${metadadosOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gravadora/Selo</Label>
                      <Input
                        value={formData.gravadora}
                        onChange={(e) => setFormData({ ...formData, gravadora: e.target.value })}
                        placeholder="Nome da gravadora ou selo"
                        disabled={isViewMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Copyright</Label>
                      <Input
                        value={formData.copyright}
                        onChange={(e) => setFormData({ ...formData, copyright: e.target.value })}
                        placeholder="© 2024 Nome do detentor"
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Artes do Lançamento */}
          <Collapsible open={artesOpen} onOpenChange={setArtesOpen}>
            <Card className="bg-muted/30 border-border">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">Artes do Lançamento</CardTitle>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${artesOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Capa Principal *</Label>
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                      onClick={() => !isViewMode && document.getElementById("capa-principal")?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        {capaPrincipal ? (
                          <p className="text-sm text-foreground">{capaPrincipal.name}</p>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">Clique para selecionar a capa ou arraste e solte aqui</p>
                            <p className="text-xs text-muted-foreground">Formatos aceitos: JPEG, PNG, WebP (máx. 10MB) - Recomendado: 3000x3000px</p>
                            {!isViewMode && (
                              <Button type="button" variant="outline" size="sm" className="mt-2 gap-2">
                                <Upload className="h-4 w-4" />
                                Selecionar Capa
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      <input
                        id="capa-principal"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCapaPrincipal(file);
                        }}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Distribuição */}
          <Card className="bg-muted/30 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribuição</CardTitle>
              <CardDescription>Selecione a distribuidora para envio às plataformas digitais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Distribuidora *</Label>
                {connectedDistributors.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Nenhuma distribuidora conectada. Configure em{" "}
                    <span className="font-medium text-foreground">Configurações &gt; Integrações</span>.
                  </div>
                ) : (
                  <Select
                    value={formData.distribuidora}
                    onValueChange={(v) => setFormData({ ...formData, distribuidora: v })}
                    disabled={isViewMode}
                  >
                    <SelectTrigger data-testid="select-distribuidora">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-primary" />
                        <SelectValue placeholder="Selecione uma distribuidora conectada" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {connectedDistributors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Status da distribuidora selecionada */}
              {(() => {
                const selected = DISTRIBUTORS.find(d => d.id === formData.distribuidora);
                const conn = selected ? distributorConnections[selected.id] : null;
                if (!selected) return null;
                return (
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Music className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{selected.name}</p>
                          <p className="text-sm text-muted-foreground">{selected.description}</p>
                          {conn?.username && (
                            <p className="text-xs text-muted-foreground mt-0.5">Conta: {conn.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Conectado
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label>Notas de Distribuição</Label>
                <Textarea
                  value={formData.notasDistribuicao}
                  onChange={(e) => setFormData({ ...formData, notasDistribuicao: e.target.value })}
                  placeholder="Notas especiais sobre a distribuição (ex: data preferencial, territórios, exclusividades...)"
                  rows={3}
                  disabled={isViewMode}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {!isViewMode && (
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {mode === "create" ? "Criar Lançamento" : "Salvar Alterações"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
