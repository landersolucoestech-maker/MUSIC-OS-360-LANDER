// ============================================================================
// AdminKnowledge — gestão da Base de Conhecimento dentro do Painel Admin.
// Reutiliza o KnowledgeBaseManager (mesmo CRUD/dados do módulo de suporte),
// apresentado como página administrativa.
// ============================================================================

import { BookOpen } from "lucide-react";
import { AdminLayout } from "../layouts/AdminLayout";
import { KnowledgeBaseManager } from "../components/knowledge/KnowledgeBaseManager";

export default function AdminKnowledge() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">Gerencie artigos, FAQs, tutoriais e documentação do suporte.</p>
          </div>
        </div>
        <KnowledgeBaseManager />
      </div>
    </AdminLayout>
  );
}
