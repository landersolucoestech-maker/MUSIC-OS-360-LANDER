import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CRED_KEY = "musicos360_docusign_credentials";

interface StoredCreds {
  integration_key: string;
  account_id: string;
  user_id?: string;
  saved_at: string;
}

function readCreds(): StoredCreds | null {
  try { return JSON.parse(sessionStorage.getItem(CRED_KEY) || "null"); } catch { return null; }
}
function writeCreds(c: StoredCreds) {
  try { sessionStorage.setItem(CRED_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}
function clearCreds() {
  try { sessionStorage.removeItem(CRED_KEY); } catch { /* ignore */ }
}

export interface DocuSignStatus {
  connected: boolean;
  has_credentials?: boolean;
  account_id?: string | null;
  last_sync_at?: string | null;
}

export function useDocuSignStatus() {
  return useQuery<DocuSignStatus>({
    queryKey: ["integrations", "docusign", "status"],
    queryFn: async (): Promise<DocuSignStatus> => {
      const creds = readCreds();
      if (!creds) {
        return { connected: false, has_credentials: false, account_id: null, last_sync_at: null };
      }
      return {
        connected: true,
        has_credentials: true,
        account_id: creds.account_id,
        last_sync_at: creds.saved_at,
      };
    },
    staleTime: Infinity,
  });
}

export function useDocuSignSaveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { integration_key: string; account_id: string; user_id?: string }) => {
      if (!input.integration_key.trim()) throw new Error("Integration Key é obrigatória.");
      if (!input.account_id.trim()) throw new Error("Account ID é obrigatório.");
      writeCreds({
        integration_key: input.integration_key.trim(),
        account_id: input.account_id.trim(),
        user_id: input.user_id?.trim(),
        saved_at: new Date().toISOString(),
      });
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "docusign", "status"] });
      toast.success("DocuSign conectado com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDocuSignDeleteCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      clearCreds();
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "docusign", "status"] });
      toast.success("DocuSign desconectado.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
