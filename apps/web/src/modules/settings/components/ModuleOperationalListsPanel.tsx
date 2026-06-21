import { useMemo, useState } from "react";
import { Edit, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  type OperationalListItem,
  type OperationalListKind,
  useOperationalSettings,
} from "@/modules/settings/hooks/useOperationalSettings";

export type ModuleListSection = {
  kind: OperationalListKind;
  title: string;
  description: string;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  group: string;
  description: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  group: "",
  description: "",
  active: true,
};

export function ModuleOperationalListsPanel({
  sections,
  note,
}: {
  sections: ModuleListSection[];
  note?: string;
}) {
  const settings = useOperationalSettings();
  const [activeKind, setActiveKind] = useState<OperationalListKind>(sections[0]?.kind ?? "lead_type");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const activeSection = sections.find((section) => section.kind === activeKind) ?? sections[0];
  const items = settings.getItemsByKind(activeKind);

  const orderedSections = useMemo(() => sections, [sections]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: OperationalListItem) => {
    setForm({
      id: item.id,
      name: item.name,
      slug: item.slug,
      group: item.group ?? "",
      description: item.description,
      active: item.active,
    });
    setFormOpen(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) {
      toast.error("Informe um nome para a configuração.");
      return;
    }
    const payload = {
      name: form.name,
      slug: form.slug || form.name,
      group: form.group,
      description: form.description,
      active: form.active,
    };
    if (form.id) {
      settings.updateItem(form.id, payload);
      toast.success("Configuração atualizada.");
    } else {
      settings.createItem(activeKind, payload);
      toast.success("Configuração criada.");
    }
    setFormOpen(false);
  };

  if (!activeSection) return null;

  return (
    <div className="space-y-4">
      {note && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">{note}</CardContent>
        </Card>
      )}

      <Tabs value={activeKind} onValueChange={(value) => setActiveKind(value as OperationalListKind)}>
        <TabsList className="h-auto flex-wrap">
          {orderedSections.map((section) => (
            <TabsTrigger key={section.kind} value={section.kind} className="text-xs">
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {orderedSections.map((section) => (
          <TabsContent key={section.kind} value={section.kind} className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => {
                      settings.resetDefaults(section.kind);
                      toast.success("Padrão restaurado.");
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    Novo item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[1fr_120px_88px] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid-cols-[1fr_180px_96px_96px]">
                    <span>Nome</span>
                    <span className="hidden md:block">Grupo</span>
                    <span>Status</span>
                    <span className="text-right">Acoes</span>
                  </div>
                  <div className="divide-y">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1fr_120px_88px] items-center gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_180px_96px_96px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.description || item.slug}</p>
                        </div>
                        <span className="hidden truncate text-xs text-muted-foreground md:block">{item.group ?? "-"}</span>
                        <button
                          type="button"
                          className="w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          onClick={() => settings.toggleItem(item.id)}
                        >
                          {item.active ? "Ativo" : "Inativo"}
                        </button>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => settings.removeItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor interno</Label>
                <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="gerado pelo nome" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Input value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label>Ativo</Label>
              <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={saveForm}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
