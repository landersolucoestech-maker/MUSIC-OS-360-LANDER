/**
 * integrations/hooks/useSigningProviders.ts
 *
 * Agrega o estado de conexão dos provedores de assinatura digital
 * REALMENTE suportados comercialmente pelo produto hoje.
 *
 * Autentique e DocuSign são selecionáveis: ambos têm cadeia real de ponta a
 * ponta no backend (envio + webhook + persistência de status). `connected`
 * reflete o estado real da credencial/OAuth de cada um — um provedor aparece
 * como "Não conectado" até que a integração seja de facto autorizada, nunca
 * como conectado por antecipação.
 *
 * Clicksign continua FORA: não existe nenhum backend em apps/api/src para ele
 * (useClicksign.ts é um stub honesto). Expor um provedor selecionável sem
 * adapter real seria fabricar funcionalidade.
 *
 * CORREÇÃO 2026-08-23 do "Decision Gate item 13": a justificativa anterior
 * dizia que "signing.adapter.ts sempre falha para os três" provaria que
 * Clicksign/DocuSign não são reais. Isso não se sustenta — aquele adapter é um
 * stub de frontend deliberado e falha TAMBÉM para Autentique, que funciona
 * normalmente via backend. O estado real é:
 *   - DocuSign  — OAuth real já existia; o adapter de assinatura foi
 *                 implementado em 2026-08-23 (integrations/docusign/) e o
 *                 provedor voltou a ser selecionável.
 *   - Clicksign — UI real existe (ClicksignConfigDialog + useClicksign), mas
 *                 não há NENHUM backend em apps/api/src. Continua fora até ter
 *                 adapter real. Ver docs/BACKLOG.md Grupo 1.
 *
 * Uso:
 *   const { data: providers } = useSigningProviders();
 */

import { useQuery } from "@tanstack/react-query";
import type { SigningProviderId } from "@/modules/integrations/services/signing.service";
import { useAutentiqueStatus } from "@/modules/integrations/hooks/useAutentique";
import { api } from "@/shared/lib/api-client";

export interface SigningProviderOption {
  id:          SigningProviderId;
  label:       string;
  description: string;
  connected:   boolean;
  logo:        string;
}

// Referência estável — ver shared/hooks/useDataQuery.ts para o motivo.
const EMPTY_PROVIDERS: SigningProviderOption[] = [];

/** Estado real da conexão OAuth do DocuSign — nunca inferido, nunca fabricado. */
function useDocuSignStatus() {
  return useQuery<{ connected: boolean; needs_reauth?: boolean }>({
    queryKey: ["integrations", "docusign", "oauth-status"],
    queryFn: () =>
      api.get<{ connected: boolean; needs_reauth?: boolean }>(
        "/integrations/oauth/status?platform=docusign",
      ),
    staleTime: 30_000,
  });
}

export function useSigningProviders() {
  const { data: autentiqueStatus, isLoading: loadingAutentique } = useAutentiqueStatus();
  const { data: docusignStatus, isLoading: loadingDocusign } = useDocuSignStatus();

  const docusignConnected = (docusignStatus?.connected ?? false) && !docusignStatus?.needs_reauth;

  const providers: SigningProviderOption[] = [
    {
      id:          "autentique",
      label:       "Autentique",
      description: autentiqueStatus?.connected
        ? "Conectado"
        : (autentiqueStatus?.last_error ?? "Não conectado"),
      connected:   autentiqueStatus?.connected ?? false,
      logo:        "A",
    },
    {
      id:          "docusign",
      label:       "DocuSign",
      description: docusignConnected
        ? "Conectado"
        : docusignStatus?.needs_reauth
          ? "Reconexão necessária"
          : "Não conectado",
      connected:   docusignConnected,
      logo:        "D",
    },
  ];

  const query = useQuery<SigningProviderOption[]>({
    queryKey: [
      "integrations", "signing-providers",
      autentiqueStatus?.connected ?? false,
      docusignConnected,
    ],
    queryFn: async (): Promise<SigningProviderOption[]> => providers,
    enabled: !loadingAutentique && !loadingDocusign,
    staleTime: 0,
  });
  return { ...query, data: query.data ?? EMPTY_PROVIDERS };
}
