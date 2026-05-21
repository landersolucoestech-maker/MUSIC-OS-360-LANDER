import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import type { FinancialRulesResult } from "@/modules/accounting/components/transacao-form/hooks/useFinancialRules";
import type { ValidationErrors } from "@/modules/accounting/components/transacao-form/validation/financial-form-validation";
import { FormSelectField } from "@/modules/accounting/components/transacao-form/components/FormSelectField";

interface CategorySectionProps {
  formData:    TransacaoFormData;
  rules:       FinancialRulesResult;
  errors:      ValidationErrors;
  disabled:    boolean;
  updateField: (field: keyof TransacaoFormData, value: string) => void;
}

export function CategorySection({
  formData,
  rules,
  errors,
  disabled,
  updateField,
}: CategorySectionProps) {
  const isInvestimento  = formData.tipoTransacao === "investimento";
  const isImposto       = formData.tipoTransacao === "imposto";
  const isTransferencia = formData.tipoTransacao === "transferencia";

  if (!rules.exibirCategoria || isInvestimento || isImposto || isTransferencia) return null;

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormSelectField
            label="Categoria"
            value={formData.categoria}
            onChange={(v) => updateField("categoria", v)}
            options={rules.categorias}
            placeholder="Selecione a categoria"
            error={errors.categoria}
            disabled={disabled}
            required
          />

          {rules.exibirSubcategoria && (
            <FormSelectField
              label="Tipo / Subcategoria"
              value={formData.subcategoria}
              onChange={(v) => updateField("subcategoria", v)}
              options={rules.subcategorias}
              placeholder="Selecione o tipo"
              error={errors.subcategoria}
              disabled={disabled}
              required
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
