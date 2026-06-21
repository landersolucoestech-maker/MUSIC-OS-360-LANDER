/**
 * modules/integrations/components/YouTubeConfigDialog.tsx
 *
 * Dialog de configuração da integração YouTube Music / YouTube Analytics.
 * Credenciais são persistidas em localStorage com prefixo musicos360_.
 */

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
import { CheckCircle, XCircle, Loader2, Trash2, ExternalLink } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import {
  useYouTubeStatus,
  useYouTubeSaveCredentials,
  useYouTubeDeleteCredentials,
} from "@/modules/integrations/hooks/useYouTube";

interface YouTubeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function YouTubeConfigDialog({ open, onOpenChange }: YouTubeConfigDialogProps) {
  const { data: status, isLoading } = useYouTubeStatus();
  const saveMutation = useYouTubeSaveCredentials();
  const deleteMutation = useYouTubeDeleteCredentials();

  const [form, setForm] = useState({ api_key: "", channel_id: "" });

  useEffect(() => {
    if (!open) return;
    setForm({ api_key: "", channel_id: "" });
  }, [open]);

  const isConnected = status?.connected ?? false;
  const canSave = form.api_key.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await saveMutation.mutateAsync({
      api_key: form.api_key.trim(),
      channel_id: form.channel_id.trim() || undefined,
    });
    setForm({ api_key: "", channel_id: "" });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-youtube-config">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
               <SiYoutube className="h-5 w-5 text-[#FF0000]" />
            </div>
            <div>
              <DialogTitle className="text-base">YouTube Music / Analytics</DialogTitle>
              <DialogDescription className="text-xs">
                Conecte via API Key do Google Cloud para importar métricas de visualizações, receita e crescimento de canal.
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
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                {isConnected ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{isConnected ? "Conectado" : "Desconectado"}</span>
                {isConnected && status?.channel_id && (
                  <span className="text-muted-foreground">· Canal {status.channel_id.slice(0, 12)}…</span>
                )}
              </div>
              {isConnected && (
                <Badge variant="success">
                  Ativo
                </Badge>
              )}
            </div>

            {!isConnected && (
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="youtube-api-key" className="text-xs font-medium">
                    API Key <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="youtube-api-key"
                    type="password"
                    value={form.api_key}
                    onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
                    placeholder="AIza••••••••"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-youtube-api-key"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="youtube-channel-id" className="text-xs font-medium text-muted-foreground">
                    Channel ID (opcional)
                  </Label>
                  <Input
                    id="youtube-channel-id"
                    value={form.channel_id}
                    onChange={(e) => setForm((p) => ({ ...p, channel_id: e.target.value }))}
                    placeholder="Ex.: UCxxxxxx"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-youtube-channel-id"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Crie uma API Key com acesso ao YouTube Data API v3 em{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline hover:text-foreground"
                  >
                    Google Cloud Console
                    <ExternalLink className="h-3 w-3" />
                  </a>.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {isConnected ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              data-testid="button-youtube-disconnect"
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
              data-testid="button-youtube-cancel"
            >
              {isConnected ? "Fechar" : "Cancelar"}
            </Button>
            {!isConnected && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || !canSave}
                data-testid="button-youtube-save"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Conectar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
