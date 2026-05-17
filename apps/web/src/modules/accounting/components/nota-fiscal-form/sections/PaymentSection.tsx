import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { FileText, Upload, X, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { NfFormData } from "@/modules/accounting/components/nota-fiscal-form/rules/nf-form-rules";

const formaPagamentoOptions = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "cheque", label: "Cheque" },
];

interface PaymentSectionProps {
  formData: NfFormData;
  disabled: boolean;
  selectedFile: File | null;
  updateField: <K extends keyof NfFormData>(field: K, value: NfFormData[K]) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setSelectedFile: (f: File | null) => void;
}

export function PaymentSection({
  formData,
  disabled,
  selectedFile,
  updateField,
  handleFileChange,
  setSelectedFile,
}: PaymentSectionProps) {
  return (
    <section className="space-y-4" data-testid="section-pagamento">
      <h3 className="text-base font-semibold border-b pb-1">Pagamento</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Forma de Pagamento</Label>
          <Select
            value={formData.forma_pagamento}
            onValueChange={(v) => updateField("forma_pagamento", v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formaPagamentoOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Condição</Label>
          <Input
            value={formData.condicao_pagamento}
            onChange={(e) => updateField("condicao_pagamento", e.target.value)}
            placeholder="30 dias / À vista / 30/60/90"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Vencimento</Label>
          <DatePickerField
            value={formData.vencimento ? format(formData.vencimento, "yyyy-MM-dd") : ""}
            onChange={(iso) => updateField("vencimento", iso ? parseISO(iso) : undefined)}
            disabled={disabled}
            placeholder="Selecione a data"
            data-testid="datepicker-vencimento"
          />
        </div>
      </div>

      {/* ── PDF upload ── */}
      <div className="space-y-2">
        <Label>Arquivo PDF da Nota</Label>
        {formData.url_pdf && !selectedFile && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm flex-1 truncate">Nota fiscal anexada</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => window.open(formData.url_pdf, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateField("url_pdf", "")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!disabled && !selectedFile && !formData.url_pdf && (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload-nf"
            />
            <label htmlFor="pdf-upload-nf" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Anexar PDF da NF (máx 10MB)</p>
            </label>
          </div>
        )}
      </div>

      {/* ── Observações ── */}
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={formData.observacoes}
          onChange={(e) => updateField("observacoes", e.target.value)}
          placeholder="Observações adicionais..."
          rows={3}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
