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
import { shareSchema } from "@/modules/releases/lib/share-schema";

interface SharePendenteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share?: any;
  onSuccess?: () => void;
}

interface ShareFormData {
  nome_musica: string;
  detentor: string;
  funcao: string;
  direcao: string;
  percentual: string;
  status: string;
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

const EMPTY: ShareFormData = {
  nome_musica: "",
  detentor: "",
  funcao: "interprete",
  direcao: "a_receber",
  percentual: "",
  status: "pendente",
  acordo_notas: "",
  acordo_url: "",
  observacoes: "",
};

function shareToForm(share: any): ShareFormData {
  return {
    nome_musica: share.nome_musica ?? share.titulo_obra ?? "",
    detentor: share.detentor ?? "",
    funcao: share.tipo ?? "interprete",
    direcao: share.direcao ?? "a_receber",
    percentual: share.percentual != null ? String(share.percentual) : "",
    status: share.status ?? "pendente",
    acordo_notas: share.acordo_notas ?? "",
    acordo_url: share.acordo_url ?? "",
    observacoes: share.observacoes ?? "",
  };
}

export function SharePendenteFormModal({ open, onOpenChange, share, onSuccess }: SharePendenteFormModalProps) {
  const { addShare, updateShare } = useShares();
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
    const validation = shareSchema.safeParse({
      nome_musica: formData.nome_musica,
      detentor: formData.detentor,
      funcao: formData.funcao as any,
      direcao: formData.direcao as any,
      percentual: formData.percentual,
      status: formData.status as any,
      acordo_notas: formData.acordo_notas,
      acordo_url: formData.acordo_url,
      observacoes: formData.observacoes,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError?.message || "Preencha os campos obrigatórios");
      return;
    }

    if (!formData.direcao) {
      toast.error("Selecione a direção do share");
      return;
    }
    if (formData.direcao === "a_enviar" && !formData.funcao) {
      toast.error("Selecione a função do detentor");
      return;
    }
    if (!formData.nome_musica.trim() && !formData.detentor.trim()) {
      toast.error("Informe o nome da música ou o detentor do share");
      return;
    }
    const percentualNum = formData.percentual ? parseFloat(formData.percentual) : null;
    if (formData.percentual && (isNaN(percentualNum!) || percentualNum! < 0 || percentualNum! > 100)) {
      toast.error("Percentual deve ser entre 0 e 100");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        nome_musica: formData.nome_musica.trim() || null,
        detentor: formData.detentor.trim() || null,
        tipo: formData.direcao === "a_enviar" ? formData.funcao : null,
        direcao: formData.direcao,
        percentual: percentualNum,
        status: formData.status,
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

          {/* Nome da Música + Detentor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_musica">Nome da Música</Label>
              <Input
                id="nome_musica"
                placeholder="Ex: Bohemian Rhapsody"
                value={formData.nome_musica}
                onChange={(e) => handleChange("nome_musica", e.target.value)}
                data-testid="input-nome-musica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detentor">Detentor / Beneficiário</Label>
              <Input
                id="detentor"
                placeholder="Nome do detentor ou beneficiário"
                value={formData.detentor}
                onChange={(e) => handleChange("detentor", e.target.value)}
                data-testid="input-detentor"
              />
            </div>
          </div>

          {/* Direção + Função (Função só aparece quando A Enviar) */}
          <div className="grid grid-cols-2 gap-4">
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
            {formData.direcao === "a_enviar" && (
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
            )}
          </div>

          {/* Percentual + Status */}
          <div className="grid grid-cols-2 gap-4">
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
