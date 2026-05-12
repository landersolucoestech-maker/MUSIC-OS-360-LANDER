import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SigningPlatformBadge } from "@/modules/contracts/components/SigningPlatformBadge";
import {
  FileText, Clock, CheckCircle, Upload, Download, Plus, Search,
  FileStack, Loader2, MoreHorizontal, Eye, Pencil, Trash2, X, DollarSign,
  AlertCircle, PenLine,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { ContratoFormModal } from "@/modules/contracts/components/ContratoFormModal";
import { ContratoViewModal } from "@/modules/contracts/components/ContratoViewModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { exportToCSV, importCSV, CSVColumn } from "@/shared/lib/csv";
import { useContratos } from "@/modules/contracts/hooks/useContratos";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { MetricCard } from "@/shared/components/MetricCard";
import { cn } from "@/shared/lib/utils";
import { RequirePermission } from "@/shared/components/RequirePermission";

const contratoColumns: CSVColumn[] = [
  { key: "titulo", label: "Título" },
  { key: "tipo", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "artista", label: "Artista", transform: (r) => r.artistas?.nome_artistico || "" },
  { key: "cliente", label: "Cliente", transform: (r) => r.clientes?.nome || "" },
  { key: "data_inicio", label: "Data Início" },
  { key: "data_fim", label: "Data Fim" },
  { key: "valor", label: "Valor (R$)" },
  { key: "exclusivo", label: "Exclusivo" },
  { key: "assinado_em", label: "Assinado Em" },
  { key: "observacoes", label: "Observações" },
];

export default function Contratos() {
  const navigate = useNavigate();
  const { contratos, isLoading, deleteContrato, addContrato } = useContratos();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; contrato?: any }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; contrato?: any }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; contrato?: any }>({ open: false });

  useEditQueryParam(
    "edit",
    contratos,
    useCallback((contrato) => setFormModal({ open: true, mode: "edit", contrato }), []),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all-type");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [platformFilter, setPlatformFilter] = useState("all-platform");

  const filteredContratos = contratos.filter((contrato) => {
    const matchesSearch =
      searchTerm === "" ||
      contrato.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.artistas?.nome_artistico?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all-type" || contrato.tipo === typeFilter;
    const matchesStatus = statusFilter === "all-status" || contrato.status === statusFilter;
    const matchesPlatform =
      platformFilter === "all-platform" ||
      (platformFilter === "none" ? !contrato.signing_platform : contrato.signing_platform === platformFilter);
    return matchesSearch && matchesType && matchesStatus && matchesPlatform;
  });

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all-type" || statusFilter !== "all-status" || platformFilter !== "all-platform";

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContratos.length && filteredContratos.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContratos.map((c: any) => c.id));
    }
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteContrato.mutate(id));
    toast.success(`${selectedIds.length} contrato(s) excluído(s) com sucesso`);
    setSelectedIds([]);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all-type");
    setStatusFilter("all-status");
    setPlatformFilter("all-platform");
  };

  const handleExport = () => exportToCSV(contratos, contratoColumns, "contratos");
  const handleImport = () =>
    importCSV(async (data) => {
      let importados = 0;
      for (const row of data) {
        const titulo = row["Título"] || row["titulo"] || row["TITULO"];
        if (!titulo) continue;
        try {
          await addContrato.mutateAsync({
            titulo,
            tipo: row["Tipo"] || row["tipo"] || "distribuicao",
            status: row["Status"] || row["status"] || "rascunho",
            data_inicio: row["Data Início"] || row["data_inicio"] || null,
            data_fim: row["Data Fim"] || row["data_fim"] || null,
            valor: row["Valor (R$)"] || row["Valor"] || row["valor"]
              ? Number(row["Valor (R$)"] || row["Valor"] || row["valor"])
              : null,
            exclusivo: row["Exclusivo"]
              ? row["Exclusivo"] === "true" || row["Exclusivo"] === "1"
              : null,
            assinado_em: row["Assinado Em"] || row["assinado_em"] || null,
            observacoes: row["Observações"] || row["observacoes"] || null,
          } as any);
          importados++;
        } catch {}
      }
      if (importados > 0) toast.success(`${importados} contrato(s) importado(s) com sucesso!`);
      else toast.error("Nenhum contrato válido encontrado no arquivo");
    }, ["Título", "Tipo", "Status", "Data Início"]);

  const handleDelete = () => {
    if (deleteModal.contrato) {
      deleteContrato.mutate(deleteModal.contrato.id);
      setDeleteModal({ open: false });
    }
  };

  // ── Metrics (real date math, not status strings) ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const currentYear = today.getFullYear();

  const contratosVigentes = contratos.filter((c) => {
    const start = c.data_inicio ? new Date(c.data_inicio) : null;
    const end = c.data_fim ? new Date(c.data_fim) : null;
    return start && end && start <= today && end >= today;
  });
  const contratosAtivos = contratosVigentes.length;
  const contratosVencendo = contratos.filter((c) => {
    const end = c.data_fim ? new Date(c.data_fim) : null;
    return end && end >= today && end <= in30Days;
  }).length;
  const aguardandoAssinatura = contratos.filter((c) => c.status === "aguardando_assinatura").length;
  const assinadosEsteAno = contratos.filter((c) => {
    const start = c.data_inicio ? new Date(c.data_inicio) : null;
    return start && start.getFullYear() === currentYear;
  }).length;
  const valorTotal = contratosVigentes.reduce((acc, c) => acc + (c.valor || 0), 0);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Contratos"
      description="Gerencie contratos e documentação legal"
      actions={
        <>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/contratos/templates")}>
            <FileStack className="h-3.5 w-3.5" />
            Templates
          </Button>
          <RequirePermission module="contracts" action="write">
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFormModal({ open: true, mode: "create" })}>
              <Plus className="h-3.5 w-3.5" />
              Novo Contrato
            </Button>
          </RequirePermission>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Contratos Vigentes"
            value={contratosAtivos}
            description="ativos no momento"
            icon={FileText}
            accent="success"
          />
          <MetricCard
            title="Vencendo em 30 dias"
            value={contratosVencendo}
            description="precisam renovação"
            icon={Clock}
            accent={contratosVencendo > 0 ? "warning" : "primary"}
          />
          <MetricCard
            title="Aguardando Assinatura"
            value={aguardandoAssinatura}
            description="pendentes de assinar"
            icon={PenLine}
            accent={aguardandoAssinatura > 0 ? "warning" : "primary"}
          />
          <MetricCard
            title="Assinados este ano"
            value={assinadosEsteAno}
            description="contratos assinados"
            icon={CheckCircle}
            accent="primary"
          />
          <MetricCard
            title="Valor Total"
            value={formatCurrency(valorTotal)}
            description="contratos vigentes"
            icon={DollarSign}
            accent="success"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por artista, tipo ou título…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-type">Todos os tipos</SelectItem>
              <SelectItem value="agenciamento">Agenciamento</SelectItem>
              <SelectItem value="distribuicao">Distribuição</SelectItem>
              <SelectItem value="licenciamento">Licenciamento</SelectItem>
              <SelectItem value="edicao">Edição</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos os status</SelectItem>
              <SelectItem value="assinado">Assinado</SelectItem>
              <SelectItem value="vigente">Vigente</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="aguardando_assinatura">Aguardando Assinatura</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
              <SelectItem value="rescindido">Rescindido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm bg-card border-border" data-testid="select-platform-filter">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-platform">Todas as plataformas</SelectItem>
              <SelectItem value="autentique">Autentique</SelectItem>
              <SelectItem value="clicksign">Clicksign</SelectItem>
              <SelectItem value="docusign">DocuSign</SelectItem>
              <SelectItem value="none">Sem plataforma</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={handleClearFilters}>
              <X className="h-3 w-3" />
              Limpar
            </Button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredContratos.length} de {contratos.length} contratos
            </span>
          )}
        </div>

        {/* ── Table Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Lista de Contratos
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredContratos.length})</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Acompanhe todos os contratos e seus vencimentos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Bulk select bar */}
            {contratos.length > 0 && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <Checkbox
                  checked={selectedIds.length === filteredContratos.length && filteredContratos.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground flex-1">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selecionado(s)`
                    : "Selecionar todos"}
                </span>
                {selectedIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleBulkDelete}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir ({selectedIds.length})
                  </Button>
                )}
              </div>
            )}

            {filteredContratos.length > 0 ? (
              <div className="divide-y divide-border/60">
                {filteredContratos.map((contrato) => (
                  <div
                    key={contrato.id}
                    className="flex items-center gap-4 py-3 first:pt-0 hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors"
                    data-testid={`row-contrato-${contrato.id}`}
                  >
                    <Checkbox
                      checked={selectedIds.includes(contrato.id)}
                      onCheckedChange={() => toggleSelect(contrato.id)}
                      className="shrink-0"
                    />

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground leading-tight truncate">
                        {contrato.titulo}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {contrato.artistas?.nome_artistico || contrato.clientes?.nome || "Sem vínculo"}
                      </p>
                    </div>

                    {/* Signing platform */}
                    <SigningPlatformBadge platform={contrato.signing_platform} />

                    {/* Status */}
                    <StatusBadge status={contrato.status} />
                    {(() => {
                      const end = contrato.data_fim ? new Date(contrato.data_fim) : null;
                      if (!end) return null;
                      const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      if (diff < 0 || diff > 30) return null;
                      return (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-warning border border-warning/20 bg-warning/10 rounded-sm px-1.5 py-0.5 font-medium">
                          <AlertCircle className="h-3 w-3" />
                          {diff}d
                        </span>
                      );
                    })()}

                    {/* Period + Value */}
                    <div className="hidden lg:flex items-center gap-8 text-xs shrink-0">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Período</p>
                        <p className="font-medium text-foreground font-mono">
                          {formatDate(contrato.data_inicio)} – {formatDate(contrato.data_fim)}
                        </p>
                      </div>
                      {contrato.valor && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">Valor</p>
                          <p className="font-medium text-foreground font-mono">{formatCurrency(contrato.valor)}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewModal({ open: true, contrato })}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          Ver
                        </DropdownMenuItem>
                        <RequirePermission module="contracts" action="write">
                          <DropdownMenuItem onClick={() => setFormModal({ open: true, mode: "edit", contrato })}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </RequirePermission>
                        <RequirePermission module="contracts" action="delete">
                          <DropdownMenuItem
                            onClick={() => setDeleteModal({ open: true, contrato })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </RequirePermission>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title={hasActiveFilters ? "Nenhum resultado" : "Nenhum contrato cadastrado"}
                description={
                  hasActiveFilters
                    ? "Nenhum contrato corresponde aos filtros aplicados."
                    : "Comece criando seu primeiro contrato."
                }
                actionLabel={hasActiveFilters ? undefined : "Novo Contrato"}
                onAction={hasActiveFilters ? undefined : () => setFormModal({ open: true, mode: "create" })}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ContratoViewModal
        open={viewModal.open}
        onOpenChange={(open) => setViewModal({ ...viewModal, open })}
        contrato={viewModal.contrato}
        onEdit={() => setFormModal({ open: true, mode: "edit", contrato: viewModal.contrato })}
      />
      <ContratoFormModal
        open={formModal.open}
        onOpenChange={(open) => setFormModal({ ...formModal, open })}
        contrato={formModal.contrato}
        mode={formModal.mode}
      />
      <DeleteConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}
        title="Excluir Contrato"
        description={`Tem certeza que deseja excluir o contrato "${deleteModal.contrato?.titulo}"?`}
        onConfirm={handleDelete}
      />
    </MainLayout>
  );
}
