import { useEffect, useState } from "react";
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
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";

interface SharePendenteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share?: any;
  onSuccess?: () => void;
}

interface ShareFormData {
  obra_id: string;
  artista_id: string;
  detentor: string;
  funcao: string;
  direcao: string;
  percentual: string;
  status: string;
  valor_total: string;
  acordo_notas: string;
  acordo_url: string;
  observacoes: string;
}

const FUNCAO_OPTIONS = [
  { value: "compositor", label: "Compositor / Autor" },
  { value: "interprete", label: "Intérprete" },
  { value: "produtor", label: "Produtor" },
  { value: "editora", label: "Editora" },
  { value: "gravadora", label: "Gravadora" },
  { value: "empresario", label: "Empresário" },
  { value: "outro", label: "Outro" },
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "parcial", label: "Parcial" },
  { value: "recebido", label: "Recebido" },
  { value: "enviado", label: "Enviado" },
  { value: "cancelado", label: "Cancelado" },
];

const NONE = "__none__";

const EMPTY: ShareFormData = {
  obra_id: NONE,
  artista_id: NONE,
  detentor: "",
  funcao: "interprete",
  direcao: "a_receber",
  percentual: "",
  status: "pendente",
  valor_total: "",
  acordo_notas: "",
  acordo_url: "",
  observacoes: "",
};

function shareToForm(share: any): ShareFormData {
  return {
    obra_id: share.obra_id ?? NONE,
    artista_id: share.artista_id ?? NONE,
    detentor: share.detentor ?? "",
    funcao: share.tipo ?? "interprete",
    direcao: share.direcao ?? "a_receber",
    percentual: share.percentual != null ? String(share.percentual) : "",
    status: share.status ?? "pendente",
    valor_total: share.valor_total != null ? String(share.valor_total) : "",
    acordo_notas: share.acordo_notas ?? "",
    acordo_url: share.acordo_url ?? "",
    observacoes: share.observacoes ?? "",
  };
}

export function SharePendenteFormModal({ open, onOpenChange, share, onSuccess }: SharePendenteFormModalProps) {
  const { addShare, updateShare } = useShares();
  const { obras } = useObras();
  const { artistas } = useArtistas();
  const [formData, setFormData] = useState<ShareFormData>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!share?.id;

  useEffect(() => {
    if (open) {
      setFormData(share?.id ? shareToForm(share) : EMPTY);
    }
  }, [open, share]);

  const handleChange = (field: keyof ShareFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.funcao) {
      toast.error("Selecione a função do detentor");
      return;
    }
    if (!formData.direcao) {
      toast.error("Selecione a direção do share");
      return;
    }
    if (!formData.obra_id && !formData.detentor.trim() && !formData.artista_id) {
      toast.error("Informe a obra ou o detentor do share");
      return;
    }
    const percentualNum = formData.percentual ? parseFloat(formData.percentual) : null;
    if (formData.percentual && (isNaN(percentualNum!) || percentualNum! < 0 || percentualNum! > 100)) {
      toast.error("Percentual deve ser entre 0 e 100");
      return;
    }
    const valorNum = formData.valor_total ? parseFloat(formData.valor_total) : null;
    if (formData.valor_total && (isNaN(valorNum!) || valorNum! < 0)) {
      toast.error("Valor total deve ser um número positivo");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        obra_id: formData.obra_id === NONE ? null : (formData.obra_id || null),
        artista_id: formData.artista_id === NONE ? null : (formData.artista_id || null),
        detentor: formData.detentor.trim() || null,
        tipo: formData.funcao,
        direcao: formData.direcao,
        percentual: percentualNum,
        status: formData.status,
        valor_total: valorNum,
        acordo_notas: formData.acordo_notas.trim() || null,
        acordo_url: formData.acordo_url.trim() || null,
        observacoes: formData.observacoes.trim() || null,
      };

      if (isEditing) {
        await updateShare.mutateAsync({ id: share.id, ...payload });
        toast.success("Share atualizado com sucesso!");
      } else {
        await addShare.mutateAsync({
          ...payload,
          versao: 1,
          historico: percentualNum != null ? [{
            versao: 1,
            data: new Date().toISOString().split("T")[0],
            percentual: percentualNum,
            autor: "Sistema",
            descricao: "Registro inicial",
          }] : [],
        });
        toast.success("Share registrado com sucesso!");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(isEditing ? "Erro ao atualizar share" : "Erro ao registrar share");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? "Editar Share" : "Registrar Share"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados de participação e acordo"
              : "Registre percentuais e acordos de participação de forma documental"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Obra e Artista */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select value={formData.obra_id} onValueChange={(v) => handleChange("obra_id", v)}>
                <SelectTrigger data-testid="select-obra">
                  <SelectValue placeholder="Selecione a obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem obra vinculada</SelectItem>
                  {obras.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Artista (opcional)</Label>
              <Select value={formData.artista_id} onValueChange={(v) => handleChange("artista_id", v)}>
                <SelectTrigger data-testid="select-artista">
                  <SelectValue placeholder="Selecione o artista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem artista vinculado</SelectItem>
                  {artistas.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome_artistico}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Detentor manual */}
          <div className="space-y-2">
            <Label htmlFor="detentor">Detentor / Beneficiário</Label>
            <Input
              id="detentor"
              placeholder="Nome do detentor (se não for um artista cadastrado)"
              value={formData.detentor}
              onChange={(e) => handleChange("detentor", e.target.value)}
              data-testid="input-detentor"
            />
          </div>

          {/* Função e Direção */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={formData.funcao} onValueChange={(v) => handleChange("funcao", v)}>
                <SelectTrigger data-testid="select-funcao">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {FUNCAO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direção</Label>
              <Select value={formData.direcao} onValueChange={(v) => handleChange("direcao", v)}>
                <SelectTrigger data-testid="select-direcao">
                  <SelectValue placeholder="Direção do share" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_receber">A Receber</SelectItem>
                  <SelectItem value="a_enviar">A Enviar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Percentual, Valor e Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percentual">% Share</Label>
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
            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total (R$)</Label>
              <Input
                id="valor_total"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.valor_total}
                onChange={(e) => handleChange("valor_total", e.target.value)}
                data-testid="input-valor-total"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas do Acordo */}
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

          <div className="grid grid-cols-1 gap-4">
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
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="button-salvar"
          >
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Registrar Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
