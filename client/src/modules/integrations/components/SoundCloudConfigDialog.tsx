/**
 * modules/integrations/components/SoundCloudConfigDialog.tsx
 *
 * Dialog de configuração da integração SoundCloud.
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
import {
  useSoundCloudStatus,
  useSoundCloudSaveCredentials,
  useSoundCloudDeleteCredentials,
} from "@/modules/integrations/hooks/useSoundCloud";

interface SoundCloudConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SoundCloudConfigDialog({ open, onOpenChange }: SoundCloudConfigDialogProps) {
  const { data: status, isLoading } = useSoundCloudStatus();
  const saveMutation = useSoundCloudSaveCredentials();
  const deleteMutation = useSoundCloudDeleteCredentials();

  const [form, setForm] = useState({ client_id: "", client_secret: "", permalink: "" });

  useEffect(() => {
    if (!open) return;
    setForm({ client_id: "", client_secret: "", permalink: "" });
  }, [open]);

  const isConnected = status?.connected ?? false;
  const canSave = form.client_id.trim().length > 0 && form.client_secret.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await saveMutation.mutateAsync({
      client_id: form.client_id.trim(),
      client_secret: form.client_secret.trim(),
      permalink: form.permalink.trim() || undefined,
    });
    setForm({ client_id: "", client_secret: "", permalink: "" });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-soundcloud-config">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-400/10">
              <span className="text-xl">☁️</span>
            </div>
            <div>
              <DialogTitle className="text-base">SoundCloud</DialogTitle>
              <DialogDescription className="text-xs">
                Conecte sua conta para importar estatísticas de reprodução, reposts e engajamento.
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
                {isConnected && status?.permalink && (
                  <span className="text-muted-foreground">· @{status.permalink}</span>
                )}
              </div>
              {isConnected && (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs">
                  Ativo
                </Badge>
              )}
            </div>

            {!isConnected && (
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="soundcloud-client-id" className="text-xs font-medium">
                    Client ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="soundcloud-client-id"
                    value={form.client_id}
                    onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                    placeholder="Cole o Client ID do SoundCloud"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-soundcloud-client-id"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="soundcloud-client-secret" className="text-xs font-medium">
                    Client Secret <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="soundcloud-client-secret"
                    type="password"
                    value={form.client_secret}
                    onChange={(e) => setForm((p) => ({ ...p, client_secret: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-soundcloud-client-secret"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="soundcloud-permalink" className="text-xs font-medium text-muted-foreground">
                    Permalink do perfil (opcional)
                  </Label>
                  <Input
                    id="soundcloud-permalink"
                    value={form.permalink}
                    onChange={(e) => setForm((p) => ({ ...p, permalink: e.target.value }))}
                    placeholder="Ex.: seu-artista"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-soundcloud-permalink"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Registre seu app em{" "}
                  <a
                    href="https://soundcloud.com/you/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline hover:text-foreground"
                  >
                    SoundCloud for Developers
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  e copie as credenciais.
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
              data-testid="button-soundcloud-disconnect"
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
              data-testid="button-soundcloud-cancel"
            >
              {isConnected ? "Fechar" : "Cancelar"}
            </Button>
            {!isConnected && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || !canSave}
                data-testid="button-soundcloud-save"
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
