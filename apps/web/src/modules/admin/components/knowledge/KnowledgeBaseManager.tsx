// ============================================================================
// KnowledgeBaseManager — área administrativa da Base de Conhecimento (Suporte).
// CRUD em mock (localStorage via useKnowledgeArticles): cadastrar, editar,
// excluir, categorizar, pesquisar, publicar/despublicar, ordenar; gerencia
// artigos, FAQs, tutoriais e documentação interna. Fonte central para o módulo
// de suporte e futuras integrações com IA/central de ajuda.
// ============================================================================

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { EmptyState } from "@/shared/components/EmptyState";
import { useKnowledgeArticles } from "@/modules/support/hooks/useSupport";
import { SUPPORT_KNOWLEDGE_CATEGORIES } from "@/modules/support/data/support-source";
import type { KnowledgeArticle, KnowledgeArticleType, KnowledgeArticleStatus } from "@/modules/support/types";

const STATUS_OPTIONS: Array<{ value: KnowledgeArticleStatus; label: string }> = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
];
const STATUS_LABEL: Record<KnowledgeArticleStatus, string> = {
  draft: "Rascunho", published: "Publicado", archived: "Arquivado",
};
const STATUS_BADGE: Record<KnowledgeArticleStatus, "success" | "warning" | "neutral"> = {
  draft: "warning", published: "success", archived: "neutral",
};

const TYPE_OPTIONS: Array<{ value: KnowledgeArticleType; label: string }> = [
  { value: "article", label: "Artigo" },
  { value: "faq", label: "FAQ" },
  { value: "tutorial", label: "Tutorial" },
  { value: "internal_doc", label: "Documentação interna" },
];

const TYPE_LABEL: Record<KnowledgeArticleType, string> = {
  article: "Artigo",
  faq: "FAQ",
  tutorial: "Tutorial",
  internal_doc: "Doc. interna",
};

interface ArticleFormState {
  title: string;
  category_id: string;
  type: KnowledgeArticleType;
  summary: string;
  content: string;
  featured: boolean;
  status: KnowledgeArticleStatus;
}

const EMPTY_FORM: ArticleFormState = {
  title: "",
  category_id: SUPPORT_KNOWLEDGE_CATEGORIES[0]?.id ?? "",
  type: "article",
  summary: "",
  content: "",
  featured: false,
  status: "published",
};

export function KnowledgeBaseManager() {
  const { articles, createArticle, updateArticle, removeArticle, togglePublished, moveArticle } =
    useKnowledgeArticles();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeArticle | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...articles]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter((article) => {
        const matchesCategory = categoryFilter === "todas" || article.category_id === categoryFilter;
        const matchesType = typeFilter === "todos" || (article.type ?? "article") === typeFilter;
        const matchesTerm =
          !term ||
          article.title.toLowerCase().includes(term) ||
          article.summary.toLowerCase().includes(term) ||
          article.content.toLowerCase().includes(term);
        return matchesCategory && matchesType && matchesTerm;
      });
  }, [articles, search, categoryFilter, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(article: KnowledgeArticle) {
    setEditing(article);
    setForm({
      title: article.title,
      category_id: article.category_id,
      type: article.type ?? "article",
      summary: article.summary,
      content: article.content,
      featured: article.featured,
      status: article.status ?? (article.published === false ? "draft" : "published"),
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    const title = form.title.trim();
    if (!title) {
      toast.error("Informe o título do conteúdo.");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Informe o conteúdo.");
      return;
    }
    const category = SUPPORT_KNOWLEDGE_CATEGORIES.find((c) => c.id === form.category_id);
    const payload = {
      title,
      category_id: form.category_id,
      category_name: category?.name ?? "Geral",
      type: form.type,
      summary: form.summary.trim(),
      content: form.content,
      featured: form.featured,
      status: form.status,
      published: form.status === "published",
    };
    if (editing) {
      updateArticle(editing.id, payload);
      toast.success("Conteúdo atualizado.");
    } else {
      createArticle(payload);
      toast.success("Conteúdo cadastrado.");
    }
    setFormOpen(false);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    removeArticle(deleteTarget.id);
    toast.success("Conteúdo excluído.");
    setDeleteTarget(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Base de Conhecimento
            </CardTitle>
            <CardDescription>
              Gerencie artigos, FAQs, tutoriais e documentação interna do suporte.
            </CardDescription>
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Novo Conteúdo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar conteúdos..."
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {SUPPORT_KNOWLEDGE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum conteúdo encontrado"
            description="Cadastre artigos, FAQs e tutoriais para alimentar a base de conhecimento."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((article, index) => {
              const published = article.published ?? true;
              const status: KnowledgeArticleStatus = article.status ?? (published ? "published" : "draft");
              return (
                <div
                  key={article.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                  data-testid={`kb-row-${article.id}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-6"
                        onClick={() => moveArticle(article.id, "up")}
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-6"
                        onClick={() => moveArticle(article.id, "down")}
                        aria-label="Descer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{article.title}</p>
                        {article.featured && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        )}
                        <Badge variant="neutral" className="text-[10px]">
                          {TYPE_LABEL[article.type ?? "article"]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {article.category_name}
                        </Badge>
                        <Badge variant={STATUS_BADGE[status]} className="text-[10px]">
                          {STATUS_LABEL[status]}
                        </Badge>
                      </div>
                      {article.summary && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{article.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => togglePublished(article.id)}
                      title={published ? "Despublicar" : "Publicar"}
                    >
                      {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(article)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(article)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal de cadastro/edição */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle>
            <DialogDescription>
              Defina título, categoria, tipo e conteúdo. Use markdown no corpo do texto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Como conciliar transações via OFX"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => setForm({ ...form, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_KNOWLEDGE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as KnowledgeArticleType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resumo</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Breve descrição exibida na listagem"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo (markdown)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Escreva o conteúdo do artigo..."
                className="min-h-[180px]"
              />
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex items-center gap-2 pb-1">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(checked) => setForm({ ...form, featured: checked })}
                />
                <Label className="cursor-default">Destaque</Label>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value as KnowledgeArticleStatus })}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>{editing ? "Salvar alterações" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deleteTarget?.title}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
