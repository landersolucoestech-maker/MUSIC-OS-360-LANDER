import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DisabledIntegrationError, INTEGRATION_DISABLED_CODE } from "@/shared/lib/disabled-integration";

/**
 * Stubs do Clicksign — integração desligada (sem backend).
 *
 * Não existe nenhum serviço Clicksign em apps/api/src. A implementação
 * anterior aqui gravava metadados não-sensíveis em sessionStorage e reportava
 * `connected: true` sem jamais validar nada contra uma conta Clicksign real
 * — a UI mostrava "Conectado" para uma conexão que nunca aconteceu. Corrigido
 * para seguir o mesmo padrão honesto já usado pelas integrações irmãs
 * (Autentique, Spotify, YouTube, Deezer, SoundCloud, ABRAMUS, Resend, IA
 * Criativa, Meta Ads — ver shared/lib/disabled-integration.ts) em vez de
 * inventar uma exceção só para esta.
 */

export interface ClicksignStatus {
  connected: boolean;
  status?: string;
  has_token?: boolean;
  account_email?: string | null;
  last_sync_at?: string | null;
}

function fail(): never {
  throw new DisabledIntegrationError("Clicksign");
}

export function useClicksignStatus() {
  return useQuery<ClicksignStatus>({
    queryKey: ["integrations", "clicksign", "status"],
    queryFn: async (): Promise<ClicksignStatus> => ({
      connected: false,
      status: INTEGRATION_DISABLED_CODE,
      has_token: false,
      account_email: null,
      last_sync_at: null,
    }),
    staleTime: Infinity,
  });
}

export function useClicksignSaveCredentials() {
  return useMutation({
    mutationFn: async (_input: { api_key: string; account_email?: string }) => fail(),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useClicksignDeleteCredentials() {
  return useMutation({
    mutationFn: async () => fail(),
    onError: (err: Error) => toast.error(err.message),
  });
}
