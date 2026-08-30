/**
 * components/ClientIntegrationCard.tsx
 *
 * Card de uma integração comercial no catálogo do tenant.
 *
 * Toda decisão vem do backend (`reasonCode`, `canConnect`, `entitled`,
 * `eligiblePlans`). Este componente NÃO recalcula política — só apresenta.
 *
 * Estados que precisam ser inequivocamente diferentes:
 *   PLAN_NOT_INCLUDED → bloqueado pelo plano, com upgrade (é uma venda)
 *   COMING_SOON       → em breve, sem ação (não existe produto ainda)
 * Colapsar os dois esconderia do cliente qual é o caminho para destravar.
 */

import { Badge, type BadgeVariant } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { IntegrationReasonCode } from "@music-os-360/types";
import {
  INTEGRATION_PRESENTATION,
  canOfferConnection,
  type ClientIntegration,
} from "@/modules/integrations/hooks/useExternalProviders";

const TONE_VARIANT: Record<string, BadgeVariant> = {
  success: "success",
  neutral: "neutral",
  warning: "warning",
  danger: "danger",
  info: "info",
};

interface Props {
  integration: ClientIntegration;
  /** Abre a superfície canônica de conexão do provedor, quando existir. */
  onConnect?: (slug: string) => void;
  /** Leva à superfície de upgrade/billing já existente — nunca um checkout novo. */
  onUpgrade?: () => void;
}

export function ClientIntegrationCard({ integration, onConnect, onUpgrade }: Props) {
  const p = INTEGRATION_PRESENTATION[integration.reasonCode];
  const showConnect = canOfferConnection(integration)
    && (p.action === "connect" || p.action === "reconnect");
  const lockedByPlan = integration.reasonCode === IntegrationReasonCode.PLAN_NOT_INCLUDED;

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      data-testid={`client-integration-${integration.slug}`}
      data-reason={integration.reasonCode}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{integration.name}</p>
          {p.hint && <p className="text-xs text-muted-foreground mt-0.5">{p.hint}</p>}
        </div>
        <Badge
          variant={TONE_VARIANT[p.tone] ?? "neutral"}
          data-testid={`client-integration-${integration.slug}-status`}
        >
          {p.label}
        </Badge>
      </div>

      {/* Bloqueio por plano: mostra os planos REAIS que incluem, vindos do
          backend. Nenhum nome de plano é decidido aqui. */}
      {lockedByPlan && (
        <div className="rounded-md bg-muted/50 p-3 space-y-2" data-testid={`client-integration-${integration.slug}-locked`}>
          {integration.eligiblePlans.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Disponível no{integration.eligiblePlans.length > 1 ? "s planos" : " plano"}:{" "}
              <span className="font-medium text-foreground">
                {integration.eligiblePlans.join(", ")}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum plano ativo inclui esta integração no momento.
            </p>
          )}
          {onUpgrade && integration.eligiblePlans.length > 0 && (
            <Button size="sm" variant="outline" onClick={onUpgrade}
              data-testid={`client-integration-${integration.slug}-upgrade`}>
              Ver planos
            </Button>
          )}
        </div>
      )}

      {/* Connect só aparece quando o BACKEND autoriza conectar. Em breve,
          indisponível e não-implementado nunca oferecem botão funcional. */}
      {showConnect && (
        <Button
          size="sm"
          onClick={() => onConnect?.(integration.slug)}
          data-testid={`client-integration-${integration.slug}-connect`}
        >
          {p.action === "reconnect" ? "Reconectar conta" : "Conectar conta"}
        </Button>
      )}

      {integration.canUse && (
        <p className="text-xs text-emerald-500" data-testid={`client-integration-${integration.slug}-ready`}>
          Pronta para uso
        </p>
      )}
    </div>
  );
}
