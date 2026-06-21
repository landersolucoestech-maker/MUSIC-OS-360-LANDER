import { useState } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { MusicChatTemplate } from "../types/musicchat-automation.types";

interface Props {
  templates: MusicChatTemplate[];
  onChange: (templates: MusicChatTemplate[]) => void;
}

export function AutoMessageTemplateEditor({ templates, onChange }: Props) {
  const [openTemplates, setOpenTemplates] = useState<Record<string, boolean>>({
    [templates[0]?.id ?? ""]: true,
  });

  const update = (id: string, patch: Partial<MusicChatTemplate>) => {
    onChange(templates.map((template) => (template.id === id ? { ...template, ...patch } : template)));
  };

  const add = () => {
    const id = `template-${Date.now()}`;
    onChange([...templates, { id, title: "Novo template", body: "Digite a mensagem automática..." }]);
    setOpenTemplates((current) => ({ ...current, [id]: true }));
  };

  const remove = (id: string) => {
    onChange(templates.filter((template) => template.id !== id));
    setOpenTemplates((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Templates automaticos</h3>
          <p className="text-xs text-muted-foreground">Mensagens editaveis enviadas apos a triagem.</p>
        </div>
        <Button type="button" size="sm" className="h-8 text-xs gap-1.5" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-3">
        {templates.map((template, index) => {
          const isOpen = openTemplates[template.id] ?? false;
          const preview = template.body.trim().replace(/\s+/g, " ");

          return (
            <Collapsible
              key={`${template.id}-${index}`}
              open={isOpen}
              onOpenChange={(open) => setOpenTemplates((current) => ({ ...current, [template.id]: open }))}
            >
              <div className="rounded-lg border border-border bg-card">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex w-full items-center justify-between gap-4 p-4 text-left">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{template.title || "Template sem título"}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{template.id}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {preview || "Sem mensagem configurada"}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 border-t border-border p-4">
                    <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                      <div className="space-y-1.5">
                        <Label className="text-xs">ID</Label>
                        <Input value={template.id} onChange={(event) => update(template.id, { id: event.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Titulo</Label>
                        <Input value={template.title} onChange={(event) => update(template.id, { title: event.target.value })} className="h-8 text-sm" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="mt-5 h-8 w-8 text-destructive" onClick={() => remove(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mensagem</Label>
                      <Textarea value={template.body} onChange={(event) => update(template.id, { body: event.target.value })} rows={3} />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
