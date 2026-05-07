import { useState, useEffect } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { toast } from "sonner";
import { ChevronDown, Folder, Music, Plus, Upload, Image as ImageIcon, X, ExternalLink, AlertCircle, CheckCircle2, CalendarIcon } from "lucide-react";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import {
  lancamentoToFormFields,
  emptyLancamentoFormFields,
  formToLancamentoPayload,
  projetoToLancamentoSeed,
} from "@/modules/releases/mappers";

// FieldError component padronizado
const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3" />
      {error}
    </p>
  );
};

// DatePickerField — replaces native <input type="date"> with system-themed Calendar
function DatePickerField({
  value,
  onChange,
  disabled,
  placeholder = "Selecione uma data",
}: {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;
  return (
    <Popover open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal bg-background border-border text-sm h-9"
          data-testid="datepicker-trigger"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
          {selected ? (
            <span>{format(selected, "dd/MM/yyyy", { locale: ptBR })}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}

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
  lancamento?: any;
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
    const projeto = projetos.find((p: any) => p.id === projetoId);
    if (!projeto) { setFormData(prev => ({ ...prev, projetoSeed: projetoId })); return; }
    const seed = projetoToLancamentoSeed(projeto as any);
    // Fallback: if project has no genre, use the linked artista's genero_musical
    const rawGenero = seed.genero?.trim()
      || artistas.find((a: any) => a.id === (projeto as any).artista_id)?.genero_musical
      || "";
    setFormData(prev => ({
      ...prev,
      projetoSeed: projetoId,
      titulo:     !prev.titulo.trim()     ? seed.titulo     ?? "" : prev.titulo,
      artista_id: !prev.artista_id.trim() ? seed.artista_id ?? "" : prev.artista_id,
      genero:     !prev.genero.trim()     ? matchGenero(rawGenero) : prev.genero,
      tipo:       !prev.tipo.trim()       ? seed.tipo ?? "" : prev.tipo,
    }));
    if ((projeto as any).descricao) {
      try {
        const musicas = JSON.parse((projeto as any).descricao) as Array<{
          nome?: string; compositores?: string[]; interpretes?: string[];
          produtores?: string[]; isrc?: string; letra?: string;
        }>;
        if (musicas.length > 0) {
          const artistaNome = (projeto as any).artista_id
            ? artistas.find((a: any) => a.id === (projeto as any).artista_id)?.nome_artistico ?? ""
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
  };

  const handleSelectObra = (obraId: string) => {
    setSelectedObraId(obraId);
    const obra = obras.find((o: any) => o.id === obraId);
    if (!obra) return;
    const compArr = splitNames(
      Array.isArray(obra.compositores) ? (obra.compositores as string[]).join(", ")
      : typeof obra.compositores === "string" ? obra.compositores
      : (obra as any).compositor ?? ""
    );
    setFormData(prev => ({
      ...prev,
      titulo:     !prev.titulo.trim()     ? (obra as any).titulo ?? "" : prev.titulo,
      genero:     !prev.genero.trim()     ? matchGenero((obra as any).genero ?? "") : prev.genero,
      isrcGlobal: !prev.isrcGlobal.trim() ? (obra as any).isrc   ?? "" : prev.isrcGlobal,
    }));
    setFaixas(prev => prev.map((f, i) => i !== 0 ? f : {
      ...f,
      titulo:       !f.titulo.trim() ? (obra as any).titulo ?? "" : f.titulo,
      isrc:         !f.isrc.trim()   ? (obra as any).isrc   ?? "" : f.isrc,
      compositores: f.compositores.join("").trim() === "" ? compArr : f.compositores,
    }));
  };

  const handleSelectFonograma = (fonogramaId: string) => {
    setSelectedFonogramaId(fonogramaId);
    const fono = fonogramas.find((f: any) => f.id === fonogramaId);
    if (!fono) return;
    const compArr  = splitNames((fono as any).compositores);
    const interpArr = splitNames((fono as any).interpretes);
    const prodArr  = splitNames((fono as any).produtores);
    setFormData(prev => ({
      ...prev,
      artista_id:  !prev.artista_id.trim()  ? (fono as any).artista_id ?? "" : prev.artista_id,
      gravadora:   !prev.gravadora.trim()   ? (fono as any).gravadora  ?? "" : prev.gravadora,
      isrcGlobal:  !prev.isrcGlobal.trim()  ? (fono as any).isrc       ?? "" : prev.isrcGlobal,
    }));
    setFaixas(prev => prev.map((f, i) => i !== 0 ? f : {
      ...f,
      titulo:       !f.titulo.trim() ? (fono as any).titulo ?? "" : f.titulo,
      isrc:         !f.isrc.trim()   ? (fono as any).isrc   ?? "" : f.isrc,
      artista:      !f.artista.trim()
        ? artistas.find((a: any) => a.id === (fono as any).artista_id)?.nome_artistico ?? f.artista
        : f.artista,
      compositores: f.compositores.join("").trim() === "" ? compArr  : f.compositores,
      interpretes:  f.interpretes.join("").trim()  === "" ? interpArr : f.interpretes,
      produtores:   f.produtores.join("").trim()   === "" ? prodArr  : f.produtores,
    }));
  };

  // Hydrate form from entity whenever modal opens or lancamento changes.
  useEffect(() => {
    if (!open) return;
    setFormData(lancamentoToFormFields(lancamento ?? null));
    setSelectedObraId((lancamento as any)?.obra_id ?? "");
    setSelectedFonogramaId((lancamento as any)?.fonograma_id ?? "");
    if (!lancamento) {
      setFaixas([{
        id: 1, titulo: "", artista: "", isrc: "",
        compositores: [""], interpretes: [""], produtores: [""],
        arquivoAudio: null, letra: "",
      }]);
    }
  }, [open, lancamento]);

  const isViewMode = mode === "view";

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

  const updateFaixa = (id: number, field: keyof Faixa, value: any) => {
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
              <CardDescription>Selecione projeto, obra e/ou fonograma para pré-carregar informações automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Projeto */}
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select value={formData.projetoSeed} onValueChange={handleSelectProjeto} disabled={isViewMode}>
                  <SelectTrigger data-testid="select-projeto-seed">
                    <SelectValue placeholder="Selecione um projeto (preenche faixas e artista)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projetos.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum projeto cadastrado</div>
                    ) : projetos.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.titulo ?? p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Select value={formData.artista_id} onValueChange={(v) => setFormData({ ...formData, artista_id: v })} disabled={isViewMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o artista" />
                    </SelectTrigger>
                    <SelectContent>
                      {artistas.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">Nenhum artista cadastrado</div>
                      ) : artistas.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome_artistico ?? a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
