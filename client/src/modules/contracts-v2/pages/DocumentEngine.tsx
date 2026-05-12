import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileSignature, Search, Filter, MoreHorizontal, Send, XCircle, Eye } from "lucide-react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Skeleton } from "@/shared/ui/skeleton";
import { useDocuments, useSendForSignature, useCancelDocument } from "../hooks/useDocumentEngine";
import { DocumentStatusBadge } from "../components/shared/DocumentStatusBadge";
import type { Document } from "../types";
import { SIGNER_ROLE_LABEL } from "../types";

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatsCard({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "amber" | "green" | "red" }) {
  const colors: Record<string, string> = {
    default: "text-foreground",
    amber:   "text-amber-600 dark:text-amber-400",
    green:   "text-green-600 dark:text-green-400",
    red:     "text-destructive",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${colors[variant]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Document row actions ─────────────────────────────────────────────────────

function DocumentActions({ doc }: { doc: Document }) {
  const sendMut   = useSendForSignature();
  const cancelMut = useCancelDocument();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`btn-actions-${doc.id}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="gap-2 text-sm" data-testid={`btn-view-${doc.id}`}>
          <Eye className="h-3.5 w-3.5" /> Ver documento
        </DropdownMenuItem>
        {doc.status === "draft" && (
          <DropdownMenuItem
            className="gap-2 text-sm"
            data-testid={`btn-send-${doc.id}`}
            disabled={sendMut.isPending}
            onClick={() => sendMut.mutate(doc.id)}
          >
            <Send className="h-3.5 w-3.5" /> Enviar para assinar
          </DropdownMenuItem>
        )}
        {(doc.status === "draft" || doc.status === "pending_signature") && (
          <DropdownMenuItem
            className="gap-2 text-sm text-destructive"
            data-testid={`btn-cancel-${doc.id}`}
            disabled={cancelMut.isPending}
            onClick={() => cancelMut.mutate(doc.id)}
          >
            <XCircle className="h-3.5 w-3.5" /> Cancelar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DocumentEngine() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: documents = [], isLoading } = useDocuments();

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total:            documents.length,
    pendingSignature: documents.filter((d) => d.status === "pending_signature" || d.status === "partially_signed").length,
    signed:           documents.filter((d) => d.status === "signed").length,
    draft:            documents.filter((d) => d.status === "draft").length,
  };

  return (
    <MainLayout
      title="Document Engine v2"
      description="Geração, envio e rastreio de contratos com assinatura digital"
      actions={
        <Button
          size="sm"
          className="gap-1.5"
          data-testid="btn-novo-documento"
          onClick={() => navigate("/contratos-v2/novo")}
        >
          <Plus className="h-4 w-4" /> Novo Documento
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Beta banner */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800">
          <FileSignature className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <strong>Document Engine v2</strong> — Dados simulados. Integre Autentique ou DocuSign para assinaturas digitais reais.{" "}
            <a href="/settings/integrations" className="underline font-medium">Configurar →</a>
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label="Total de documentos"    value={stats.total}            />
          <StatsCard label="Aguardando assinatura"  value={stats.pendingSignature} variant="amber" />
          <StatsCard label="Assinados"              value={stats.signed}           variant="green" />
          <StatsCard label="Rascunhos"              value={stats.draft}            />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Pesquisar documentos…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-documentos"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" data-testid="btn-filtros">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-medium">Documentos ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum documento encontrado.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/contratos-v2/novo")}
                >
                  Criar primeiro documento
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Título</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Signatários</TableHead>
                    <TableHead className="text-xs">Criado em</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((doc) => (
                    <TableRow key={doc.id} data-testid={`row-doc-${doc.id}`}>
                      <TableCell className="font-medium text-sm max-w-[260px] truncate">{doc.title}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doc.signers.slice(0, 3).map((s) => (
                            <Badge
                              key={s.id}
                              variant="outline"
                              className="text-[10px] font-normal"
                              data-testid={`badge-signer-${s.id}`}
                            >
                              {SIGNER_ROLE_LABEL[s.role]}
                            </Badge>
                          ))}
                          {doc.signers.length > 3 && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              +{doc.signers.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <DocumentActions doc={doc} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
