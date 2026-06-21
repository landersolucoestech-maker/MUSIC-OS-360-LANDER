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
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Loader2, Trash2, CheckCircle2, ExternalLink } from "lucide-react";
import { SiGoogleads } from "react-icons/si";
import { toast } from "sonner";
import {
  useGoogleAdsStatus,
  useGoogleAdsSaveCredentials,
  useGoogleAdsDeleteCredentials,
} from "@/modules/integrations/hooks/useGoogleAds";

interface GoogleAdsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleAdsConfigDialog({
  open,
  onOpenChange,
}: GoogleAdsConfigDialogProps) {
  const { data: status, isLoading } = useGoogleAdsStatus();
  const saveMutation = useGoogleAdsSaveCredentials();
  const deleteMutation = useGoogleAdsDeleteCredentials();

  const [developerToken, setDeveloperToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [managerAccountId, setManagerAccountId] = useState("");

  useEffect(() => {
    if (!open) return;
    setDeveloperToken("");
    setClientId("");
    setClientSecret("");
    setManagerAccountId(status?.manager_account_id ?? "");
  }, [open, status?.manager_account_id]);

  const handleSave = async () => {
    if (!developerToken.trim() || !clientId.trim() || !clientSecret.trim()) {
      toast.error("Preencha Developer Token, Client ID e Client Secret.");
      return;
    }
    await saveMutation.mutateAsync({
      developer_token: developerToken.trim(),
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      manager_account_id: managerAccountId.trim() || undefined,
    });
    toast.success("Google Ads configurado com sucesso!");
    setDeveloperToken("");
    setClientId("");
    setClientSecret("");
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
    toast.info("Google Ads desconectado.");
    setDeveloperToken("");
    setClientId("");
    setClientSecret("");
    setManagerAccountId("");
  };

  const canSave =
    developerToken.trim().length > 0 &&
    clientId.trim().length > 0 &&
    clientSecret.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-google-ads-config">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <SiGoogleads className="h-4.5 w-4.5 text-[#4285F4]" />
            </div>
            <div>
              <DialogTitle>Google Ads</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Conecte sua conta Google Ads para centralizar campanhas de Search, Display e YouTube Ads.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando status…
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {status?.connected && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success">Conta conectada</p>
                  {status.manager_account_id && (
                    <p className="text-xs text-muted-foreground">MCC: {status.manager_account_id}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px]">Ativo</Badge>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="gads-dev-token">
                Developer Token <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gads-dev-token"
                type="password"
                placeholder="••••••••••••••••••••"
                value={developerToken}
                onChange={(e) => setDeveloperToken(e.target.value)}
                data-testid="input-google-ads-developer-token"
              />
              <p className="text-[11px] text-muted-foreground">
                Obtido na Google Ads API Center da sua MCC.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gads-client-id">
                  Client ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gads-client-id"
                  placeholder="xxx.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  data-testid="input-google-ads-client-id"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gads-client-secret">
                  Client Secret <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gads-client-secret"
                  type="password"
                  placeholder="••••••••••••"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  data-testid="input-google-ads-client-secret"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gads-mcc">Manager Account ID (MCC)</Label>
              <Input
                id="gads-mcc"
                placeholder="123-456-7890"
                value={managerAccountId}
                onChange={(e) => setManagerAccountId(e.target.value)}
                data-testid="input-google-ads-manager-id"
              />
              <p className="text-[11px] text-muted-foreground">
                Opcional. Necessário se sua conta for gerida por uma MCC.
              </p>
            </div>

            <Separator />

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <a
                href="https://developers.google.com/google-ads/api/docs/get-started/oauth-cloud-project"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Como obter credenciais Google Ads API
              </a>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {status?.connected && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 mr-auto"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-google-ads-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Desconectar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-google-ads-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || saveMutation.isPending}
            data-testid="button-google-ads-save"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {status?.connected ? "Actualizar" : "Conectar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

