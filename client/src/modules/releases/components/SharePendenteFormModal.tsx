import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { toast } from "sonner";
import { useShares } from "@/modules/releases/hooks/useShares";

interface SharePendenteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ShareFormData {
  titulo_musica: string;
  artista: string;
  beneficiario: string;
  funcao: string;
  percentual: string;
  acordo_notas: string;
  acordo_url: string;
  observacoes: string;
}

const funcaoOptions = [
  { value: "interprete", label: "Intérprete" },
  { value: "compositor", label: "Compositor" },
  { value: "produtor", label: "Produtor" },
  { value: "musico", label: "Músico" },
  { value: "arranjador", label: "Arranjador" },
  { value: "editor", label: "Editor" },
  { value: "autor", label: "Autor" },
  { value: "outro", label: "Outro" },
];

const EMPTY: ShareFormData = {
  titulo_musica: "",
  artista: "",
  beneficiario: "",
  funcao: "interprete",
  percentual: "",
  acordo_notas: "",
  acordo_url: "",
  observacoes: "",
};

export function SharePendenteFormModal({ open, onOpenChange, onSuccess }: SharePendenteFormModalProps) {
  const { addShare } = useShares();
  const [formData, setFormData] = useState<ShareFormData>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof ShareFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.titulo_musica.trim()) {
      toast.error("O título da música é obrigatório");
      return;
    }
    if (!formData.beneficiario.trim()) {
      toast.error("O nome do beneficiário é obrigatório");
      return;
    }
    const percentualNum = formData.percentual ? parseFloat(formData.percentual) : null;
    if (formData.percentual && (isNaN(percentualNum!) || percentualNum! < 0 || percentualNum! > 100)) {
      toast.error("Percentual deve ser entre 0 e 100");
      return;
    }

    setIsSubmitting(true);
    try {
      await addShare.mutateAsync({
        detentor: formData.beneficiario.trim(),
        tipo: formData.funcao,
        percentual: percentualNum,
        acordo_notas: formData.acordo_notas.trim() || null,
        acordo_url: formData.acordo_url.trim() || null,
        observacoes: formData.observacoes.trim() || null,
        versao: 1,
        historico: percentualNum != null ? [{
          versao: 1,
          data: new Date().toISOString().split("T")[0],
          percentual: percentualNum,
          autor: "Sistema",
          descricao: "Registro inicial",
        }] : [],
      } as any);
      toast.success("Share registrado com sucesso!");
      setFormData(EMPTY);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Erro ao registrar share");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Registrar Share</DialogTitle>
          <DialogDescription>
            Registre percentuais e acordos de participação de forma documental
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Música e artista */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo_musica">Título da Música *</Label>
              <Input
                id="titulo_musica"
                placeholder="Nome da música ou obra"
                value={formData.titulo_musica}
                onChange={(e) => handleChange("titulo_musica", e.target.value)}
                data-testid="input-titulo-musica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artista">Artista</Label>
              <Input
                id="artista"
                placeholder="Nome do artista"
                value={formData.artista}
                onChange={(e) => handleChange("artista", e.target.value)}
                data-testid="input-artista"
              />
            </div>
          </div>

          {/* Beneficiário e função */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beneficiario">Beneficiário / Detentor *</Label>
              <Input
                id="beneficiario"
                placeholder="Nome do participante"
                value={formData.beneficiario}
                onChange={(e) => handleChange("beneficiario", e.target.value)}
                data-testid="input-beneficiario"
              />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={formData.funcao} onValueChange={(v) => handleChange("funcao", v)}>
                <SelectTrigger data-testid="select-funcao">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {funcaoOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Percentual */}
          <div className="space-y-2">
            <Label htmlFor="percentual">Percentual do Share (%)</Label>
            <Input
              id="percentual"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Ex: 10.00"
              value={formData.percentual}
              onChange={(e) => handleChange("percentual", e.target.value)}
              data-testid="input-percentual"
            />
          </div>

          {/* Acordo / Documento */}
          <div className="space-y-2">
            <Label htmlFor="acordo_notas">Notas do Acordo</Label>
            <Textarea
              id="acordo_notas"
              placeholder="Descreva os termos do acordo, condições, vigência..."
              value={formData.acordo_notas}
              onChange={(e) => handleChange("acordo_notas", e.target.value)}
              rows={3}
              data-testid="textarea-acordo-notas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acordo_url">URL do Documento (opcional)</Label>
            <Input
              id="acordo_url"
              type="url"
              placeholder="https://..."
              value={formData.acordo_url}
              onChange={(e) => handleChange("acordo_url", e.target.value)}
              data-testid="input-acordo-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações adicionais</Label>
            <Textarea
              id="observacoes"
              placeholder="Informações adicionais sobre este share..."
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              rows={2}
              data-testid="textarea-observacoes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => { setFormData(EMPTY); onOpenChange(false); }}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-registrar"
          >
            {isSubmitting ? "Salvando..." : "Registrar Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
