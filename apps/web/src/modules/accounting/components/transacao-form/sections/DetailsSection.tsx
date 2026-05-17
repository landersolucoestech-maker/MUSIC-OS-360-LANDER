import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { X, Upload, FileText } from "lucide-react";
import { FieldError } from "@/shared/components/FormField";
import type { TransacaoFormData } from "@/modules/accounting/lib/transacao-constants";
import type { ValidationErrors } from "@/modules/accounting/components/transacao-form/validation/financial-form-validation";
import { FormInputField } from "@/modules/accounting/components/transacao-form/components/FormInputField";

interface DetailsSectionProps {
  formData:          TransacaoFormData;
  errors:            ValidationErrors;
  disabled:          boolean;
  updateField:       (field: keyof TransacaoFormData, value: string) => void;
  handleFileUpload:  (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAnexo: () => void;
}

export function DetailsSection({
  formData,
  errors,
  disabled,
  updateField,
  handleFileUpload,
  handleRemoveAnexo,
}: DetailsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Detalhes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormInputField
          label="Descrição"
          value={formData.descricao}
          onChange={(e) => updateField("descricao", e.target.value)}
          disabled={disabled}
          placeholder="Ex: Pagamento de produção musical para o single 'Nome da Música'"
          error={errors.descricao}
          required
        />

        <div className="space-y-2">
          <Label className="text-sm">Observações</Label>
          <Textarea
            value={formData.observacao}
            onChange={(e) => updateField("observacao", e.target.value)}
            disabled={disabled}
            placeholder="Informações adicionais sobre a transação..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Anexo (Comprovante)</Label>
          {formData.anexoUrl ? (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{formData.anexoNome}</span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAnexo}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
                disabled={disabled}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
          <FieldError error={errors.anexoUrl} />
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PDF, JPG, PNG, DOC, DOCX
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
