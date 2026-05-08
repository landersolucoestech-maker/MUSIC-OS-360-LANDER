import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { MOCK_KNOWLEDGE_CATEGORIES, MOCK_KNOWLEDGE_ARTICLES } from "../data/mockSupport";
import type { KnowledgeArticle } from "../types";
import {
  Search, BookOpen, Eye, ThumbsUp,
  Clock, FileText, X,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ArticleCard({ article, onClick }: { article: KnowledgeArticle; onClick: () => void }) {
  return (
    <button
      className={cn(
        "w-full text-left rounded-xl border border-border/60 bg-card p-4",
        "hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-200 group",
      )}
      onClick={onClick}
      data-testid={`card-article-${article.id}`}
    >
      <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
        {article.title}
      </p>
      <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3">{article.summary}</p>
      <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground/60">
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.views}</span>
        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{article.helpful_count}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.read_time} min</span>
        <span className="ml-auto">{formatDate(article.updated_at)}</span>
      </div>
    </button>
  );
}

function ArticleModal({ article, onClose }: { article: KnowledgeArticle; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground">
            <span>{article.category_name}</span>
            <span>·</span>
            <span>{article.read_time} min de leitura</span>
          </div>
          <DialogTitle className="text-base leading-snug text-left">{article.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{article.summary}</p>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {article.content}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
            <span>Atualizado em {formatDate(article.updated_at)}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.views} visualizações</span>
              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{article.helpful_count} úteis</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SupportKnowledge() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  const filtered = MOCK_KNOWLEDGE_ARTICLES.filter((a) => {
    if (selectedCategory !== "all" && a.category_id !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalArticles = MOCK_KNOWLEDGE_ARTICLES.length;
  const totalViews = MOCK_KNOWLEDGE_ARTICLES.reduce((s, a) => s + a.views, 0);

  return (
    <MainLayout title="Base de Conhecimento" description="Artigos, tutoriais e guias">
      <div className="space-y-6 animate-fade-in">

        {/* Hero search */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border border-primary/20",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-7",
        )}>
          <div className="relative max-w-xl mx-auto text-center">
            <BookOpen className="h-8 w-8 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold text-foreground mb-1">Como podemos ajudar?</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              Pesquise em {totalArticles} artigos · {totalViews.toLocaleString()} visualizações
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos, guias, tutoriais..."
                className="pl-10 h-10 text-sm bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-knowledge"
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">

          {/* Categories sidebar */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Categorias
            </p>
            <button
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] transition-colors",
                selectedCategory === "all"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              onClick={() => setSelectedCategory("all")}
              data-testid="category-all"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Todos os artigos
              </span>
              <span className="text-[10.5px]">{totalArticles}</span>
            </button>
            {MOCK_KNOWLEDGE_CATEGORIES.map((cat) => {
              const count = MOCK_KNOWLEDGE_ARTICLES.filter((a) => a.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] transition-colors",
                    selectedCategory === cat.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                  onClick={() => setSelectedCategory(cat.id)}
                  data-testid={`category-${cat.id}`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="text-[10.5px]">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Articles grid */}
          <div>
            {search && (
              <p className="text-[12px] text-muted-foreground mb-3">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para "{search}"
              </p>
            )}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-[13px] font-medium text-muted-foreground">Nenhum artigo encontrado</p>
                <p className="text-[12px] text-muted-foreground/60 mt-1">
                  Tente outros termos de busca
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => setSelectedArticle(article)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </MainLayout>
  );
}
