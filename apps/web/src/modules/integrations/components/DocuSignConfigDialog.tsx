import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/shared/ui/dialog";
import { IntegrationDialogHeader } from "@/shared/integrations";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import {
  useDocuSignStatus,
  useDocuSignSaveCredentials,
  useDocuSignDeleteCredentials,
} from "@/modules/integrations/hooks/useDocuSign";

interface DocuSignConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocuSignConfigDialog({ open, onOpenChange }: DocuSignConfigDialogProps) {
  const { data: status, isLoading } = useDocuSignStatus();
  const saveMutation = useDocuSignSaveCredentials();
  const deleteMutation = useDocuSignDeleteCredentials();

  const [integrationKey, setIntegrationKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    if (!open) return;
    setIntegrationKey("");
    setAccountId("");
    setUserId("");
  }, [open]);

  const handleSave = async () => {
    const trimmedKey = integrationKey.trim();
    const trimmedAccount = accountId.trim();
    if (!trimmedKey || !trimmedAccount) return;
    await saveMutation.mutateAsync({
      integration_key: trimmedKey,
      account_id: trimmedAccount,
      user_id: userId,
    });
    setIntegrationKey("");
    setAccountId("");
    setUserId("");
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
    setIntegrationKey("");
    setAccountId("");
    setUserId("");
  };

  const canSave = integrationKey.trim().length > 0 && accountId.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-docusign-config">
        <IntegrationDialogHeader
          logoId="docusign"
          title="Integração DocuSign"
          description="Conecte sua conta DocuSign para enviar e gerenciar envelopes de assinatura digital direto do MUSIC OS 360."
        />

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando status…
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {status?.connected && (
              <div
                className="rounded-md border border-success/40 bg-success/5 p-3 text-sm"
                data-testid="docusign-connected-status"
              >
                Conectado.
                {status.account_id && (
                  <span className="block text-xs text-muted-foreground">
                    Account ID: {status.account_id}
                  </span>
                )}
                {status.last_sync_at && (
                  <span className="block text-xs text-muted-foreground">
                    Conectado em: {new Date(status.last_sync_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="docusign-integration-key">Integration Key</Label>
              <Input
                id="docusign-integration-key"
                type="password"
                value={integrationKey}
                onChange={(e) => setIntegrationKey(e.target.value)}
                placeholder={
                  status?.has_credentials
                    ? "••••••• (digite para atualizar)"
                    : "Ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                }
                autoComplete="off"
                data-testid="input-docusign-integration-key"
              />
              <p className="text-xs text-muted-foreground">
                Em <span className="font-medium">DocuSign Admin → Apps e Chaves → Chaves de Integração</span>{" "}
                crie ou copie a Integration Key da sua aplicação.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="docusign-account-id">Account ID (API)</Label>
              <Input
                id="docusign-account-id"
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="off"
                data-testid="input-docusign-account-id"
              />
              <p className="text-xs text-muted-foreground">
                Encontre em <span className="font-medium">DocuSign Admin → Informações da Conta → ID da Conta API</span>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="docusign-user-id">
                User ID <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="docusign-user-id"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="off"
                data-testid="input-docusign-user-id"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {status?.has_credentials ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-docusign-disconnect"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Desconectar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-docusign-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !canSave}
              data-testid="button-docusign-save"
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar e conectar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
