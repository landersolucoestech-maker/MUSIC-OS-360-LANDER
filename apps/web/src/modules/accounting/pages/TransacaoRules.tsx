import { useState, useMemo } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { useRegrasTransacao, type RegraTransacao, type RegraTransacaoInsert } from "../hooks/useRegrasTransacao";

// ── Opções de selects ──────────────────────────────────────────────────────────

const TIPOS_TRANSACAO = [
  { value: "all",          label: "Todos os tipos" },
  { value: "receita",      label: "Receita" },
  { value: "despesa",      label: "Despesa" },
  { value: "investimento", label: "Investimento" },
  { value: "imposto",      label: "Imposto" },
  { value: "transferencia", label: "Transferência" },
];

const TIPOS_CLIENTE = [
  { value: "all",     label: "Todos" },
  { value: "empresa", label: "Empresa" },
  { value: "artista", label: "Artista" },
  { value: "pessoa",  label: "Pessoa" },
];

const CATEGORIAS = [
  { value: "all",                label: "Todas as categorias" },
  { value: "receitas-musicais",  label: "Receitas Musicais" },
  { value: "caches",             label: "Cachês" },
  { value: "servicos",           label: "Serviços" },
  { value: "produtos",           label: "Produtos" },
  { value: "administrativo",     label: "Administrativo" },
  { value: "marketing",          label: "Marketing" },
  { value: "viagens",            label: "Viagens" },
  { value: "equipamentos",       label: "Equipamentos" },
  { value: "suporte-financeiro", label: "Suporte Financeiro" },
  { value: "impostos",           label: "Impostos" },
];

const CAMPOS_DISPONIVEIS: { key: string; label: string; grupo: string }[] = [
  { key: "categoria",         label: "Categoria",           grupo: "Base" },
  { key: "subcategoria",      label: "Subcategoria",        grupo: "Base" },
  { key: "descricao",         label: "Descrição",           grupo: "Base" },
  { key: "valor",             label: "Valor",               grupo: "Base" },
  { key: "data",              label: "Data",                grupo: "Base" },
  { key: "status",            label: "Status",              grupo: "Base" },
  { key: "observacao",        label: "Observação",          grupo: "Base" },
  { key: "artista",           label: "Artista Vinculado",   grupo: "Vínculos" },
  { key: "projeto",           label: "Projeto Vinculado",   grupo: "Vínculos" },
  { key: "contrato",          label: "Contrato Vinculado",  grupo: "Vínculos" },
  { key: "evento",            label: "Evento Vinculado",    grupo: "Vínculos" },
  { key: "fornecedor",        label: "Fornecedor / Cliente", grupo: "Vínculos" },
  { key: "orgaoArrecadador",  label: "Órgão Arrecadador",   grupo: "Vínculos" },
  { key: "formaPagamento",    label: "Forma de Pagamento",  grupo: "Pagamento" },
  { key: "tipoPagamento",     label: "Tipo de Pagamento",   grupo: "Pagamento" },
  { key: "parcelas",          label: "Parcelas",            grupo: "Pagamento" },
  { key: "itemInvestimento",  label: "Item de Investimento", grupo: "Específicos" },
  { key: "motivoViagem",      label: "Motivo de Viagem",    grupo: "Específicos" },
  { key: "nomePublicidade",   label: "Nome da Publicidade", grupo: "Específicos" },
  { key: "anexo",             label: "Anexo",               grupo: "Específicos" },
];

const TIPO_BADGE: Record<string, string> = {
  receita:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  despesa:       "bg-rose-500/10 text-rose-400 border-rose-500/20",
  investimento:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  imposto:       "bg-amber-500/10 text-amber-400 border-amber-500/20",
  transferencia: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  all:           "bg-muted text-muted-foreground border-border",
};

const labelFor = (opts: { value: string; label: string }[], val: string) =>
  opts.find((o) => o.value === val)?.label ?? val;

// ── Form vazio ────────────────────────────────────────────────────────────────

const EMPTY_FORM: RegraTransacaoInsert = {
  nome: "",
  descricao: "",
  tipoTransacao: "all",
  tipoCliente: "all",
  categoria: "all",
  camposVisiveis: ["categoria", "valor", "data"],
  camposObrigatorios: ["valor", "data"],
  prioridade: 10,
  ativo: true,
};

// ── Modal Criar / Editar ──────────────────────────────────────────────────────

interface RegraModalProps {
  open: boolean;
  regra: RegraTransacao | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: RegraTransacaoInsert) => void;
}

function RegraModal({ open, regra, isSubmitting, onClose, onSubmit }: RegraModalProps) {
  const [form, setForm] = useState<RegraTransacaoInsert>(() =>
    regra ? {
      nome: regra.nome,
      descricao: regra.descricao,
      tipoTransacao: regra.tipoTransacao,
      tipoCliente: regra.tipoCliente,
      categoria: regra.categoria,
      camposVisiveis: regra.camposVisiveis,
      camposObrigatorios: regra.camposObrigatorios,
      prioridade: regra.prioridade,
      ativo: regra.ativo,
    } : { ...EMPTY_FORM }
  );

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setForm(regra ? {
        nome: regra.nome,
        descricao: regra.descricao,
        tipoTransacao: regra.tipoTransacao,
        tipoCliente: regra.tipoCliente,
        categoria: regra.categoria,
        camposVisiveis: regra.camposVisiveis,
        camposObrigatorios: regra.camposObrigatorios,
        prioridade: regra.prioridade,
        ativo: regra.ativo,
      } : { ...EMPTY_FORM });
    }
    if (!isOpen) onClose();
  };

  const toggleCampoVisivel = (key: string, checked: boolean) => {
    setForm((f) => {
      const visiveis = checked
        ? [...f.camposVisiveis, key]
        : f.camposVisiveis.filter((k) => k !== key);
      const obrigatorios = f.camposObrigatorios.filter((k) => visiveis.includes(k));
      return { ...f, camposVisiveis: visiveis, camposObrigatorios: obrigatorios };
    });
  };

  const toggleCampoObrigatorio = (key: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      camposObrigatorios: checked
        ? [...f.camposObrigatorios, key]
        : f.camposObrigatorios.filter((k) => k !== key),
    }));
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) return;
    onSubmit(form);
  };

  const gruposOrdem = ["Base", "Vínculos", "Pagamento", "Específicos"];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{regra ? "Editar Regra" : "Nova Regra de Transação"}</DialogTitle>
          <DialogDescription>
            {regra
              ? "Edite os parâmetros desta regra de validação de transações."
              : "Configure os campos visíveis e obrigatórios para este cenário de transação."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-nome">Nome da regra <span className="text-destructive">*</span></Label>
            <Input
              id="rule-nome"
              data-testid="input-rule-nome"
              placeholder="Ex: Despesa de Show com Artista"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-descricao">Descrição</Label>
            <Textarea
              id="rule-descricao"
              data-testid="input-rule-descricao"
              placeholder="Explique quando esta regra se aplica…"
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          {/* Tipo transação + Tipo cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de Transação</Label>
              <Select
                value={form.tipoTransacao}
                onValueChange={(v) => setForm((f) => ({ ...f, tipoTransacao: v }))}
              >
                <SelectTrigger data-testid="select-rule-tipoTransacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TRANSACAO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de Cliente</Label>
              <Select
                value={form.tipoCliente}
                onValueChange={(v) => setForm((f) => ({ ...f, tipoCliente: v }))}
              >
                <SelectTrigger data-testid="select-rule-tipoCliente">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CLIENTE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categoria + Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
              >
                <SelectTrigger data-testid="select-rule-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-prioridade">Prioridade</Label>
              <Input
                id="rule-prioridade"
                data-testid="input-rule-prioridade"
                type="number"
                min={1}
                max={99}
                value={form.prioridade}
                onChange={(e) => setForm((f) => ({ ...f, prioridade: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Menor número = maior prioridade</p>
            </div>
          </div>

          {/* Campos */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Configuração de campos</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecione quais campos aparecem e quais são obrigatórios neste cenário.
              </p>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_80px] text-xs font-semibold text-muted-foreground bg-muted/40 px-3 py-2 border-b border-border">
                <span>Campo</span>
                <span className="text-center">Visível</span>
                <span className="text-center">Obrigatório</span>
              </div>
              {gruposOrdem.map((grupo) => {
                const campos = CAMPOS_DISPONIVEIS.filter((c) => c.grupo === grupo);
                return (
                  <div key={grupo}>
                    <div className="px-3 py-1.5 bg-muted/20 border-b border-border">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {grupo}
                      </span>
                    </div>
                    {campos.map((campo) => {
                      const visivel = form.camposVisiveis.includes(campo.key);
                      const obrigatorio = form.camposObrigatorios.includes(campo.key);
                      return (
                        <div
                          key={campo.key}
                          className="grid grid-cols-[1fr_80px_80px] items-center px-3 py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/10"
                        >
                          <span className="text-sm">{campo.label}</span>
                          <div className="flex justify-center">
                            <Checkbox
                              data-testid={`check-visivel-${campo.key}`}
                              checked={visivel}
                              onCheckedChange={(checked) =>
                                toggleCampoVisivel(campo.key, checked === true)
                              }
                            />
                          </div>
                          <div className="flex justify-center">
                            <Checkbox
                              data-testid={`check-obrigatorio-${campo.key}`}
                              checked={obrigatorio}
                              disabled={!visivel}
                              onCheckedChange={(checked) =>
                                toggleCampoObrigatorio(campo.key, checked === true)
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Regra ativa</p>
              <p className="text-xs text-muted-foreground">Quando inativa, a regra não é aplicada ao formulário</p>
            </div>
            <Switch
              data-testid="switch-rule-ativo"
              checked={form.ativo}
              onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            data-testid="button-submit-rule"
            onClick={handleSubmit}
            disabled={isSubmitting || !form.nome.trim()}
          >
            {isSubmitting ? "Salvando…" : regra ? "Salvar alterações" : "Criar regra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TransacaoRules() {
  const { regras, isLoading, createRegra, updateRegra, deleteRegra, isCreating, isUpdating, isDeleting } =
    useRegrasTransacao();

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterAtivo, setFilterAtivo] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RegraTransacao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegraTransacao | null>(null);

  const filtered = useMemo(() => {
    return regras.filter((r) => {
      if (search && !r.nome.toLowerCase().includes(search.toLowerCase()) &&
          !r.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTipo !== "all" && r.tipoTransacao !== filterTipo) return false;
      if (filterAtivo === "ativo" && !r.ativo) return false;
      if (filterAtivo === "inativo" && r.ativo) return false;
      return true;
    });
  }, [regras, search, filterTipo, filterAtivo]);

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (regra: RegraTransacao) => {
    setEditTarget(regra);
    setModalOpen(true);
  };

  const handleSubmit = (data: RegraTransacaoInsert) => {
    if (editTarget) {
      updateRegra({ id: editTarget.id, data });
    } else {
      createRegra(data);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteRegra(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Regras de Transação"
          description="Configure os campos visíveis e obrigatórios para cada cenário de lançamento financeiro."
          actions={{
            custom: (
              <Button data-testid="button-nova-regra" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            ),
          }}
        />

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-rules"
              className="pl-9"
              placeholder="Buscar por nome ou descrição…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger data-testid="select-filter-tipo" className="w-44">
                <SelectValue placeholder="Tipo de transação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
                <SelectItem value="imposto">Imposto</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAtivo} onValueChange={setFilterAtivo}>
              <SelectTrigger data-testid="select-filter-ativo" className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">P.</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo de Transação</TableHead>
                  <TableHead>Tipo de Cliente</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Campos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 rounded bg-muted animate-pulse w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {search || filterTipo !== "all" || filterAtivo !== "all"
                        ? "Nenhuma regra encontrada com os filtros aplicados."
                        : "Nenhuma regra cadastrada. Clique em Nova Regra para começar."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((regra) => (
                    <TableRow key={regra.id} data-testid={`row-regra-${regra.id}`}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {regra.prioridade}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{regra.nome}</p>
                          {regra.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{regra.descricao}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TIPO_BADGE[regra.tipoTransacao] ?? TIPO_BADGE.all}
                        >
                          {labelFor(TIPOS_TRANSACAO, regra.tipoTransacao)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {labelFor(TIPOS_CLIENTE, regra.tipoCliente)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {labelFor(CATEGORIAS, regra.categoria)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-mono">
                          <span className="text-foreground">{regra.camposVisiveis.length}</span>
                          <span className="text-muted-foreground"> vis / </span>
                          <span className="text-amber-400">{regra.camposObrigatorios.length}</span>
                          <span className="text-muted-foreground"> obr</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            regra.ativo
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {regra.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-edit-regra-${regra.id}`}
                            onClick={() => openEdit(regra)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-regra-${regra.id}`}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(regra)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Rodapé informativo */}
        {!isLoading && regras.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} de {regras.length} regra(s) exibida(s) — ordenadas por prioridade (menor = maior precedência)
          </p>
        )}
      </div>

      {/* Modal criar / editar */}
      <RegraModal
        open={modalOpen}
        regra={editTarget}
        isSubmitting={isCreating || isUpdating}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              A regra <strong>"{deleteTarget?.nome}"</strong> será excluída permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
