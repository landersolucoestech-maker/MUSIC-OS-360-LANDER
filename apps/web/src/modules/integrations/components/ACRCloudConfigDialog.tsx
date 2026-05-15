/**
 * modules/integrations/components/ACRCloudConfigDialog.tsx
 *
 * Painel de status do ACRCloud (infraestrutura da plataforma).
 *
 * REGRA ABSOLUTA:
 *   ACRCloud é engine invisível do Music OS 360 — nenhuma credencial é exposta ao browser.
 *   Este dialog mostra apenas o estado operacional da plataforma: quota, projectos e alertas.
 *   NÃO há formulário de credenciais, login, OAuth, save ou delete.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";
import {
  Radio,
  Loader2,
  CheckCircle,
  XCircle,
  Gauge,
  FolderOpen,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { useACRCloudStatus } from "../hooks/useACRCloud";
import { useACRCloudAlerts, useACRCloudProjects } from "../hooks/useACRCloud";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ACRCloudConfigDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ACRCloudConfigDialog({ open, onOpenChange }: ACRCloudConfigDialogProps) {
  const { data: status, isLoading: isLoadingStatus } = useACRCloudStatus();
  const { data: alerts   = [] } = useACRCloudAlerts({ unacknowledged_only: true, limit: 99 });
  const { data: projects = [] } = useACRCloudProjects();

  const isConnected          = status?.connected ?? false;
  const activeProjects       = projects.filter((p) => p.active).length;
  const unacknowledgedAlerts = alerts.length;
  const quotaRemaining       = status?.quota_remaining ?? null;
  const quotaMax             = 5000;
  const quotaPct             = quotaRemaining !== null ? Math.round((quotaRemaining / quotaMax) * 100) : null;

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
                Infraestrutura da plataforma · Fingerprint de áudio · Alertas · Relatórios de execução
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Status da plataforma */}
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
              {isLoadingStatus ? "A verificar…" : isConnected ? "Operacional" : "Indisponível"}
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

        {/* Nota de infra */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-xs text-muted-foreground">
            O ACRCloud é infraestrutura interna do Music OS 360. As credenciais são geridas exclusivamente pelo backend — nenhum dado de autenticação é exposto ao utilizador.
          </p>
        </div>

        {/* Métricas operacionais */}
        {isConnected && (
          <div className="space-y-4">
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
                    <p className="text-[11px] text-muted-foreground">
                      {quotaPct}% de {quotaMax.toLocaleString("pt-BR")}
                    </p>
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
          </div>
        )}

        {/* Estado indisponível */}
        {!isLoadingStatus && !isConnected && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              O serviço de monitoramento está temporariamente indisponível. Contacte o suporte técnico se o problema persistir.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
