import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/ui/command";
import { cn } from "@/shared/lib/utils";
import { useEntityLookup, useEntityById } from "@/shared/hooks/useEntityLookup";

export interface AsyncEntityComboboxProps<T extends { id: string }> {
  /** Nome da tabela/recurso — mesma chave usada em TABLE_ENDPOINT (api-client.ts). */
  table: string;
  /** Extrai o texto exibido de um registro (ex.: (a) => a.nome_artistico). */
  getLabel: (item: T) => string;
  value?: string | null;
  onChange: (id: string, item: T | undefined) => void;
  filters?: Record<string, unknown>;
  pageSize?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  errorText?: string;
  disabled?: boolean;
  invalid?: boolean;
  "data-testid"?: string;
}

/**
 * Task I — combobox com busca server-side, substituto do padrão "carregar a
 * tabela inteira num Select" (useArtistas()/useObras()/etc. sem filtro, que
 * silenciosamente cortava em 50 registros por tenant). Cada tecla digitada
 * (debounced) refaz a query só com o termo atual — nunca a lista inteira.
 *
 * O valor já selecionado é resolvido via GET /:resource/:id (useEntityById),
 * não por busca na lista — assim o label aparece correto mesmo que o
 * registro esteja fora dos primeiros resultados (ex.: editar um item #75).
 */
export function AsyncEntityCombobox<T extends { id: string }>({
  table, getLabel, value, onChange, filters, pageSize = 20,
  placeholder = "Selecione…", searchPlaceholder = "Buscar…",
  emptyText = "Nenhum resultado.", errorText = "Não foi possível buscar. Tente novamente.",
  disabled, invalid, "data-testid": testId,
}: AsyncEntityComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { items, isLoading, isFetching, error } = useEntityLookup<T>({
    table, search, filters, pageSize, enabled: open,
  });
  // Resolve o item selecionado por ID — funciona mesmo se ele não estiver
  // entre os resultados da busca atual (ou antes de qualquer busca).
  const { entity: selectedEntity } = useEntityById<T>(table, value);

  const selectedLabel = selectedEntity ? getLabel(selectedEntity) : undefined;
  const showLoading = open && (isLoading || isFetching);

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            invalid && "border-destructive",
          )}
        >
          <span className="truncate">{selectedLabel ?? (value ? "…" : placeholder)}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            data-testid={testId ? `${testId}-input` : undefined}
          />
          <CommandList>
            {showLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Buscando…
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-destructive">{errorText}</div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        onChange(item.id, item);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", item.id === value ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{getLabel(item)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
