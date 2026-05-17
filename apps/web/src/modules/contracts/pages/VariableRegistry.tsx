import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Braces, Copy, Pencil, Trash2, Plus, Variable } from "lucide-react";
import { toast } from "sonner";
import { useVariableRegistry } from "@/modules/contracts/hooks/useVariableRegistry";
import type { RegistryVariable } from "@/modules/contracts/hooks/useVariableRegistry";
import { PageHeader } from "@/shared/components/PageHeader";

// ── Validation helpers ─────────────────────────────────────────────────────

const SLUG_REGEX = /^[A-Z][A-Z0-9_]+$/;

function normalizeSlug(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function isValidSlug(v: string): boolean {
  return SLUG_REGEX.test(v) && v.length >= 2;
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="rounded-full bg-primary/10 p-5">
        <Variable className="h-10 w-10 text-primary/60" />
      </div>
      <div>
        <p className="text-lg font-semibold">Nenhuma variável criada</p>
        <p className="text-sm text-muted-foreground mt-1">
          Clique em "Nova Variável" para começar a criar placeholders reutilizáveis.
        </p>
      </div>
      <Button onClick={onNew} data-testid="button-new-variable-empty">
        <Plus className="h-4 w-4 mr-2" />
        Nova Variável
      </Button>
    </div>
  );
}

// ── Variable form modal ────────────────────────────────────────────────────

interface VariableFormState {
  name: string;
  group: string;
  field: string;
}

interface VariableFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: VariableFormState;
  onSubmit: (values: VariableFormState) => void;
  mode: "create" | "edit";
}

function VariableFormModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
  mode,
}: VariableFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [group, setGroup] = useState(initial?.group ?? "");
  const [field, setField] = useState(initial?.field ?? "");

  const groupNorm = normalizeSlug(group);
  const fieldNorm = normalizeSlug(field);
  const preview =
    isValidSlug(groupNorm) && isValidSlug(fieldNorm)
      ? `{{${groupNorm}.${fieldNorm}}}`
      : "{{GRUPO.CAMPO}}";

  const nameError = name.trim().length === 0 ? "Nome é obrigatório" : null;
  const groupError =
    group.trim().length === 0
      ? "Grupo é obrigatório"
      : !isValidSlug(groupNorm)
        ? "Mínimo 2 caracteres (letras/números/_)"
        : null;
  const fieldError =
    field.trim().length === 0
      ? "Campo é obrigatório"
      : !isValidSlug(fieldNorm)
        ? "Mínimo 2 caracteres (letras/números/_)"
        : null;

  const canSubmit = !nameError && !groupError && !fieldError;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), group: groupNorm, field: fieldNorm });
    onOpenChange(false);
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setName(initial?.name ?? "");
      setGroup(initial?.group ?? "");
      setField(initial?.field ?? "");
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-variable-form">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova Variável" : "Editar Variável"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="vr-name">Nome amigável</Label>
            <Input
              id="vr-name"
              placeholder="Ex: Nome do Artista"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-variable-name"
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vr-group">Grupo / Contexto</Label>
              <Input
                id="vr-group"
                placeholder="Ex: ARTISTA"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                data-testid="input-variable-group"
              />
              {groupError && (
                <p className="text-xs text-destructive">{groupError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vr-field">Campo</Label>
              <Input
                id="vr-field"
                placeholder="Ex: NAME"
                value={field}
                onChange={(e) => setField(e.target.value)}
                data-testid="input-variable-field"
              />
              {fieldError && (
                <p className="text-xs text-destructive">{fieldError}</p>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 px-4 py-3 flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-mono text-primary font-medium">
              {preview}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid="button-variable-form-cancel"
          >
            Cancelar
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            data-testid="button-variable-form-submit"
          >
            {mode === "create" ? "Criar Variável" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function VariableRegistry() {
  const { variables, addVariable, updateVariable, removeVariable } =
    useVariableRegistry();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RegistryVariable | null>(null);
  const [search, setSearch] = useState("");

  const filtered = variables.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.placeholder.toLowerCase().includes(q) ||
      v.group.toLowerCase().includes(q) ||
      v.field.toLowerCase().includes(q)
    );
  });

  function handleCreate(values: VariableFormState) {
    addVariable(values.name, values.group, values.field);
    toast.success("Variável criada com sucesso");
  }

  function handleEdit(values: VariableFormState) {
    if (!editTarget) return;
    updateVariable(editTarget.id, {
      name: values.name,
      group: values.group,
      field: values.field,
    });
    toast.success("Variável atualizada");
    setEditTarget(null);
  }

  function handleCopy(placeholder: string) {
    navigator.clipboard
      .writeText(placeholder)
      .then(() => toast.success(`${placeholder} copiado`))
      .catch(() => toast.error("Não foi possível copiar"));
  }

  function handleDelete(v: RegistryVariable) {
    removeVariable(v.id);
    toast.success(`"${v.name}" removida`);
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Variáveis de Template"
        description="Crie, organize e reutilize placeholders em qualquer contrato"
        actions={{
          custom: (
            <Button
              onClick={() => setCreateOpen(true)}
              data-testid="button-new-variable"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Variável
            </Button>
          ),
        }}
      />

      <div className="flex-1 overflow-auto p-6">
        {variables.length === 0 ? (
          <EmptyState onNew={() => setCreateOpen(true)} />
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Pesquisar variáveis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
              data-testid="input-search-variables"
            />

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Placeholder</TableHead>
                    <TableHead className="w-28 text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-10"
                      >
                        Nenhuma variável encontrada para "{search}"
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((v) => (
                      <TableRow key={v.id} data-testid={`row-variable-${v.id}`}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{v.group}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {v.field}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-primary bg-primary/5 border border-primary/15 rounded px-2 py-0.5">
                            {v.placeholder}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopy(v.placeholder)}
                              title="Copiar placeholder"
                              data-testid={`button-copy-variable-${v.id}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditTarget(v)}
                              title="Editar"
                              data-testid={`button-edit-variable-${v.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(v)}
                              title="Remover"
                              data-testid={`button-delete-variable-${v.id}`}
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
            </div>
          </div>
        )}
      </div>

      <VariableFormModal
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={handleCreate}
      />

      {editTarget && (
        <VariableFormModal
          key={editTarget.id}
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          mode="edit"
          initial={{
            name: editTarget.name,
            group: editTarget.group,
            field: editTarget.field,
          }}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
