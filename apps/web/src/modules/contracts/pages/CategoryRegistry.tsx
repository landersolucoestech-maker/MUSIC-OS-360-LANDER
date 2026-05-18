import { useState, useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
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
import { Search, Plus, Pencil, Trash2, Check, X, Tag } from "lucide-react";
import {
  useCategoryRegistry,
  type ContractCategory,
} from "@/modules/contracts/hooks/useCategoryRegistry";
import { toast } from "sonner";

interface CategoryRegistryProps {
  asModal?: boolean;
  onClose?: () => void;
}

interface EditState {
  id: string;
  label: string;
  value: string;
  description: string;
}

export default function CategoryRegistry({
  asModal = false,
  onClose: _onClose,
}: CategoryRegistryProps) {
  const { categories, addCategory, updateCategory, removeCategory, toSlug } =
    useCategoryRegistry();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContractCategory | null>(
    null,
  );
  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  // ── filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [categories, search]);

  // ── create ───────────────────────────────────────────────────────────────
  function resetCreate() {
    setCreating(false);
    setNewLabel("");
    setNewValue("");
    setNewDesc("");
    setAutoSlug(true);
  }

  function handleCreate() {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    const slug = autoSlug ? toSlug(label) : newValue.trim() || toSlug(label);
    const dupe = categories.find((c) => c.value === slug);
    if (dupe) {
      toast.error(`Já existe uma categoria com o slug "${slug}"`);
      return;
    }
    addCategory(label, slug, newDesc.trim() || undefined);
    toast.success(`Categoria "${label}" criada`);
    resetCreate();
  }

  // ── edit ─────────────────────────────────────────────────────────────────
  function startEdit(cat: ContractCategory) {
    setEditing({
      id: cat.id,
      label: cat.label,
      value: cat.value,
      description: cat.description ?? "",
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function commitEdit() {
    if (!editing) return;
    const label = editing.label.trim();
    if (!label) {
      toast.error("Nome não pode ficar vazio");
      return;
    }
    const slug = toSlug(editing.value || label);
    const dupe = categories.find(
      (c) => c.value === slug && c.id !== editing.id,
    );
    if (dupe) {
      toast.error(`Slug "${slug}" já está a ser usado por outra categoria`);
      return;
    }
    updateCategory(editing.id, {
      label,
      value: slug,
      description: editing.description.trim() || undefined,
    });
    toast.success("Categoria actualizada");
    setEditing(null);
  }

  // ── delete ───────────────────────────────────────────────────────────────
  function confirmDelete() {
    if (!deleteTarget) return;
    removeCategory(deleteTarget.id);
    toast.success(`Categoria "${deleteTarget.label}" eliminada`);
    setDeleteTarget(null);
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={
        asModal
          ? "flex flex-col h-full gap-4 p-1"
          : "flex flex-col gap-4 p-4 max-w-3xl"
      }
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Pesquisar categorias…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-category-search"
          />
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setCreating(true)}
          disabled={creating}
          data-testid="button-new-category"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Categoria
        </Button>
      </div>

      {/* Inline create form */}
      {creating && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary">Nova categoria</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="ex: Licenciamento Sync"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  if (autoSlug) setNewValue(toSlug(e.target.value));
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                data-testid="input-new-category-label"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                Slug
                <span className="text-muted-foreground font-normal">
                  (gerado auto)
                </span>
              </Label>
              <Input
                className="h-8 text-xs font-mono"
                placeholder="licenciamento_sync"
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setAutoSlug(false);
                }}
                data-testid="input-new-category-value"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Breve descrição da categoria…"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              data-testid="input-new-category-description"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={resetCreate}
              data-testid="button-cancel-new-category"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleCreate}
              data-testid="button-confirm-new-category"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Criar
            </Button>
          </div>
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} categoria{filtered.length !== 1 ? "s" : ""}
        {search ? ` para "${search}"` : " no registo"}
      </p>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
            <Tag className="h-8 w-8 opacity-30" />
            <p className="text-sm">
              {search
                ? "Nenhuma categoria encontrada"
                : "Nenhuma categoria criada ainda"}
            </p>
          </div>
        )}

        {filtered.map((cat) => {
          const isEditing = editing?.id === cat.id;

          if (isEditing && editing) {
            return (
              <div
                key={cat.id}
                className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2"
                data-testid={`row-category-editing-${cat.id}`}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Nome
                    </Label>
                    <Input
                      className="h-7 text-xs"
                      value={editing.label}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev ? { ...prev, label: e.target.value } : prev,
                        )
                      }
                      autoFocus
                      data-testid="input-edit-category-label"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Slug
                    </Label>
                    <Input
                      className="h-7 text-xs font-mono"
                      value={editing.value}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev ? { ...prev, value: e.target.value } : prev,
                        )
                      }
                      data-testid="input-edit-category-value"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Descrição
                  </Label>
                  <Input
                    className="h-7 text-xs"
                    value={editing.description}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    data-testid="input-edit-category-description"
                  />
                </div>
                <div className="flex gap-1.5 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={cancelEdit}
                    data-testid="button-cancel-edit-category"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={commitEdit}
                    data-testid="button-confirm-edit-category"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Guardar
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={cat.id}
              className="group flex items-center gap-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 px-3 py-2 transition-colors"
              data-testid={`row-category-${cat.id}`}
            >
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">
                    {cat.label}
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] px-1.5 py-0 h-4 text-muted-foreground"
                  >
                    {cat.value}
                  </Badge>
                </div>
                {cat.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {cat.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => startEdit(cat)}
                  data-testid={`button-edit-category-${cat.id}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(cat)}
                  data-testid={`button-delete-category-${cat.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar{" "}
              <span className="font-semibold text-foreground">
                "{deleteTarget?.label}"
              </span>
              ? Os templates que usam esta categoria não serão afectados, mas a
              categoria deixará de aparecer nos formulários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-category">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-category"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
