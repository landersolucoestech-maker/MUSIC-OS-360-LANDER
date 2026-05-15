/**
 * modules/integrations/components/SpotifyConfigDialog.tsx
 *
 * Dialog de configuração da integração Spotify for Artists.
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
  useSpotifyStatus,
  useSpotifySaveCredentials,
  useSpotifyDeleteCredentials,
} from "@/modules/integrations/hooks/useSpotify";

interface SpotifyConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpotifyConfigDialog({ open, onOpenChange }: SpotifyConfigDialogProps) {
  const { data: status, isLoading } = useSpotifyStatus();
  const saveMutation = useSpotifySaveCredentials();
  const deleteMutation = useSpotifyDeleteCredentials();

  const [form, setForm] = useState({ client_id: "", client_secret: "", artist_id: "" });

  useEffect(() => {
    if (!open) return;
    setForm({ client_id: "", client_secret: "", artist_id: "" });
  }, [open]);

  const isConnected = status?.connected ?? false;
  const canSave = form.client_id.trim().length > 0 && form.client_secret.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await saveMutation.mutateAsync({
      client_id: form.client_id.trim(),
      client_secret: form.client_secret.trim(),
      artist_id: form.artist_id.trim() || undefined,
    });
    setForm({ client_id: "", client_secret: "", artist_id: "" });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-spotify-config">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1DB954]/10">
              <span className="text-xl">🎵</span>
            </div>
            <div>
              <DialogTitle className="text-base">Spotify for Artists</DialogTitle>
              <DialogDescription className="text-xs">
                Conecte sua conta para importar dados de streams, ouvintes mensais e desempenho de catálogo.
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
                {isConnected && status?.client_id && (
                  <span className="text-muted-foreground">· App {status.client_id.slice(0, 8)}…</span>
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
                  <Label htmlFor="spotify-client-id" className="text-xs font-medium">
                    Client ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="spotify-client-id"
                    value={form.client_id}
                    onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                    placeholder="Cole o Client ID do Spotify Developer"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-spotify-client-id"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="spotify-client-secret" className="text-xs font-medium">
                    Client Secret <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="spotify-client-secret"
                    type="password"
                    value={form.client_secret}
                    onChange={(e) => setForm((p) => ({ ...p, client_secret: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-spotify-client-secret"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="spotify-artist-id" className="text-xs font-medium text-muted-foreground">
                    Artist ID (opcional)
                  </Label>
                  <Input
                    id="spotify-artist-id"
                    value={form.artist_id}
                    onChange={(e) => setForm((p) => ({ ...p, artist_id: e.target.value }))}
                    placeholder="Ex.: 4Z8W4fKeB5YxbusRsdQVPb"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-spotify-artist-id"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Crie um app em{" "}
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline hover:text-foreground"
                  >
                    Spotify Developer Dashboard
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
              data-testid="button-spotify-disconnect"
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
              data-testid="button-spotify-cancel"
            >
              {isConnected ? "Fechar" : "Cancelar"}
            </Button>
            {!isConnected && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || !canSave}
                data-testid="button-spotify-save"
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
