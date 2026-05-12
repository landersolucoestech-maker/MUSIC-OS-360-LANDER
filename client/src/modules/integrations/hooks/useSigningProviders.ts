/**
 * integrations/hooks/useSigningProviders.ts
 *
 * Agrega o estado de conexão de todos os provedores de assinatura digital:
 *   - Autentique (sempre disponível — provider padrão)
 *   - Clicksign  (disponível quando musicos360_clicksign_credentials está salvo)
 *   - DocuSign   (disponível quando musicos360_docusign_credentials está salvo)
 *
 * Uso:
 *   const { providers, connectedProviders } = useSigningProviders();
 */

import { useQuery } from "@tanstack/react-query";
import type { SigningProviderId } from "@/modules/integrations/adapters/signing.adapter";

export interface SigningProviderOption {
  id:          SigningProviderId;
  label:       string;
  description: string;
  connected:   boolean;
  logo:        string;
}

function readClicksignCreds(): boolean {
  try { return localStorage.getItem("musicos360_clicksign_credentials") !== null; } catch { return false; }
}

function readDocuSignCreds(): boolean {
  try { return localStorage.getItem("musicos360_docusign_credentials") !== null; } catch { return false; }
}

/**
 * UX decision: disconnected providers are shown as disabled (not hidden).
 * This informs users which providers are available and how to enable them.
 * The service layer also enforces connectivity at runtime via verifyConnection().
 */
export function useSigningProviders() {
  return useQuery<SigningProviderOption[]>({
    queryKey: ["integrations", "signing-providers"],
    queryFn: async (): Promise<SigningProviderOption[]> => {
      const clicksignConnected = readClicksignCreds();
      const docusignConnected  = readDocuSignCreds();

      return [
        {
          id:          "autentique",
          label:       "Autentique",
          description: "Provedor padrão — assinatura eletrônica brasileira",
          connected:   true,
          logo:        "A",
        },
        {
          id:          "clicksign",
          label:       "Clicksign",
          description: clicksignConnected
            ? "Conectado — API Key configurada"
            : "Não conectado — configure em Integrações",
          connected:   clicksignConnected,
          logo:        "C",
        },
        {
          id:          "docusign",
          label:       "DocuSign",
          description: docusignConnected
            ? "Conectado — credenciais configuradas"
            : "Não conectado — configure em Integrações",
          connected:   docusignConnected,
          logo:        "D",
        },
      ];
    },
    staleTime: 0,
  });
}
