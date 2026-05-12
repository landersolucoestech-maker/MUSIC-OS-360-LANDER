/**
 * modules/integrations/components/ACRCloudConfigDialog.tsx
 *
 * Dialog de configuração da integração ACRCloud (monitoramento musical).
 * Permite conectar, testar, ver estado da quota e projectos activos.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Progress } from "@/shared/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import {
  Radio,
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Gauge,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import {
  useACRCloudStatus,
  useACRCloudSaveCredentials,
  useACRCloudDeleteCredentials,
} from "../hooks/useACRCloud";
import { useACRCloudAlerts, useACRCloudProjects } from "../hooks/useACRCloud";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ACRCloudConfigDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ACRCloudConfigDialog({ open, onOpenChange }: ACRCloudConfigDialogProps) {
  const { data: status, isLoading: isLoadingStatus } = useACRCloudStatus();
  const saveCredentials   = useACRCloudSaveCredentials();
  const deleteCredentials = useACRCloudDeleteCredentials();

  const { data: alerts    = [] } = useACRCloudAlerts({ unacknowledged_only: true, limit: 99 });
  const { data: projects  = [] } = useACRCloudProjects();

  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({
    access_key:    "",
    access_secret: "",
    host:          "identify-eu-west-1.acrcloud.com",
  });

  const isConnected  = status?.connected ?? false;
  const isSaving     = saveCredentials.isPending;
  const isDeleting   = deleteCredentials.isPending;

  const activeProjects      = projects.filter((p) => p.active).length;
  const unacknowledgedAlerts = alerts.length;
  const quotaRemaining      = status?.quota_remaining ?? null;
  const quotaMax            = 5000;
  const quotaPct            = quotaRemaining !== null ? Math.round((quotaRemaining / quotaMax) * 100) : null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveCredentials.mutate({
      access_key:    form.access_key.trim(),
      access_secret: form.access_secret.trim(),
      host:          form.host.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Radio className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <DialogTitle className="text-base">ACRCloud — Monitoramento Musical</DialogTitle>
              <DialogDescription className="text-xs">
                Fingerprint de áudio · Alertas de uso · Relatórios de execução
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Status badge */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            {isLoadingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isConnected ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
            {isConnected && status?.plan && (
              <span className="text-muted-foreground">· Plano {status.plan}</span>
            )}
          </div>
          {isConnected && (
            <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-600 text-xs">
              Activo
            </Badge>
          )}
        </div>

        {/* Form de credenciais (desconectado) */}
        {!isConnected && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="acr-key" className="text-xs font-medium">
                  Access Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="acr-key"
                  placeholder="Chave de acesso ACRCloud"
                  value={form.access_key}
                  onChange={(e) => setForm((p) => ({ ...p, access_key: e.target.value }))}
                  data-testid="input-acrcloud-key"
                  disabled={isSaving}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="acr-secret" className="text-xs font-medium">
                  Access Secret <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="acr-secret"
                    type={showSecret ? "text" : "password"}
                    placeholder="••••••••••••••••••••"
                    value={form.access_secret}
                    onChange={(e) => setForm((p) => ({ ...p, access_secret: e.target.value }))}
                    data-testid="input-acrcloud-secret"
                    disabled={isSaving}
                    autoComplete="off"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSecret((v) => !v)}
                    tabIndex={-1}
                    aria-label={showSecret ? "Ocultar secret" : "Mostrar secret"}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="acr-host" className="text-xs font-medium">
                  Host <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="acr-host"
                  placeholder="identify-eu-west-1.acrcloud.com"
                  value={form.host}
                  onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))}
                  data-testid="input-acrcloud-host"
                  disabled={isSaving}
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  Disponível no dashboard ACRCloud → Projectos → Configurações
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSaving || !form.access_key.trim() || !form.access_secret.trim() || !form.host.trim()}
              data-testid="button-acrcloud-save"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Conectar ao ACRCloud</>
              )}
            </Button>
          </form>
        )}

        {/* Painel de gestão (conectado) */}
        {isConnected && (
          <div className="space-y-4">
            {/* Métricas em tempo real */}
            <div className="grid grid-cols-2 gap-3">
              {/* Quota */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span>Quota restante</span>
                </div>
                {quotaRemaining !== null ? (
                  <>
                    <p className="text-lg font-semibold tabular-nums">
                      {quotaRemaining.toLocaleString("pt-BR")}
                    </p>
                    <Progress value={quotaPct ?? 0} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">{quotaPct}% de {quotaMax.toLocaleString("pt-BR")}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>

              {/* Projectos activos */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Projectos activos</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">{activeProjects}</p>
                <p className="text-[11px] text-muted-foreground">de {projects.length} total</p>
              </div>
            </div>

            {/* Alertas não lidos */}
            {unacknowledgedAlerts > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {unacknowledgedAlerts} alerta{unacknowledgedAlerts > 1 ? "s" : ""} por rever
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                    Aceda ao módulo Monitoramento para ver os detalhes.
                  </p>
                </div>
              </div>
            )}

            {/* Info do host */}
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Host: <strong className="text-foreground">{status?.host}</strong></span>
              </div>
              {status?.access_key && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Access Key: <code className="font-mono">{status.access_key}</code>
                </div>
              )}
            </div>

            <Separator />

            {/* Desconectar */}
            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isDeleting}
                    data-testid="button-acrcloud-disconnect"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">Desconectar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar ACRCloud?</AlertDialogTitle>
                    <AlertDialogDescription>
                      As credenciais e os dados de monitoramento em cache serão removidos. Projectos e alertas guardados localmente serão mantidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteCredentials.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
