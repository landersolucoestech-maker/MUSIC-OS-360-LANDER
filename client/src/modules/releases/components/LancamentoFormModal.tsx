import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown, Folder, Music, Plus, Upload, Image as ImageIcon, X, ExternalLink, LogIn, AlertCircle } from "lucide-react";
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
const normStr = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const matchGenero = (raw: string) => {
  if (!raw) return "";
  const n = normStr(raw);
  return GENERO_OPTS.find(g => normStr(g) === n) ?? raw.toLowerCase();
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
  const [distribuidoraConectada, setDistribuidoraConectada] = useState(false);

  // ── Auto-fill handlers ───────────────────────────────────────────────────

  const handleSelectProjeto = (projetoId: string) => {
    const projeto = projetos.find((p: any) => p.id === projetoId);
    if (!projeto) { setFormData(prev => ({ ...prev, projetoSeed: projetoId })); return; }
    const seed = projetoToLancamentoSeed(projeto as any);
    setFormData(prev => ({
      ...prev,
      projetoSeed: projetoId,
      titulo:     !prev.titulo.trim()     ? seed.titulo     ?? "" : prev.titulo,
      artista_id: !prev.artista_id.trim() ? seed.artista_id ?? "" : prev.artista_id,
      genero:     !prev.genero.trim()     ? matchGenero(seed.genero ?? "") : prev.genero,
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

  const handleConectarDistribuidora = () => {
    toast.success("Conectando com ONErpm...");
    setDistribuidoraConectada(true);
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

              {/* Obra */}
              <div className="space-y-2">
                <Label>Obra Musical</Label>
                <Select value={selectedObraId} onValueChange={handleSelectObra} disabled={isViewMode}>
                  <SelectTrigger data-testid="select-obra-vinculada">
                    <SelectValue placeholder="Selecione uma obra (preenche título, gênero, ISRC)" />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhuma obra cadastrada</div>
                    ) : obras.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.titulo} {o.compositor ? `— ${o.compositor}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedObraId && (
                  <p className="text-xs text-muted-foreground">Título, gênero, ISRC e compositores da faixa 1 preenchidos.</p>
                )}
              </div>

              {/* Fonograma */}
              <div className="space-y-2">
                <Label>Fonograma</Label>
                <Select value={selectedFonogramaId} onValueChange={handleSelectFonograma} disabled={isViewMode}>
                  <SelectTrigger data-testid="select-fonograma-vinculado">
                    <SelectValue placeholder="Selecione um fonograma (preenche artista, gravadora, créditos)" />
                  </SelectTrigger>
                  <SelectContent>
                    {fonogramas.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum fonograma cadastrado</div>
                    ) : fonogramas.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.titulo} {f.isrc ? `· ${f.isrc}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFonogramaId && (
                  <p className="text-xs text-muted-foreground">Artista, gravadora, ISRC e créditos da faixa 1 preenchidos.</p>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="funk">Funk</SelectItem>
                      <SelectItem value="trap">Trap</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="sertanejo">Sertanejo</SelectItem>
                      <SelectItem value="rock">Rock</SelectItem>
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
                  <Input
                    type="date"
                    value={formData.dataLancamento}
                    onChange={(e) => setFormData({ ...formData, dataLancamento: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    disabled={isViewMode}
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

          {/* Assets do Lançamento */}
          <Card className="bg-muted/30 border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Assets do Lançamento</CardTitle>
              </div>
              <CardDescription>URLs dos materiais do lançamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Áudio Master (WAV/FLAC URL)</Label>
                  <Input
                    value={formData.assetAudioMasterUrl}
                    onChange={(e) => setFormData({ ...formData, assetAudioMasterUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    disabled={isViewMode}
                    data-testid="input-asset-audio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capa do Álbum (3000×3000 URL)</Label>
                  <Input
                    value={formData.assetCapaUrl}
                    onChange={(e) => setFormData({ ...formData, assetCapaUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    disabled={isViewMode}
                    data-testid="input-asset-capa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vídeo Clipe (YouTube URL)</Label>
                  <Input
                    value={formData.assetVideoClipeUrl}
                    onChange={(e) => setFormData({ ...formData, assetVideoClipeUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    disabled={isViewMode}
                    data-testid="input-asset-video-clipe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>EPK – Electronic Press Kit (URL)</Label>
                  <Input
                    value={formData.assetEpkUrl}
                    onChange={(e) => setFormData({ ...formData, assetEpkUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    disabled={isViewMode}
                    data-testid="input-asset-epk"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Ficha Técnica</Label>
                  <Textarea
                    value={formData.assetFichaTecnica}
                    onChange={(e) => setFormData({ ...formData, assetFichaTecnica: e.target.value })}
                    placeholder="Produção: ...\nMixagem: ...\nMasterização: ..."
                    rows={3}
                    disabled={isViewMode}
                    data-testid="input-asset-ficha-tecnica"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Press Release</Label>
                  <Textarea
                    value={formData.assetPressRelease}
                    onChange={(e) => setFormData({ ...formData, assetPressRelease: e.target.value })}
                    placeholder="Texto do press release..."
                    rows={3}
                    disabled={isViewMode}
                    data-testid="input-asset-press-release"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Letra da Música</Label>
                  <Textarea
                    value={formData.assetLetra}
                    onChange={(e) => setFormData({ ...formData, assetLetra: e.target.value })}
                    placeholder="Letra da música..."
                    rows={4}
                    disabled={isViewMode}
                    data-testid="input-asset-letra"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cronograma de Produção */}
          <Card className="bg-muted/30 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cronograma de Produção</CardTitle>
              <CardDescription>Datas-chave da produção ao lançamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Gravação</Label>
                  <Input
                    type="date"
                    value={formData.cronGravacao}
                    onChange={(e) => setFormData({ ...formData, cronGravacao: e.target.value })}
                    disabled={isViewMode}
                    data-testid="input-cron-gravacao"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Mix & Master</Label>
                  <Input
                    type="date"
                    value={formData.cronMixMaster}
                    onChange={(e) => setFormData({ ...formData, cronMixMaster: e.target.value })}
                    disabled={isViewMode}
                    data-testid="input-cron-mix-master"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entrega à Distribuidora</Label>
                  <Input
                    type="date"
                    value={formData.cronEntregaDistribuidora}
                    onChange={(e) => setFormData({ ...formData, cronEntregaDistribuidora: e.target.value })}
                    disabled={isViewMode}
                    data-testid="input-cron-entrega"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ISRC Global (Singles)</Label>
                  <Input
                    value={formData.isrcGlobal}
                    onChange={(e) => setFormData({ ...formData, isrcGlobal: e.target.value })}
                    placeholder="BR-XXX-25-00001"
                    disabled={isViewMode}
                    data-testid="input-isrc-global"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas Internas</Label>
                  <Textarea
                    value={formData.notasInternas}
                    onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })}
                    placeholder="Notas para a equipe interna..."
                    rows={2}
                    disabled={isViewMode}
                    data-testid="input-notas-internas"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribuição */}
          <Card className="bg-muted/30 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribuição</CardTitle>
              <CardDescription>Selecione a distribuidora para envio às plataformas digitais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Distribuidora *</Label>
                <Select value={formData.distribuidora} onValueChange={(v) => setFormData({ ...formData, distribuidora: v })} disabled={isViewMode}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onerpm">ONErpm</SelectItem>
                    <SelectItem value="distrokid">DistroKid</SelectItem>
                    <SelectItem value="tunecore">TuneCore</SelectItem>
                    <SelectItem value="cdbaby">CD Baby</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status da distribuidora */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">ONErpm</p>
                      <p className="text-sm text-muted-foreground">Distribuidora global com presença na América Latina</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {distribuidoraConectada ? "Conectado" : "Não conectado"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                    onClick={handleConectarDistribuidora}
                    disabled={isViewMode}
                  >
                    <LogIn className="h-4 w-4" />
                    Conectar com ONErpm
                  </Button>
                  <Button type="button" variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Abrir site
                  </Button>
                </div>
              </div>

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
