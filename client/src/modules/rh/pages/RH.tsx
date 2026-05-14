import { useState, useMemo } from "react";
import { MonthPickerField } from "@/shared/ui/month-picker-field";
import { toast } from "sonner";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Users,
  Search,
  Loader2,
  Download,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Briefcase,
  DollarSign,
  CalendarDays,
  FileText,
  UserCheck,
  UserX,
  Palmtree,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
} from "lucide-react";
import { FuncionarioFormModal } from "@/modules/rh/components/FuncionarioFormModal";
import { FolhaPagamentoFormModal } from "@/modules/rh/components/FolhaPagamentoFormModal";
import { FeriasAusenciasFormModal } from "@/modules/rh/components/FeriasAusenciasFormModal";
import { DeleteConfirmModal } from "@/shared/components/DeleteConfirmModal";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { FileUpload, UploadedFile } from "@/shared/components/FileUpload";
import { EmptyState } from "@/shared/components/EmptyState";
import { exportToCSV, CSVColumn } from "@/shared/lib/csv";
import { formatCurrency, formatDate } from "@/shared/lib/format-utils";
import {
  useFuncionarios,
  SETORES,
  STATUS_FUNCIONARIO,
} from "@/modules/rh/hooks/useFuncionarios";
import type { Funcionario } from "@/modules/rh/hooks/useFuncionarios";
import { useFolhaPagamento, STATUS_PAGAMENTO } from "@/modules/rh/hooks/useFolhaPagamento";
import type { FolhaPagamento } from "@/modules/rh/hooks/useFolhaPagamento";
import {
  useFeriasAusencias,
  STATUS_AUSENCIA,
} from "@/modules/rh/hooks/useFeriasAusencias";
import type { FeriasAusencia } from "@/modules/rh/hooks/useFeriasAusencias";
import { useUsuarios } from "@/modules/settings/hooks/useUsuarios";
import {
  useDocumentosFuncionario,
  TIPOS_DOCUMENTO,
} from "@/modules/rh/hooks/useDocumentosFuncionario";
import type { DocumentoFuncionario } from "@/modules/rh/hooks/useDocumentosFuncionario";
import { Label } from "@/shared/ui/label";
import { FeatureGate } from '@/shared/components/FeatureGate';
const funcionarioColumns: CSVColumn[] = [
  { key: "nome_completo", label: "Nome Completo" },
  { key: "cpf", label: "CPF" },
  { key: "email", label: "Email" },
  { key: "telefone", label: "Telefone" },
  { key: "cargo", label: "Cargo" },
  { key: "setor", label: "Setor" },
  { key: "tipo_contrato", label: "Tipo Contrato" },
  { key: "data_admissao", label: "Data Admissão" },
  { key: "salario_base", label: "Salário Base (R$)" },
  { key: "status", label: "Status" },
  { key: "observacoes", label: "Observações" },
];

const folhaColumns: CSVColumn[] = [
  { key: "funcionario_nome", label: "Funcionário" },
  { key: "mes_referencia", label: "Mês Referência" },
  { key: "salario_bruto", label: "Salário Bruto" },
  { key: "descontos", label: "Descontos" },
  { key: "bonus", label: "Bônus" },
  { key: "salario_liquido", label: "Salário Líquido" },
  { key: "data_pagamento", label: "Data Pagamento" },
  { key: "status", label: "Status" },
];

const feriasColumns: CSVColumn[] = [
  { key: "funcionario_nome", label: "Funcionário" },
  { key: "tipo", label: "Tipo" },
  { key: "data_inicio", label: "Data Início" },
  { key: "data_fim", label: "Data Fim" },
  { key: "dias_totais", label: "Dias" },
  { key: "status", label: "Status" },
  { key: "aprovado_por", label: "Aprovado Por" },
];

const documentosColumns: CSVColumn[] = [
  { key: "funcionario_nome", label: "Funcionário" },
  { key: "tipo_documento", label: "Tipo Documento" },
  { key: "nome_arquivo", label: "Nome Arquivo" },
  { key: "descricao", label: "Descrição" },
];

const STATUS_BADGE_FUNCIONARIO: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  inativo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "férias": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  afastado: "bg-warning/10 text-warning",
  desligado: "bg-destructive/10 text-destructive",
};

const STATUS_BADGE_PAGAMENTO: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  pago: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  cancelado: "bg-destructive/10 text-destructive",
};

const STATUS_BADGE_AUSENCIA: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  aprovado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  rejeitado: "bg-destructive/10 text-destructive",
  "em andamento": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "concluído": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function RH() {
  const {
    funcionarios,
    isLoading: loadingFuncionarios,
    error: errorFuncionarios,
    deleteFuncionario,
    refetch: refetchFuncionarios,
  } = useFuncionarios();

  const {
    folhaPagamento,
    isLoading: loadingFolha,
    deleteFolhaPagamento,
  } = useFolhaPagamento();

  const { usuarios } = useUsuarios();
  const getUsuarioNome = (userId: string | null) => {
    if (!userId) return null;
    const u = usuarios.find((u) => u.id === userId);
    return u?.full_name || u?.email || null;
  };

  const {
    feriasAusencias,
    isLoading: loadingFerias,
    updateFeriasAusencia,
    deleteFeriasAusencia,
  } = useFeriasAusencias();

  const [activeTab, setActiveTab] = useState("funcionarios");

  const [funcSearch, setFuncSearch] = useState("");
  const [funcStatusFilter, setFuncStatusFilter] = useState("all");
  const [funcSetorFilter, setFuncSetorFilter] = useState("all");
  const [funcFormModal, setFuncFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit" | "view";
    funcionario?: Funcionario;
  }>({ open: false, mode: "create" });
  const [funcDeleteModal, setFuncDeleteModal] = useState<{
    open: boolean;
    funcionario?: Funcionario;
  }>({ open: false });

  const [selectedFuncIds, setSelectedFuncIds] = useState<string[]>([]);
  const toggleSelectAllFuncs = () => {
    if (selectedFuncIds.length === filteredFuncionarios.length && filteredFuncionarios.length > 0) {
      setSelectedFuncIds([]);
    } else {
      setSelectedFuncIds(filteredFuncionarios.map((f: any) => f.id));
    }
  };
  const toggleSelectFunc = (id: string) => setSelectedFuncIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleBulkDeleteFuncs = () => {
    if (selectedFuncIds.length === 0) return;
    selectedFuncIds.forEach(id => deleteFuncionario.mutate(id));
    toast.success(`${selectedFuncIds.length} funcionário(s) excluído(s) com sucesso`);
    setSelectedFuncIds([]);
  };

  const [folhaSearch, setFolhaSearch] = useState("");
  const [folhaMesFilter, setFolhaMesFilter] = useState("");
  const [folhaStatusFilter, setFolhaStatusFilter] = useState("all");
  const [folhaFormModal, setFolhaFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit" | "view";
    registro?: FolhaPagamento;
  }>({ open: false, mode: "create" });
  const [folhaDeleteModal, setFolhaDeleteModal] = useState<{
    open: boolean;
    registro?: FolhaPagamento;
  }>({ open: false });

  const [feriasSearch, setFeriasSearch] = useState("");
  const [feriasStatusFilter, setFeriasStatusFilter] = useState("all");
  const [feriasFormModal, setFeriasFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit" | "view";
    ausencia?: FeriasAusencia;
  }>({ open: false, mode: "create" });
  const [feriasDeleteModal, setFeriasDeleteModal] = useState<{
    open: boolean;
    ausencia?: FeriasAusencia;
  }>({ open: false });

  const [docFuncionarioId, setDocFuncionarioId] = useState("");
  const [docTipoDocumento, setDocTipoDocumento] = useState("");
  const [docDescricao, setDocDescricao] = useState("");
  const [docDeleteModal, setDocDeleteModal] = useState<{
    open: boolean;
    documento?: DocumentoFuncionario;
  }>({ open: false });

  const {
    documentos,
    isLoading: loadingDocs,
    addDocumento,
    deleteDocumento,
  } = useDocumentosFuncionario(docFuncionarioId || undefined);

  const kpiCounts = useMemo(() => {
    const counts = {
      total: funcionarios.length,
      ativos: 0,
      ferias: 0,
      afastados: 0,
    };
    funcionarios.forEach((f) => {
      if (f.status === "ativo") counts.ativos++;
      else if (f.status === "férias") counts.ferias++;
      else if (f.status === "afastado") counts.afastados++;
    });
    return counts;
  }, [funcionarios]);

  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter((f) => {
      const matchesSearch =
        funcSearch === "" ||
        f.nome_completo?.toLowerCase().includes(funcSearch.toLowerCase()) ||
        f.email?.toLowerCase().includes(funcSearch.toLowerCase()) ||
        f.cargo?.toLowerCase().includes(funcSearch.toLowerCase()) ||
        f.cpf?.includes(funcSearch);
      const matchesStatus =
        funcStatusFilter === "all" || f.status === funcStatusFilter;
      const matchesSetor =
        funcSetorFilter === "all" || f.setor === funcSetorFilter;
      return matchesSearch && matchesStatus && matchesSetor;
    });
  }, [funcionarios, funcSearch, funcStatusFilter, funcSetorFilter]);

  const filteredFolha = useMemo(() => {
    return folhaPagamento.filter((fp) => {
      const func = funcionarios.find((f) => f.id === fp.funcionario_id);
      const funcName = func?.nome_completo || "";
      const matchesSearch =
        folhaSearch === "" ||
        funcName.toLowerCase().includes(folhaSearch.toLowerCase()) ||
        fp.mes_referencia?.includes(folhaSearch);
      const matchesMes =
        !folhaMesFilter || fp.mes_referencia === folhaMesFilter;
      const matchesStatus =
        folhaStatusFilter === "all" || fp.status === folhaStatusFilter;
      return matchesSearch && matchesMes && matchesStatus;
    });
  }, [folhaPagamento, funcionarios, folhaSearch, folhaMesFilter, folhaStatusFilter]);

  const filteredFerias = useMemo(() => {
    return feriasAusencias.filter((fa) => {
      const func = funcionarios.find((f) => f.id === fa.funcionario_id);
      const funcName = func?.nome_completo || "";
      const matchesSearch =
        feriasSearch === "" ||
        funcName.toLowerCase().includes(feriasSearch.toLowerCase()) ||
        fa.tipo?.toLowerCase().includes(feriasSearch.toLowerCase());
      const matchesStatus =
        feriasStatusFilter === "all" || fa.status === feriasStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [feriasAusencias, funcionarios, feriasSearch, feriasStatusFilter]);

  const getFuncionarioNome = (id: string | null) => {
    if (!id) return "N/A";
    const func = funcionarios.find((f) => f.id === id);
    return func?.nome_completo || "N/A";
  };

  const handleExportFuncionarios = () =>
    exportToCSV(filteredFuncionarios, funcionarioColumns, "funcionarios");

  const handleExportFolha = () => {
    const data = filteredFolha.map((fp) => ({
      ...fp,
      funcionario_nome: getFuncionarioNome(fp.funcionario_id),
    }));
    exportToCSV(data, folhaColumns, "folha_pagamento");
  };

  const handleExportFerias = () => {
    const data = filteredFerias.map((fa) => ({
      ...fa,
      funcionario_nome: getFuncionarioNome(fa.funcionario_id),
    }));
    exportToCSV(data, feriasColumns, "ferias_ausencias");
  };

  const handleExportDocumentos = () => {
    const data = (documentos || []).map((d) => ({
      ...d,
      funcionario_nome: getFuncionarioNome(d.funcionario_id),
    }));
    exportToCSV(data, documentosColumns, "documentos_funcionario");
  };

  const handleDeleteFuncionario = () => {
    if (funcDeleteModal.funcionario) {
      deleteFuncionario.mutate(funcDeleteModal.funcionario.id);
      setFuncDeleteModal({ open: false });
    }
  };

  const handleDeleteFolha = () => {
    if (folhaDeleteModal.registro) {
      deleteFolhaPagamento.mutate(folhaDeleteModal.registro.id);
      setFolhaDeleteModal({ open: false });
    }
  };

  const handleDeleteFerias = () => {
    if (feriasDeleteModal.ausencia) {
      deleteFeriasAusencia.mutate(feriasDeleteModal.ausencia.id);
      setFeriasDeleteModal({ open: false });
    }
  };

  const handleApproveReject = (ausencia: FeriasAusencia, newStatus: string) => {
    updateFeriasAusencia.mutate({
      id: ausencia.id,
      status: newStatus,
    } as any);
  };

  const handleDeleteDocumento = () => {
    if (docDeleteModal.documento) {
      deleteDocumento.mutate(docDeleteModal.documento.id);
      setDocDeleteModal({ open: false });
    }
  };

  const handleDocUploadComplete = async (files: UploadedFile[]) => {
    if (!docFuncionarioId) {
      toast.error("Selecione um funcionário primeiro");
      return;
    }
    for (const file of files) {
      try {
        await addDocumento.mutateAsync({
          funcionario_id: docFuncionarioId,
          tipo_documento: docTipoDocumento || "Outro",
          nome_arquivo: file.name,
          url_arquivo: file.url || file.path,
          descricao: docDescricao.trim() || null,
        });
      } catch {
        toast.error(`Erro ao registrar documento: ${file.name}`);
      }
    }
    setDocDescricao("");
    setDocTipoDocumento("");
  };

  if (loadingFuncionarios) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (errorFuncionarios) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-destructive" data-testid="text-error-title">
              Erro ao carregar dados de RH
            </h2>
            <p className="text-muted-foreground max-w-md" data-testid="text-error-message">
              Não foi possível carregar os dados. Verifique se as tabelas foram criadas no banco de dados.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetchFuncionarios()}
            className="gap-2"
            data-testid="button-retry"
          >
            <Loader2 className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <FeatureGate feature="moduleRh" featureName="Recursos Humanos">
    <MainLayout
      title="Recursos Humanos"
      description="Gestão de funcionários, folha de pagamento, férias e documentos"
      actions={
        <div className="flex items-center gap-2">
          {activeTab !== "documentos" && (
            <RequirePermission module="rh" action="write">
              <Button
                size="sm"
                className="gap-2"
                onClick={
                  activeTab === "funcionarios"
                    ? () => setFuncFormModal({ open: true, mode: "create" })
                    : activeTab === "folha"
                    ? () => setFolhaFormModal({ open: true, mode: "create" })
                    : () => setFeriasFormModal({ open: true, mode: "create" })
                }
                data-testid="button-new-header"
              >
                <Plus className="h-4 w-4" />
                {activeTab === "funcionarios" ? "Novo Funcionário"
                  : activeTab === "folha" ? "Novo Registro"
                  : "Nova Ausência"}
              </Button>
            </RequirePermission>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {activeTab === "funcionarios" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, cargo, CPF..."
                  value={funcSearch}
                  onChange={(e) => setFuncSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-funcionarios"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={funcStatusFilter} onValueChange={setFuncStatusFilter}>
                  <SelectTrigger className="w-[130px]" data-testid="select-filter-status-func">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {STATUS_FUNCIONARIO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={funcSetorFilter} onValueChange={setFuncSetorFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-filter-setor">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Setores</SelectItem>
                    {SETORES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {activeTab === "folha" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por funcionário ou mês..."
                  value={folhaSearch}
                  onChange={(e) => setFolhaSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-folha"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MonthPickerField
                  value={folhaMesFilter}
                  onChange={setFolhaMesFilter}
                  placeholder="Filtrar por mês"
                  className="w-[200px]"
                  data-testid="monthpicker-filter-mes-folha"
                />
                <Select value={folhaStatusFilter} onValueChange={setFolhaStatusFilter}>
                  <SelectTrigger className="w-[130px]" data-testid="select-filter-status-folha">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {STATUS_PAGAMENTO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {activeTab === "ferias" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por funcionário ou tipo..."
                  value={feriasSearch}
                  onChange={(e) => setFeriasSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-ferias"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={feriasStatusFilter} onValueChange={setFeriasStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-filter-status-ferias">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {STATUS_AUSENCIA.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="funcionarios" className="flex items-center gap-2" data-testid="tab-funcionarios">
              <Users className="h-4 w-4" />
              Funcionários
            </TabsTrigger>
            <TabsTrigger value="folha" className="flex items-center gap-2" data-testid="tab-folha">
              <DollarSign className="h-4 w-4" />
              Folha de Pagamento
            </TabsTrigger>
            <TabsTrigger value="ferias" className="flex items-center gap-2" data-testid="tab-ferias">
              <CalendarDays className="h-4 w-4" />
              Férias e Ausências
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2" data-testid="tab-documentos">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funcionarios" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card data-testid="kpi-total">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-kpi-total">{kpiCounts.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-ativos">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-kpi-ativos">{kpiCounts.ativos}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-ferias">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Palmtree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-kpi-ferias">{kpiCounts.ferias}</p>
                    <p className="text-xs text-muted-foreground">Férias</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-afastados">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <UserX className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-kpi-afastados">{kpiCounts.afastados}</p>
                    <p className="text-xs text-muted-foreground">Afastados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {filteredFuncionarios.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum funcionário encontrado"
                description="Adicione seu primeiro funcionário para começar a gerenciar a equipe."
                action={{
                  label: "Novo Funcionário",
                  onClick: () => setFuncFormModal({ open: true, mode: "create" }),
                }}
              />
            ) : (
              <>
              {selectedFuncIds.length > 0 && (
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                  <span className="text-sm text-muted-foreground flex-1">{selectedFuncIds.length} selecionado(s)</span>
                  <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" onClick={handleBulkDeleteFuncs} data-testid="button-bulk-delete-funcs">
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir ({selectedFuncIds.length})
                  </Button>
                </div>
              )}
              <Table data-testid="table-funcionarios">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]">
                      <Checkbox
                        checked={selectedFuncIds.length === filteredFuncionarios.length && filteredFuncionarios.length > 0}
                        onCheckedChange={toggleSelectAllFuncs}
                        data-testid="checkbox-select-all-funcs"
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFuncionarios.map((f) => (
                    <TableRow key={f.id} data-testid={`row-funcionario-${f.id}`} className={selectedFuncIds.includes(f.id) ? "bg-muted/20" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFuncIds.includes(f.id)}
                          onCheckedChange={() => toggleSelectFunc(f.id)}
                          data-testid={`checkbox-funcionario-${f.id}`}
                          aria-label={`Selecionar ${f.nome_completo}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{f.nome_completo}</p>
                          {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{f.cargo || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{f.setor || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{f.tipo_contrato || "—"}</TableCell>
                      <TableCell className="text-right">{f.salario_base ? formatCurrency(Number(f.salario_base)) : "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE_FUNCIONARIO[f.status || "ativo"] || ""}>
                          {(f.status || "ativo").charAt(0).toUpperCase() + (f.status || "ativo").slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs" data-testid={`text-usuario-vinculo-${f.id}`}>
                        {getUsuarioNome(f.vinculo_usuario_id) || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-actions-func-${f.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setFuncFormModal({ open: true, mode: "view", funcionario: f })} data-testid={`button-view-func-${f.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFuncFormModal({ open: true, mode: "edit", funcionario: f })} data-testid={`button-edit-func-${f.id}`}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setFuncDeleteModal({ open: true, funcionario: f })} data-testid={`button-delete-func-${f.id}`}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
          </TabsContent>

          <TabsContent value="folha" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card data-testid="kpi-total-folha">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-ativos-folha">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.ativos}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-ferias-folha">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Palmtree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.ferias}</p>
                    <p className="text-xs text-muted-foreground">Férias</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-afastados-folha">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <UserX className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.afastados}</p>
                    <p className="text-xs text-muted-foreground">Afastados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {loadingFolha ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFolha.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="Nenhum registro de pagamento"
                description="Adicione registros de folha de pagamento para controlar os salários."
                action={{
                  label: "Novo Registro",
                  onClick: () => setFolhaFormModal({ open: true, mode: "create" }),
                }}
              />
            ) : (
              <Table data-testid="table-folha">
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Mês Ref.</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Descontos</TableHead>
                    <TableHead className="text-right">Bônus</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFolha.map((fp) => (
                    <TableRow key={fp.id} data-testid={`row-folha-${fp.id}`}>
                      <TableCell className="font-medium">{getFuncionarioNome(fp.funcionario_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{fp.mes_referencia || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(fp.salario_bruto) || 0)}</TableCell>
                      <TableCell className="text-right text-destructive">
                        {fp.descontos ? `- ${formatCurrency(Number(fp.descontos))}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        {fp.bonus ? `+ ${formatCurrency(Number(fp.bonus))}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(fp.salario_liquido) || 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fp.data_pagamento ? formatDate(fp.data_pagamento) : "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE_PAGAMENTO[fp.status || "pendente"] || ""}>
                          {(fp.status || "pendente").charAt(0).toUpperCase() + (fp.status || "pendente").slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-actions-folha-${fp.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setFolhaFormModal({ open: true, mode: "view", registro: fp })} data-testid={`button-view-folha-${fp.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFolhaFormModal({ open: true, mode: "edit", registro: fp })} data-testid={`button-edit-folha-${fp.id}`}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setFolhaDeleteModal({ open: true, registro: fp })} data-testid={`button-delete-folha-${fp.id}`}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="ferias" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card data-testid="kpi-total-ferias">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-ativos-ferias">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.ativos}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-ferias-ferias">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Palmtree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.ferias}</p>
                    <p className="text-xs text-muted-foreground">Férias</p>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="kpi-afastados-ferias">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <UserX className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{kpiCounts.afastados}</p>
                    <p className="text-xs text-muted-foreground">Afastados</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {loadingFerias ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFerias.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nenhum registro de férias/ausência"
                description="Registre férias e ausências dos funcionários aqui."
                action={{
                  label: "Nova Ausência",
                  onClick: () => setFeriasFormModal({ open: true, mode: "create" }),
                }}
              />
            ) : (
              <Table data-testid="table-ferias">
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead className="text-center">Dias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFerias.map((fa) => (
                    <TableRow key={fa.id} data-testid={`row-ferias-${fa.id}`}>
                      <TableCell className="font-medium">{getFuncionarioNome(fa.funcionario_id)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {fa.tipo ? fa.tipo.charAt(0).toUpperCase() + fa.tipo.slice(1) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(fa.data_inicio)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(fa.data_fim)}</TableCell>
                      <TableCell className="text-center">{fa.dias_totais ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE_AUSENCIA[fa.status || "pendente"] || ""}>
                          {(fa.status || "pendente").charAt(0).toUpperCase() + (fa.status || "pendente").slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {fa.status === "pendente" && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleApproveReject(fa, "aprovado")} title="Aprovar" data-testid={`button-approve-${fa.id}`}>
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleApproveReject(fa, "rejeitado")} title="Rejeitar" data-testid={`button-reject-${fa.id}`}>
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-actions-ferias-${fa.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setFeriasFormModal({ open: true, mode: "view", ausencia: fa })} data-testid={`button-view-ferias-${fa.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setFeriasFormModal({ open: true, mode: "edit", ausencia: fa })} data-testid={`button-edit-ferias-${fa.id}`}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setFeriasDeleteModal({ open: true, ausencia: fa })} data-testid={`button-delete-ferias-${fa.id}`}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="documentos" className="mt-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <Select value={docFuncionarioId} onValueChange={setDocFuncionarioId}>
                  <SelectTrigger className="w-[250px]" data-testid="select-doc-funcionario">
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!docFuncionarioId ? (
              <EmptyState
                icon={FileText}
                title="Selecione um funcionário"
                description="Escolha um funcionário na lista acima para visualizar e gerenciar seus documentos."
              />
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-semibold text-sm" data-testid="text-upload-title">Enviar Novo Documento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Documento</Label>
                        <Select value={docTipoDocumento} onValueChange={setDocTipoDocumento}>
                          <SelectTrigger data-testid="select-tipo-documento">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_DOCUMENTO.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          placeholder="Descrição opcional do documento"
                          value={docDescricao}
                          onChange={(e) => setDocDescricao(e.target.value)}
                          data-testid="input-doc-descricao"
                        />
                      </div>
                    </div>
                    <FileUpload
                      folder="documentos-rh"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      maxSize={10}
                      multiple
                      onUploadComplete={handleDocUploadComplete}
                      data-testid="file-upload-documentos"
                    />
                  </CardContent>
                </Card>

                {loadingDocs ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (documentos || []).length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Nenhum documento encontrado"
                    description="Envie documentos usando o formulário acima."
                  />
                ) : (
                  <div className="rounded-lg border overflow-x-auto" data-testid="table-documentos">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Arquivo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(documentos || []).map((doc) => (
                          <TableRow key={doc.id} data-testid={`row-documento-${doc.id}`}>
                            <TableCell>
                              <Badge variant="secondary">{doc.tipo_documento || "Outro"}</Badge>
                            </TableCell>
                            <TableCell>
                              <a
                                href={doc.url_arquivo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                data-testid={`link-doc-${doc.id}`}
                              >
                                {doc.nome_arquivo}
                              </a>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{doc.descricao || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(doc.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDocDeleteModal({ open: true, documento: doc })}
                                data-testid={`button-delete-doc-${doc.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FuncionarioFormModal
        open={funcFormModal.open}
        onOpenChange={(open) => setFuncFormModal({ ...funcFormModal, open })}
        funcionario={funcFormModal.funcionario}
        mode={funcFormModal.mode}
      />

      <FolhaPagamentoFormModal
        open={folhaFormModal.open}
        onOpenChange={(open) => setFolhaFormModal({ ...folhaFormModal, open })}
        registro={folhaFormModal.registro}
        mode={folhaFormModal.mode}
      />

      <FeriasAusenciasFormModal
        open={feriasFormModal.open}
        onOpenChange={(open) => setFeriasFormModal({ ...feriasFormModal, open })}
        ausencia={feriasFormModal.ausencia}
        mode={feriasFormModal.mode}
      />

      <DeleteConfirmModal
        open={funcDeleteModal.open}
        onOpenChange={(open) => setFuncDeleteModal({ ...funcDeleteModal, open })}
        onConfirm={handleDeleteFuncionario}
        title="Excluir Funcionário"
        description={`Tem certeza que deseja excluir "${funcDeleteModal.funcionario?.nome_completo}"? Esta ação não pode ser desfeita.`}
      />

      <DeleteConfirmModal
        open={folhaDeleteModal.open}
        onOpenChange={(open) => setFolhaDeleteModal({ ...folhaDeleteModal, open })}
        onConfirm={handleDeleteFolha}
        title="Excluir Registro de Pagamento"
        description="Tem certeza que deseja excluir este registro de pagamento? Esta ação não pode ser desfeita."
      />

      <DeleteConfirmModal
        open={feriasDeleteModal.open}
        onOpenChange={(open) => setFeriasDeleteModal({ ...feriasDeleteModal, open })}
        onConfirm={handleDeleteFerias}
        title="Excluir Registro de Ausência"
        description="Tem certeza que deseja excluir este registro de férias/ausência? Esta ação não pode ser desfeita."
      />

      <DeleteConfirmModal
        open={docDeleteModal.open}
        onOpenChange={(open) => setDocDeleteModal({ ...docDeleteModal, open })}
        onConfirm={handleDeleteDocumento}
        title="Excluir Documento"
        description={`Tem certeza que deseja excluir o documento "${docDeleteModal.documento?.nome_arquivo}"? Esta ação não pode ser desfeita.`}
      />
    </MainLayout>
    </FeatureGate>
  );
}
