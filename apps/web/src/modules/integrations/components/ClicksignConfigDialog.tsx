import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import {
  useClicksignStatus,
  useClicksignSaveCredentials,
  useClicksignDeleteCredentials,
} from "@/modules/integrations/hooks/useClicksign";

interface ClicksignConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClicksignConfigDialog({ open, onOpenChange }: ClicksignConfigDialogProps) {
  const { data: status, isLoading } = useClicksignStatus();
  const saveMutation = useClicksignSaveCredentials();
  const deleteMutation = useClicksignDeleteCredentials();

  const [apiKey, setApiKey] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    setApiKey("");
    setAccountEmail("");
  }, [open]);

  const handleSave = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    await saveMutation.mutateAsync({ api_key: trimmedKey, account_email: accountEmail });
    setApiKey("");
    setAccountEmail("");
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
    setApiKey("");
    setAccountEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-clicksign-config">
        <DialogHeader>
          <DialogTitle>Integração Clicksign</DialogTitle>
          <DialogDescription>
            Conecte sua conta Clicksign para enviar e acompanhar contratos com
            assinatura eletrônica com validade jurídica direto do MUSIC OS 360.
          </DialogDescription>
        </DialogHeader>

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
                data-testid="clicksign-connected-status"
              >
                Conectado.
                {status.account_email && (
                  <span className="block text-xs text-muted-foreground">
                    Conta: {status.account_email}
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
              <Label htmlFor="clicksign-api-key">API Key</Label>
              <Input
                id="clicksign-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  status?.has_token
                    ? "••••••• (digite para atualizar)"
                    : "Cole a API Key do seu painel Clicksign"
                }
                autoComplete="off"
                data-testid="input-clicksign-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Em <span className="font-medium">Clicksign → Configurações → Integrações → API</span>{" "}
                gere uma chave de acesso e cole aqui.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clicksign-account-email">E-mail da conta <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                id="clicksign-account-email"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                placeholder="email@suaempresa.com"
                autoComplete="off"
                data-testid="input-clicksign-account-email"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {status?.has_token ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-clicksign-disconnect"
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
              data-testid="button-clicksign-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || apiKey.trim().length === 0}
              data-testid="button-clicksign-save"
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
