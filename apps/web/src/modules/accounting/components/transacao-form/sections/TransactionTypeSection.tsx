import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  tiposTransacao,
  tiposCliente,
  tiposClienteReceita,
} from "@/modules/accounting/lib/transacao-constants";
import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import type { FinancialRulesResult } from "@/modules/accounting/components/transacao-form/hooks/useFinancialRules";
import type { ValidationErrors } from "@/modules/accounting/components/transacao-form/validation/financial-form-validation";
import { FormSelectField } from "@/modules/accounting/components/transacao-form/components/FormSelectField";

interface TransactionTypeSectionProps {
  formData:   TransacaoFormData;
  rules:      FinancialRulesResult;
  errors:     ValidationErrors;
  disabled:   boolean;
  updateField: (field: keyof TransacaoFormData, value: string) => void;
}

export function TransactionTypeSection({
  formData,
  rules,
  errors,
  disabled,
  updateField,
}: TransactionTypeSectionProps) {
  const isReceita = formData.tipoTransacao === "receita";
  const isInvestimentoOrImpostoOrTransferencia =
    formData.tipoTransacao === "investimento" ||
    formData.tipoTransacao === "imposto" ||
    formData.tipoTransacao === "transferencia";

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Tipo de Transação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelectField
            label="Tipo de Transação"
            value={formData.tipoTransacao}
            onChange={(v) => updateField("tipoTransacao", v)}
            options={tiposTransacao}
            placeholder="Ex: Receita, Despesa, Imposto..."
            error={errors.tipoTransacao}
            disabled={disabled}
            required
          />

          {rules.exibirTipoCliente && (
            <FormSelectField
              label={rules.labelTipoCliente}
              value={formData.tipoCliente}
              onChange={(v) => updateField("tipoCliente", v)}
              options={isReceita ? tiposClienteReceita : tiposCliente}
              placeholder="Ex: Empresa, Artista, Pessoa..."
              error={errors.tipoCliente}
              disabled={disabled}
              required
            />
          )}

          {isInvestimentoOrImpostoOrTransferencia && rules.exibirCategoria && (
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
          )}

          {rules.exibirItemInvestimento && (
            <FormSelectField
              label="Item"
              value={formData.itemInvestimento}
              onChange={(v) => updateField("itemInvestimento", v)}
              options={rules.itensInvestimento}
              placeholder="Selecione o item"
              error={errors.itemInvestimento}
              disabled={disabled}
              required
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
