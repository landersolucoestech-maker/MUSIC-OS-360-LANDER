import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Loader2 } from "lucide-react";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useClientes } from "@/modules/crm/hooks/useClientes";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useTransacaoForm } from "./hooks/useTransacaoForm";
import { useFinancialRules } from "./hooks/useFinancialRules";
import { TransactionTypeSection } from "./sections/TransactionTypeSection";
import { CategorySection } from "./sections/CategorySection";
import { FinancialLinksSection } from "./sections/FinancialLinksSection";
import { PaymentSection } from "./sections/PaymentSection";
import { DetailsSection } from "./sections/DetailsSection";

interface TransacaoFormModalProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  transacao?:    Record<string, unknown>;
  mode:          "create" | "edit" | "view";
}

export function TransacaoFormModal({ open, onOpenChange, transacao, mode }: TransacaoFormModalProps) {
  const isViewMode = mode === "view";
  const title = mode === "create" ? "Nova Transação Financeira"
    : mode === "edit" ? "Editar Transação"
    : "Visualizar Transação";

  const { artistas } = useArtistas();
  const { clientes } = useClientes();
  const { projetos } = useProjetos();
  const { eventos }  = useEventos();

  const form = useTransacaoForm({ open, mode, transacao, onClose: () => onOpenChange(false) });

  const rules = useFinancialRules({
    formData: form.formData,
    projetos,
    eventos,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => form.handleSubmit(e, rules)} className="space-y-6">
          <TransactionTypeSection
            formData={form.formData}
            rules={rules}
            errors={form.errors}
            disabled={isViewMode}
            updateField={form.updateField}
          />

          <CategorySection
            formData={form.formData}
            rules={rules}
            errors={form.errors}
            disabled={isViewMode}
            updateField={form.updateField}
          />

          <FinancialLinksSection
            formData={form.formData}
            rules={rules}
            errors={form.errors}
            disabled={isViewMode}
            updateField={form.updateField}
            artistas={artistas}
            clientes={clientes}
            projetosFiltrados={rules.projetosFiltrados}
            eventosFiltrados={rules.eventosFiltrados}
          />

          <PaymentSection
            formData={form.formData}
            rules={rules}
            errors={form.errors}
            disabled={isViewMode}
            updateField={form.updateField}
          />

          <DetailsSection
            formData={form.formData}
            errors={form.errors}
            disabled={isViewMode}
            updateField={form.updateField}
            handleFileUpload={form.handleFileUpload}
            handleRemoveAnexo={form.handleRemoveAnexo}
          />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.isSubmitting}
            >
              {isViewMode ? "Fechar" : "Cancelar"}
            </Button>
            {!isViewMode && (
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                disabled={form.isSubmitting}
              >
                {form.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  mode === "create" ? "Salvar Transação" : "Salvar Alterações"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
