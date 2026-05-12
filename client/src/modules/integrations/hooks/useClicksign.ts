import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CRED_KEY = "musicos360_clicksign_credentials";

interface StoredCreds {
  api_key: string;
  account_email?: string;
  saved_at: string;
}

function readCreds(): StoredCreds | null {
  try { return JSON.parse(localStorage.getItem(CRED_KEY) || "null"); } catch { return null; }
}
function writeCreds(c: StoredCreds) {
  try { localStorage.setItem(CRED_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}
function clearCreds() {
  try { localStorage.removeItem(CRED_KEY); } catch { /* ignore */ }
}

export interface ClicksignStatus {
  connected: boolean;
  has_token?: boolean;
  account_email?: string | null;
  last_sync_at?: string | null;
}

export function useClicksignStatus() {
  return useQuery<ClicksignStatus>({
    queryKey: ["integrations", "clicksign", "status"],
    queryFn: async (): Promise<ClicksignStatus> => {
      const creds = readCreds();
      if (!creds) {
        return { connected: false, has_token: false, account_email: null, last_sync_at: null };
      }
      return {
        connected: true,
        has_token: true,
        account_email: creds.account_email ?? null,
        last_sync_at: creds.saved_at,
      };
    },
    staleTime: Infinity,
  });
}

export function useClicksignSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { api_key: string; account_email?: string }) => {
      if (!input.api_key.trim()) throw new Error("API Key é obrigatória.");
      writeCreds({
        api_key: input.api_key.trim(),
        account_email: input.account_email?.trim(),
        saved_at: new Date().toISOString(),
      });
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "clicksign", "status"] });
      toast.success("Clicksign conectado com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useClicksignDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      clearCreds();
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "clicksign", "status"] });
      toast.success("Clicksign desconectado.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
