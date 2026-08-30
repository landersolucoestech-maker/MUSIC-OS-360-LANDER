/**
 * modules/integrations/hooks/useExternalProviders.ts
 *
 * Catálogo comercial resolvido para ESTE tenant (GET /integrations/providers).
 *
 * O BACKEND é a fonte de verdade: ele compõe governança administrativa +
 * capacidade técnica + audiência VIEW/USE + entitlement do plano + conexão, e
 * devolve apenas o que o cliente pode DESCOBRIR. Integrações internas
 * (Soundcharts/ACRCloud/Resend) e billing (Stripe) são excluídas por
 * classificação no resolver — nunca por filtro de frontend.
 *
 * Regra: ramifique sempre por `reasonCode`/flags (enum), nunca por texto humano.
 */

import { useQuery } from "@tanstack/react-query";
import {
  ExternalProviderStatus,
  IntegrationClassification,
  IntegrationPublicationState,
  IntegrationTechnicalState,
  IntegrationReasonCode,
} from "@music-os-360/types";
import { api } from "@/shared/lib/api-client";

/** Espelha 1:1 o payload client-safe do resolver — sem campos administrativos. */
export interface ClientIntegration {
  slug: string;
  name: string;
  category: string | null;
  classification: IntegrationClassification;
  publicationState: IntegrationPublicationState;
  technicalState: IntegrationTechnicalState;
  connectionKind: "oauth" | "tenant_credentials" | "platform_credentials";
  /** O plano do tenant inclui esta integração. */
  entitled: boolean;
  /** Pode iniciar conexão/OAuth — não exige já estar conectado. */
  canConnect: boolean;
  /** Pode operar de facto (exige conexão válida). */
  canUse: boolean;
  connectionState: ExternalProviderStatus;
  reasonCode: IntegrationReasonCode;
  /** Planos que incluem o slug — descoberto no backend, nunca hardcoded. */
  eligiblePlans: string[];
}

const EMPTY: ClientIntegration[] = [];

/** Como cada estado deve ser apresentado. Derivado do enum, nunca fonte de lógica. */
export interface IntegrationPresentation {
  label: string;
  tone: "success" | "neutral" | "warning" | "danger" | "info";
  /** Ação primária oferecida ao cliente, se houver. */
  action: "connect" | "reconnect" | "manage" | "upgrade" | "none";
  hint?: string;
}

/**
 * PLAN_NOT_INCLUDED e COMING_SOON são deliberadamente distintos em rótulo, tom
 * e ação: "bloqueado pelo plano" é uma venda (upgrade), "em breve" é ausência de
 * produto. Colapsá-los num só estado esconde a diferença do cliente.
 */
export const INTEGRATION_PRESENTATION: Record<IntegrationReasonCode, IntegrationPresentation> = {
  [IntegrationReasonCode.CONNECTED]: {
    label: "Conectado", tone: "success", action: "manage",
  },
  [IntegrationReasonCode.NOT_CONNECTED]: {
    label: "Incluído no seu plano", tone: "info", action: "connect",
    hint: "Conecte sua conta para começar a usar.",
  },
  [IntegrationReasonCode.PLAN_NOT_INCLUDED]: {
    label: "Bloqueado pelo plano", tone: "warning", action: "upgrade",
    hint: "Esta integração não está incluída no seu plano atual.",
  },
  [IntegrationReasonCode.COMING_SOON]: {
    label: "Em breve", tone: "neutral", action: "none",
    hint: "Estamos preparando esta integração.",
  },
  [IntegrationReasonCode.TEMPORARILY_UNAVAILABLE]: {
    label: "Temporariamente indisponível", tone: "warning", action: "none",
    hint: "Esta integração está fora do ar no momento.",
  },
  [IntegrationReasonCode.REQUIRES_REAUTH]: {
    label: "Reconexão necessária", tone: "warning", action: "reconnect",
    hint: "A autorização expirou ou foi revogada.",
  },
  [IntegrationReasonCode.PROVIDER_ERROR]: {
    label: "Erro no provedor", tone: "danger", action: "reconnect",
    hint: "A última comunicação com o provedor falhou.",
  },
  [IntegrationReasonCode.TECHNICAL_NOT_READY]: {
    label: "Ainda não operacional", tone: "neutral", action: "none",
  },
  [IntegrationReasonCode.NOT_IMPLEMENTED]: {
    label: "Ainda não disponível", tone: "neutral", action: "none",
  },
  [IntegrationReasonCode.AUDIENCE_NOT_ALLOWED]: {
    label: "Indisponível para esta conta", tone: "neutral", action: "none",
  },
  [IntegrationReasonCode.HIDDEN]: {
    label: "Indisponível", tone: "neutral", action: "none",
  },
  [IntegrationReasonCode.NOT_CUSTOMER_FACING]: {
    label: "Indisponível", tone: "neutral", action: "none",
  },
};

export function useExternalProviders() {
  const query = useQuery<ClientIntegration[]>({
    queryKey: ["integrations", "external-providers"],
    queryFn: () => api.get<ClientIntegration[]>("/integrations/providers"),
    staleTime: 30_000,
  });
  return { ...query, data: query.data ?? EMPTY };
}

/** Lookup por slug. Undefined = o backend não resolveu para este cliente. */
export function findProviderState(
  providers: ClientIntegration[],
  slug: string,
): ClientIntegration | undefined {
  return providers.find((p) => p.slug === slug);
}

/**
 * Um botão de conexão só pode existir quando o backend autoriza conectar E o
 * provedor tem forma real de conexão. Entitlement sozinho nunca cria botão.
 */
export function canOfferConnection(p: ClientIntegration): boolean {
  return p.canConnect && p.connectionKind !== "platform_credentials";
}
