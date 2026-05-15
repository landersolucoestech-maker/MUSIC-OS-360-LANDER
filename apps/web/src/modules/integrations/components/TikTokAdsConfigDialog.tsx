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
import { SiTiktok } from "react-icons/si";
import { toast } from "sonner";
import {
  useTikTokAdsStatus,
  useTikTokAdsSaveCredentials,
  useTikTokAdsDeleteCredentials,
} from "@/modules/integrations/hooks/useTikTokAds";

interface TikTokAdsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TikTokAdsConfigDialog({
  open,
  onOpenChange,
}: TikTokAdsConfigDialogProps) {
  const { data: status, isLoading } = useTikTokAdsStatus();
  const saveMutation = useTikTokAdsSaveCredentials();
  const deleteMutation = useTikTokAdsDeleteCredentials();

  const [appId, setAppId] = useState("");
  const [secret, setSecret] = useState("");
  const [advertiserId, setAdvertiserId] = useState("");

  useEffect(() => {
    if (!open) return;
    setAppId("");
    setSecret("");
    setAdvertiserId(status?.advertiser_id ?? "");
  }, [open, status?.advertiser_id]);

  const handleSave = async () => {
    if (!appId.trim() || !secret.trim()) {
      toast.error("Preencha o App ID e o Secret.");
      return;
    }
    await saveMutation.mutateAsync({
      app_id: appId.trim(),
      secret: secret.trim(),
      advertiser_id: advertiserId.trim() || undefined,
    });
    toast.success("TikTok Ads configurado com sucesso!");
    setAppId("");
    setSecret("");
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
    toast.info("TikTok Ads desconectado.");
    setAppId("");
    setSecret("");
    setAdvertiserId("");
  };

  const canSave = appId.trim().length > 0 && secret.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-tiktok-ads-config">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-950/10 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
              <SiTiktok className="h-4.5 w-4.5 text-neutral-900 dark:text-neutral-100" />
            </div>
            <div>
              <DialogTitle>TikTok Ads Manager</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Conecte sua conta do TikTok Ads para gerenciar campanhas, conjuntos de anúncios e leads.
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
                  {status.advertiser_id && (
                    <p className="text-xs text-muted-foreground">Advertiser ID: {status.advertiser_id}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px]">Ativo</Badge>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tt-app-id">
                App ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tt-app-id"
                placeholder="1234567890123456789"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                data-testid="input-tiktok-ads-app-id"
              />
              <p className="text-[11px] text-muted-foreground">
                Encontrado no TikTok for Business → Ferramentas → API de Marketing.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tt-secret">
                App Secret <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tt-secret"
                type="password"
                placeholder="••••••••••••••••••••••••••••••••"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                data-testid="input-tiktok-ads-secret"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tt-advertiser-id">Advertiser ID</Label>
              <Input
                id="tt-advertiser-id"
                placeholder="6987654321012345678"
                value={advertiserId}
                onChange={(e) => setAdvertiserId(e.target.value)}
                data-testid="input-tiktok-ads-advertiser-id"
              />
              <p className="text-[11px] text-muted-foreground">
                Opcional. ID da conta de anúncios no TikTok Ads Manager.
              </p>
            </div>

            <Separator />

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <a
                href="https://business-api.tiktok.com/portal/docs?id=1735713588895745"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Documentação TikTok Marketing API
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
              data-testid="button-tiktok-ads-delete"
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
            data-testid="button-tiktok-ads-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || saveMutation.isPending}
            data-testid="button-tiktok-ads-save"
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
