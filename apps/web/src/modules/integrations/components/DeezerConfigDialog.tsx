/**
 * modules/integrations/components/DeezerConfigDialog.tsx
 *
 * Dialog de configuração da integração Deezer.
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
import { DeezerIcon } from "@/shared/ui/deezer-icon";
import {
  useDeezerStatus,
  useDeezerSaveCredentials,
  useDeezerDeleteCredentials,
} from "@/modules/integrations/hooks/useDeezer";

interface DeezerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeezerConfigDialog({ open, onOpenChange }: DeezerConfigDialogProps) {
  const { data: status, isLoading } = useDeezerStatus();
  const saveMutation = useDeezerSaveCredentials();
  const deleteMutation = useDeezerDeleteCredentials();

  const [form, setForm] = useState({ app_id: "", secret_key: "", artist_id: "" });

  useEffect(() => {
    if (!open) return;
    setForm({ app_id: "", secret_key: "", artist_id: "" });
  }, [open]);

  const isConnected = status?.connected ?? false;
  const canSave = form.app_id.trim().length > 0 && form.secret_key.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await saveMutation.mutateAsync({
      app_id: form.app_id.trim(),
      secret_key: form.secret_key.trim(),
      artist_id: form.artist_id.trim() || undefined,
    });
    setForm({ app_id: "", secret_key: "", artist_id: "" });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-deezer-config">
        <DialogHeader>
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
               <DeezerIcon className="h-5 w-5 text-[#A238FF]" />
            </div>
            <div>
              <DialogTitle className="text-base">Deezer</DialogTitle>
              <DialogDescription className="text-xs">
                Conecte sua conta para importar relatórios de streams e dados do mercado brasileiro e francês.
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
                {isConnected && status?.app_id && (
                  <span className="text-muted-foreground">· App {status.app_id}</span>
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
                  <Label htmlFor="deezer-app-id" className="text-xs font-medium">
                    App ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="deezer-app-id"
                    value={form.app_id}
                    onChange={(e) => setForm((p) => ({ ...p, app_id: e.target.value }))}
                    placeholder="Ex.: 123456"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-deezer-app-id"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="deezer-secret-key" className="text-xs font-medium">
                    Secret Key <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="deezer-secret-key"
                    type="password"
                    value={form.secret_key}
                    onChange={(e) => setForm((p) => ({ ...p, secret_key: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-deezer-secret-key"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="deezer-artist-id" className="text-xs font-medium text-muted-foreground">
                    Artist ID (opcional)
                  </Label>
                  <Input
                    id="deezer-artist-id"
                    value={form.artist_id}
                    onChange={(e) => setForm((p) => ({ ...p, artist_id: e.target.value }))}
                    placeholder="Ex.: 7890"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-deezer-artist-id"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Crie um app em{" "}
                  <a
                    href="https://developers.deezer.com/myapps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline hover:text-foreground"
                  >
                    Deezer Developers
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  e copie o App ID e Secret Key.
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
              data-testid="button-deezer-disconnect"
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
              data-testid="button-deezer-cancel"
            >
              {isConnected ? "Fechar" : "Cancelar"}
            </Button>
            {!isConnected && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || !canSave}
                data-testid="button-deezer-save"
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
