import { useEffect, useMemo, useState } from "react";
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
import { getExpectedUpdatedAt, handleConcurrencyConflict } from "@/shared/hooks/useConcurrencyConflict";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import type { Artista } from "@/modules/artist/hooks/useArtistas";
import { AsyncEntityCombobox } from "@/shared/components/AsyncEntityCombobox";
import { shareSchema } from "@/modules/releases/lib/share-schema";
import { resolveShareType } from "@/modules/releases/lib/share-format";
import type { Share, ShareType } from "@/modules/releases/types";

interface SharePendenteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share?: Share;
  /** Pré-seleciona um lançamento (ex.: vindo do fluxo de release). */
  initialLancamentoId?: string;
  onSuccess?: () => void;
}

interface ShareFormState {
  share_type: ShareType;
  // interno
  lancamento_id: string;
  detentor: string;       // participante
  destinatario: string;
  funcao: string;
  // externo
  nome_musica: string;
  artista_externo: string;
  artista_projeto_id: string;
  pagador: string;
  pagador_contato: string;
  origem_acordo: string;
  data_prevista: string;
  documentos: string;
  // comum
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
  { value: "enviado", label: "Enviado" },
  { value: "aceito", label: "Aceito" },
  { value: "recebido", label: "Recebido" },
  { value: "recusado", label: "Recusado" },
  { value: "erro", label: "Erro" },
  { value: "cancelado", label: "Cancelado" },
];

const EMPTY: ShareFormState = {
  share_type: "internal_release",
  lancamento_id: "",
  detentor: "",
  destinatario: "",
  funcao: "interprete",
  nome_musica: "",
  artista_externo: "",
  artista_projeto_id: "",
  pagador: "",
  pagador_contato: "",
  origem_acordo: "",
  data_prevista: "",
  documentos: "",
  percentual: "",
  status: "pendente",
  acordo_notas: "",
  acordo_url: "",
  observacoes: "",
};

function shareToForm(share: Share & Record<string, unknown>): ShareFormState {
  const s = (k: string): string => {
    const v = share[k];
    return typeof v === "string" ? v : "";
  };
  return {
    share_type: resolveShareType(share),
    lancamento_id: s("lancamento_id"),
    detentor: s("detentor"),
    destinatario: s("destinatario"),
    funcao: s("tipo") || "interprete",
    nome_musica: s("nome_musica") || s("titulo_obra"),
    artista_externo: s("artista_externo"),
    artista_projeto_id: s("artista_projeto_id") || s("artista_id"),
    pagador: s("pagador"),
    pagador_contato: s("pagador_contato"),
    origem_acordo: s("origem_acordo"),
    data_prevista: s("data_prevista"),
    documentos: s("documentos"),
    percentual: share.percentual != null ? String(share.percentual) : "",
    status: s("status") || "pendente",
    acordo_notas: s("acordo_notas"),
    acordo_url: s("acordo_url"),
    observacoes: s("observacoes"),
  };
}

export function SharePendenteFormModal({ open, onOpenChange, share, initialLancamentoId, onSuccess }: SharePendenteFormModalProps) {
  const { addShare, updateShare, shares } = useShares();
  const { lancamentos } = useLancamentos();
  const [formData, setFormData] = useState<ShareFormState>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!share?.id;
  const isInternal = formData.share_type === "internal_release";

  const lancamentosDistribuidos = useMemo(
    () =>
      lancamentos
        .slice()
        .sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "pt-BR")),
    [lancamentos],
  );

  useEffect(() => {
    if (!open) return;
    if (share?.id) {
      setFormData(shareToForm(share as Share & Record<string, unknown>));
    } else {
      setFormData({
        ...EMPTY,
        ...(initialLancamentoId ? { lancamento_id: initialLancamentoId, share_type: "internal_release" } : {}),
      });
    }
  }, [open, share, initialLancamentoId]);

  const handleChange = (field: keyof ShareFormState, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    const validation = shareSchema.safeParse({
      share_type: formData.share_type,
      lancamento_id: formData.lancamento_id,
      detentor: formData.detentor,
      destinatario: formData.destinatario,
      funcao: formData.funcao as ShareFormState["funcao"],
      nome_musica: formData.nome_musica,
      artista_externo: formData.artista_externo,
      artista_projeto_id: formData.artista_projeto_id,
      pagador: formData.pagador,
      pagador_contato: formData.pagador_contato,
      origem_acordo: formData.origem_acordo,
      data_prevista: formData.data_prevista,
      documentos: formData.documentos,
      percentual: formData.percentual,
      status: formData.status,
      acordo_notas: formData.acordo_notas,
      acordo_url: formData.acordo_url,
      observacoes: formData.observacoes,
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Preencha os campos obrigatórios");
      return;
    }

    // Bloqueia duplicidade no fluxo interno: release + participante + destinatário
    if (isInternal) {
      const dup = shares.find(
        (s) =>
          s.id !== share?.id &&
          (s as Record<string, unknown>)["lancamento_id"] === formData.lancamento_id &&
          (s.detentor ?? "") === formData.detentor &&
          ((s as Record<string, unknown>)["destinatario"] ?? "") === formData.destinatario,
      );
      if (dup) {
        toast.error("Já existe um share para este lançamento, participante e destinatário.");
        return;
      }
    }

    const percentualNum = formData.percentual ? parseFloat(formData.percentual) : null;
    setIsSubmitting(true);
    try {
      const selectedRelease = lancamentosDistribuidos.find((l) => l.id === formData.lancamento_id);
      const common = {
        share_type: formData.share_type,
        percentual: percentualNum,
        status: formData.status,
        acordo_notas: formData.acordo_notas.trim() || null,
        acordo_url: formData.acordo_url.trim() || null,
        observacoes: formData.observacoes.trim() || null,
      };
      const payload: Record<string, unknown> = isInternal
        ? {
            ...common,
            // direcao mantém semântica de fluxo de caixa (compat KPIs)
            direcao: "a_enviar",
            lancamento_id: formData.lancamento_id || null,
            nome_musica: selectedRelease?.titulo ?? null,
            detentor: formData.detentor.trim() || null,
            destinatario: formData.destinatario.trim() || null,
            tipo: formData.funcao || null,
          }
        : {
            ...common,
            direcao: "a_receber",
            nome_musica: formData.nome_musica.trim() || null,
            artista_externo: formData.artista_externo.trim() || null,
            artista_projeto_id: formData.artista_projeto_id || null,
            artista_id: formData.artista_projeto_id || null,
            pagador: formData.pagador.trim() || null,
            pagador_contato: formData.pagador_contato.trim() || null,
            origem_acordo: formData.origem_acordo.trim() || null,
            data_prevista: formData.data_prevista || null,
            documentos: formData.documentos.trim() || null,
          };

      if (isEditing && share?.id) {
        await updateShare.mutateAsync({ id: share.id, ...payload, expectedUpdatedAt: getExpectedUpdatedAt(share) });
        toast.success("Share atualizado com sucesso!");
      } else {
        const novaVersao = 1;
        await addShare.mutateAsync({
          ...payload,
          versao: novaVersao,
          historico:
            percentualNum != null
              ? [{
                  versao: novaVersao,
                  data: new Date().toISOString().split("T")[0],
                  percentual: percentualNum,
                  autor: "Sistema",
                  descricao: "Registro inicial",
                }]
              : [],
        });
        toast.success("Share registrado com sucesso!");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (handleConcurrencyConflict(err, "share")) return;
      toast.error(isEditing ? "Erro ao atualizar share" : "Erro ao registrar share");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? "Editar Share" : "Registrar Share"}
          </DialogTitle>
          <DialogDescription>
            {isInternal
              ? "Participação de um lançamento interno cadastrado no sistema."
              : "Recebível de música externa — não depende de lançamento interno."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Tipo de Share */}
          <div className="space-y-2">
            <Label>Tipo de Share</Label>
            <Select value={formData.share_type} onValueChange={(v) => handleChange("share_type", v)}>
              <SelectTrigger data-testid="select-share-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal_release">Release Interno</SelectItem>
                <SelectItem value="external_receivable">Share Externo a Receber</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isInternal ? (
            <>
              <div className="space-y-2">
                <Label>Lançamento</Label>
                <Select value={formData.lancamento_id} onValueChange={(v) => handleChange("lancamento_id", v)}>
                  <SelectTrigger data-testid="select-lancamento-distribuido">
                    <SelectValue placeholder="Selecione o lançamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {lancamentosDistribuidos.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="detentor">Participante</Label>
                  <Input id="detentor" placeholder="Nome do participante" value={formData.detentor}
                    onChange={(e) => handleChange("detentor", e.target.value)} data-testid="input-detentor" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinatario">Destinatário</Label>
                  <Input id="destinatario" placeholder="Quem recebe (envio)" value={formData.destinatario}
                    onChange={(e) => handleChange("destinatario", e.target.value)} data-testid="input-destinatario" />
                </div>
              </div>
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
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_musica">Nome da Música</Label>
                  <Input id="nome_musica" placeholder="Ex: Bohemian Rhapsody" value={formData.nome_musica}
                    onChange={(e) => handleChange("nome_musica", e.target.value)} data-testid="input-nome-musica" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artista_externo">Artista principal externo</Label>
                  <Input id="artista_externo" placeholder="Artista da música" value={formData.artista_externo}
                    onChange={(e) => handleChange("artista_externo", e.target.value)} data-testid="input-artista-externo" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Artista / Projeto vinculado à empresa</Label>
                {/* Task J: busca server-side (AsyncEntityCombobox) — antes populava
                    o Select com useArtistas() sem filtro, truncado nos primeiros
                    50 artistas do tenant. */}
                <AsyncEntityCombobox<Artista>
                  table="artistas"
                  getLabel={(a) => a.nome_artistico ?? ""}
                  value={formData.artista_projeto_id || null}
                  onChange={(id) => handleChange("artista_projeto_id", id)}
                  placeholder="Selecione o vínculo"
                  searchPlaceholder="Buscar artista..."
                  data-testid="select-artista-projeto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pagador">Responsável pagador</Label>
                  <Input id="pagador" placeholder="Quem paga" value={formData.pagador}
                    onChange={(e) => handleChange("pagador", e.target.value)} data-testid="input-pagador" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pagador_contato">Contato do pagador</Label>
                  <Input id="pagador_contato" placeholder="Email / telefone" value={formData.pagador_contato}
                    onChange={(e) => handleChange("pagador_contato", e.target.value)} data-testid="input-pagador-contato" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origem_acordo">Origem do acordo</Label>
                  <Input id="origem_acordo" placeholder="Como surgiu o acordo" value={formData.origem_acordo}
                    onChange={(e) => handleChange("origem_acordo", e.target.value)} data-testid="input-origem-acordo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_prevista">Data prevista de recebimento</Label>
                  <Input id="data_prevista" type="date" value={formData.data_prevista}
                    onChange={(e) => handleChange("data_prevista", e.target.value)} data-testid="input-data-prevista" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentos">Documentos / comprovantes (URL)</Label>
                <Input id="documentos" placeholder="https://..." value={formData.documentos}
                  onChange={(e) => handleChange("documentos", e.target.value)} data-testid="input-documentos" />
              </div>
            </>
          )}

          {/* Percentual + Status (comum) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percentual">% Share</Label>
              <Input id="percentual" type="number" min="0" max="100" step="0.01" placeholder="Ex: 10.00"
                value={formData.percentual} onChange={(e) => handleChange("percentual", e.target.value)} data-testid="input-percentual" />
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

          <div className="space-y-2">
            <Label htmlFor="acordo_notas">Notas do Acordo</Label>
            <Textarea id="acordo_notas" placeholder="Termos do acordo, condições, vigência..."
              value={formData.acordo_notas} onChange={(e) => handleChange("acordo_notas", e.target.value)} rows={2} data-testid="textarea-acordo-notas" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acordo_url">URL do Documento (opcional)</Label>
            <Input id="acordo_url" type="url" placeholder="https://..." value={formData.acordo_url}
              onChange={(e) => handleChange("acordo_url", e.target.value)} data-testid="input-acordo-url" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações adicionais</Label>
            <Textarea id="observacoes" placeholder="Informações adicionais sobre este share..."
              value={formData.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} rows={2} data-testid="textarea-observacoes" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="button-salvar">
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Registrar Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
