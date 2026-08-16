import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Loader2 } from "lucide-react";
import { useEventos } from "@/modules/events/hooks/useEventos";
import { useFinancialCategoryRulesStore } from "@/modules/accounting/hooks/useFinancialCategoryRulesStore";
import type { TransacaoFormEntity } from "@/modules/accounting/mappers";
import { useTransacaoFormController } from "./hooks/useTransacaoFormController";
import { TransactionTypeSection } from "./sections/TransactionTypeSection";
import { PaymentSection } from "./sections/PaymentSection";
import { DetailsSection } from "./sections/DetailsSection";

interface TransacaoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacao?: TransacaoFormEntity;
  mode: "create" | "edit" | "view";
}

export function TransacaoFormModal({
  open,
  onOpenChange,
  transacao,
  mode,
}: TransacaoFormModalProps) {
  const { eventos } = useEventos();
  const { rules: categoryRules } = useFinancialCategoryRulesStore();

  const form = useTransacaoFormController({
    open,
    mode,
    transacao,
    onClose: () => onOpenChange(false),
    eventos,
  });
  const rules = form.visibleRules;
  const disabled = form.isViewMode || form.isSubmitting;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.handleClose();
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{form.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit} className="space-y-5">
          <TransactionTypeSection
            formData={form.formData}
            rules={rules}
            categoryRules={categoryRules}
            errors={form.errors}
            disabled={disabled}
            updateField={form.updateField}
            eventosFiltrados={rules.eventosFiltrados}
          />

          <PaymentSection
            formData={form.formData}
            rules={rules}
            errors={form.errors}
            disabled={disabled}
            updateField={form.updateField}
          />

          <DetailsSection
            formData={form.formData}
            errors={form.errors}
            disabled={disabled}
            updateField={form.updateField}
            handleFileUpload={form.handleFileUpload}
            handleRemoveAnexo={form.handleRemoveAnexo}
          />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleClose}
              disabled={form.isSubmitting}
            >
              {form.isViewMode ? "Fechar" : "Cancelar"}
            </Button>
            {!form.isViewMode && (
              <Button
                type="submit"
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

