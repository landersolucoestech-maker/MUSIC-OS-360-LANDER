/**
 * modules/integrations/components/AppleMusicConfigDialog.tsx
 *
 * Dialog de configuração da integração Apple Music for Artists.
 * Credenciais são enviadas ao backend e armazenadas criptografadas no banco.
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
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { CheckCircle, XCircle, Loader2, Trash2, ExternalLink } from "lucide-react";
import { SiApplemusic } from "react-icons/si";
import {
  useAppleMusicStatus,
  useAppleMusicSaveCredentials,
  useAppleMusicDeleteCredentials,
} from "@/modules/integrations/hooks/useAppleMusic";

interface AppleMusicConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppleMusicConfigDialog({ open, onOpenChange }: AppleMusicConfigDialogProps) {
  const { data: status, isLoading } = useAppleMusicStatus();
  const saveMutation = useAppleMusicSaveCredentials();
  const deleteMutation = useAppleMusicDeleteCredentials();

  const [form, setForm] = useState({ team_id: "", key_id: "", private_key: "", artist_id: "" });

  useEffect(() => {
    if (!open) return;
    setForm({ team_id: "", key_id: "", private_key: "", artist_id: "" });
  }, [open]);

  const isConnected = status?.connected ?? false;
  const canSave =
    form.team_id.trim().length > 0 &&
    form.key_id.trim().length > 0 &&
    form.private_key.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await saveMutation.mutateAsync({
      team_id: form.team_id.trim(),
      key_id: form.key_id.trim(),
      private_key: form.private_key.trim(),
      artist_id: form.artist_id.trim() || undefined,
    });
    setForm({ team_id: "", key_id: "", private_key: "", artist_id: "" });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-apple-music-config">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
              <SiApplemusic className="h-5 w-5 text-[#FA243C]" />
            </div>
            <div>
              <DialogTitle className="text-base">Apple Music for Artists</DialogTitle>
              <DialogDescription className="text-xs">
                Conecte via chave MusicKit (Team ID, Key ID e chave privada) do Apple Developer Program.
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
                {isConnected && status?.team_id && (
                  <span className="text-muted-foreground">· Team {status.team_id.slice(0, 12)}…</span>
                )}
              </div>
              {isConnected && <Badge variant="success">Ativo</Badge>}
            </div>

            {!isConnected && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="apple-music-team-id" className="text-xs font-medium">
                      Team ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="apple-music-team-id"
                      value={form.team_id}
                      onChange={(e) => setForm((p) => ({ ...p, team_id: e.target.value }))}
                      placeholder="10 caracteres"
                      autoComplete="off"
                      disabled={saveMutation.isPending}
                      data-testid="input-apple-music-team-id"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="apple-music-key-id" className="text-xs font-medium">
                      Key ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="apple-music-key-id"
                      value={form.key_id}
                      onChange={(e) => setForm((p) => ({ ...p, key_id: e.target.value }))}
                      placeholder="10 caracteres"
                      autoComplete="off"
                      disabled={saveMutation.isPending}
                      data-testid="input-apple-music-key-id"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="apple-music-private-key" className="text-xs font-medium">
                    Chave privada (MusicKit .p8) <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="apple-music-private-key"
                    value={form.private_key}
                    onChange={(e) => setForm((p) => ({ ...p, private_key: e.target.value }))}
                    placeholder="-----BEGIN PRIVATE KEY-----"
                    rows={4}
                    className="font-mono text-xs"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-apple-music-private-key"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="apple-music-artist-id" className="text-xs font-medium text-muted-foreground">
                    Artist ID (opcional)
                  </Label>
                  <Input
                    id="apple-music-artist-id"
                    value={form.artist_id}
                    onChange={(e) => setForm((p) => ({ ...p, artist_id: e.target.value }))}
                    placeholder="Ex.: 123456789"
                    autoComplete="off"
                    disabled={saveMutation.isPending}
                    data-testid="input-apple-music-artist-id"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Crie uma chave MusicKit em{" "}
                  <a
                    href="https://developer.apple.com/account/resources/authkeys/list"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline hover:text-foreground"
                  >
                    Apple Developer
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  (requer Apple Developer Program).
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
              data-testid="button-apple-music-disconnect"
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
              data-testid="button-apple-music-cancel"
            >
              {isConnected ? "Fechar" : "Cancelar"}
            </Button>
            {!isConnected && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || !canSave}
                data-testid="button-apple-music-save"
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
